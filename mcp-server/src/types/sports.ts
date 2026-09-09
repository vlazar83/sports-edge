/**
 * TypeScript types for sports betting data
 */

export interface Sport {
  key: string;
  group: string;
  title: string;
  description: string;
  active: boolean;
  has_outrights: boolean;
}

export interface Bookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: Market[];
}

export interface Market {
  key: string;
  last_update: string;
  outcomes: Outcome[];
}

export interface Outcome {
  name: string;
  price: number;
  point?: number;
}

export interface Game {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: Bookmaker[];
}

export interface OddsResponse {
  games: Game[];
  remaining_requests: number;
  used_requests: number;
}

export interface SportsList {
  sports: Sport[];
  remaining_requests: number;
}

export interface OddsApiConfig {
  apiKey: string;
  baseUrl: string;
}

export interface Score {
  name: string;
  score?: string;
}

export interface GameWithScores extends Game {
  scores?: Score[];
  completed: boolean;
  last_update?: string;
}

export interface Event {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
}

export interface EventMarket {
  bookmaker: string;
  markets: string[];
}

export interface EventMarketsResponse {
  id: string;
  sport_key: string;
  home_team: string;
  away_team: string;
  bookmakers: EventMarket[];
}

export interface Participant {
  id?: string;
  name: string;
}

export interface ParticipantsResponse {
  sport_key: string;
  participants: Participant[];
}

export type Region = 'us' | 'uk' | 'eu' | 'au';
export type Market_Type = 'h2h' | 'spreads' | 'totals' | 'outrights';
export type OddsFormat = 'decimal' | 'american';
