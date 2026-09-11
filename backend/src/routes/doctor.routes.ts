import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { prisma } from '../config/database.js';
import { AuthorizationPolicy } from '../authz/policy.js';
import { NotFoundError, ForbiddenError, DomainError } from '../utils/errors.js';
import { successResponse } from '../utils/response.js';
import { serializeDoctorPatient, serializeFacilityQueue } from '../serializers/index.js';
import { queueService } from '../modules/queues/queues.service.js';
import { referralService } from '../modules/referrals/referrals.service.js';

const doctorRouter = Router();

doctorRouter.use(requireAuth);
doctorRouter.use(requireRole('DOCTOR', 'SUPER_ADMIN'));

/**
 * GET /api/v1/doctor/worklist
 * Worklist of patients currently waiting in queue or with active appointments at doctor's assigned facilities
 */
doctorRouter.get('/worklist', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    if (auth.facilityIds.length === 0) {
      return successResponse(res, { queue: [], appointments: [] });
    }

    const today = new Date().toISOString().slice(0, 10);

    const [queueTokens, appointments] = await Promise.all([
      prisma.queueToken.findMany({
        where: {
          facilityId: { in: auth.facilityIds },
          serviceDate: today,
          status: { in: ['WAITING', 'CALLED', 'IN_CONSULTATION'] },
        },
        include: {
          patient: true,
        },
        orderBy: [{ priority: 'desc' }, { tokenSequence: 'asc' }],
      }),
      prisma.appointment.findMany({
        where: {
          facilityId: { in: auth.facilityIds },
          serviceDate: today,
        },
        include: {
          patient: true,
          queueToken: true,
        },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    return successResponse(res, {
      queue: serializeFacilityQueue(queueTokens),
      appointments,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/doctor/patients/:id
 * Scoped clinical view of patient (must have active appointment, queue token, encounter, or referral at doctor's facility)
 */
doctorRouter.get('/patients/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const id = String(req.params.id);

    const allowed = await AuthorizationPolicy.canViewPatient(auth, id);
    if (!allowed) {
      throw new ForbiddenError('Doctor is not authorized to access this patient record (no active facility relationship)', 'FORBIDDEN');
    }

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        triageSessions: { orderBy: { createdAt: 'desc' } },
        encounters: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!patient) throw new NotFoundError('Patient not found', 'PATIENT_NOT_FOUND');

    // Audit clinical view
    await prisma.auditLog.create({
      data: {
        actorId: auth.userId,
        action: 'PATIENT_CLINICAL_VIEW',
        entityType: 'PATIENT',
        entityId: id,
        metadata: { doctorId: auth.userId, facilityIds: auth.facilityIds },
      },
    });

    return successResponse(res, serializeDoctorPatient(patient));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/doctor/encounters
 * Create clinical encounter notes and diagnoses
 */
doctorRouter.post('/encounters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const { patientId, facilityId, chiefComplaint, notes, type = 'OPD_CONSULTATION' } = req.body;

    const targetFacility = facilityId || auth.facilityIds[0];
    if (!targetFacility || !auth.facilityIds.includes(targetFacility)) {
      throw new ForbiddenError('Doctor does not belong to the selected facility', 'FORBIDDEN');
    }

    const allowed = await AuthorizationPolicy.canViewPatient(auth, patientId);
    if (!allowed) {
      throw new ForbiddenError('Unauthorized to create encounter for this patient', 'FORBIDDEN');
    }

    const encounter = await prisma.encounter.create({
      data: {
        patientId,
        facilityId: targetFacility,
        chiefComplaint,
        notes,
        type,
        status: 'COMPLETED',
        demoData: true,
      },
    });

    return successResponse(res, encounter, 'Encounter recorded', 201);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/doctor/referrals
 * Doctor creates secondary/tertiary referral
 */
doctorRouter.post('/referrals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const { patientId, destinationFacilityId, sourceFacilityId, reason, urgency } = req.body;

    const sourceFac = sourceFacilityId || auth.facilityIds[0];
    if (!sourceFac || !auth.facilityIds.includes(sourceFac)) {
      throw new ForbiddenError('Doctor does not belong to the source facility', 'FORBIDDEN');
    }

    const allowed = await AuthorizationPolicy.canViewPatient(auth, patientId);
    if (!allowed) {
      throw new ForbiddenError('Unauthorized to refer this patient', 'FORBIDDEN');
    }

    const referral = await referralService.createReferral({
      patientId,
      sourceFacilityId: sourceFac,
      destinationFacilityId,
      reason,
      urgency,
    }, auth.userId);

    return successResponse(res, referral, 'Referral created', 201);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/doctor/referrals
 * List inbound referrals for doctor's facility
 */
doctorRouter.get('/referrals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const referrals = await prisma.referral.findMany({
      where: {
        destinationFacilityId: { in: auth.facilityIds },
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
 * POST /api/v1/doctor/referrals/:id/accept
 */
doctorRouter.post('/referrals/:id/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const id = String(req.params.id);

    const ref = await prisma.referral.findUnique({ where: { id } });
    if (!ref) throw new NotFoundError('Referral not found', 'REFERRAL_NOT_FOUND');

    if (!auth.facilityIds.includes(ref.destinationFacilityId) && !auth.isSuperAdmin) {
      throw new ForbiddenError('Doctor cannot accept referrals for another facility', 'FORBIDDEN');
    }

    const result = await referralService.acceptReferral(id, auth.userId);
    return successResponse(res, result, 'Referral accepted');
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/doctor/referrals/:id/reject
 */
doctorRouter.post('/referrals/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const id = String(req.params.id);
    const { reason } = req.body;

    const ref = await prisma.referral.findUnique({ where: { id } });
    if (!ref) throw new NotFoundError('Referral not found', 'REFERRAL_NOT_FOUND');

    if (!auth.facilityIds.includes(ref.destinationFacilityId) && !auth.isSuperAdmin) {
      throw new ForbiddenError('Doctor cannot reject referrals for another facility', 'FORBIDDEN');
    }

    const result = await referralService.rejectReferral(id, reason || 'Capacity exceeded', auth.userId);
    return successResponse(res, result, 'Referral rejected');
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/doctor/queues/:facilityId/call-next
 */
doctorRouter.post('/queues/:facilityId/call-next', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const facilityId = String(req.params.facilityId);
    const { department } = req.body;

    const token = await queueService.callNext(facilityId, department, auth);
    return successResponse(res, token, 'Patient called into chamber');
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/doctor/queues/:facilityId/complete
 */
doctorRouter.post('/queues/:facilityId/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const facilityId = String(req.params.facilityId);
    const { tokenId } = req.body;

    const completed = await queueService.completeConsultation(facilityId, tokenId, auth);
    return successResponse(res, completed, 'Consultation marked completed');
  } catch (err) {
    next(err);
  }
});

export default doctorRouter;
