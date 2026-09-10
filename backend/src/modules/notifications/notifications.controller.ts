import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { notificationService } from './notifications.service.js';
import { getParam } from '../../utils/params.js';

export async function listNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await notificationService.getUserNotifications(req.user!.id);
    return sendSuccess(res, { items });
  } catch (err) {
    return next(err);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    await notificationService.markAsRead(getParam(req, 'id'), req.user!.id);
    return sendSuccess(res, { success: true });
  } catch (err) {
    return next(err);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    await notificationService.markAllAsRead(req.user!.id);
    return sendSuccess(res, { success: true });
  } catch (err) {
    return next(err);
  }
}
