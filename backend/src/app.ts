import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './config/prisma';

// Import route modules
import crmRouter from './routes/crm';
import aiRouter from './routes/ai';
import campaignRouter from './routes/campaign';
import webhookRouter from './routes/webhook';
import triggersRouter from './routes/triggers';
import aiAgentRouter from './routes/aiAgent';
import offersRouter from './routes/offers';
import loyaltyRouter from './routes/loyalty';
import ingestRouter from './routes/ingest';
import { initCron } from './config/cron';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Enable Cross-Origin Resource Sharing (CORS)
app.use(cors());

// Parse incoming request bodies as JSON
app.use(express.json());

// Request logger middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Register routes
app.use('/api', crmRouter);
app.use('/api', aiAgentRouter);
app.use('/api', offersRouter);
app.use('/api', loyaltyRouter);
app.use('/api/ai', aiRouter);
app.use('/api/campaigns', campaignRouter);
app.use('/api/webhooks', webhookRouter);
app.use('/api/triggers', triggersRouter);
app.use('/api/ingest', ingestRouter);

// Health check endpoint (including database connection status check)
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Run a fast, lightweight query to check Postgres connectivity
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({
      status: 'OK',
      database: 'CONNECTED',
      timestamp: new Date().toISOString()
    });
  } catch (dbError: any) {
    console.error('Database connection check failed:', dbError.message);
    return res.status(500).json({
      status: 'ERROR',
      database: 'DISCONNECTED',
      error: dbError.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  return res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.'
  });
});

// Start Express server and verify DB connectivity
if (process.env.NODE_ENV !== 'test') {
  initCron();
  app.listen(port, async () => {
    console.log(`========================================`);
    console.log(`CRM Backend Server running on port ${port}`);
    console.log(`========================================`);

    try {
      console.log('Verifying database connection status...');
      await prisma.$queryRaw`SELECT 1`;
      console.log('Database connection status: SUCCESS (PostgreSQL connected)');
    } catch (error: any) {
      console.error('Database connection status: FAILED');
      console.error('Please check your DATABASE_URL in the .env file. Error:', error.message);
    }
  });
}

export default app;
