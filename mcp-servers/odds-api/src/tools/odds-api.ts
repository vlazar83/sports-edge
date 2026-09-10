/**
 * The Odds API integration
 * Documentation: https://the-odds-api.com/liveapi/guides/v4/
 */

import axios, { AxiosInstance } from 'axios';
import type {
  Sport,
  Game,
  GameWithScores,
  Event,
  EventMarketsResponse,
  Participant,
  ParticipantsResponse,
  OddsResponse,
  SportsList,
  OddsApiConfig,
  Region,
  Market_Type,
  OddsFormat
} from '../types/sports.js';

export class OddsApiClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(config: OddsApiConfig) {
    this.apiKey = config.apiKey;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Get list of available sports
   */
  async getSports(): Promise<SportsList> {
    try {
      const response = await this.client.get<Sport[]>('/sports', {
        params: { apiKey: this.apiKey }
      });

      return {
        sports: response.data,
        remaining_requests: parseInt(response.headers['x-requests-remaining'] || '0')
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get odds for a specific sport
   *
   * @param sportKey - Sport identifier (e.g., 'soccer_epl', 'basketball_nba')
   * @param regions - Bookmaker regions (default: 'us')
   * @param markets - Market types (default: 'h2h')
   * @param oddsFormat - Odds format (default: 'decimal')
   * @param dateFormat - Date format (default: 'iso')
   */
  async getOdds(
    sportKey: string,
    regions: Region[] = ['us'],
    markets: Market_Type[] = ['h2h'],
    oddsFormat: OddsFormat = 'decimal',
    dateFormat: 'iso' | 'unix' = 'iso'
  ): Promise<OddsResponse> {
    try {
      const response = await this.client.get<Game[]>(`/sports/${sportKey}/odds`, {
        params: {
          apiKey: this.apiKey,
          regions: regions.join(','),
          markets: markets.join(','),
          oddsFormat,
          dateFormat
        }
      });

      const remainingRequests = parseInt(response.headers['x-requests-remaining'] || '0');
      const usedRequests = parseInt(response.headers['x-requests-used'] || '0');

      return {
        games: response.data,
        remaining_requests: remainingRequests,
        used_requests: usedRequests
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get upcoming games for a sport (without odds)
   */
  async getUpcomingGames(sportKey: string, daysFrom: number = 3): Promise<Game[]> {
    try {
      const response = await this.client.get<Game[]>(`/sports/${sportKey}/odds`, {
        params: {
          apiKey: this.apiKey,
          regions: 'us',
          markets: 'h2h',
          oddsFormat: 'decimal',
          dateFormat: 'iso',
          daysFrom
        }
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get historical odds (requires paid tier)
   */
  async getHistoricalOdds(
    sportKey: string,
    date: string,
    regions: Region[] = ['us'],
    markets: Market_Type[] = ['h2h']
  ): Promise<OddsResponse> {
    try {
      const response = await this.client.get<Game[]>(`/sports/${sportKey}/odds-history`, {
        params: {
          apiKey: this.apiKey,
          date,
          regions: regions.join(','),
          markets: markets.join(','),
          oddsFormat: 'decimal'
        }
      });

      return {
        games: response.data,
        remaining_requests: parseInt(response.headers['x-requests-remaining'] || '0'),
        used_requests: parseInt(response.headers['x-requests-used'] || '0')
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Search for games by team name
   */
  async searchGamesByTeam(sportKey: string, teamName: string): Promise<Game[]> {
    const games = await this.getUpcomingGames(sportKey);
    const lowerTeamName = teamName.toLowerCase();

    return games.filter(game =>
      game.home_team.toLowerCase().includes(lowerTeamName) ||
      game.away_team.toLowerCase().includes(lowerTeamName)
    );
  }

  /**
   * Get live and completed scores
   * Cost: 2 credits with daysFrom parameter, 1 credit without
   */
  async getScores(
    sportKey: string,
    daysFrom?: number,
    dateFormat: 'iso' | 'unix' = 'iso'
  ): Promise<GameWithScores[]> {
    try {
      const params: any = {
        apiKey: this.apiKey,
        dateFormat
      };

      if (daysFrom !== undefined) {
        params.daysFrom = daysFrom;
      }

      const response = await this.client.get<GameWithScores[]>(`/sports/${sportKey}/scores`, {
        params
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get events list (FREE - does not count against quota)
   */
  async getEvents(
    sportKey: string,
    commenceTimeFrom?: string,
    commenceTimeTo?: string,
    dateFormat: 'iso' | 'unix' = 'iso'
  ): Promise<Event[]> {
    try {
      const params: any = {
        apiKey: this.apiKey,
        dateFormat
      };

      if (commenceTimeFrom) {
        params.commenceTimeFrom = commenceTimeFrom;
      }

      if (commenceTimeTo) {
        params.commenceTimeTo = commenceTimeTo;
      }

      const response = await this.client.get<Event[]>(`/sports/${sportKey}/events`, {
        params
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get odds for a single event
   * Cost: based on unique markets × regions
   */
  async getEventOdds(
    sportKey: string,
    eventId: string,
    regions: Region[] = ['us'],
    markets: Market_Type[] = ['h2h'],
    oddsFormat: OddsFormat = 'decimal'
  ): Promise<Game> {
    try {
      const response = await this.client.get<Game>(
        `/sports/${sportKey}/events/${eventId}/odds`,
        {
          params: {
            apiKey: this.apiKey,
            regions: regions.join(','),
            markets: markets.join(','),
            oddsFormat,
            dateFormat: 'iso'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get available markets for a specific event
   * Cost: 1 credit
   */
  async getEventMarkets(
    sportKey: string,
    eventId: string,
    regions: Region[] = ['us']
  ): Promise<EventMarketsResponse> {
    try {
      const response = await this.client.get<EventMarketsResponse>(
        `/sports/${sportKey}/events/${eventId}/markets`,
        {
          params: {
            apiKey: this.apiKey,
            regions: regions.join(','),
            dateFormat: 'iso'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get list of participants (teams/players) for a sport
   * Cost: 1 credit
   */
  async getParticipants(sportKey: string): Promise<ParticipantsResponse> {
    try {
      const response = await this.client.get<Participant[]>(
        `/sports/${sportKey}/participants`,
        {
          params: {
            apiKey: this.apiKey
          }
        }
      );

      return {
        sport_key: sportKey,
        participants: response.data
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;

      if (status === 401) {
        return new Error('Invalid API key. Please check your credentials.');
      } else if (status === 429) {
        return new Error('Rate limit exceeded. Free tier allows 500 requests/month.');
      } else if (status === 422) {
        return new Error(`Invalid parameters: ${message}`);
      }

      return new Error(`The Odds API error: ${message}`);
    }

    return error instanceof Error ? error : new Error('Unknown error occurred');
  }
}
