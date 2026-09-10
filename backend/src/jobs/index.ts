import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import { logger } from '../utils/logger.js';

export const notificationQueue = new Queue('notifications', { connection: redisConnection });
export const followupQueue = new Queue('followups', { connection: redisConnection });
export const analyticsQueue = new Queue('analytics', { connection: redisConnection });
export const syncQueue = new Queue('sync', { connection: redisConnection });

export async function scheduleNotificationJob(data: any) {
  try {
    await notificationQueue.add('sendNotification', data, { removeOnComplete: true });
  } catch (err: any) {
    logger.warn({ error: err.message }, 'Failed to schedule notification job');
  }
}
