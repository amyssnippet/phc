import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { prisma } from '../config/database.js';
import { AuthorizationPolicy } from '../authz/policy.js';
import { NotFoundError, ForbiddenError, DomainError } from '../utils/errors.js';
import { successResponse } from '../utils/response.js';
import { serializeWorkerPatient, serializeCitizenReferral } from '../serializers/index.js';
import { triageService } from '../modules/triage/triage.service.js';
import { referralService } from '../modules/referrals/referrals.service.js';

const workerRouter = Router();

// Worker endpoints require CHW role
workerRouter.use(requireAuth);
workerRouter.use(requireRole('CHW', 'SUPER_ADMIN'));

/**
 * GET /api/v1/worker/me
 * Returns worker profile & assigned scope
 */
workerRouter.get('/me', async (req: Request, res: Response) => {
  const auth = req.auth!;
  return successResponse(res, {
    userId: auth.userId,
    name: auth.name,
    phone: auth.phone,
    role: auth.role,
    facilityIds: auth.facilityIds,
    catchmentCodes: auth.catchmentCodes,
  });
});

/**
 * GET /api/v1/worker/patients
 * Lists patients scoped to worker's assignment (registered by worker or belonging to worker's facility)
 */
workerRouter.get('/patients', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const { q, limit = 50 } = req.query;

    const where: any = {
      OR: [
        { registeredByUserId: auth.userId },
        ...(auth.facilityIds.length > 0 ? [{ registeredAtFacilityId: { in: auth.facilityIds } }] : []),
        ...(auth.catchmentCodes.length > 0 ? [{ catchmentCode: { in: auth.catchmentCodes } }] : []),
      ],
    };

    if (q && typeof q === 'string') {
      where.AND = [
        {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { patientCode: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
          ],
        },
      ];
    }

    const patients = await prisma.patient.findMany({
      where,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(res, {
      items: patients.map(serializeWorkerPatient),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/worker/patients
 * Registers new patient. Server forces createdByUserId and facilityId from authenticated context.
 */
workerRouter.post('/patients', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const { firstName, lastName, dateOfBirth, age, sex, phone, address, pincode, abhaReference, emergencyName, emergencyPhone } = req.body;

    if (!firstName) {
      throw new DomainError('First name is required', 'VALIDATION_ERROR');
    }

    const patientCode = `MH-P-${Math.floor(100000 + Math.random() * 900000)}`;

    let dob: Date | undefined;
    if (dateOfBirth) {
      dob = new Date(dateOfBirth);
    } else if (age) {
      const d = new Date();
      d.setFullYear(d.getFullYear() - Number(age));
      dob = d;
    }

    const patient = await prisma.patient.create({
      data: {
        patientCode,
        firstName,
        lastName,
        dateOfBirth: dob,
        sex,
        phone,
        address,
        pincode: pincode || '400067',
        abhaReference,
        emergencyName,
        emergencyPhone,
        registeredByUserId: auth.userId,
        registeredAtFacilityId: auth.facilityIds[0] || null,
        catchmentCode: auth.catchmentCodes[0] || 'MUMBAI_SUBURBAN',
        demoData: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: auth.userId,
        action: 'PATIENT_CREATE',
        entityType: 'PATIENT',
        entityId: patient.id,
        metadata: { patientCode: patient.patientCode, workerId: auth.userId },
      },
    });

    return successResponse(res, serializeWorkerPatient(patient), 'Patient registered successfully', 201);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/worker/patients/:id
 * Get patient details with strict authorization check
 */
workerRouter.get('/patients/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const id = String(req.params.id);

    const allowed = await AuthorizationPolicy.canViewPatient(auth, id);
    if (!allowed) {
      throw new ForbiddenError('You do not have authorization to view this patient', 'FORBIDDEN');
    }

    const patient: any = await prisma.patient.findUnique({
      where: { id },
      include: {
        triageSessions: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!patient) throw new NotFoundError('Patient not found', 'PATIENT_NOT_FOUND');

    return successResponse(res, {
      ...serializeWorkerPatient(patient),
      triageSessions: patient.triageSessions,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/worker/triage
 * Conduct syndromic triage with CDSS advisory
 */
workerRouter.post('/triage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const { patientId, facilityId, symptoms, vitals } = req.body;

    const allowed = await AuthorizationPolicy.canViewPatient(auth, patientId);
    if (!allowed) {
      throw new ForbiddenError('You do not have authorization to triage this patient', 'FORBIDDEN');
    }

    const targetFacilityId = facilityId || auth.facilityIds[0];
    if (!targetFacilityId) {
      throw new DomainError('Facility ID required for triage encounter', 'VALIDATION_ERROR');
    }

    // Create primary care encounter
    const encounter = await prisma.encounter.create({
      data: {
        patientId,
        facilityId: targetFacilityId,
        type: 'COMMUNITY_TRIAGE',
        chiefComplaint: Array.isArray(symptoms) ? symptoms.join(', ') : 'Routine screening',
        status: 'COMPLETED',
        demoData: true,
      },
    });

    const triage = await triageService.createSession({
      encounterId: encounter.id,
      patientId,
      symptoms: Array.isArray(symptoms) ? symptoms : [],
      vitals: vitals || {},
    });

    return successResponse(res, triage, 'Triage assessment complete with CDSS advisory', 201);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/worker/referrals
 * Create primary care referral to secondary/tertiary center
 */
workerRouter.post('/referrals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const { patientId, destinationFacilityId, sourceFacilityId, reason, urgency } = req.body;

    const sourceFac = sourceFacilityId || auth.facilityIds[0];
    if (!sourceFac) {
      throw new DomainError('Source facility ID required', 'VALIDATION_ERROR');
    }

    const allowed = await AuthorizationPolicy.canViewPatient(auth, patientId);
    if (!allowed) {
      throw new ForbiddenError('You do not have authorization to refer this patient', 'FORBIDDEN');
    }

    const referral = await referralService.createReferral({
      patientId,
      sourceFacilityId: sourceFac,
      destinationFacilityId,
      reason,
      urgency,
    }, auth.userId);

    return successResponse(res, serializeCitizenReferral(referral), 'Referral initiated successfully', 201);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/worker/referrals
 * List referrals initiated by worker or worker's facility
 */
workerRouter.get('/referrals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const referrals = await prisma.referral.findMany({
      where: {
        OR: [
          { createdById: auth.userId },
          ...(auth.facilityIds.length > 0 ? [{ sourceFacilityId: { in: auth.facilityIds } }] : []),
        ],
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, patientCode: true } },
        sourceFacility: { select: { id: true, name: true } },
        destinationFacility: { select: { id: true, name: true, facilityType: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(res, { items: referrals });
  } catch (err) {
    next(err);
  }
});

export default workerRouter;
