import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { userService } from './users.service.js';
import { updateUserSchema } from './users.schema.js';
import { AuthError } from '../../utils/errors.js';
import { getParam } from '../../utils/params.js';

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AuthError('Authentication required');
    const user = await userService.getUserById(req.user.id);
    return sendSuccess(res, user);
  } catch (err) {
    return next(err);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AuthError('Authentication required');
    const input = updateUserSchema.parse(req.body);
    const user = await userService.updateProfile(req.user.id, input);
    return sendSuccess(res, user);
  } catch (err) {
    return next(err);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getUserById(getParam(req, 'id'));
    return sendSuccess(res, user);
  } catch (err) {
    return next(err);
  }
}
