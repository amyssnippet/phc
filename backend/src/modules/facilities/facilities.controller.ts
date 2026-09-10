import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { facilityService } from './facilities.service.js';
import { nearbyFacilitySchema, searchFacilitySchema, mapBoundsSchema } from './facilities.schema.js';
import { getParam } from '../../utils/params.js';

export async function getNearby(req: Request, res: Response, next: NextFunction) {
  try {
    const input = nearbyFacilitySchema.parse(req.query);
    const result = await facilityService.findNearby(input);
    return sendSuccess(res, { items: result.items }, { count: result.count });
  } catch (err) {
    return next(err);
  }
}

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const input = searchFacilitySchema.parse(req.query);
    const result = await facilityService.searchFacilities(input);
    return sendSuccess(res, { items: result.items }, result.meta);
  } catch (err) {
    return next(err);
  }
}

export async function getMap(req: Request, res: Response, next: NextFunction) {
  try {
    const bounds = mapBoundsSchema.parse(req.query);
    const result = await facilityService.getMapFacilities(bounds);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await facilityService.getFacilityById(getParam(req, 'id'));
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function getHours(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await facilityService.getHours(getParam(req, 'id'));
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function getSpecialties(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await facilityService.getSpecialties(getParam(req, 'id'));
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function getResources(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await facilityService.getResources(getParam(req, 'id'));
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function getQueue(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await facilityService.getQueueState(getParam(req, 'id'));
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function getDiagnostics(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await facilityService.getDiagnostics(getParam(req, 'id'));
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}
