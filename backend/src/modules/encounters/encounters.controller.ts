import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { encounterService } from './encounters.service.js';
import { createEncounterSchema, updateEncounterSchema } from './encounters.schema.js';
import { recordAudit } from '../../middleware/audit.js';
import { getParam } from '../../utils/params.js';

export async function createEncounter(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createEncounterSchema.parse(req.body);
    const encounter = await encounterService.createEncounter(input);
    await recordAudit(req, 'CREATE_ENCOUNTER', 'ENCOUNTER', encounter.id);
    return sendSuccess(res, encounter, undefined, 201);
  } catch (err) {
    return next(err);
  }
}

export async function getEncounterById(req: Request, res: Response, next: NextFunction) {
  try {
    const encounter = await encounterService.getEncounterById(getParam(req, 'id'));
    return sendSuccess(res, encounter);
  } catch (err) {
    return next(err);
  }
}

export async function updateEncounter(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateEncounterSchema.parse(req.body);
    const encounter = await encounterService.updateEncounter(getParam(req, 'id'), input);
    await recordAudit(req, 'UPDATE_ENCOUNTER', 'ENCOUNTER', encounter.id);
    return sendSuccess(res, encounter);
  } catch (err) {
    return next(err);
  }
}

export async function completeEncounter(req: Request, res: Response, next: NextFunction) {
  try {
    const encounter = await encounterService.completeEncounter(getParam(req, 'id'));
    await recordAudit(req, 'COMPLETE_ENCOUNTER', 'ENCOUNTER', encounter.id);
    return sendSuccess(res, encounter);
  } catch (err) {
    return next(err);
  }
}
