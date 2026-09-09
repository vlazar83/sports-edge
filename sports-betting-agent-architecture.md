# Sports Betting Analytics Agent - Architecture

## Overview
A multi-agent system for collecting sports data, betting odds, generating statistics, and creating forecasts for learning and experimentation.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Claude Agent (Main)                    │
│              Orchestrates analysis & decisions           │
└─────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
        ┌───────▼────────┐     ┌───────▼────────┐
        │  Data Collection│     │   Analytics &  │
        │   MCP Server    │     │  Forecasting   │
        │   (TypeScript)  │     │    (Python)    │
        └───────┬────────┘     └───────┬────────┘
                │                       │
        ┌───────▼────────┐     ┌───────▼────────┐
        │  Sports APIs &  │     │   PostgreSQL   │
        │  Web Scraping   │     │   / BigQuery   │
        └─────────────────┘     └────────────────┘
```

## Component Breakdown

### 1. Custom MCP Server - Sports Data Collector
**Technology:** TypeScript/Node.js  
**Purpose:** Unified interface for multiple data sources

**Tools to implement:**
- `get_upcoming_games` - Fetch scheduled matches by sport/league
- `get_live_scores` - Real-time game scores
- `get_betting_odds` - Current odds from multiple bookmakers
- `get_historical_odds` - Historical odds changes over time
- `get_team_stats` - Team performance statistics
- `get_player_stats` - Individual player statistics
- `search_games` - Find games by team, date, league

### 2. Data Sources

#### **Paid API Options (Cost Breakdown)**

| API | Sports Covered | Free Tier | Paid Plans | Best For |
|-----|---------------|-----------|------------|----------|
| **The Odds API** | 25+ sports | 500 requests/month | $59/mo (10K requests) | Betting odds ⭐ |
| **API-Football** | Soccer | 100 req/day | €13/mo (unlimited) | Soccer data ⭐ |
| **API-Basketball** | Basketball | 100 req/day | €13/mo (unlimited) | NBA/NCAA |
| **API-NFL** | NFL | 100 req/day | €13/mo (unlimited) | NFL stats |
| **SportsData.io** | Multiple | Free trial | $30-100/mo | All-in-one |
| **RapidAPI Sports** | Multiple | Varies | $10-50/mo | Aggregator |

**Recommendation for experimentation:**
- Start with **The Odds API free tier** (500 requests = ~16 requests/day)
- Use **API-Football free tier** (100/day is generous)
- Total cost if going paid: ~$85/month for comprehensive coverage

#### **Free/Scraping Options**

| Source | Method | Data Available | Reliability |
|--------|--------|----------------|-------------|
| ESPN | Web scraping | Scores, stats, schedules | High |
| Flashscore | Web scraping | Live scores, results | High |
| Oddsportal | Web scraping | Historical odds | Medium (anti-scraping) |
| Reddit APIs | Reddit API | Community predictions, sentiment | High |
| Twitter/X | API v2 (free) | Breaking news, injury reports | Medium |

### 3. Data Storage

**Option A: PostgreSQL (Recommended for learning)**
```sql
-- Schema structure
Tables:
- games (game_id, sport, league, home_team, away_team, date, status)
- odds (odds_id, game_id, bookmaker, home_odds, away_odds, draw_odds, timestamp)
- team_stats (team_id, season, wins, losses, points_scored, etc.)
- player_stats (player_id, game_id, points, assists, etc.)
- predictions (prediction_id, game_id, predicted_winner, confidence, model_used)
```

**Option B: Google BigQuery** (Better for large-scale analysis)
- Free tier: 10GB storage, 1TB queries/month
- Better for complex analytics and ML

### 4. Analytics & Forecasting (Python)

**Libraries:**
```python
# Data processing
import pandas as pd
import numpy as np

# Machine Learning
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
import xgboost as xgb

# Time series
from statsmodels.tsa.arima.model import ARIMA
import prophet  # Facebook Prophet for forecasting

# Deep learning (optional)
import tensorflow as tf
```

**Forecasting Models:**

1. **Simple Statistical Models** (Start here)
   - Win probability based on historical matchups
   - ELO rating system
   - Poisson distribution for goal/point prediction

2. **Machine Learning Models**
   - Random Forest: Team stats → win probability
   - Gradient Boosting: Multi-factor predictions
   - Logistic Regression: Simple betting value detection

3. **Advanced Models**
   - Neural networks for pattern recognition
   - Time series analysis for odds movement
   - Ensemble models combining multiple approaches

**Key Features to Calculate:**
```python
# Example features for soccer
features = [
    'home_win_rate_last_10',
    'away_win_rate_last_10',
    'goals_scored_avg',
    'goals_conceded_avg',
    'head_to_head_record',
    'current_form_streak',
    'home_advantage_factor',
    'rest_days_since_last_game',
    'injury_impact_score',
    'betting_odds_value'  # Value = (your probability - implied probability)
]
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. ✓ Set up project structure
2. Create basic MCP server with one API integration
3. Set up PostgreSQL database with core schema
4. Build simple data collection workflow
5. Test end-to-end: API → Database → Claude query

### Phase 2: Data Collection (Week 3-4)
1. Integrate The Odds API (free tier)
2. Add web scraping for ESPN/Flashscore
3. Build historical data backfill scripts
4. Set up automated data collection (cron jobs)
5. Data quality checks and validation

### Phase 3: Basic Analytics (Week 5-6)
1. Calculate simple statistics (win rates, averages)
2. Build ELO rating system
3. Implement basic prediction model (logistic regression)
4. Create evaluation metrics (accuracy, ROI simulation)
5. Build reporting dashboard (using MCP + Claude)

### Phase 4: Advanced Forecasting (Week 7-8)
1. Feature engineering (30+ features per game)
2. Train multiple ML models
3. Ensemble model combining predictions
4. Backtesting framework
5. Real-time prediction updates

### Phase 5: Agent Integration (Week 9-10)
1. Claude agent workflows for analysis
2. Automated daily betting recommendations
3. Risk management rules
4. Performance tracking
5. Continuous model improvement

## Project Structure

```
sports-betting-agent/
├── mcp-server/                  # TypeScript MCP Server
│   ├── src/
│   │   ├── tools/
│   │   │   ├── odds-api.ts      # The Odds API integration
│   │   │   ├── api-football.ts  # Football API integration
│   │   │   ├── scraper.ts       # Web scraping tools
│   │   │   └── index.ts         # Tool registry
│   │   ├── types/
│   │   │   └── sports.ts        # TypeScript interfaces
│   │   └── index.ts             # MCP server entry point
│   ├── package.json
│   └── tsconfig.json
│
├── analytics/                   # Python Analytics
│   ├── data_collection/
│   │   ├── collectors.py        # Data collection scripts
│   │   └── scrapers.py          # Web scrapers
│   ├── models/
│   │   ├── elo_rating.py       # ELO rating system
│   │   ├── ml_models.py        # ML models
│   │   └── ensemble.py         # Ensemble predictor
│   ├── features/
│   │   └── engineering.py      # Feature calculation
│   ├── evaluation/
│   │   └── backtest.py         # Backtesting framework
│   └── requirements.txt
│
├── database/
│   ├── schema.sql              # PostgreSQL schema
│   ├── migrations/             # Database migrations
│   └── seeds/                  # Test data
│
├── claude-workflows/           # Agent workflows
│   ├── daily-analysis.md       # Daily analysis routine
│   └── game-prediction.md      # Per-game prediction workflow
│
├── config/
│   ├── apis.json              # API keys and config
│   └── claude-settings.json   # MCP server registration
│
└── docs/
    ├── SETUP.md               # Setup instructions
    ├── API_COSTS.md           # API pricing details
    └── MODELS.md              # Model documentation
```

## Quick Start Commands

```bash
# 1. Create project
mkdir sports-betting-agent && cd sports-betting-agent

# 2. Set up MCP server
mkdir mcp-server && cd mcp-server
npm init -y
npm install @modelcontextprotocol/sdk axios cheerio dotenv
npm install -D typescript @types/node ts-node

# 3. Set up Python environment
cd ..
mkdir analytics && cd analytics
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install pandas numpy scikit-learn xgboost statsmodels requests beautifulsoup4 sqlalchemy psycopg2-binary

# 4. Set up PostgreSQL
# Using Docker:
docker run --name sports-db -e POSTGRES_PASSWORD=sports123 -p 5432:5432 -d postgres

# 5. Register MCP server with Claude
# Add to ~/.claude/config.json:
{
  "mcpServers": {
    "sports-data": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "ODDS_API_KEY": "your_key_here",
        "FOOTBALL_API_KEY": "your_key_here"
      }
    }
  }
}
```

## Cost Analysis - Two Scenarios

### Scenario A: Free/Minimal Cost (Learning)
- **APIs:** Free tiers only ($0/month)
- **Database:** PostgreSQL on your machine ($0)
- **Total:** $0/month
- **Limitations:** ~16 odds checks/day, 100 football requests/day
- **Best for:** Learning, backtesting historical data

### Scenario B: Serious Analysis ($85/month)
- **The Odds API:** $59/month (10K requests)
- **API-Football:** €13/month (~$14)
- **API-Basketball:** €13/month (~$14)
- **Database:** PostgreSQL on machine or GCP free tier ($0-10)
- **Total:** ~$85-95/month
- **Capabilities:** Real-time odds for all major sports, comprehensive stats

## Next Steps

Would you like me to:
1. **Generate the MCP server code** (TypeScript boilerplate with The Odds API integration)
2. **Create Python analysis scripts** (basic prediction models)
3. **Set up the database schema** (PostgreSQL with sample queries)
4. **Build a complete starter template** (all of the above)

Let me know which component you'd like to start with!
