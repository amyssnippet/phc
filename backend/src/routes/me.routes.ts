import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../config/database.js';
import { appointmentService } from '../modules/appointments/appointments.service.js';
import { queueService } from '../modules/queues/queues.service.js';
import { NotFoundError, ForbiddenError, DomainError } from '../utils/errors.js';
import { successResponse } from '../utils/response.js';
import {
  serializeCitizenPatient,
  serializeCitizenAppointment,
  serializeCitizenQueueStatus,
  serializeCitizenReferral,
} from '../serializers/index.js';

const meRouter = Router();

// All /me routes require authentication
meRouter.use(requireAuth);

/**
 * GET /api/v1/me
 * Returns current authenticated user and linked citizen patient profile
 */
meRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: { patient: true },
    });

    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

    return successResponse(res, {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      preferredLanguage: user.preferredLanguage,
      patient: serializeCitizenPatient(user.patient),
      facilityIds: auth.facilityIds,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/me/appointments
 * Lists authenticated citizen's own appointments
 */
meRouter.get('/appointments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    if (!auth.patientId) {
      return successResponse(res, { items: [] });
    }

    const appointments = await prisma.appointment.findMany({
      where: { patientId: auth.patientId },
      include: {
        facility: true,
        queueToken: true,
      },
      orderBy: { appointmentDate: 'desc' },
    });

    return successResponse(res, {
      items: appointments.map(serializeCitizenAppointment),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/me/appointments
 * Citizen books an appointment. The server binds it strictly to req.auth.patientId.
 * No client-supplied patientId is trusted!
 */
meRouter.post('/appointments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    if (!auth.patientId) {
      // If user has no patient record, create or link one for the citizen
      let patient = await prisma.patient.findFirst({ where: { userId: auth.userId } });
      if (!patient) {
        patient = await prisma.patient.create({
          data: {
            userId: auth.userId,
            patientCode: `MH-P-${Math.floor(100000 + Math.random() * 900000)}`,
            firstName: auth.name.split(' ')[0] || 'Citizen',
            lastName: auth.name.split(' ').slice(1).join(' ') || undefined,
            phone: auth.phone,
            pincode: '400067',
            demoData: true,
          },
        });
      }
      auth.patientId = patient.id;
    }

    const { facilityId, appointmentDate, startTime, endTime, department } = req.body;
    if (!facilityId || !appointmentDate) {
      throw new DomainError('Facility and appointment date are required', 'VALIDATION_ERROR');
    }

    const result = await appointmentService.createAppointment(
      {
        facilityId,
        patientId: auth.patientId,
        appointmentDate,
        startTime: startTime || '09:00',
        endTime: endTime || '09:30',
        department: department || 'GENERAL_MEDICINE',
        source: 'CITIZEN',
      },
      auth
    );

    return successResponse(res, serializeCitizenAppointment(result), 'Appointment booked successfully', 201);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/me/appointments/:id
 * Get own appointment details
 */
meRouter.get('/appointments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const id = String(req.params.id);

    const appointment = await appointmentService.getAppointmentById(id, auth);
    if (!appointment || (auth.role === 'CITIZEN' && appointment.patientId !== auth.patientId)) {
      throw new NotFoundError('Appointment not found', 'APPOINTMENT_NOT_FOUND');
    }

    return successResponse(res, serializeCitizenAppointment(appointment));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/me/appointments/:id/cancel
 * Cancel own appointment
 */
meRouter.post('/appointments/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const id = String(req.params.id);

    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment || (auth.role === 'CITIZEN' && appointment.patientId !== auth.patientId)) {
      throw new NotFoundError('Appointment not found', 'APPOINTMENT_NOT_FOUND');
    }

    const result = await appointmentService.cancelAppointment(id, auth);
    return successResponse(res, serializeCitizenAppointment(result), 'Appointment cancelled successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/me/queue-status
 * Live OPD queue status for authenticated citizen (only own token + anonymous position)
 */
meRouter.get('/queue-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    if (!auth.patientId) {
      return successResponse(res, null);
    }

    const queueStatus = await queueService.getCitizenQueueStatus(auth.patientId);
    if (!queueStatus) {
      return successResponse(res, null);
    }

    return successResponse(
      res,
      serializeCitizenQueueStatus(
        queueStatus.token,
        queueStatus.currentlyServingNumber,
        queueStatus.aheadCount
      )
    );
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/me/referrals
 * List own referrals
 */
meRouter.get('/referrals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    if (!auth.patientId) {
      return successResponse(res, { items: [] });
    }

    const referrals = await prisma.referral.findMany({
      where: { patientId: auth.patientId },
      include: {
        sourceFacility: true,
        destinationFacility: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(res, {
      items: referrals.map(serializeCitizenReferral),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/me/referrals/:id
 * Get own referral details
 */
meRouter.get('/referrals/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const id = String(req.params.id);

    const referral = await prisma.referral.findUnique({
      where: { id },
      include: {
        sourceFacility: true,
        destinationFacility: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!referral || (auth.role === 'CITIZEN' && referral.patientId !== auth.patientId)) {
      throw new NotFoundError('Referral not found', 'REFERRAL_NOT_FOUND');
    }

    return successResponse(res, serializeCitizenReferral(referral));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/me/referrals/:id/timeline
 * Get own referral timeline
 */
meRouter.get('/referrals/:id/timeline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const id = String(req.params.id);

    const referral: any = await prisma.referral.findUnique({
      where: { id },
      include: {
        sourceFacility: true,
        destinationFacility: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!referral || (auth.role === 'CITIZEN' && referral.patientId !== auth.patientId)) {
      throw new NotFoundError('Referral not found', 'REFERRAL_NOT_FOUND');
    }

    return successResponse(res, {
      referralId: referral.id,
      status: referral.status,
      milestones: ((referral.events as any[]) || []).map((e: any) => ({
        eventType: e.eventType,
        createdAt: e.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/me/care-timeline
 * Own clinical timeline (encounters and triage sessions)
 */
meRouter.get('/care-timeline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    if (!auth.patientId) {
      return successResponse(res, { timeline: [] });
    }

    const encounters = await prisma.encounter.findMany({
      where: { patientId: auth.patientId },
      include: {
        facility: { select: { id: true, name: true, facilityType: true } },
        triageSession: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const timeline = encounters.map((e) => ({
      id: e.id,
      type: e.type,
      facility: e.facility,
      status: e.status,
      chiefComplaint: e.chiefComplaint,
      date: e.createdAt,
      triage: e.triageSession
        ? {
            urgency: e.triageSession.urgency,
            recommendedAction: e.triageSession.recommendedAction,
          }
        : null,
    }));

    return successResponse(res, { timeline });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/me/followups
 * List own follow-ups
 */
meRouter.get('/followups', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    if (!auth.patientId) {
      return successResponse(res, { items: [] });
    }

    const followups = await prisma.followUp.findMany({
      where: { patientId: auth.patientId },
      orderBy: { dueDate: 'asc' },
    });

    return successResponse(res, {
      items: followups.map((f) => ({
        id: f.id,
        type: f.type,
        dueDate: f.dueDate,
        status: f.status,
        notes: f.notes,
        completedAt: f.completedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/me/notifications
 * List own notifications
 */
meRouter.get('/notifications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const notifications = await prisma.notification.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return successResponse(res, { items: notifications });
  } catch (err) {
    next(err);
  }
});

export default meRouter;
