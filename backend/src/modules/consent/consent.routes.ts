import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { sendSuccess } from '../../utils/response.js';
import { requireAuth } from '../../middleware/auth.js';
import { ConsentStatus } from '@prisma/client';
import { getParam } from '../../utils/params.js';

const router = Router();

const createConsentSchema = z.object({
  patientId: z.string().uuid(),
  purpose: z.string().min(3),
  scope: z.record(z.any()).default({}),
});

router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.consentRecord.findMany({
      where: { requestingUserId: req.user!.id },
      include: { patient: true },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, { items });
  } catch (err) {
    return next(err);
  }
});

router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createConsentSchema.parse(req.body);
    const consent = await prisma.consentRecord.create({
      data: {
        patientId: input.patientId,
        requestingUserId: req.user!.id,
        purpose: input.purpose,
        scope: input.scope,
        status: ConsentStatus.GRANTED,
        grantedAt: new Date(),
      },
    });
    return sendSuccess(res, consent, undefined, 201);
  } catch (err) {
    return next(err);
  }
});

router.post('/:id/revoke', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const consent = await prisma.consentRecord.update({
      where: { id: getParam(req, 'id') },
      data: {
        status: ConsentStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
    return sendSuccess(res, consent);
  } catch (err) {
    return next(err);
  }
});

export default router;
