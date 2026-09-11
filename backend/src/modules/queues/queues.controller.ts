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
    const priorityScore = input.priority === 'CRITICAL' ? 100 : input.priority === 'HIGH' ? 75 : input.priority === 'MEDIUM' ? 50 : 10;
    const result = await queueService.allocateQueueToken({
      facilityId,
      patientId: input.patientId,
      department: input.department,
      priority: priorityScore,
    });
    await recordAudit(req, 'JOIN_QUEUE', 'QUEUE_TOKEN', result.id, { tokenNumber: result.displayNumber });
    return sendSuccess(res, result, undefined, 201);
  } catch (err) {
    return next(err);
  }
}

export async function callNext(req: Request, res: Response, next: NextFunction) {
  try {
    const facilityId = getParam(req, 'facilityId');
    const result = await queueService.callNext(facilityId, undefined, req.auth);
    await recordAudit(req, 'CALL_NEXT_QUEUE', 'QUEUE_TOKEN', result.id, { tokenNumber: result.displayNumber });
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function completeQueue(req: Request, res: Response, next: NextFunction) {
  try {
    const facilityId = getParam(req, 'facilityId');
    const input = completeQueueSchema.parse(req.body);
    const result = await queueService.completeConsultation(facilityId, input.tokenId, req.auth);
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
