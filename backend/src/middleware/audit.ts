import { Request } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

export async function recordAudit(
  req: Request | null,
  action: string,
  entityType: string,
  entityId: string | null = null,
  metadata: any = null
) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: req?.user?.id || null,
        action,
        entityType,
        entityId,
        metadata: metadata ? metadata : undefined,
        ipAddress: req?.ip || req?.socket.remoteAddress || null,
        userAgent: (req?.headers['user-agent'] as string) || null,
      },
    });
  } catch (err: any) {
    logger.warn({ error: err.message }, 'Failed to record audit log');
  }
}
