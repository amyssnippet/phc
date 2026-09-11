import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';

async function startServer() {
  try {
    await connectDatabase();
    await connectRedis();

    app.listen(env.PORT, () => {
      logger.info(`SwasthyaSetu Backend API running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`Health check: http://localhost:${env.PORT}/health`);
      logger.info(`Readiness: http://localhost:${env.PORT}/ready`);
      logger.info(`API Base: http://localhost:${env.PORT}/api/v1`);
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();
