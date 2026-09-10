import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { dataQualityService } from './data-quality.service.js';
import { recordAudit } from '../../middleware/audit.js';
import { getParam } from '../../utils/params.js';

export async function getSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await dataQualityService.getSummary();
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function listIssues(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await dataQualityService.listIssues(req.query as any);
    return sendSuccess(res, { items: result });
  } catch (err) {
    return next(err);
  }
}

export async function getFacilityIssues(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await dataQualityService.getFacilityIssues(getParam(req, 'facilityId'));
    return sendSuccess(res, { items: result });
  } catch (err) {
    return next(err);
  }
}

export async function resolveIssue(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await dataQualityService.resolveIssue(getParam(req, 'id'));
    await recordAudit(req, 'RESOLVE_DATA_QUALITY_ISSUE', 'DATA_QUALITY_ISSUE', result.id);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function ignoreIssue(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await dataQualityService.ignoreIssue(getParam(req, 'id'));
    await recordAudit(req, 'IGNORE_DATA_QUALITY_ISSUE', 'DATA_QUALITY_ISSUE', result.id);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}
