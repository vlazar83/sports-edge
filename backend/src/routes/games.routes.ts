import { Router, Request, Response } from 'express';
import mcpClient from '../config/mcp-client';

const router = Router();

/**
 * POST /api/games
 * Get games for a specific league and date
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { sport, mcp, league, date } = req.body;

    if (!sport || !league || !date) {
      return res.status(400).json({
        error: 'sport, league, and date parameters are required'
      });
    }

    console.log(`🎮 Fetching games - Sport: ${sport}, League: ${league}, Date: ${date}, MCP: ${mcp || 'odds-api'}`);

    const startTime = Date.now();

    // Parse date range
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch games from MCP
    let gamesResponse;

    if (mcp === 'basketball-api' || mcp === 'football-api') {
      // International API (not implemented yet)
      return res.status(501).json({
        error: 'International API not yet implemented',
        message: 'Please use The Odds API for now'
      });
    } else {
      // The Odds API
      gamesResponse = await mcpClient.getEvents(league);
    }

    const executionTime = Date.now() - startTime;

    // Extract and filter games
    let games = gamesResponse.games || gamesResponse || [];

    // Filter by date range
    games = games.filter((game: any) => {
      const gameTime = new Date(game.commence_time);
      return gameTime >= startOfDay && gameTime <= endOfDay;
    });

    // If no games on selected date, show next upcoming games
    let fallbackUsed = false;
    if (games.length === 0) {
      console.log(`📅 No games on ${date}, showing next 10 upcoming games...`);
      const allGames = gamesResponse.games || gamesResponse || [];
      const futureGames = allGames.filter((game: any) => {
        const gameTime = new Date(game.commence_time);
        return gameTime >= startOfDay;
      });

      // Sort by date and take first 10
      games = futureGames.sort((a: any, b: any) => {
        return new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime();
      }).slice(0, 10);

      fallbackUsed = true;
    }

    console.log(`✓ Found ${games.length} games for ${league}${fallbackUsed ? ' (upcoming)' : ` on ${date}`}`);

    // Format response
    const formattedGames = games.map((game: any) => ({
      eventId: game.id,
      sport: sport,
      sportTitle: game.sport_title || sport,
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      commenceTime: game.commence_time,
      status: game.completed ? 'completed' : 'scheduled',
      scores: game.scores ? {
        home: game.scores[0]?.score,
        away: game.scores[1]?.score
      } : undefined
    }));

    res.json({
      sport,
      league,
      date,
      mcp: mcp || 'odds-api',
      games: formattedGames,
      executionTimeMs: executionTime,
      fallbackUsed: fallbackUsed,
      message: fallbackUsed ? `No games on ${date}. Showing next upcoming games.` : undefined
    });

  } catch (error: any) {
    console.error('Games error:', error);
    res.status(500).json({
      error: 'Failed to fetch games',
      message: error.message
    });
  }
});

/**
 * GET /api/games
 * Legacy endpoint - list all games with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { sport, date } = req.query;

    console.log(`🎮 Fetching games - Sport: ${sport}, Date: ${date}`);

    // For now, return empty array - this is legacy endpoint
    res.json({
      games: [],
      message: 'Please use POST /api/games with league and date'
    });

  } catch (error: any) {
    console.error('Games error:', error);
    res.status(500).json({
      error: 'Failed to fetch games',
      message: error.message
    });
  }
});

export default router;
