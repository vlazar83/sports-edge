import { Router, Request, Response } from 'express';
import mcpClient from '../config/mcp-client';

const router = Router();

/**
 * GET /api/leagues
 * Get available leagues for a sport
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { sport, mcp } = req.query;

    if (!sport) {
      return res.status(400).json({ error: 'Sport parameter is required' });
    }

    console.log(`📋 Fetching leagues for sport: ${sport}, MCP: ${mcp || 'odds-api'}`);

    // Get sports list from MCP
    const sportsResponse = await mcpClient.getSports();

    // Extract leagues - MCP returns { sports: [...], remaining_requests: N }
    let leagues = sportsResponse.sports || [];

    console.log(`📋 Received ${leagues.length} sports from MCP`);

    // Log first few for debugging
    if (leagues.length > 0) {
      console.log(`📋 Sample sports:`, leagues.slice(0, 3).map((l: any) => `${l.key} (${l.group})`));
    }

    // Map sport name to filter criteria
    const sportFilters: Record<string, string[]> = {
      basketball: ['basketball', 'nba', 'ncaa', 'euroleague', 'eurocup', 'wnba'],
      football: ['soccer', 'football', 'epl', 'la_liga', 'bundesliga', 'serie_a', 'ligue_1', 'mls', 'uefa']
    };

    const filters = sportFilters[sport as string] || [];

    if (filters.length > 0 && leagues.length > 0) {
      leagues = leagues.filter((league: any) => {
        const title = (league.title || '').toLowerCase();
        const key = (league.key || '').toLowerCase();
        const group = (league.group || '').toLowerCase();
        return filters.some(f => title.includes(f) || key.includes(f) || group.includes(f));
      });
    }

    console.log(`✓ Found ${leagues.length} leagues for ${sport}`);

    res.json({
      sport,
      mcp: mcp || 'odds-api',
      leagues: leagues.map((league: any) => ({
        key: league.key,
        title: league.title,
        group: league.group,
        description: league.description,
        active: league.active
      }))
    });

  } catch (error: any) {
    console.error('Leagues error:', error);
    res.status(500).json({
      error: 'Failed to fetch leagues',
      message: error.message
    });
  }
});

export default router;
