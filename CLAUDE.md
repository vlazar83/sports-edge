# Sports Edge - Sports Betting Analytics Agent

## Project Overview
A multi-agent system for collecting sports data, betting odds, generating statistics, and creating forecasts for learning and experimentation.

**Key Architecture:**
- **Claude Agent (Main)**: Orchestrates analysis & decisions
- **MCP Server (TypeScript)**: Data collection from sports APIs & web scraping
- **Analytics Engine (Python)**: ML models for predictions and forecasting
- **Database**: PostgreSQL (or BigQuery for large-scale)

## Purpose
This is a **learning and experimentation project** to:
- Collect sports data from multiple sources (APIs + web scraping)
- Store historical data (games, odds, stats)
- Build ML models for game predictions
- Generate betting forecasts and analytics
- Learn about sports analytics, MCP servers, and agent orchestration

## Technology Stack

### Data Collection (TypeScript MCP Server)
- **APIs**: The Odds API, API-Football, API-Basketball, API-NFL
- **Scraping**: ESPN, Flashscore, Oddsportal
- **MCP Tools**: get_upcoming_games, get_live_scores, get_betting_odds, get_team_stats, etc.

### Analytics & Forecasting (Python)
- **Libraries**: pandas, numpy, scikit-learn, xgboost, statsmodels
- **Models**: ELO ratings, Random Forest, Gradient Boosting, Logistic Regression
- **Features**: Win rates, form, head-to-head, rest days, injury impact, betting value

### Database
- **Primary**: PostgreSQL
- **Alternative**: Google BigQuery
- **Schema**: games, odds, team_stats, player_stats, predictions

## Current Phase
**Phase 1: Foundation** - Setting up project structure and basic components

## Development Guidelines

### When working on this project:
1. **Start small**: Use free API tiers for learning (The Odds API: 500 req/month, API-Football: 100 req/day)
2. **Incremental approach**: Build foundation → data collection → analytics → forecasting
3. **Cost-conscious**: Prefer free/scraping options initially before paid APIs
4. **Learning focus**: This is for experimentation, not production betting

### Key Principles:
- Clean separation: MCP server for data, Python for analytics
- Data quality: Validate all collected data
- Backtesting: Always test predictions against historical data
- Risk management: Include confidence scores and risk rules

## Project Structure
```
sports-edge/
├── mcp-server/          # TypeScript MCP Server (data collection)
├── analytics/           # Python analytics & ML models
├── database/            # Schema, migrations, seeds
├── claude-workflows/    # Agent workflows
├── config/              # API keys, MCP registration
└── docs/                # Documentation
```

## Quick Reference

### MCP Tools to Implement
- `get_upcoming_games` - Fetch scheduled matches
- `get_live_scores` - Real-time scores
- `get_betting_odds` - Current odds from bookmakers
- `get_historical_odds` - Historical odds changes
- `get_team_stats` - Team performance data
- `get_player_stats` - Player statistics

### Python Models to Build
1. Simple statistical models (ELO, Poisson)
2. ML models (Random Forest, Gradient Boosting)
3. Ensemble models combining multiple approaches

## Repository Info
- **Owner**: vlazar83
- **GitHub**: https://github.com/vlazar83/sports-edge

## Next Steps
See detailed roadmap in [sports-betting-agent-architecture.md](sports-betting-agent-architecture.md)
