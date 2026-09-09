import { Router, Request, Response } from 'express';
import queryParserService from '../services/query-parser.service';
import mcpOrchestratorService from '../services/mcp-orchestrator.service';
import { QueryRequest, QueryResponse, GameResult } from '../types';

const router = Router();

/**
 * POST /api/query
 * Natural language query endpoint
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { query, userId, sessionId }: QueryRequest = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Query parameter is required and must be a string'
      });
    }

    console.log(`📝 Query received: "${query}"`);

    // Parse the natural language query
    const intent = await queryParserService.parse(query);
    console.log(`🧠 Parsed intent:`, intent);

    if (intent.confidence < 0.4) {
      return res.status(400).json({
        error: 'Could not understand query. Please be more specific.',
        intent,
        suggestions: [
          'Try: "Shelton vs Alcaraz"',
          'Try: "NBA games today"',
          'Try: "show me Lakers games"'
        ]
      });
    }

    // Execute query via MCP orchestrator
    const result = await mcpOrchestratorService.executeQuery(intent, query);

    // Format response
    const games = result.data.games || [];
    const formattedResults: GameResult[] = games.map((game: any) => ({
      gameId: game.id,
      eventId: game.id,
      sport: intent.sport || '',
      sportTitle: game.sport_title,
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      commenceTime: game.commence_time,
      status: game.completed ? 'completed' : 'scheduled',
      odds: game.bookmakers ? {
        bookmakers: game.bookmakers.map((bm: any) => ({
          bookmaker: bm.key,
          title: bm.title,
          markets: bm.markets
        }))
      } : undefined,
      scores: game.scores ? {
        home: game.scores[0]?.score,
        away: game.scores[1]?.score
      } : undefined
    }));

    const response: QueryResponse = {
      intent,
      results: formattedResults,
      mcpRequestId: result.mcpRequestId,
      executionTimeMs: result.executionTimeMs
    };

    console.log(`✓ Found ${formattedResults.length} results in ${result.executionTimeMs}ms`);

    res.json(response);

  } catch (error: any) {
    console.error('Query error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;
