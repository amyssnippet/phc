import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
  lazyConnect: true,
});

redisConnection.on('error', (err) => {
  logger.warn({ error: err.message }, 'Redis connection error');
});

redisConnection.on('connect', () => {
  logger.info('Connected to Redis');
});

export async function connectRedis() {
  try {
    if (redisConnection.status !== 'ready' && redisConnection.status !== 'connecting') {
      await redisConnection.connect();
    }
  } catch (err: any) {
    logger.warn({ error: err.message }, 'Could not connect to Redis - background jobs will retry');
  }
}
