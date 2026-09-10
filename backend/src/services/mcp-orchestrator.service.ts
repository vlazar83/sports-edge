import { ParsedIntent, QueryType } from '../types';
import mcpClient from '../config/mcp-client';
import db from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import oddsStorageService from './odds-storage.service';

/**
 * MCP Orchestrator Service
 * Routes queries to appropriate MCP tools and tracks all interactions
 */
export class MCPOrchestratorService {
  /**
   * Execute query by selecting appropriate MCP tool
   */
  async executeQuery(intent: ParsedIntent, originalQuery: string): Promise<any> {
    const { sportKey, queryType, teams, dateRange } = intent;

    if (!sportKey) {
      throw new Error('Cannot determine sport from query');
    }

    let mcpTool: string;
    let mcpParams: any;

    // Select MCP tool based on query type
    switch (queryType) {
      case 'specific_match':
      case 'team_games':
        mcpTool = 'search_games_by_team';
        mcpParams = {
          sport_key: sportKey,
          team_name: teams[0]
        };
        break;

      case 'sport_overview':
      case 'upcoming_games':
        mcpTool = 'get_upcoming_games';
        mcpParams = {
          sport_key: sportKey,
          days_from: this.calculateDaysFrom(dateRange) || 3
        };
        break;

      case 'odds_request':
        mcpTool = 'get_odds';
        mcpParams = {
          sport_key: sportKey,
          regions: ['us'],
          markets: ['h2h'],
          odds_format: 'decimal'
        };
        break;

      case 'live_scores':
        mcpTool = 'get_scores';
        mcpParams = {
          sport_key: sportKey,
          days_from: 1
        };
        break;

      default:
        mcpTool = 'get_events';
        mcpParams = {
          sport_key: sportKey
        };
    }

    return await this.executeAndTrack(mcpTool, mcpParams, intent, originalQuery);
  }

  /**
   * Execute MCP tool and track request/response in database
   */
  private async executeAndTrack(
    toolName: string,
    params: any,
    intent: ParsedIntent,
    originalQuery: string
  ): Promise<any> {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      // 1. Save MCP request to database
      await db.query(`
        INSERT INTO mcp_requests (
          request_id, tool_name, input_parameters, user_query, parsed_intent, request_timestamp
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        requestId,
        toolName,
        JSON.stringify(params),
        originalQuery,
        JSON.stringify(intent)
      ]);

      // 2. Call MCP tool
      const response = await mcpClient.callTool(toolName, params);
      const executionTime = Date.now() - startTime;

      // 3. Save MCP response
      await db.query(`
        INSERT INTO mcp_responses (
          request_id, response_data, response_status, execution_time_ms,
          remaining_api_credits, response_timestamp
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        requestId,
        JSON.stringify(response),
        200,
        executionTime,
        response.remaining_requests || response.remaining_api_credits
      ]);

      // 4. Store normalized data
      await oddsStorageService.storeNormalizedData(response, toolName);

      // 5. Filter results based on intent
      let filteredResults = this.filterResults(response, intent, originalQuery);

      // 6. Fallback: if "today" returned 0 results for sport_overview, show upcoming games
      if (intent.queryType === 'sport_overview' &&
          intent.dateRange &&
          originalQuery.toLowerCase().includes('today') &&
          (!filteredResults.games || filteredResults.games.length === 0)) {

        console.log('📅 No games today, showing upcoming games instead...');
        // Remove date filter and show upcoming games
        const intentWithoutDate = { ...intent, dateRange: undefined };
        filteredResults = this.filterResults(response, intentWithoutDate, originalQuery);
      }

      // 7. Save query history
      await this.saveQueryHistory(originalQuery, intent, requestId);

      return {
        data: filteredResults,
        mcpRequestId: requestId,
        executionTimeMs: executionTime
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      // Save error response
      await db.query(`
        INSERT INTO mcp_responses (
          request_id, response_data, response_status, error_message, execution_time_ms, response_timestamp
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        requestId,
        JSON.stringify({}),
        500,
        error.message,
        executionTime
      ]);

      throw error;
    }
  }

  /**
   * Filter MCP response based on parsed intent
   */
  private filterResults(response: any, intent: ParsedIntent, originalQuery?: string): any {
    const games = response.games || (Array.isArray(response) ? response : [response]);

    if (!Array.isArray(games)) {
      return response;
    }

    let filtered = games;

    // Check if teams look like international basketball countries
    const internationalCountries = [
      'usa', 'hungary', 'france', 'spain', 'canada', 'argentina', 'brazil',
      'china', 'japan', 'australia', 'germany', 'italy', 'greece', 'serbia'
    ];
    const hasInternationalTeams = intent.teams?.some(team =>
      internationalCountries.includes(team.toLowerCase())
    );

    // Filter by teams if specified (but skip filtering if international teams and no matches)
    if (intent.teams && intent.teams.length > 0 && !hasInternationalTeams) {
      filtered = filtered.filter((game: any) => {
        const homeMatch = intent.teams.some(t =>
          game.home_team.toLowerCase().includes(t.toLowerCase())
        );
        const awayMatch = intent.teams.some(t =>
          game.away_team.toLowerCase().includes(t.toLowerCase())
        );
        return homeMatch || awayMatch;
      });
    }

    // Filter by date range
    if (intent.dateRange) {
      filtered = filtered.filter((game: any) => {
        const gameTime = new Date(game.commence_time);
        return gameTime >= intent.dateRange!.from && gameTime <= intent.dateRange!.to;
      });
    }

    // Add relevance scoring if we have a query and teams
    if (originalQuery && (intent.teams?.length > 0 || filtered.length > 1)) {
      filtered = this.rankByRelevance(filtered, originalQuery, intent);
    }

    return { ...response, games: filtered };
  }

  /**
   * Rank games by relevance to search query
   */
  private rankByRelevance(games: any[], query: string, intent: ParsedIntent): any[] {
    const queryLower = query.toLowerCase();

    // Extract search terms (exclude common words)
    const searchTerms = queryLower
      .split(/[\s\-,]+/)
      .filter(term =>
        term.length > 2 &&
        !['today', 'tomorrow', 'yesterday', 'basketball', 'nba', 'game', 'match',
          'vs', 'versus', 'show', 'the', 'and', 'for'].includes(term)
      );

    console.log(`🔍 Ranking games by search terms: ${searchTerms.join(', ')}`);

    // Score each game
    const scoredGames = games.map((game: any) => {
      const homeTeam = (game.home_team || '').toLowerCase();
      const awayTeam = (game.away_team || '').toLowerCase();
      let relevanceScore = 0;

      searchTerms.forEach(term => {
        // Exact team name match (highest priority)
        if (homeTeam === term || awayTeam === term) {
          relevanceScore += 100;
        }
        // Team name contains search term
        else if (homeTeam.includes(term) || awayTeam.includes(term)) {
          relevanceScore += 50;
        }
        // Search term contains team name (partial match)
        else if (term.includes(homeTeam) || term.includes(awayTeam)) {
          relevanceScore += 20;
        }

        // Bonus: Both teams match search terms
        const homeHasMatch = homeTeam.includes(term) || homeTeam === term;
        const awayHasMatch = awayTeam.includes(term) || awayTeam === term;
        if (homeHasMatch && awayHasMatch) {
          relevanceScore += 30;
        }
      });

      // Bonus for country codes in international basketball
      if (intent.sport === 'basketball') {
        searchTerms.forEach(term => {
          // Check for country name matches (USA, Hungary, etc.)
          const countryPatterns = ['usa', 'hungary', 'france', 'spain', 'canada',
                                   'argentina', 'brazil', 'china', 'japan'];
          if (countryPatterns.includes(term)) {
            if (homeTeam.includes(term) || awayTeam.includes(term)) {
              relevanceScore += 75; // High boost for country matches
            }
          }
        });
      }

      return { ...game, relevanceScore };
    });

    // Sort by relevance score (highest first), then by commence time
    scoredGames.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      // Fallback to time sorting
      const timeA = new Date(a.commence_time || 0).getTime();
      const timeB = new Date(b.commence_time || 0).getTime();
      return timeA - timeB;
    });

    // Log top results for debugging
    if (scoredGames.length > 0) {
      console.log(`✓ Top match: ${scoredGames[0].home_team} vs ${scoredGames[0].away_team} (score: ${scoredGames[0].relevanceScore})`);
      if (scoredGames.length > 1) {
        console.log(`  2nd: ${scoredGames[1].home_team} vs ${scoredGames[1].away_team} (score: ${scoredGames[1].relevanceScore})`);
      }
    }

    return scoredGames;
  }

  /**
   * Save query to history table
   */
  private async saveQueryHistory(query: string, intent: ParsedIntent, mcpRequestId: string): Promise<void> {
    try {
      await db.query(`
        INSERT INTO query_history (
          raw_query, parsed_successfully, parsed_sport, parsed_teams,
          parsed_date_from, parsed_date_to, query_type, confidence_score, mcp_request_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        query,
        intent.confidence > 0.5,
        intent.sport,
        intent.teams,
        intent.dateRange?.from,
        intent.dateRange?.to,
        intent.queryType,
        intent.confidence,
        mcpRequestId
      ]);
    } catch (error) {
      console.error('Error saving query history:', error);
    }
  }

  /**
   * Calculate days from date range
   */
  private calculateDaysFrom(dateRange?: { from: Date; to: Date }): number | undefined {
    if (!dateRange) return undefined;

    const now = new Date();
    const diffMs = dateRange.to.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return Math.max(1, Math.min(diffDays, 30)); // Clamp between 1-30 days
  }
}

export default new MCPOrchestratorService();
