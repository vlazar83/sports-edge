// ============================================================================
// TypeScript Interfaces for Sports Edge Backend
// ============================================================================

// Query Intent
export interface ParsedIntent {
  sport?: string;           // 'tennis', 'basketball', 'soccer'
  sportKey?: string;        // 'tennis_atp_us_open', 'basketball_nba'
  teams: string[];          // ['Shelton', 'Alcaraz']
  dateRange?: {
    from: Date;
    to: Date;
  };
  queryType: QueryType;
  confidence: number;       // 0.0 to 1.0
}

export type QueryType =
  | 'specific_match'        // "Shelton vs Alcaraz"
  | 'team_games'            // "show me Lakers games"
  | 'sport_overview'        // "NBA games today"
  | 'odds_request'          // "odds for Lakers vs Celtics"
  | 'live_scores'           // "live NBA scores"
  | 'upcoming_games';       // "upcoming tennis matches"

// API Request/Response
export interface QueryRequest {
  query: string;
  userId?: string;
  sessionId?: string;
}

export interface QueryResponse {
  intent: ParsedIntent;
  results: GameResult[];
  mcpRequestId: string;
  executionTimeMs: number;
}

export interface GameResult {
  gameId: number;
  eventId: string;
  sport: string;
  sportTitle: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  status: string;
  odds?: OddsData;
  scores?: {
    home: number;
    away: number;
  };
}

export interface OddsData {
  bookmakers: BookmakerOdds[];
  avgHome?: number;
  avgAway?: number;
  bestHome?: { bookmaker: string; odds: number };
  bestAway?: { bookmaker: string; odds: number };
}

export interface BookmakerOdds {
  bookmaker: string;
  title: string;
  markets: MarketOdds[];
}

export interface MarketOdds {
  marketType: string;
  outcomes: OutcomeOdds[];
}

export interface OutcomeOdds {
  name: string;
  price: number;
  point?: number;
}

// MCP Types (from existing MCP server)
export interface MCPGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: MCPBookmaker[];
}

export interface MCPBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: MCPMarket[];
}

export interface MCPMarket {
  key: string;
  last_update: string;
  outcomes: MCPOutcome[];
}

export interface MCPOutcome {
  name: string;
  price: number;
  point?: number;
}

// Database Models
export interface Sport {
  id: number;
  sport_key: string;
  title: string;
  group_name?: string;
  description?: string;
  active: boolean;
}

export interface Participant {
  id: number;
  sport_id: number;
  name: string;
  normalized_name: string;
  participant_type: 'team' | 'player';
}

export interface Game {
  id: number;
  event_id: string;
  sport_id: number;
  home_participant_id: number;
  away_participant_id: number;
  commence_time: Date;
  completed: boolean;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  home_score?: number;
  away_score?: number;
}

export interface MCPRequest {
  id: number;
  request_id: string;
  tool_name: string;
  input_parameters: any;
  user_query?: string;
  parsed_intent?: any;
  request_timestamp: Date;
}

export interface MCPResponse {
  id: number;
  request_id: string;
  response_data: any;
  response_status: number;
  error_message?: string;
  execution_time_ms: number;
  remaining_api_credits?: number;
}
