import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { careRoutingService } from './care-routing.service.js';
import { careRoutingRequestSchema } from './care-routing.schema.js';

export async function recommend(req: Request, res: Response, next: NextFunction) {
  try {
    const input = careRoutingRequestSchema.parse(req.body);
    const result = await careRoutingService.recommendFacilities(input);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, { message: 'Care routing configuration', id: req.params.id });
  } catch (err) {
    return next(err);
  }
}
