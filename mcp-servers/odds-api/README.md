# Sports Edge MCP Server

MCP server for collecting sports betting data from The Odds API.

## Features

### Core Tools (4)
- **get_sports**: List all available sports (FREE)
- **get_odds**: Get current betting odds for a sport (1 credit per region/market)
- **get_upcoming_games**: Get scheduled games without detailed odds
- **search_games_by_team**: Find games by team name

### Live & Results Tools (1)
- **get_scores**: Get live scores and completed games (1-2 credits)

### Event Tools (4)
- **get_events**: List events without odds data (FREE)
- **get_event_odds**: Get odds for a specific event (varies)
- **get_event_markets**: See available markets per bookmaker (1 credit)
- **get_participants**: Get list of teams/players for a sport (1 credit)

**Total: 9 tools covering all major The Odds API v4 endpoints**

## Setup

1. Install dependencies:
```bash
cd mcp-server
npm install
```

2. Configure API key:
```bash
cp .env.example .env
# Edit .env and add your The Odds API key
```

3. Build the server:
```bash
npm run build
```

4. Test locally:
```bash
npm start
```

## Claude Configuration

Add to your Claude settings (`~/.claude/config.json` or project settings):

```json
{
  "mcpServers": {
    "sports-edge": {
      "command": "node",
      "args": ["/Users/i060663/git/com/sports-edge/mcp-server/dist/index.js"],
      "env": {
        "ODDS_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Usage Examples

### Basic Queries
```
get_sports - See all available sports (FREE)
get_events with sport_key="basketball_nba" - List upcoming NBA events (FREE)
get_participants with sport_key="basketball_nba" - Get all NBA teams (1 credit)
```

### Odds & Betting
```
get_odds with sport_key="basketball_nba" - Current NBA betting odds (1 credit)
get_event_odds with event_id="abc123" - Odds for specific game (varies)
get_event_markets with event_id="abc123" - See what markets are available (1 credit)
```

### Scores & Results
```
get_scores with sport_key="basketball_nba" - Live & recent scores (1 credit)
get_scores with sport_key="basketball_nba", days_from=2 - Include last 2 days (2 credits)
```

### Search & Filter
```
search_games_by_team with sport_key="basketball_nba", team_name="Lakers"
get_events with commence_time_from="2024-12-25T00:00:00Z" - Games from specific date
```

## API Limits

Free tier: 500 requests/month (~16 requests/day)

The server automatically tracks remaining requests in the response.
