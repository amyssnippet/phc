import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { patientService } from './patients.service.js';
import { createPatientSchema, updatePatientSchema, searchPatientSchema } from './patients.schema.js';
import { recordAudit } from '../../middleware/audit.js';
import { getParam } from '../../utils/params.js';
import { AuthorizationPolicy } from '../../authz/policy.js';
import { ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { serializeCitizenPatient, serializeDoctorPatient, serializeWorkerPatient } from '../../serializers/index.js';

export async function listPatients(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    if (!auth || auth.role === 'CITIZEN') {
      throw new ForbiddenError('Citizens are not permitted to list patient directory', 'FORBIDDEN');
    }

    const input = searchPatientSchema.parse(req.query);
    const result = await patientService.listPatients(input);

    const items = auth.role === 'DOCTOR'
      ? result.items.map(serializeDoctorPatient)
      : result.items.map(serializeWorkerPatient);

    return sendSuccess(res, { items }, result.meta);
  } catch (err) {
    return next(err);
  }
}

export async function createPatient(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    const input = createPatientSchema.parse(req.body);
    const patient = await patientService.createPatient(input);
    await recordAudit(req, 'CREATE_PATIENT', 'PATIENT', patient.id, { code: patient.patientCode });
    return sendSuccess(res, serializeCitizenPatient(patient), undefined, 201);
  } catch (err) {
    return next(err);
  }
}

export async function getPatientById(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    const patientId = getParam(req, 'id');

    if (auth) {
      const allowed = await AuthorizationPolicy.canViewPatient(auth, patientId);
      if (!allowed) {
        throw new ForbiddenError('You are not authorized to view this patient record', 'FORBIDDEN');
      }
    }

    const patient = await patientService.getPatientById(patientId);
    if (!patient) throw new NotFoundError('Patient not found', 'PATIENT_NOT_FOUND');

    let serialized: any = serializeCitizenPatient(patient);
    if (auth?.role === 'DOCTOR') serialized = serializeDoctorPatient(patient);
    else if (auth?.role === 'CHW') serialized = serializeWorkerPatient(patient);

    return sendSuccess(res, serialized);
  } catch (err) {
    return next(err);
  }
}

export async function updatePatient(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    const patientId = getParam(req, 'id');

    if (auth) {
      const allowed = await AuthorizationPolicy.canViewPatient(auth, patientId);
      if (!allowed) {
        throw new ForbiddenError('You are not authorized to update this patient record', 'FORBIDDEN');
      }
    }

    const input = updatePatientSchema.parse(req.body);
    const patient = await patientService.updatePatient(patientId, input);
    await recordAudit(req, 'UPDATE_PATIENT', 'PATIENT', patient.id);
    return sendSuccess(res, serializeCitizenPatient(patient));
  } catch (err) {
    return next(err);
  }
}

export async function getPatientTimeline(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    const patientId = getParam(req, 'id');

    if (auth) {
      const allowed = await AuthorizationPolicy.canViewPatient(auth, patientId);
      if (!allowed) {
        throw new ForbiddenError('You are not authorized to view this patient timeline', 'FORBIDDEN');
      }
    }

    const timeline = await patientService.getPatientTimeline(patientId);
    return sendSuccess(res, timeline);
  } catch (err) {
    return next(err);
  }
}

export async function getPatientReferrals(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    const patientId = getParam(req, 'id');

    if (auth) {
      const allowed = await AuthorizationPolicy.canViewPatient(auth, patientId);
      if (!allowed) {
        throw new ForbiddenError('You are not authorized to view this patient referrals', 'FORBIDDEN');
      }
    }

    const referrals = await patientService.getPatientReferrals(patientId);
    return sendSuccess(res, referrals);
  } catch (err) {
    return next(err);
  }
}

export async function getPatientFollowups(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    const patientId = getParam(req, 'id');

    if (auth) {
      const allowed = await AuthorizationPolicy.canViewPatient(auth, patientId);
      if (!allowed) {
        throw new ForbiddenError('You are not authorized to view this patient followups', 'FORBIDDEN');
      }
    }

    const followups = await patientService.getPatientFollowups(patientId);
    return sendSuccess(res, followups);
  } catch (err) {
    return next(err);
  }
}

export async function getPatientAppointments(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    const patientId = getParam(req, 'id');

    if (auth) {
      const allowed = await AuthorizationPolicy.canViewPatient(auth, patientId);
      if (!allowed) {
        throw new ForbiddenError('You are not authorized to view this patient appointments', 'FORBIDDEN');
      }
    }

    const appointments = await patientService.getPatientAppointments(patientId);
    return sendSuccess(res, appointments);
  } catch (err) {
    return next(err);
  }
}
