import { ParsedIntent, QueryType } from '../types';
import db from '../config/database';

/**
 * Query Parser Service
 * Converts natural language queries into structured intents
 */
export class QueryParserService {
  /**
   * Main parsing function
   */
  async parse(query: string): Promise<ParsedIntent> {
    const sport = this.detectSport(query);
    const entities = await this.extractEntities(query, sport);
    const dateRange = this.parseTemporalExpressions(query);
    const queryType = this.classifyQueryType(query, entities);
    const confidence = this.calculateConfidence(sport, entities, queryType);

    return {
      sport,
      sportKey: this.mapToSportKey(sport),
      teams: entities,
      dateRange,
      queryType,
      confidence
    };
  }

  /**
   * Detect sport from keywords and patterns
   */
  private detectSport(query: string): string | undefined {
    const lowerQuery = query.toLowerCase();

    const sportPatterns: Record<string, { keywords: string[]; teams?: string[] }> = {
      'tennis': {
        keywords: ['tennis', 'atp', 'wta', 'grand slam', 'wimbledon', 'us open', 'french open', 'australian open'],
      },
      'basketball': {
        keywords: ['nba', 'basketball', 'ncaa basketball'],
        teams: ['lakers', 'celtics', 'warriors', 'heat', 'bulls', 'nets', 'bucks', 'suns']
      },
      'soccer': {
        keywords: ['soccer', 'football', 'epl', 'premier league', 'la liga', 'serie a', 'bundesliga', 'champions league'],
        teams: ['manchester', 'liverpool', 'arsenal', 'chelsea', 'barcelona', 'real madrid', 'bayern', 'juventus']
      },
      'nfl': {
        keywords: ['nfl', 'super bowl', 'football'],
        teams: ['chiefs', 'patriots', 'cowboys', 'packers', '49ers', 'eagles', 'bills']
      },
      'baseball': {
        keywords: ['mlb', 'baseball', 'world series'],
        teams: ['yankees', 'red sox', 'dodgers', 'cubs', 'astros', 'braves']
      },
      'hockey': {
        keywords: ['nhl', 'hockey', 'stanley cup'],
        teams: ['rangers', 'bruins', 'maple leafs', 'canadiens', 'penguins']
      }
    };

    for (const [sport, config] of Object.entries(sportPatterns)) {
      if (config.keywords.some(kw => lowerQuery.includes(kw))) {
        return sport;
      }
      if (config.teams?.some(team => lowerQuery.includes(team))) {
        return sport;
      }
    }

    // Default: if "vs" or "v" pattern exists, likely tennis
    if (lowerQuery.includes(' vs ') || lowerQuery.includes(' v ')) {
      return 'tennis';
    }

    return undefined;
  }

  /**
   * Extract team/player names from query
   */
  private async extractEntities(query: string, sport?: string): Promise<string[]> {
    const entities: string[] = [];

    // Pattern 1: "X vs Y" or "X v Y"
    const vsPattern = /(\w+(?:\s+\w+)?)\s+(?:vs?\.?|versus)\s+(\w+(?:\s+\w+)?)/i;
    const vsMatch = query.match(vsPattern);

    if (vsMatch) {
      entities.push(vsMatch[1].trim(), vsMatch[2].trim());
      return entities;
    }

    // Pattern 2: Query database for known participants
    if (sport) {
      const words = query.toLowerCase().split(/\s+/);
      const participants = await this.findParticipants(sport, words);
      entities.push(...participants);
    }

    // Pattern 3: Capitalized words (likely team/player names)
    const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g;
    const capitalizedMatches = query.match(capitalizedPattern);

    if (capitalizedMatches) {
      entities.push(...capitalizedMatches);
    }

    return [...new Set(entities)];
  }

  /**
   * Database lookup for participants
   */
  private async findParticipants(sport: string, words: string[]): Promise<string[]> {
    if (words.length === 0) return [];

    try {
      const conditions = words.map((_, i) => `p.normalized_name LIKE $${i + 2}`).join(' OR ');
      const query = `
        SELECT DISTINCT p.name
        FROM participants p
        JOIN sports s ON p.sport_id = s.id
        WHERE s.sport_key LIKE $1
          AND (${conditions})
        LIMIT 10
      `;

      const params = [`%${sport}%`, ...words.map(w => `%${w}%`)];
      const result = await db.query(query, params);
      return result.rows.map(r => r.name);
    } catch (error) {
      console.error('Error finding participants:', error);
      return [];
    }
  }

  /**
   * Parse temporal expressions
   */
  private parseTemporalExpressions(query: string): { from: Date; to: Date } | undefined {
    const lowerQuery = query.toLowerCase();
    const now = new Date();

    if (lowerQuery.includes('today')) {
      const start = new Date(now.setHours(0, 0, 0, 0));
      const end = new Date(now.setHours(23, 59, 59, 999));
      return { from: start, to: end };
    }

    if (lowerQuery.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const start = new Date(tomorrow.setHours(0, 0, 0, 0));
      const end = new Date(tomorrow.setHours(23, 59, 59, 999));
      return { from: start, to: end };
    }

    if (lowerQuery.includes('this week') || lowerQuery.includes('week')) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return { from: now, to: weekEnd };
    }

    if (lowerQuery.includes('weekend')) {
      const dayOfWeek = now.getDay();
      const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
      const saturday = new Date(now);
      saturday.setDate(saturday.getDate() + daysUntilSaturday);
      const sunday = new Date(saturday);
      sunday.setDate(sunday.getDate() + 1);
      return {
        from: new Date(saturday.setHours(0, 0, 0, 0)),
        to: new Date(sunday.setHours(23, 59, 59, 999))
      };
    }

    return undefined;
  }

  /**
   * Classify query type
   */
  private classifyQueryType(query: string, entities: string[]): QueryType {
    const lowerQuery = query.toLowerCase();

    if ((lowerQuery.includes(' vs ') || lowerQuery.includes(' v ')) && entities.length >= 2) {
      return 'specific_match';
    }

    if (lowerQuery.includes('live') || lowerQuery.includes('score')) {
      return 'live_scores';
    }

    if (lowerQuery.includes('odds') || lowerQuery.includes('betting')) {
      return entities.length >= 2 ? 'specific_match' : 'odds_request';
    }

    if (entities.length === 1) {
      return 'team_games';
    }

    if (lowerQuery.includes('upcoming') || lowerQuery.includes('schedule')) {
      return 'upcoming_games';
    }

    return 'sport_overview';
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(sport: string | undefined, entities: string[], queryType: QueryType): number {
    let confidence = 0.5;

    if (sport) confidence += 0.2;
    confidence += Math.min(entities.length * 0.1, 0.2);

    if (queryType === 'specific_match' && entities.length >= 2) confidence += 0.1;
    if (queryType === 'sport_overview' && sport) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Map sport name to The Odds API sport_key
   */
  private mapToSportKey(sport: string | undefined): string | undefined {
    if (!sport) return undefined;

    const mapping: Record<string, string> = {
      'tennis': 'tennis_atp_us_open',
      'basketball': 'basketball_nba',
      'soccer': 'soccer_epl',
      'nfl': 'americanfootball_nfl',
      'baseball': 'baseball_mlb',
      'hockey': 'icehockey_nhl'
    };

    return mapping[sport.toLowerCase()];
  }
}

export default new QueryParserService();
