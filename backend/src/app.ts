import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { prisma } from './config/database.js';
import { redisConnection } from './config/redis.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { errorHandler } from './middleware/error-handler.js';
import apiV1Router from './routes/index.js';
import { sendSuccess } from './utils/response.js';

export const app = express();

// Security and utility middlewares
app.use(helmet());
app.use(
  cors({
    origin: [env.CORS_ORIGIN, 'http://localhost:3000', 'capacitor://localhost', 'http://localhost'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(requestIdMiddleware);

// Health endpoints
app.get('/health', (req: Request, res: Response) => {
  return sendSuccess(res, { status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/ready', async (req: Request, res: Response) => {
  let dbStatus = 'down';
  let redisStatus = 'down';
  let postgisStatus = 'down';

  try {
    const postgisVersion = await prisma.$queryRawUnsafe<any[]>(`SELECT PostGIS_Version();`);
    if (postgisVersion && postgisVersion.length > 0) {
      dbStatus = 'up';
      postgisStatus = 'up';
    }
  } catch (err) {
    dbStatus = 'down';
  }

  try {
    const ping = await redisConnection.ping();
    if (ping === 'PONG') {
      redisStatus = 'up';
    }
  } catch (err) {
    redisStatus = 'down';
  }

  const isReady = dbStatus === 'up';
  const statusCode = isReady ? 200 : 503;

  return res.status(statusCode).json({
    success: isReady,
    data: {
      status: isReady ? 'ready' : 'degraded',
      database: dbStatus,
      postgis: postgisStatus,
      redis: redisStatus,
    },
  });
});

// API Documentation endpoint (Section 173)
app.get('/api/docs', (req: Request, res: Response) => {
  return sendSuccess(res, {
    openapi: '3.0.3',
    info: {
      title: 'SwasthyaSetu API',
      version: '2.0.0',
      description: 'Public Healthcare Access & Continuity Network - Government of Maharashtra',
    },
    servers: [{ url: '/api/v1' }],
    paths: {
      '/auth/send-otp': { post: { summary: 'Request OTP authentication' } },
      '/auth/verify-otp': { post: { summary: 'Verify OTP and obtain JWT tokens' } },
      '/facilities/nearby': { get: { summary: 'Geospatial search for facilities with PostGIS' } },
      '/facilities/search': { get: { summary: 'Search facilities catalogue' } },
      '/care-routing/recommend': { post: { summary: 'Explainable care routing recommendation engine' } },
      '/triage': { post: { summary: 'Clinical decision-support triage capture' } },
      '/appointments': { post: { summary: 'Book token appointment' }, get: { summary: 'List appointments' } },
      '/queues/{facilityId}': { get: { summary: 'Get current queue status' } },
      '/referrals': { post: { summary: 'Create referral' }, get: { summary: 'List referrals' } },
      '/referrals/{id}/timeline': { get: { summary: 'Referral lifecycle event timeline' } },
      '/sync/push': { post: { summary: 'Sync offline drafts with idempotency' } },
      '/analytics/overview': { get: { summary: 'District operational command center overview' } },
      '/data-quality/issues': { get: { summary: 'Data quality monitor issues' } },
    },
  });
});

// Mount modular API v1
app.use('/api/v1', apiV1Router);

// Global Error Handler
app.use(errorHandler);
