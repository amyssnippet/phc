import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { analyticsService } from './analytics.service.js';

export async function getOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await analyticsService.getOverview();
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function getFacilities(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await analyticsService.getFacilityMetrics();
    return sendSuccess(res, { items: result });
  } catch (err) {
    return next(err);
  }
}

export async function getReferrals(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await analyticsService.getReferralFunnel();
    return sendSuccess(res, { funnel: result });
  } catch (err) {
    return next(err);
  }
}

export async function getFollowups(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await analyticsService.getFollowupMetrics();
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function getAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const overview = await analyticsService.getOverview();
    return sendSuccess(res, {
      averageTravelDistanceKm: 2.8,
      estimatedWaitMinutes: overview.averageEstimatedWaitMinutes,
      operationalRate: Math.round((overview.operationalFacilities / (overview.totalFacilities || 1)) * 100),
      isDemoData: true,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getDataQuality(req: Request, res: Response, next: NextFunction) {
  try {
    const counts = await analyticsService.getDataQualityBreakdown();
    return sendSuccess(res, { issuesByType: counts });
  } catch (err) {
    return next(err);
  }
}
