import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { referralService } from './referrals.service.js';
import {
  createReferralSchema,
  bookReferralAppointmentSchema,
  listReferralsSchema,
} from './referrals.schema.js';
import { recordAudit } from '../../middleware/audit.js';
import { getParam } from '../../utils/params.js';

export async function listReferrals(req: Request, res: Response, next: NextFunction) {
  try {
    const input = listReferralsSchema.parse(req.query);
    const result = await referralService.listReferrals(input as any);
    return sendSuccess(res, { items: result.items }, result.meta);
  } catch (err) {
    return next(err);
  }
}

export async function createReferral(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createReferralSchema.parse(req.body);
    const result = await referralService.createReferral(input, req.user!.id);
    await recordAudit(req, 'CREATE_REFERRAL', 'REFERRAL', result.id, { urgency: result.urgency });
    return sendSuccess(res, result, undefined, 201);
  } catch (err) {
    return next(err);
  }
}

export async function getReferralById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'id');
    const result = await referralService.getReferralById(id);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function getTimeline(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'id');
    const result = await referralService.getReferralTimeline(id);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function acceptReferral(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'id');
    const result = await referralService.acceptReferral(id, req.user?.name);
    await recordAudit(req, 'ACCEPT_REFERRAL', 'REFERRAL', result.id);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function rejectReferral(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'id');
    const reason = req.body.reason || 'Capacity exceeded';
    const result = await referralService.rejectReferral(id, reason, req.user?.name);
    await recordAudit(req, 'REJECT_REFERRAL', 'REFERRAL', result.id, { reason });
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function bookAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'id');
    const input = bookReferralAppointmentSchema.parse(req.body);
    const result = await referralService.bookAppointmentForReferral(id, input, req.user?.name);
    await recordAudit(req, 'BOOK_REFERRAL_APPOINTMENT', 'REFERRAL', id);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function markArrived(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'id');
    const result = await referralService.markPatientArrived(id, req.user?.name);
    await recordAudit(req, 'ARRIVE_REFERRAL', 'REFERRAL', result.id);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function markConsulted(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'id');
    const result = await referralService.markConsulted(id, req.user?.name);
    await recordAudit(req, 'CONSULT_REFERRAL', 'REFERRAL', result.id);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function completeReferral(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'id');
    const result = await referralService.completeReferral(id, req.user?.name);
    await recordAudit(req, 'COMPLETE_REFERRAL', 'REFERRAL', result.id);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function cancelReferral(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getParam(req, 'id');
    const reason = req.body.reason || 'Cancelled by user';
    const result = await referralService.cancelReferral(id, reason, req.user?.name);
    await recordAudit(req, 'CANCEL_REFERRAL', 'REFERRAL', result.id);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}
