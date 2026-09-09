# Sports Edge - Sports Betting Analytics Agent

A multi-agent system for collecting sports data, betting odds, and generating ML-based predictions.

## Project Status

✅ **Phase 1: Foundation - MCP Server Complete**

## Structure

```
sports-edge/
├── mcp-server/              # TypeScript MCP Server (COMPLETED)
│   ├── src/
│   │   ├── tools/
│   │   │   └── odds-api.ts  # The Odds API integration
│   │   ├── types/
│   │   │   └── sports.ts    # TypeScript interfaces
│   │   └── index.ts         # MCP server entry point
│   ├── .env                 # API keys (not in git)
│   └── README.md
│
├── analytics/               # Python Analytics (TODO)
├── database/                # PostgreSQL schema (TODO)
└── docs/                    # Documentation
```

## Quick Start

### 1. MCP Server Setup (Completed)

The MCP server is built and ready to use. Configuration is in `.claude/mcp-settings.json`.

**Available tools:**
- `get_sports` - List all available sports
- `get_odds` - Get current betting odds for a sport
- `get_upcoming_games` - Get scheduled games
- `search_games_by_team` - Find games by team name

**API limits:** Free tier = 500 requests/month (~16 requests/day)

### 2. Test the MCP Server

```bash
# The server is ready to use through Claude!
# Just restart Claude and the tools will be available
```

### 3. Next Steps

1. Test the MCP server tools with some queries
2. Set up PostgreSQL database
3. Build Python analytics scripts
4. Create data collection workflows

## Configuration

- **API Key**: The Odds API (free tier)
- **MCP Settings**: `.claude/mcp-settings.json`
- **Environment**: `mcp-server/.env`

## Documentation

- Architecture: [sports-betting-agent-architecture.md](sports-betting-agent-architecture.md)
- Project context: [CLAUDE.md](CLAUDE.md)
- MCP Server: [mcp-server/README.md](mcp-server/README.md)

## Owner

Viktor Lazar (@vlazar83)  
https://github.com/vlazar83/sports-edge
