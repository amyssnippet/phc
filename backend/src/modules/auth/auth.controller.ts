import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { authService } from './auth.service.js';
import { sendOtpSchema, verifyOtpSchema, demoLoginSchema } from './auth.schema.js';

export async function sendOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const input = sendOtpSchema.parse(req.body);
    const result = await authService.sendOtp(input);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const input = verifyOtpSchema.parse(req.body);
    const result = await authService.verifyOtp(input);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function demoLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const input = demoLoginSchema.parse(req.body);
    const result = await authService.demoLogin(input);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, { message: 'Logged out successfully' });
  } catch (err) {
    return next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Not authenticated' } });
    }
    const result = await authService.getCurrentUser(req.user.id);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}
