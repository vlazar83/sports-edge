-- ============================================================================
-- Sports Edge - PostgreSQL Database Schema
-- Version: 1.0
-- Purpose: Store sports data, betting odds, and MCP interactions for analytics
-- ============================================================================

-- Enable UUID extension for request tracking
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SPORTS & PARTICIPANTS
-- ============================================================================

CREATE TABLE sports (
    id SERIAL PRIMARY KEY,
    sport_key VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    group_name VARCHAR(100),
    description TEXT,
    active BOOLEAN DEFAULT true,
    has_outrights BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sports_key ON sports(sport_key);
CREATE INDEX idx_sports_active ON sports(active);

COMMENT ON TABLE sports IS 'Available sports from The Odds API';
COMMENT ON COLUMN sports.sport_key IS 'Unique identifier from API (e.g., tennis_atp_us_open, basketball_nba)';

-- Participants (teams or individual players)
CREATE TABLE participants (
    id SERIAL PRIMARY KEY,
    sport_id INTEGER REFERENCES sports(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) NOT NULL, -- Lowercase, trimmed for searching
    participant_type VARCHAR(50) DEFAULT 'team', -- 'team', 'player'
    external_id VARCHAR(255), -- ID from The Odds API if available
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sport_id, normalized_name)
);

CREATE INDEX idx_participants_sport ON participants(sport_id);
CREATE INDEX idx_participants_normalized ON participants(normalized_name);
CREATE INDEX idx_participants_external ON participants(external_id);

COMMENT ON TABLE participants IS 'Teams and individual players across all sports';
COMMENT ON COLUMN participants.normalized_name IS 'Lowercase name for case-insensitive searching';

-- ============================================================================
-- GAMES / EVENTS
-- ============================================================================

CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(255) UNIQUE NOT NULL, -- The Odds API event ID
    sport_id INTEGER REFERENCES sports(id) ON DELETE CASCADE,
    home_participant_id INTEGER REFERENCES participants(id),
    away_participant_id INTEGER REFERENCES participants(id),
    commence_time TIMESTAMP NOT NULL,
    completed BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'live', 'completed', 'cancelled'
    home_score INTEGER,
    away_score INTEGER,
    last_update TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_games_event_id ON games(event_id);
CREATE INDEX idx_games_sport ON games(sport_id);
CREATE INDEX idx_games_commence ON games(commence_time);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_participants ON games(home_participant_id, away_participant_id);
CREATE INDEX idx_games_sport_commence ON games(sport_id, commence_time DESC);

COMMENT ON TABLE games IS 'Scheduled and completed games/matches';
COMMENT ON COLUMN games.event_id IS 'Unique event ID from The Odds API';

-- ============================================================================
-- BOOKMAKERS & ODDS
-- ============================================================================

CREATE TABLE bookmakers (
    id SERIAL PRIMARY KEY,
    bookmaker_key VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    region VARCHAR(10), -- 'us', 'uk', 'eu', 'au'
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bookmakers_key ON bookmakers(bookmaker_key);
CREATE INDEX idx_bookmakers_region ON bookmakers(region);

COMMENT ON TABLE bookmakers IS 'Betting bookmakers/sportsbooks';

-- Odds snapshots (time-series data)
CREATE TABLE odds_snapshots (
    id BIGSERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    bookmaker_id INTEGER REFERENCES bookmakers(id),
    market_type VARCHAR(50) NOT NULL, -- 'h2h', 'spreads', 'totals', 'outrights'
    snapshot_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_odds_game ON odds_snapshots(game_id);
CREATE INDEX idx_odds_bookmaker ON odds_snapshots(bookmaker_id);
CREATE INDEX idx_odds_market ON odds_snapshots(market_type);
CREATE INDEX idx_odds_time ON odds_snapshots(snapshot_time);
CREATE INDEX idx_odds_game_time ON odds_snapshots(game_id, snapshot_time DESC);

COMMENT ON TABLE odds_snapshots IS 'Time-series snapshots of odds data';
COMMENT ON COLUMN odds_snapshots.market_type IS 'h2h=moneyline, spreads=point spread, totals=over/under';

-- Individual odds outcomes
CREATE TABLE odds_outcomes (
    id BIGSERIAL PRIMARY KEY,
    snapshot_id BIGINT REFERENCES odds_snapshots(id) ON DELETE CASCADE,
    outcome_name VARCHAR(255) NOT NULL, -- Team name or 'Over'/'Under'
    price DECIMAL(10, 2) NOT NULL, -- Decimal odds (e.g., 1.95, 2.50)
    point DECIMAL(10, 2), -- Spread or total line (e.g., -3.5, 45.5)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_outcomes_snapshot ON odds_outcomes(snapshot_id);

COMMENT ON TABLE odds_outcomes IS 'Individual betting outcomes (team odds, over/under)';
COMMENT ON COLUMN odds_outcomes.price IS 'Decimal odds format';
COMMENT ON COLUMN odds_outcomes.point IS 'Point spread or total line (null for moneyline)';

-- ============================================================================
-- MCP AUDIT TRAIL (Critical for ML Training)
-- ============================================================================

CREATE TABLE mcp_requests (
    id BIGSERIAL PRIMARY KEY,
    request_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    tool_name VARCHAR(100) NOT NULL, -- 'get_sports', 'get_odds', 'search_games_by_team', etc.
    input_parameters JSONB NOT NULL, -- Full input args as JSON
    user_query TEXT, -- Original natural language query (if applicable)
    parsed_intent JSONB, -- Extracted intent: {sport, teams, date, queryType, etc.}
    api_endpoint VARCHAR(255), -- The Odds API endpoint called
    request_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(100), -- Optional: track which user made request
    session_id VARCHAR(100), -- Optional: group related requests
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mcp_requests_tool ON mcp_requests(tool_name);
CREATE INDEX idx_mcp_requests_time ON mcp_requests(request_timestamp);
CREATE INDEX idx_mcp_requests_session ON mcp_requests(session_id);
CREATE INDEX idx_mcp_requests_intent ON mcp_requests USING GIN (parsed_intent);

COMMENT ON TABLE mcp_requests IS 'Complete audit trail of all MCP tool calls';
COMMENT ON COLUMN mcp_requests.parsed_intent IS 'Structured intent from natural language query';

CREATE TABLE mcp_responses (
    id BIGSERIAL PRIMARY KEY,
    request_id UUID REFERENCES mcp_requests(request_id) ON DELETE CASCADE,
    response_data JSONB NOT NULL, -- Full API response as JSON
    response_status INTEGER NOT NULL, -- HTTP status code
    error_message TEXT, -- Error details if failed
    execution_time_ms INTEGER, -- How long the request took
    remaining_api_credits INTEGER, -- Track API quota usage
    used_api_credits INTEGER,
    response_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mcp_responses_request ON mcp_responses(request_id);
CREATE INDEX idx_mcp_responses_status ON mcp_responses(response_status);
CREATE INDEX idx_mcp_responses_time ON mcp_responses(response_timestamp);
CREATE INDEX idx_mcp_responses_data ON mcp_responses USING GIN (response_data);

COMMENT ON TABLE mcp_responses IS 'Complete API responses stored as JSONB for ML training';
COMMENT ON COLUMN mcp_responses.response_data IS 'Raw API response preserved for analysis';

-- ============================================================================
-- ANALYTICS & ML SUPPORT
-- ============================================================================

-- Store parsed and denormalized data for fast analytics
CREATE TABLE analytics_game_stats (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE UNIQUE,
    home_win_probability DECIMAL(5, 4), -- 0.0000 to 1.0000
    away_win_probability DECIMAL(5, 4),
    draw_probability DECIMAL(5, 4),
    total_bookmakers INTEGER,
    avg_home_odds DECIMAL(10, 2),
    avg_away_odds DECIMAL(10, 2),
    avg_draw_odds DECIMAL(10, 2),
    best_home_odds DECIMAL(10, 2),
    best_away_odds DECIMAL(10, 2),
    best_home_bookmaker VARCHAR(100),
    best_away_bookmaker VARCHAR(100),
    odds_movement_direction VARCHAR(20), -- 'home_favorite', 'away_favorite', 'neutral'
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_game ON analytics_game_stats(game_id);

COMMENT ON TABLE analytics_game_stats IS 'Pre-calculated analytics for quick querying';

-- Query history for improving NLP parsing
CREATE TABLE query_history (
    id BIGSERIAL PRIMARY KEY,
    raw_query TEXT NOT NULL,
    parsed_successfully BOOLEAN,
    parsed_sport VARCHAR(100),
    parsed_teams TEXT[], -- Array of team names extracted
    parsed_date_from TIMESTAMP,
    parsed_date_to TIMESTAMP,
    query_type VARCHAR(50), -- 'specific_match', 'team_games', 'sport_overview', etc.
    confidence_score DECIMAL(3, 2), -- 0.00 to 1.00
    correction_feedback TEXT, -- If user corrected the parsing
    mcp_request_id UUID REFERENCES mcp_requests(request_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_query_history_sport ON query_history(parsed_sport);
CREATE INDEX idx_query_history_teams ON query_history USING GIN (parsed_teams);
CREATE INDEX idx_query_history_time ON query_history(created_at);
CREATE INDEX idx_query_history_success ON query_history(parsed_successfully);

COMMENT ON TABLE query_history IS 'Natural language query history for improving parser';

-- ============================================================================
-- MATERIALIZED VIEW FOR PERFORMANCE
-- ============================================================================

CREATE MATERIALIZED VIEW latest_game_odds AS
SELECT DISTINCT ON (g.id, os.bookmaker_id, os.market_type)
    g.id as game_id,
    g.event_id,
    g.sport_id,
    s.sport_key,
    s.title as sport_title,
    hp.name as home_team,
    ap.name as away_team,
    g.commence_time,
    g.status,
    b.bookmaker_key,
    b.title as bookmaker_title,
    os.market_type,
    os.snapshot_time,
    json_agg(json_build_object(
        'outcome_name', oo.outcome_name,
        'price', oo.price,
        'point', oo.point
    )) as outcomes
FROM games g
JOIN sports s ON g.sport_id = s.id
JOIN participants hp ON g.home_participant_id = hp.id
JOIN participants ap ON g.away_participant_id = ap.id
JOIN odds_snapshots os ON g.id = os.game_id
JOIN bookmakers b ON os.bookmaker_id = b.id
JOIN odds_outcomes oo ON os.id = oo.snapshot_id
WHERE g.commence_time > NOW() - INTERVAL '7 days'
GROUP BY g.id, g.event_id, g.sport_id, s.sport_key, s.title,
         hp.name, ap.name, g.commence_time, g.status, b.bookmaker_key,
         b.title, os.market_type, os.snapshot_time, os.bookmaker_id
ORDER BY g.id, os.bookmaker_id, os.market_type, os.snapshot_time DESC;

CREATE INDEX idx_latest_odds_game ON latest_game_odds(game_id);
CREATE INDEX idx_latest_odds_sport ON latest_game_odds(sport_key);
CREATE INDEX idx_latest_odds_teams ON latest_game_odds(home_team, away_team);
CREATE INDEX idx_latest_odds_commence ON latest_game_odds(commence_time);

COMMENT ON MATERIALIZED VIEW latest_game_odds IS 'Fast access to latest odds for recent games';

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_sports_updated_at BEFORE UPDATE ON sports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- USEFUL VIEWS
-- ============================================================================

-- View for recent games with basic info
CREATE VIEW recent_games AS
SELECT
    g.id,
    g.event_id,
    s.sport_key,
    s.title as sport_title,
    hp.name as home_team,
    ap.name as away_team,
    g.commence_time,
    g.status,
    g.home_score,
    g.away_score,
    COUNT(DISTINCT os.bookmaker_id) as bookmaker_count
FROM games g
JOIN sports s ON g.sport_id = s.id
JOIN participants hp ON g.home_participant_id = hp.id
JOIN participants ap ON g.away_participant_id = ap.id
LEFT JOIN odds_snapshots os ON g.id = os.game_id
WHERE g.commence_time >= NOW() - INTERVAL '7 days'
GROUP BY g.id, s.sport_key, s.title, hp.name, ap.name
ORDER BY g.commence_time DESC;

COMMENT ON VIEW recent_games IS 'Quick view of recent and upcoming games';

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert sample sport
INSERT INTO sports (sport_key, title, group_name, description, active, has_outrights)
VALUES
    ('tennis_atp_us_open', 'ATP US Open', 'Tennis', 'Men''s Singles', true, false),
    ('basketball_nba', 'NBA', 'Basketball', 'US Basketball', true, false),
    ('soccer_epl', 'EPL', 'Soccer', 'English Premier League', true, false)
ON CONFLICT (sport_key) DO NOTHING;

-- ============================================================================
-- MAINTENANCE COMMANDS
-- ============================================================================

-- Refresh materialized view (run periodically)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY latest_game_odds;

-- Vacuum and analyze (run weekly)
-- VACUUM ANALYZE;

-- Check database size
-- SELECT pg_size_pretty(pg_database_size('sports_edge'));

-- Check table sizes
-- SELECT
--     schemaname,
--     tablename,
--     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
