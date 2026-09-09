# Sports Edge - Sports Betting Analytics Agent

A multi-agent system for collecting sports data, betting odds, and generating analytics for learning and experimentation.

## 🚀 Features

- **Natural Language Queries**: Ask questions like "Shelton vs Alcaraz" or "NBA games today"
- **Multi-Sport Support**: Tennis, Basketball, Soccer, NFL, Baseball, Hockey
- **Real-time Odds**: Live betting odds from multiple bookmakers
- **Complete Audit Trail**: All API interactions stored for ML training
- **Web UI + CLI**: Multiple interfaces for querying data
- **Database Storage**: PostgreSQL with normalized schema + raw JSON for analytics

## 📋 What's Been Built

### ✅ Phase 1: Complete Foundation

1. **PostgreSQL Database** (10 tables)
   - Sports, games, participants, bookmakers
   - Odds snapshots (time-series data)
   - MCP request/response audit trail
   - Query history for NLP improvement

2. **Backend API** (Node.js + Express + TypeScript)
   - Natural language query parser (5-stage pipeline)
   - MCP orchestrator (routes to correct tools)
   - Odds storage service (normalizes API data)
   - REST endpoints: `/api/query`, `/api/games`

3. **MCP Server Integration**
   - Calls existing TypeScript MCP server
   - 9 tools: get_sports, get_odds, search_games_by_team, etc.
   - Automatic request/response tracking

4. **Web UI** (HTML + TypeScript)
   - Beautiful gradient interface
   - Real-time search
   - Displays games with odds from multiple bookmakers

5. **CLI Tool** (TypeScript + Commander)
   - `sports-query query "your query"`
   - `sports-query games --sport tennis`
   - Color-coded output with Chalk

## 🎯 Quick Start

### Prerequisites
- Docker (for PostgreSQL)
- Node.js 18+
- The Odds API key (free tier: 500 requests/month)

### 1. Start Database
```bash
docker-compose up -d
# Database will be available at localhost:5432
```

### 2. Start Backend API
```bash
cd backend
npm install
npm run build
node dist/server.js

# Backend will run at http://localhost:3000
```

### 3. Use Web UI
```bash
# Open in browser
open ui/index.html
# Or serve with any HTTP server
python3 -m http.server 8080 --directory ui
```

### 4. Use CLI Tool
```bash
cd cli
npm install
npm run build

# Query examples
node dist/index.js query "Shelton vs Alcaraz"
node dist/index.js query "NBA games today"
node dist/index.js games --sport tennis
node dist/index.js health
```

## 📊 Example Queries

**Natural Language Queries:**
- "Shelton vs Alcaraz" → Finds specific tennis match
- "NBA games today" → Shows all NBA games
- "show me Lakers games" → Filters by team
- "odds for Lakers vs Celtics" → Shows betting odds
- "upcoming tennis matches" → Lists scheduled matches

## 🗄️ Database Schema

**Core Tables:**
- `sports` - Available sports from API
- `participants` - Teams/players with normalized names
- `games` - All games/matches
- `bookmakers` - Betting bookmakers
- `odds_snapshots` - Time-series odds data
- `odds_outcomes` - Individual betting outcomes

**Audit Trail:**
- `mcp_requests` - Every MCP tool call with intent
- `mcp_responses` - Complete API responses as JSONB
- `query_history` - Natural language queries for ML training

## 🧠 Query Parser (5-Stage Pipeline)

1. **Sport Detection**: Keywords, team names, patterns
2. **Entity Extraction**: Team/player names via regex + DB lookup
3. **Temporal Parsing**: "today", "tomorrow", "this week"
4. **Query Classification**: specific_match, team_games, sport_overview, etc.
5. **Confidence Scoring**: 0.0 to 1.0 based on detected features

## 📈 Data Flow

```
User Query: "Shelton vs Alcaraz"
    ↓
[Web UI / CLI] → POST /api/query
    ↓
[Query Parser] → {sport: tennis, teams: [Shelton, Alcaraz], type: specific_match}
    ↓
[MCP Orchestrator] → Calls search_games_by_team tool
    ↓
[Save Request] → mcp_requests table (UUID, tool, params, intent)
    ↓
[MCP Server] → TypeScript MCP server → The Odds API
    ↓
[Save Response] → mcp_responses table (complete JSON)
    ↓
[Odds Storage] → Normalize into games, odds_snapshots, outcomes
    ↓
[Response] → Filtered results → User
```

## 🔌 API Endpoints

**Backend API (http://localhost:3000):**
- `POST /api/query` - Natural language query
- `GET /api/games` - List games (filters: sport, status, limit, offset)
- `GET /api/games/:id` - Get specific game with odds
- `GET /api/sports` - List available sports
- `GET /health` - Health check

## 🧪 Testing

### Test Backend
```bash
# Health check
curl http://localhost:3000/health

# Natural language query
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Shelton vs Alcaraz"}'

# List games
curl http://localhost:3000/api/games?sport=tennis&limit=5
```

### Verify Database
```bash
# Check stored data
docker exec sports-edge-db psql -U sports_user -d sports_edge -c "SELECT COUNT(*) FROM mcp_requests;"
docker exec sports-edge-db psql -U sports_user -d sports_edge -c "SELECT COUNT(*) FROM games;"
docker exec sports-edge-db psql -U sports_user -d sports_edge -c "SELECT COUNT(*) FROM odds_snapshots;"

# View recent queries
docker exec sports-edge-db psql -U sports_user -d sports_edge -c "SELECT raw_query, parsed_sport, query_type FROM query_history ORDER BY created_at DESC LIMIT 5;"
```

## 📦 Project Structure

```
sports-edge/
├── mcp-server/           # TypeScript MCP Server (9 tools)
├── backend/              # Express.js API (query parser, orchestrator)
├── ui/                   # Web interface (HTML + TypeScript)
├── cli/                  # CLI tool (Commander + Chalk)
├── database/             # PostgreSQL schema + migrations
├── docker-compose.yml    # PostgreSQL container
└── .env                  # Configuration
```

## 🎓 Learning Goals Achieved

✅ Natural language query understanding  
✅ MCP server integration and request tracking  
✅ Database design for time-series + ML training  
✅ Multi-interface (Web UI + CLI)  
✅ Complete audit trail for analytics  
✅ Data normalization from nested JSON  

## 🚧 Future Enhancements (Not Built Yet)

- **Phase 2**: Python analytics engine
- **Phase 3**: ML models (ELO, Random Forest, Gradient Boosting)
- **Phase 4**: Prediction system with backtesting
- **Phase 5**: Automated daily analysis workflows

## 💾 Data Storage

**Hybrid Storage Strategy:**
- **Raw JSON** in `mcp_responses.response_data` (JSONB) - Preserves complete API responses for ML
- **Normalized Tables** - Fast queries for production
- **Best of Both Worlds** - Flexibility + Performance

## 🔑 Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=sports_user
DB_PASSWORD=sports_password
DB_NAME=sports_edge

# API
PORT=3000
NODE_ENV=development

# The Odds API
ODDS_API_KEY=your_key_here  # Free tier: 500 requests/month
```

## 📊 Current Status

**API Usage (Free Tier):**
- The Odds API: 500 requests/month
- Cost per query: 1-2 requests depending on tool

**Database:**
- 10 tables created
- Ready for millions of records
- Indexes optimized for common queries

**Features Working:**
- ✅ Natural language queries
- ✅ Multi-bookmaker odds
- ✅ Database storage
- ✅ Web UI
- ✅ CLI tool
- ✅ Complete audit trail

## 🤝 Contributing

This is a learning and experimentation project. Feel free to:
- Add more sports
- Improve query parsing
- Build ML models
- Add visualizations

## 📝 License

ISC

## 🙏 Acknowledgments

- The Odds API for sports data
- MCP (Model Context Protocol) for agent integration
- PostgreSQL for reliable data storage
