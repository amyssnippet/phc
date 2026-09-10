import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { sendSuccess } from '../../utils/response.js';
import { getParam } from '../../utils/params.js';

const router = Router();

router.get('/facilities/:facilityId/diagnostics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.diagnosticService.findMany({
      where: { facilityId: getParam(req, 'facilityId') },
    });
    return sendSuccess(res, { items });
  } catch (err) {
    return next(err);
  }
});

export default router;
