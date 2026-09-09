import { Router, Request, Response } from 'express';
import db from '../config/database';

const router = Router();

/**
 * GET /api/games
 * List games with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { sport, status, limit = '20', offset = '0' } = req.query;

    let query = `
      SELECT
        g.id, g.event_id, g.commence_time, g.status,
        s.sport_key, s.title as sport_title,
        hp.name as home_team, ap.name as away_team,
        g.home_score, g.away_score,
        COUNT(DISTINCT os.bookmaker_id) as bookmaker_count
      FROM games g
      JOIN sports s ON g.sport_id = s.id
      JOIN participants hp ON g.home_participant_id = hp.id
      JOIN participants ap ON g.away_participant_id = ap.id
      LEFT JOIN odds_snapshots os ON g.id = os.game_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (sport) {
      query += ` AND s.sport_key LIKE $${paramIndex}`;
      params.push(`%${sport}%`);
      paramIndex++;
    }

    if (status) {
      query += ` AND g.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += `
      GROUP BY g.id, s.sport_key, s.title, hp.name, ap.name
      ORDER BY g.commence_time DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await db.query(query, params);

    res.json({
      games: result.rows,
      count: result.rows.length
    });

  } catch (error: any) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/games/:gameId
 * Get specific game with odds
 */
router.get('/:gameId', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;

    const gameResult = await db.query(`
      SELECT
        g.id, g.event_id, g.commence_time, g.status,
        s.sport_key, s.title as sport_title,
        hp.name as home_team, ap.name as away_team,
        g.home_score, g.away_score
      FROM games g
      JOIN sports s ON g.sport_id = s.id
      JOIN participants hp ON g.home_participant_id = hp.id
      JOIN participants ap ON g.away_participant_id = ap.id
      WHERE g.id = $1
    `, [gameId]);

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = gameResult.rows[0];

    // Get latest odds
    const oddsResult = await db.query(`
      SELECT DISTINCT ON (os.bookmaker_id, os.market_type)
        b.bookmaker_key, b.title as bookmaker_title,
        os.market_type, os.snapshot_time,
        json_agg(json_build_object(
          'outcome_name', oo.outcome_name,
          'price', oo.price,
          'point', oo.point
        )) as outcomes
      FROM odds_snapshots os
      JOIN bookmakers b ON os.bookmaker_id = b.id
      JOIN odds_outcomes oo ON os.id = oo.snapshot_id
      WHERE os.game_id = $1
      GROUP BY b.bookmaker_key, b.title, os.market_type, os.snapshot_time, os.bookmaker_id
      ORDER BY os.bookmaker_id, os.market_type, os.snapshot_time DESC
    `, [gameId]);

    game.odds = oddsResult.rows;

    res.json(game);

  } catch (error: any) {
    console.error('Error fetching game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/sports
 * List all available sports
 */
router.get('/sports', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT id, sport_key, title, group_name, active
      FROM sports
      WHERE active = true
      ORDER BY title
    `);

    res.json({ sports: result.rows });

  } catch (error: any) {
    console.error('Error fetching sports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
