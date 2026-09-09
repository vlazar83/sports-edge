import { spawn } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

/**
 * MCP Client to communicate with the existing TypeScript MCP server
 * Uses stdio protocol to call MCP tools
 */
export class MCPClient {
  private mcpServerPath: string;

  constructor() {
    // Resolve MCP server path relative to the project root
    const mcpServerRelativePath = process.env.MCP_SERVER_PATH || '../mcp-server/dist/index.js';
    this.mcpServerPath = path.resolve(__dirname, '../../../mcp-server/dist/index.js');
    console.log('MCP Server Path:', this.mcpServerPath);
  }

  /**
   * Call an MCP tool and return the response
   */
  async callTool(toolName: string, args: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const mcpPath = path.resolve(__dirname, '../../..', this.mcpServerPath);
      const mcpProcess = spawn('node', [mcpPath]);

      let stdout = '';
      let stderr = '';

      mcpProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      mcpProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      mcpProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`MCP server exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          // Parse the JSON-RPC response
          const lines = stdout.trim().split('\n');
          const responseLine = lines.find(line => line.includes('"result"'));

          if (responseLine) {
            const response = JSON.parse(responseLine);
            if (response.result && response.result.content) {
              const content = response.result.content[0].text;
              resolve(JSON.parse(content));
            } else {
              reject(new Error('Invalid MCP response format'));
            }
          } else {
            reject(new Error('No result in MCP response'));
          }
        } catch (error) {
          reject(new Error(`Failed to parse MCP response: ${error}`));
        }
      });

      // Send JSON-RPC request
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      };

      mcpProcess.stdin.write(JSON.stringify(request) + '\n');
      mcpProcess.stdin.end();
    });
  }

  /**
   * Helper methods for common MCP tools
   */
  async getSports() {
    return this.callTool('get_sports', {});
  }

  async getOdds(sportKey: string, regions: string[] = ['us'], markets: string[] = ['h2h']) {
    return this.callTool('get_odds', {
      sport_key: sportKey,
      regions,
      markets,
      odds_format: 'decimal'
    });
  }

  async searchGamesByTeam(sportKey: string, teamName: string) {
    return this.callTool('search_games_by_team', {
      sport_key: sportKey,
      team_name: teamName
    });
  }

  async getUpcomingGames(sportKey: string, daysFrom: number = 3) {
    return this.callTool('get_upcoming_games', {
      sport_key: sportKey,
      days_from: daysFrom
    });
  }

  async getScores(sportKey: string, daysFrom?: number) {
    return this.callTool('get_scores', {
      sport_key: sportKey,
      ...(daysFrom && { days_from: daysFrom })
    });
  }

  async getEvents(sportKey: string) {
    return this.callTool('get_events', {
      sport_key: sportKey
    });
  }
}

export default new MCPClient();
