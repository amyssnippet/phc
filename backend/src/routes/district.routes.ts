import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { prisma } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';
import { successResponse } from '../utils/response.js';
import { dataQualityService } from '../modules/data-quality/data-quality.service.js';

const districtRouter = Router();

districtRouter.use(requireAuth);
districtRouter.use(requireRole('DISTRICT_OFFICER', 'SUPER_ADMIN'));

/**
 * GET /api/v1/district/overview
 * Aggregated district macro metrics (no individual patient clinical leaks!)
 */
districtRouter.get('/overview', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [totalFacilities, totalPatients, activeTokens, totalReferrals, openIssues] = await Promise.all([
      prisma.facility.count(),
      prisma.patient.count(),
      prisma.queueToken.count({
        where: { serviceDate: today, status: { in: ['WAITING', 'CALLED', 'IN_CONSULTATION'] } },
      }),
      prisma.referral.count(),
      prisma.dataQualityIssue.count({ where: { status: 'OPEN' } }),
    ]);

    const facilities = await prisma.facility.findMany({ select: { dataQualityScore: true } });
    const avgScore = facilities.length
      ? facilities.reduce((sum, f) => sum + f.dataQualityScore, 0) / facilities.length
      : 100;

    return successResponse(res, {
      totalFacilities,
      totalPatients,
      activeConsultations: activeTokens,
      totalReferrals,
      openIssues,
      avgQualityScore: Math.round(avgScore),
      districtCode: 'MUMBAI_SUBURBAN',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/district/facilities
 */
districtRouter.get('/facilities', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const facilities = await prisma.facility.findMany({
      include: {
        specialties: true,
        hours: true,
        dataQualityIssues: { where: { status: 'OPEN' } },
      },
      orderBy: { dataQualityScore: 'desc' },
    });

    return successResponse(res, { items: facilities });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/district/map
 */
districtRouter.get('/map', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const facilities = await prisma.facility.findMany({
      select: {
        id: true,
        name: true,
        facilityType: true,
        pincode: true,
        address: true,
        latitude: true,
        longitude: true,
        operationalStatus: true,
        dataQualityScore: true,
      },
    });

    return successResponse(res, { items: facilities });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/district/referrals
 */
districtRouter.get('/referrals', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const total = await prisma.referral.count();
    const statuses = ['CREATED', 'ACCEPTED', 'APPOINTMENT_BOOKED', 'PATIENT_ARRIVED', 'CONSULTED', 'COMPLETED'];
    const funnel = await Promise.all(
      statuses.map(async (status) => {
        const count = await prisma.referral.count({ where: { status: status as any } });
        return { status, count };
      })
    );

    const completed = await prisma.referral.count({ where: { status: 'COMPLETED' } });
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return successResponse(res, {
      total,
      completionRate: Math.round(completionRate),
      funnel,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/district/quality/issues
 */
districtRouter.get('/quality/issues', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, severity } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const issues = await prisma.dataQualityIssue.findMany({
      where,
      include: { facility: { select: { id: true, name: true, facilityType: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(res, { items: issues });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/district/quality/issues/:id/resolve
 */
districtRouter.post('/quality/issues/:id/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const issue = await dataQualityService.resolveIssue(id);
    return successResponse(res, issue, 'Data quality issue resolved and quality score recalculated');
  } catch (err) {
    next(err);
  }
});

export default districtRouter;
