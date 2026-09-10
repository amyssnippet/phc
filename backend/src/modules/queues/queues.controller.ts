import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { queueService } from './queues.service.js';
import { joinQueueSchema, completeQueueSchema } from './queues.schema.js';
import { recordAudit } from '../../middleware/audit.js';
import { getParam } from '../../utils/params.js';

export async function getQueueState(req: Request, res: Response, next: NextFunction) {
  try {
    const facilityId = getParam(req, 'facilityId');
    const result = await queueService.getFacilityQueue(facilityId);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function joinQueue(req: Request, res: Response, next: NextFunction) {
  try {
    const facilityId = getParam(req, 'facilityId');
    const input = joinQueueSchema.parse(req.body);
    const result = await queueService.joinQueue(
      facilityId,
      input.patientId,
      input.department,
      input.priority
    );
    await recordAudit(req, 'JOIN_QUEUE', 'QUEUE_TOKEN', result.id, { tokenNumber: result.tokenNumber });
    return sendSuccess(res, result, undefined, 201);
  } catch (err) {
    return next(err);
  }
}

export async function callNext(req: Request, res: Response, next: NextFunction) {
  try {
    const facilityId = getParam(req, 'facilityId');
    const result = await queueService.callNext(facilityId);
    await recordAudit(req, 'CALL_NEXT_QUEUE', 'QUEUE_TOKEN', result.id, { tokenNumber: result.tokenNumber });
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function completeQueue(req: Request, res: Response, next: NextFunction) {
  try {
    const facilityId = getParam(req, 'facilityId');
    const input = completeQueueSchema.parse(req.body);
    const result = await queueService.completeCurrent(facilityId, input.tokenId);
    await recordAudit(req, 'COMPLETE_QUEUE', 'QUEUE_TOKEN', result.id);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function streamQueue(req: Request, res: Response, next: NextFunction) {
  const facilityId = getParam(req, 'facilityId');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendUpdate = async () => {
    try {
      const data = await queueService.getFacilityQueue(facilityId);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      // Ignore disconnect
    }
  };

  await sendUpdate();
  const interval = setInterval(sendUpdate, 3000);

  req.on('close', () => {
    clearInterval(interval);
  });
}
