import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { appointmentService } from './appointments.service.js';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  listAppointmentsSchema,
} from './appointments.schema.js';
import { recordAudit } from '../../middleware/audit.js';
import { getParam } from '../../utils/params.js';

export async function listAppointments(req: Request, res: Response, next: NextFunction) {
  try {
    const input = listAppointmentsSchema.parse(req.query);
    const result = await appointmentService.listAppointments(input);
    return sendSuccess(res, { items: result.items }, result.meta);
  } catch (err) {
    return next(err);
  }
}

export async function createAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createAppointmentSchema.parse(req.body);
    const result = await appointmentService.createAppointment(input, req.auth);
    await recordAudit(req, 'BOOK_APPOINTMENT', 'APPOINTMENT', result.id, { token: result.tokenNumber });
    return sendSuccess(res, result, undefined, 201);
  } catch (err) {
    return next(err);
  }
}

export async function getAppointmentById(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await appointmentService.getAppointmentById(getParam(req, 'id'));
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function updateAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateAppointmentSchema.parse(req.body);
    const result = await appointmentService.updateAppointment(getParam(req, 'id'), input);
    await recordAudit(req, 'UPDATE_APPOINTMENT', 'APPOINTMENT', result.id);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function checkIn(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await appointmentService.checkInAppointment(getParam(req, 'id'));
    await recordAudit(req, 'CHECKIN_APPOINTMENT', 'APPOINTMENT', result.id);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function cancelAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await appointmentService.cancelAppointment(getParam(req, 'id'), req.auth);
    await recordAudit(req, 'CANCEL_APPOINTMENT', 'APPOINTMENT', result.id);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}
