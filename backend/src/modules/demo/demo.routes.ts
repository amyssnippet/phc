import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { resetDemoState } from './demo.service.js';
import { sendSuccess } from '../../utils/response.js';
import { DomainError } from '../../utils/errors.js';

const router = Router();

router.use((req, res, next) => {
  if (!env.DEMO_MODE) {
    return next(new DomainError('Demo mode is disabled in production', 'DEMO_MODE_DISABLED'));
  }
  next();
});

router.post('/reset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await resetDemoState();
    return sendSuccess(res, { message: 'Demo environment reset to clean initial state' });
  } catch (err) {
    return next(err);
  }
});

router.post('/scenarios/full-care-journey', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { patientCode: 'MH-P-000101' },
    });

    const appointment = await prisma.appointment.findFirst({
      where: { patientId: patient!.id },
      include: { queueToken: true },
    });

    const encounter = await prisma.encounter.findFirst({
      where: { patientId: patient!.id },
      include: { triageSession: true },
    });

    const referral = await prisma.referral.findFirst({
      where: { patientId: patient!.id },
    });

    const followup = await prisma.followUp.findFirst({
      where: { patientId: patient!.id },
    });

    return sendSuccess(res, {
      patientId: patient!.id,
      patientCode: patient!.patientCode,
      appointmentId: appointment?.id || null,
      queueTokenId: appointment?.queueToken?.id || null,
      encounterId: encounter?.id || null,
      triageId: encounter?.triageSession?.id || null,
      referralId: referral?.id || null,
      followupId: followup?.id || null,
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [patientCount, referralCount, appointmentCount] = await Promise.all([
      prisma.patient.count({ where: { demoData: true } }),
      prisma.referral.count({ where: { demoData: true } }),
      prisma.appointment.count({ where: { demoData: true } }),
    ]);

    return sendSuccess(res, {
      demoMode: true,
      syntheticPatients: patientCount,
      syntheticReferrals: referralCount,
      syntheticAppointments: appointmentCount,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
