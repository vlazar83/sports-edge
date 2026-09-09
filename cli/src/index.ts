#!/usr/bin/env node
import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';

const API_URL = process.env.API_URL || 'http://localhost:3000';

const program = new Command();

program
  .name('sports-query')
  .description('CLI tool for Sports Edge betting analytics')
  .version('1.0.0');

// Query command
program
  .command('query')
  .description('Search for games using natural language')
  .argument('<query>', 'Natural language query (e.g., "Shelton vs Alcaraz")')
  .action(async (query: string) => {
    try {
      console.log(chalk.blue(`🔍 Searching for: "${query}"\n`));

      const response = await axios.post(`${API_URL}/api/query`, { query });
      const { intent, results, executionTimeMs } = response.data;

      // Display intent
      console.log(chalk.gray('Intent:'));
      console.log(`  Sport: ${chalk.cyan(intent.sport || 'unknown')}`);
      console.log(`  Type: ${chalk.cyan(intent.queryType)}`);
      console.log(`  Confidence: ${chalk.cyan((intent.confidence * 100).toFixed(0) + '%')}`);
      console.log(`  Time: ${chalk.gray(executionTimeMs + 'ms')}\n`);

      // Display results
      if (results.length === 0) {
        console.log(chalk.yellow('⚠️  No games found'));
        return;
      }

      console.log(chalk.green(`✓ Found ${results.length} game(s):\n`));

      results.forEach((game: any, index: number) => {
        const date = new Date(game.commenceTime).toLocaleString();

        console.log(chalk.bold(`${index + 1}. ${game.homeTeam} vs ${game.awayTeam}`));
        console.log(chalk.gray(`   ${game.sportTitle} • ${date}`));

        if (game.odds && game.odds.bookmakers && game.odds.bookmakers.length > 0) {
          console.log(chalk.gray('   Odds:'));
          game.odds.bookmakers.slice(0, 3).forEach((bookmaker: any) => {
            const h2hMarket = bookmaker.markets.find((m: any) => m.marketType === 'h2h');
            if (h2hMarket && h2hMarket.outcomes) {
              const oddsStr = h2hMarket.outcomes
                .map((o: any) => `${o.name}: ${chalk.yellow(o.price)}`)
                .join(' | ');
              console.log(chalk.gray(`     ${bookmaker.title}: ${oddsStr}`));
            }
          });
        }
        console.log('');
      });

    } catch (error: any) {
      if (error.response) {
        console.error(chalk.red(`❌ Error: ${error.response.data.error || error.message}`));
      } else if (error.code === 'ECONNREFUSED') {
        console.error(chalk.red('❌ Error: Cannot connect to API server'));
        console.error(chalk.gray(`   Make sure the backend is running at ${API_URL}`));
      } else {
        console.error(chalk.red(`❌ Error: ${error.message}`));
      }
      process.exit(1);
    }
  });

// List games command
program
  .command('games')
  .description('List recent games')
  .option('-s, --sport <sport>', 'Filter by sport (e.g., tennis, basketball)')
  .option('-l, --limit <number>', 'Number of results', '10')
  .action(async (options) => {
    try {
      const params = new URLSearchParams();
      if (options.sport) params.append('sport', options.sport);
      params.append('limit', options.limit);

      const response = await axios.get(`${API_URL}/api/games?${params}`);
      const { games } = response.data;

      if (games.length === 0) {
        console.log(chalk.yellow('⚠️  No games found'));
        return;
      }

      console.log(chalk.green(`✓ Found ${games.length} game(s):\n`));

      games.forEach((game: any, index: number) => {
        const date = new Date(game.commence_time).toLocaleString();
        console.log(chalk.bold(`${index + 1}. ${game.home_team} vs ${game.away_team}`));
        console.log(chalk.gray(`   ${game.sport_title} • ${date} • ${game.status}`));
        if (game.bookmaker_count > 0) {
          console.log(chalk.gray(`   ${game.bookmaker_count} bookmakers`));
        }
        console.log('');
      });

    } catch (error: any) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Health check
program
  .command('health')
  .description('Check API server health')
  .action(async () => {
    try {
      const response = await axios.get(`${API_URL}/health`);
      console.log(chalk.green('✓ API server is healthy'));
      console.log(chalk.gray(`  ${response.data.service} - ${response.data.timestamp}`));
    } catch (error) {
      console.error(chalk.red('❌ API server is not responding'));
      process.exit(1);
    }
  });

program.parse();
