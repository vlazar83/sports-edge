#!/usr/bin/env node

/**
 * Sports Edge MCP Server
 * Provides tools for collecting sports betting data
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { OddsApiClient } from './tools/odds-api.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Initialize API client
const oddsApiKey = process.env.ODDS_API_KEY;
const oddsApiBaseUrl = process.env.ODDS_API_BASE_URL || 'https://api.the-odds-api.com/v4';

if (!oddsApiKey) {
  console.error('Error: ODDS_API_KEY environment variable is required');
  process.exit(1);
}

const oddsClient = new OddsApiClient({
  apiKey: oddsApiKey,
  baseUrl: oddsApiBaseUrl
});

// Define available tools
const tools: Tool[] = [
  {
    name: 'get_sports',
    description: 'Get list of all available sports with their keys and status. Use this to find sport keys for other tools. FREE - does not count against quota.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_odds',
    description: 'Get current betting odds for a specific sport from multiple bookmakers. Returns games with odds for different markets (moneyline, spreads, totals). Cost: 1 credit per region per market.',
    inputSchema: {
      type: 'object',
      properties: {
        sport_key: {
          type: 'string',
          description: 'Sport identifier (e.g., soccer_epl, basketball_nba, americanfootball_nfl). Use get_sports to see all available keys.'
        },
        regions: {
          type: 'array',
          items: { type: 'string', enum: ['us', 'uk', 'eu', 'au'] },
          description: 'Bookmaker regions to include (default: us)',
          default: ['us']
        },
        markets: {
          type: 'array',
          items: { type: 'string', enum: ['h2h', 'spreads', 'totals'] },
          description: 'Market types to include: h2h (moneyline), spreads, totals (over/under). Default: h2h',
          default: ['h2h']
        },
        odds_format: {
          type: 'string',
          enum: ['decimal', 'american'],
          description: 'Odds format (default: decimal)',
          default: 'decimal'
        }
      },
      required: ['sport_key']
    }
  },
  {
    name: 'get_upcoming_games',
    description: 'Get upcoming scheduled games for a sport without detailed odds. Useful for seeing the schedule and match-ups.',
    inputSchema: {
      type: 'object',
      properties: {
        sport_key: {
          type: 'string',
          description: 'Sport identifier (e.g., soccer_epl, basketball_nba)'
        },
        days_from: {
          type: 'number',
          description: 'Number of days from now to fetch games (default: 3)',
          default: 3
        }
      },
      required: ['sport_key']
    }
  },
  {
    name: 'search_games_by_team',
    description: 'Search for upcoming games involving a specific team name.',
    inputSchema: {
      type: 'object',
      properties: {
        sport_key: {
          type: 'string',
          description: 'Sport identifier (e.g., soccer_epl, basketball_nba)'
        },
        team_name: {
          type: 'string',
          description: 'Team name or partial name to search for'
        }
      },
      required: ['sport_key', 'team_name']
    }
  },
  {
    name: 'get_scores',
    description: 'Get live scores and recently completed games with final scores. Cost: 2 credits with daysFrom parameter, 1 credit without.',
    inputSchema: {
      type: 'object',
      properties: {
        sport_key: {
          type: 'string',
          description: 'Sport identifier (e.g., soccer_epl, basketball_nba)'
        },
        days_from: {
          type: 'number',
          description: 'Number of days in the past to include (1-3). Omit for only current/upcoming games.'
        }
      },
      required: ['sport_key']
    }
  },
  {
    name: 'get_events',
    description: 'Get list of in-play and pre-match events without odds data. FREE - does not count against quota. Great for checking schedules.',
    inputSchema: {
      type: 'object',
      properties: {
        sport_key: {
          type: 'string',
          description: 'Sport identifier (e.g., soccer_epl, basketball_nba)'
        },
        commence_time_from: {
          type: 'string',
          description: 'Filter events starting from this ISO timestamp (e.g., 2024-01-01T00:00:00Z)'
        },
        commence_time_to: {
          type: 'string',
          description: 'Filter events until this ISO timestamp'
        }
      },
      required: ['sport_key']
    }
  },
  {
    name: 'get_event_odds',
    description: 'Get detailed odds for a single specific event/game. Cost: based on unique markets × regions.',
    inputSchema: {
      type: 'object',
      properties: {
        sport_key: {
          type: 'string',
          description: 'Sport identifier (e.g., soccer_epl, basketball_nba)'
        },
        event_id: {
          type: 'string',
          description: 'Event ID from get_events or get_odds response'
        },
        regions: {
          type: 'array',
          items: { type: 'string', enum: ['us', 'uk', 'eu', 'au'] },
          description: 'Bookmaker regions (default: us)',
          default: ['us']
        },
        markets: {
          type: 'array',
          items: { type: 'string', enum: ['h2h', 'spreads', 'totals'] },
          description: 'Market types (default: h2h)',
          default: ['h2h']
        },
        odds_format: {
          type: 'string',
          enum: ['decimal', 'american'],
          description: 'Odds format (default: decimal)',
          default: 'decimal'
        }
      },
      required: ['sport_key', 'event_id']
    }
  },
  {
    name: 'get_event_markets',
    description: 'Get available betting markets for a specific event from each bookmaker. Useful to see what markets are offered. Cost: 1 credit.',
    inputSchema: {
      type: 'object',
      properties: {
        sport_key: {
          type: 'string',
          description: 'Sport identifier (e.g., soccer_epl, basketball_nba)'
        },
        event_id: {
          type: 'string',
          description: 'Event ID from get_events or get_odds response'
        },
        regions: {
          type: 'array',
          items: { type: 'string', enum: ['us', 'uk', 'eu', 'au'] },
          description: 'Bookmaker regions (default: us)',
          default: ['us']
        }
      },
      required: ['sport_key', 'event_id']
    }
  },
  {
    name: 'get_participants',
    description: 'Get list of all participants (teams or individual players) for a sport. Useful for finding exact team names. Cost: 1 credit.',
    inputSchema: {
      type: 'object',
      properties: {
        sport_key: {
          type: 'string',
          description: 'Sport identifier (e.g., soccer_epl, basketball_nba)'
        }
      },
      required: ['sport_key']
    }
  }
];

// Create MCP server
const server = new Server(
  {
    name: 'sports-edge-mcp-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Handle tool list requests
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_sports': {
        const result = await oddsClient.getSports();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'get_odds': {
        const {
          sport_key,
          regions = ['us'],
          markets = ['h2h'],
          odds_format = 'decimal'
        } = args as any;

        const result = await oddsClient.getOdds(
          sport_key,
          regions,
          markets,
          odds_format
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'get_upcoming_games': {
        const { sport_key, days_from = 3 } = args as any;
        const games = await oddsClient.getUpcomingGames(sport_key, days_from);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(games, null, 2)
            }
          ]
        };
      }

      case 'search_games_by_team': {
        const { sport_key, team_name } = args as any;
        const games = await oddsClient.searchGamesByTeam(sport_key, team_name);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(games, null, 2)
            }
          ]
        };
      }

      case 'get_scores': {
        const { sport_key, days_from } = args as any;
        const scores = await oddsClient.getScores(sport_key, days_from);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(scores, null, 2)
            }
          ]
        };
      }

      case 'get_events': {
        const { sport_key, commence_time_from, commence_time_to } = args as any;
        const events = await oddsClient.getEvents(
          sport_key,
          commence_time_from,
          commence_time_to
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(events, null, 2)
            }
          ]
        };
      }

      case 'get_event_odds': {
        const {
          sport_key,
          event_id,
          regions = ['us'],
          markets = ['h2h'],
          odds_format = 'decimal'
        } = args as any;

        const eventOdds = await oddsClient.getEventOdds(
          sport_key,
          event_id,
          regions,
          markets,
          odds_format
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(eventOdds, null, 2)
            }
          ]
        };
      }

      case 'get_event_markets': {
        const { sport_key, event_id, regions = ['us'] } = args as any;
        const markets = await oddsClient.getEventMarkets(sport_key, event_id, regions);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(markets, null, 2)
            }
          ]
        };
      }

      case 'get_participants': {
        const { sport_key } = args as any;
        const participants = await oddsClient.getParticipants(sport_key);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(participants, null, 2)
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage }, null, 2)
        }
      ],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Sports Edge MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
