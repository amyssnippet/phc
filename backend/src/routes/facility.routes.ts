import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { prisma } from '../config/database.js';
import { NotFoundError, ForbiddenError, DomainError } from '../utils/errors.js';
import { successResponse } from '../utils/response.js';
import { queueService } from '../modules/queues/queues.service.js';
import { referralService } from '../modules/referrals/referrals.service.js';
import { serializeFacilityQueue, serializeWorkerPatient } from '../serializers/index.js';

const facilityRouter = Router();

facilityRouter.use(requireAuth);
facilityRouter.use(requireRole('FACILITY_ADMIN', 'DOCTOR', 'SUPER_ADMIN'));

function verifyFacilityAccess(req: Request, facilityId: string) {
  const auth = req.auth!;
  if (!auth.isSuperAdmin && !auth.facilityIds.includes(facilityId)) {
    throw new ForbiddenError('You are not authorized to access this facility', 'FORBIDDEN');
  }
}

/**
 * GET /api/v1/facility/overview
 */
facilityRouter.get('/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const facilityId = (req.query.facilityId as string) || auth.facilityIds[0];
    if (!facilityId) {
      throw new DomainError('Facility ID required', 'VALIDATION_ERROR');
    }
    verifyFacilityAccess(req, facilityId);

    const today = new Date().toISOString().slice(0, 10);

    const [facility, queue, appointmentsCount, pendingReferralsCount] = await Promise.all([
      prisma.facility.findUnique({ where: { id: facilityId } }),
      queueService.getFacilityQueue(facilityId),
      prisma.appointment.count({
        where: { facilityId, serviceDate: today },
      }),
      prisma.referral.count({
        where: { destinationFacilityId: facilityId, status: 'CREATED' },
      }),
    ]);

    if (!facility) throw new NotFoundError('Facility not found', 'FACILITY_NOT_FOUND');

    return successResponse(res, {
      facility,
      queue,
      appointmentsCount,
      pendingReferralsCount,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/facility/queues/:facilityId
 */
facilityRouter.get('/queues/:facilityId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = String(req.params.facilityId);
    const { department, serviceDate } = req.query;
    verifyFacilityAccess(req, facilityId);

    const queue = await queueService.getFacilityQueue(
      facilityId,
      department as string | undefined,
      serviceDate as string | undefined
    );
    return successResponse(res, queue);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/facility/queues/:facilityId/tokens
 * Generate walk-in queue token using atomic sequence generator
 */
facilityRouter.post(['/queues/:facilityId/tokens', '/queues/:facilityId/walkin'], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = String(req.params.facilityId);
    const { patientId, department, priority, serviceDate, patientName, patientPhone } = req.body;
    verifyFacilityAccess(req, facilityId);

    let targetPatientId = patientId;
    if (!targetPatientId) {
      if (patientName) {
        const pCode = `MH-P-${Math.floor(100000 + Math.random() * 900000)}`;
        const newPatient = await prisma.patient.create({
          data: {
            patientCode: pCode,
            firstName: patientName.split(' ')[0] || patientName,
            lastName: patientName.split(' ').slice(1).join(' ') || undefined,
            phone: patientPhone || '9999999999',
            registeredAtFacilityId: facilityId,
            demoData: true,
          },
        });
        targetPatientId = newPatient.id;
      } else {
        throw new DomainError('Patient ID or patient details are required', 'VALIDATION_ERROR');
      }
    }

    const priorityScore = priority === 'EMERGENCY' ? 100 : priority === 'HIGH' ? 75 : priority === 'PRIORITY' ? 50 : 10;

    const token = await queueService.allocateQueueToken({
      facilityId,
      patientId: targetPatientId,
      department: department || 'GENERAL_MEDICINE',
      serviceDate,
      priority: priorityScore,
      source: 'WALK_IN',
    });

    return successResponse(res, { token }, 'Walk-in queue token issued', 201);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/facility/queues/:facilityId/call-next
 */
facilityRouter.post('/queues/:facilityId/call-next', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = String(req.params.facilityId);
    const { department } = req.body;
    verifyFacilityAccess(req, facilityId);

    const token = await queueService.callNext(facilityId, department, req.auth);
    return successResponse(res, token, 'Next patient called');
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/facility/queues/:facilityId/complete
 */
facilityRouter.post('/queues/:facilityId/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = String(req.params.facilityId);
    const { tokenId } = req.body;
    verifyFacilityAccess(req, facilityId);

    const token = await queueService.completeConsultation(facilityId, tokenId, req.auth);
    return successResponse(res, token, 'Consultation completed');
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/facility/referrals
 */
facilityRouter.get('/referrals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const facilityId = (req.query.facilityId as string) || auth.facilityIds[0];
    if (facilityId) verifyFacilityAccess(req, facilityId);

    const targetFacilities = facilityId ? [facilityId] : auth.facilityIds;

    const referrals = await prisma.referral.findMany({
      where: {
        OR: [
          { destinationFacilityId: { in: targetFacilities } },
          { sourceFacilityId: { in: targetFacilities } },
        ],
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, patientCode: true } },
        sourceFacility: { select: { id: true, name: true } },
        destinationFacility: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(res, { items: referrals });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/facility/referrals/:id/accept
 */
facilityRouter.post('/referrals/:id/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const ref = await prisma.referral.findUnique({ where: { id } });
    if (!ref) throw new NotFoundError('Referral not found', 'REFERRAL_NOT_FOUND');
    verifyFacilityAccess(req, ref.destinationFacilityId);

    const result = await referralService.acceptReferral(id, req.auth!.userId);
    return successResponse(res, result, 'Referral accepted');
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/facility/referrals/:id/reject
 */
facilityRouter.post('/referrals/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { reason } = req.body;
    const ref = await prisma.referral.findUnique({ where: { id } });
    if (!ref) throw new NotFoundError('Referral not found', 'REFERRAL_NOT_FOUND');
    verifyFacilityAccess(req, ref.destinationFacilityId);

    const result = await referralService.rejectReferral(id, reason || 'Capacity exceeded', req.auth!.userId);
    return successResponse(res, result, 'Referral rejected');
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/facility/practitioners
 */
facilityRouter.get('/practitioners', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const facilityId = (req.query.facilityId as string) || auth.facilityIds[0];
    if (facilityId) verifyFacilityAccess(req, facilityId);

    const practitioners = await prisma.practitioner.findMany({
      where: { facilityId: { in: facilityId ? [facilityId] : auth.facilityIds } },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });

    return successResponse(res, { items: practitioners });
  } catch (err) {
    next(err);
  }
});

export default facilityRouter;
