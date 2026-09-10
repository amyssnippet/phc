import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { syncService } from './sync.service.js';
import { syncPushSchema, syncPullSchema } from './sync.schema.js';

export async function pushSync(req: Request, res: Response, next: NextFunction) {
  try {
    const input = syncPushSchema.parse(req.body);
    const result = await syncService.processPush(input, req.user?.id);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function pullSync(req: Request, res: Response, next: NextFunction) {
  try {
    const input = syncPullSchema.parse(req.body);
    const result = await syncService.processPull(input.deviceId, input.since);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function getSyncStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const deviceId = (req.query.deviceId as string) || 'default-device';
    const result = await syncService.getStatus(deviceId);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}
