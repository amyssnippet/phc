import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { followupService } from './followups.service.js';
import { createFollowupSchema, listFollowupsSchema } from './followups.schema.js';
import { recordAudit } from '../../middleware/audit.js';
import { getParam } from '../../utils/params.js';

export async function listFollowups(req: Request, res: Response, next: NextFunction) {
  try {
    const input = listFollowupsSchema.parse(req.query);
    const result = await followupService.listFollowups(input as any);
    return sendSuccess(res, { items: result.items }, result.meta);
  } catch (err) {
    return next(err);
  }
}

export async function createFollowup(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createFollowupSchema.parse(req.body);
    const result = await followupService.createFollowup(input);
    await recordAudit(req, 'CREATE_FOLLOWUP', 'FOLLOWUP', result.id, { type: result.type });
    return sendSuccess(res, result, undefined, 201);
  } catch (err) {
    return next(err);
  }
}

export async function getFollowupById(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await followupService.getFollowupById(getParam(req, 'id'));
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function completeFollowup(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await followupService.completeFollowup(getParam(req, 'id'), req.body.notes);
    await recordAudit(req, 'COMPLETE_FOLLOWUP', 'FOLLOWUP', result.id);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}
