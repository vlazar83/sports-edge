import db from '../config/database';
import { MCPGame } from '../types';

/**
 * Odds Storage Service
 * Normalizes MCP responses and stores them in relational tables
 */
export class OddsStorageService {
  /**
   * Store MCP response data in normalized tables
   */
  async storeNormalizedData(response: any, toolName: string): Promise<void> {
    const games = response.games || (Array.isArray(response) ? response : [response]);

    for (const game of games) {
      if (!game || !game.id) continue;

      try {
        // 1. Ensure sport exists
        const sportId = await this.ensureSport(game.sport_key, game.sport_title);

        // 2. Ensure participants exist
        const homeId = await this.ensureParticipant(sportId, game.home_team);
        const awayId = await this.ensureParticipant(sportId, game.away_team);

        // 3. Upsert game
        const gameId = await this.upsertGame({
          event_id: game.id,
          sport_id: sportId,
          home_participant_id: homeId,
          away_participant_id: awayId,
          commence_time: game.commence_time,
          status: game.completed ? 'completed' : 'scheduled',
          home_score: game.scores?.[0]?.score,
          away_score: game.scores?.[1]?.score
        });

        // 4. Store odds snapshots (if available)
        if (game.bookmakers && Array.isArray(game.bookmakers)) {
          await this.storeOddsSnapshot(gameId, game.bookmakers);
        }

      } catch (error) {
        console.error(`Error storing game ${game.id}:`, error);
        // Continue with next game
      }
    }
  }

  /**
   * Ensure sport exists, return sport_id
   */
  private async ensureSport(sportKey: string, sportTitle: string): Promise<number> {
    const result = await db.query(`
      INSERT INTO sports (sport_key, title)
      VALUES ($1, $2)
      ON CONFLICT (sport_key)
      DO UPDATE SET title = EXCLUDED.title, updated_at = NOW()
      RETURNING id
    `, [sportKey, sportTitle]);

    return result.rows[0].id;
  }

  /**
   * Ensure participant exists, return participant_id
   */
  private async ensureParticipant(sportId: number, name: string): Promise<number> {
    const normalized = name.toLowerCase().trim();

    const result = await db.query(`
      INSERT INTO participants (sport_id, name, normalized_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (sport_id, normalized_name)
      DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
      RETURNING id
    `, [sportId, name, normalized]);

    return result.rows[0].id;
  }

  /**
   * Upsert game record
   */
  private async upsertGame(game: any): Promise<number> {
    const result = await db.query(`
      INSERT INTO games (
        event_id, sport_id, home_participant_id, away_participant_id,
        commence_time, status, home_score, away_score, last_update
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (event_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        home_score = EXCLUDED.home_score,
        away_score = EXCLUDED.away_score,
        last_update = NOW(),
        updated_at = NOW()
      RETURNING id
    `, [
      game.event_id,
      game.sport_id,
      game.home_participant_id,
      game.away_participant_id,
      game.commence_time,
      game.status,
      game.home_score,
      game.away_score
    ]);

    return result.rows[0].id;
  }

  /**
   * Store odds snapshot with bookmakers and outcomes
   */
  private async storeOddsSnapshot(gameId: number, bookmakers: any[]): Promise<void> {
    const snapshotTime = new Date();

    for (const bookmaker of bookmakers) {
      // Ensure bookmaker exists
      const bookmakerId = await this.ensureBookmaker(bookmaker.key, bookmaker.title);

      // Store each market
      for (const market of bookmaker.markets) {
        // Create snapshot
        const snapshotResult = await db.query(`
          INSERT INTO odds_snapshots (game_id, bookmaker_id, market_type, snapshot_time)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [gameId, bookmakerId, market.key, snapshotTime]);

        const snapshotId = snapshotResult.rows[0].id;

        // Store outcomes
        for (const outcome of market.outcomes) {
          await db.query(`
            INSERT INTO odds_outcomes (snapshot_id, outcome_name, price, point)
            VALUES ($1, $2, $3, $4)
          `, [snapshotId, outcome.name, outcome.price, outcome.point]);
        }
      }
    }
  }

  /**
   * Ensure bookmaker exists
   */
  private async ensureBookmaker(key: string, title: string): Promise<number> {
    const result = await db.query(`
      INSERT INTO bookmakers (bookmaker_key, title)
      VALUES ($1, $2)
      ON CONFLICT (bookmaker_key)
      DO UPDATE SET title = EXCLUDED.title
      RETURNING id
    `, [key, title]);

    return result.rows[0].id;
  }

  /**
   * Get game with latest odds
   */
  async getGameWithOdds(gameId: number): Promise<any> {
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
      return null;
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
    return game;
  }
}

export default new OddsStorageService();
