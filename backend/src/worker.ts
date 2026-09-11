import { Worker } from 'bullmq';
import { redisConnection } from './config/redis.js';
import { logger } from './utils/logger.js';
import { prisma } from './config/database.js';

logger.info('Starting SwasthyaSetu Background Worker...');

const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'Processing notification job');
    // Notification logic handled transactionally on API, worker handles async delivery/SMS mock
    return { status: 'delivered', at: new Date() };
  },
  { connection: redisConnection }
);

const followupWorker = new Worker(
  'followups',
  async (job) => {
    logger.info({ jobId: job.id }, 'Checking due follow-ups');
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    await prisma.followUp.updateMany({
      where: {
        status: 'PENDING',
        dueDate: { lte: today },
      },
      data: { status: 'DUE' },
    });
    return { status: 'updated' };
  },
  { connection: redisConnection }
);

notificationWorker.on('failed', (job, err) => {
  logger.warn({ jobId: job?.id, error: err.message }, 'Notification job failed');
});

followupWorker.on('failed', (job, err) => {
  logger.warn({ jobId: job?.id, error: err.message }, 'Followup job failed');
});

logger.info('Background Workers initialized and listening for jobs');
