import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import queryRoutes from './routes/query.routes';
import gamesRoutes from './routes/games.routes';
import db from './config/database';

// Load environment variables
dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from ui directory
const uiPath = path.resolve(__dirname, '../../ui');
app.use('/ui', express.static(uiPath));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/query', queryRoutes);
app.use('/api/games', gamesRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'sports-edge-backend'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Sports Edge Backend API',
    version: '1.0.0',
    endpoints: {
      query: 'POST /api/query - Natural language query',
      games: 'GET /api/games - List games',
      gameById: 'GET /api/games/:id - Get specific game',
      sports: 'GET /api/sports - List sports',
      health: 'GET /health - Health check'
    }
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
async function start() {
  try {
    // Test database connection
    await db.query('SELECT NOW()');
    console.log('✓ Database connected');

    app.listen(PORT, () => {
      console.log(`\n🚀 Sports Edge Backend API running on port ${PORT}`);
      console.log(`   http://localhost:${PORT}`);
      console.log(`\n📍 Endpoints:`);
      console.log(`   POST http://localhost:${PORT}/api/query`);
      console.log(`   GET  http://localhost:${PORT}/api/games`);
      console.log(`   GET  http://localhost:${PORT}/health\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('\n\nShutting down gracefully...');
  await db.end();
  process.exit(0);
});

start();
