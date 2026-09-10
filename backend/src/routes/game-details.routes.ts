import { Router, Request, Response } from 'express';
import mcpClient from '../config/mcp-client';

const router = Router();

/**
 * GET /api/game-details/:eventId
 * Get detailed information for a specific game
 */
router.get('/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { sport, league, mcp } = req.query;

    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' });
    }

    console.log(`🎯 Fetching game details - ID: ${eventId}, League: ${league}, MCP: ${mcp}`);

    const startTime = Date.now();

    // Fetch detailed odds for this specific event
    let gameDetails;

    if (mcp === 'basketball-api' || mcp === 'football-api') {
      return res.status(501).json({
        error: 'International API not yet implemented',
        message: 'Game details not available for this source yet'
      });
    } else {
      // Get event odds from The Odds API
      try {
        gameDetails = await mcpClient.callTool('get_event_odds', {
          sport_key: league,
          event_id: eventId,
          regions: ['us'],
          markets: ['h2h', 'spreads', 'totals'],
          odds_format: 'decimal'
        });
      } catch (error: any) {
        console.error('Failed to fetch event odds:', error.message);
        // Fallback: try to find in events list
        const eventsResponse = await mcpClient.getEvents(league as string);
        const events = eventsResponse.games || eventsResponse || [];
        const game = events.find((g: any) => g.id === eventId);

        if (game) {
          gameDetails = game;
        } else {
          return res.status(404).json({ error: 'Game not found' });
        }
      }
    }

    const executionTime = Date.now() - startTime;

    // Format response
    const response = {
      eventId: gameDetails.id,
      sport: sport || gameDetails.sport_key,
      sportTitle: gameDetails.sport_title,
      homeTeam: gameDetails.home_team,
      awayTeam: gameDetails.away_team,
      commenceTime: gameDetails.commence_time,
      status: gameDetails.completed ? 'completed' : 'scheduled',
      bookmakers: gameDetails.bookmakers?.map((bm: any) => ({
        key: bm.key,
        title: bm.title,
        lastUpdate: bm.last_update,
        markets: bm.markets?.map((market: any) => ({
          key: market.key,
          lastUpdate: market.last_update,
          outcomes: market.outcomes?.map((outcome: any) => ({
            name: outcome.name,
            price: outcome.price,
            point: outcome.point
          }))
        }))
      })),
      dataSource: mcp || 'odds-api',
      executionTimeMs: executionTime
    };

    console.log(`✓ Found game details for ${gameDetails.home_team} vs ${gameDetails.away_team}`);

    res.json(response);

  } catch (error: any) {
    console.error('Game details error:', error);
    res.status(500).json({
      error: 'Failed to fetch game details',
      message: error.message
    });
  }
});

export default router;
