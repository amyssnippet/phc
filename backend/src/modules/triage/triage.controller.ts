import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { triageService } from './triage.service.js';
import { createTriageSchema } from './triage.schema.js';
import { getParam } from '../../utils/params.js';

export async function createTriage(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createTriageSchema.parse(req.body);
    const result = await triageService.createSession(input);
    return sendSuccess(res, result, undefined, 201);
  } catch (err) {
    return next(err);
  }
}

export async function getTriageById(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await triageService.getSessionById(getParam(req, 'id'));
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function completeTriage(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await triageService.completeSession(getParam(req, 'id'));
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}
