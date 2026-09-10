import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { patientService } from './patients.service.js';
import { createPatientSchema, updatePatientSchema, searchPatientSchema } from './patients.schema.js';
import { recordAudit } from '../../middleware/audit.js';
import { getParam } from '../../utils/params.js';

export async function listPatients(req: Request, res: Response, next: NextFunction) {
  try {
    const input = searchPatientSchema.parse(req.query);
    const result = await patientService.listPatients(input);
    return sendSuccess(res, { items: result.items }, result.meta);
  } catch (err) {
    return next(err);
  }
}

export async function createPatient(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createPatientSchema.parse(req.body);
    const patient = await patientService.createPatient(input);
    await recordAudit(req, 'CREATE_PATIENT', 'PATIENT', patient.id, { code: patient.patientCode });
    return sendSuccess(res, patient, undefined, 201);
  } catch (err) {
    return next(err);
  }
}

export async function getPatientById(req: Request, res: Response, next: NextFunction) {
  try {
    const patient = await patientService.getPatientById(getParam(req, 'id'));
    return sendSuccess(res, patient);
  } catch (err) {
    return next(err);
  }
}

export async function updatePatient(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updatePatientSchema.parse(req.body);
    const patient = await patientService.updatePatient(getParam(req, 'id'), input);
    await recordAudit(req, 'UPDATE_PATIENT', 'PATIENT', patient.id);
    return sendSuccess(res, patient);
  } catch (err) {
    return next(err);
  }
}

export async function getPatientTimeline(req: Request, res: Response, next: NextFunction) {
  try {
    const timeline = await patientService.getPatientTimeline(getParam(req, 'id'));
    return sendSuccess(res, timeline);
  } catch (err) {
    return next(err);
  }
}

export async function getPatientReferrals(req: Request, res: Response, next: NextFunction) {
  try {
    const referrals = await patientService.getPatientReferrals(getParam(req, 'id'));
    return sendSuccess(res, referrals);
  } catch (err) {
    return next(err);
  }
}

export async function getPatientFollowups(req: Request, res: Response, next: NextFunction) {
  try {
    const followups = await patientService.getPatientFollowups(getParam(req, 'id'));
    return sendSuccess(res, followups);
  } catch (err) {
    return next(err);
  }
}

export async function getPatientAppointments(req: Request, res: Response, next: NextFunction) {
  try {
    const appointments = await patientService.getPatientAppointments(getParam(req, 'id'));
    return sendSuccess(res, appointments);
  } catch (err) {
    return next(err);
  }
}
