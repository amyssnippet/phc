import { Router, Request, Response, NextFunction } from 'express';
import { facilitiesService } from '../modules/facilities/facilities.service.js';
import { successResponse } from '../utils/response.js';
import { serializePublicFacility } from '../serializers/index.js';
import { prisma } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';

const publicRouter = Router();

/**
 * GET /api/v1/public/facilities
 * Public facility catalogue (strictly sanitized)
 */
publicRouter.get('/facilities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, pincode, specialty, page = 1, limit = 20 } = req.query;
    const result = await facilitiesService.searchFacilities({
      q: q as string | undefined,
      pincode: pincode as string | undefined,
      specialty: specialty as string | undefined,
      page: Number(page),
      limit: Number(limit),
    });

    return successResponse(res, {
      items: result.items.map(serializePublicFacility),
      meta: result.meta,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/public/facilities/search
 */
publicRouter.get('/facilities/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, pincode, specialty, page = 1, limit = 20 } = req.query;
    const result = await facilitiesService.searchFacilities({
      q: q as string | undefined,
      pincode: pincode as string | undefined,
      specialty: specialty as string | undefined,
      page: Number(page),
      limit: Number(limit),
    });

    return successResponse(res, {
      items: result.items.map(serializePublicFacility),
      meta: result.meta,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/public/facilities/nearby
 */
publicRouter.get('/facilities/nearby', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lat, lng, radius = 5, specialty, openNow } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: { message: 'lat and lng query parameters required' } });
    }

    const result = await facilitiesService.findNearby({
      lat: Number(lat),
      lng: Number(lng),
      radius: Number(radius),
      specialty: specialty as string | undefined,
      openNow: openNow === 'true',
    });

    return successResponse(res, {
      items: result.items,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/public/facilities/:id
 */
publicRouter.get('/facilities/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const facility = await prisma.facility.findUnique({
      where: { id },
      include: {
        hours: true,
        specialties: true,
        resources: true,
        demoCapabilities: true,
      },
    });

    if (!facility) throw new NotFoundError('Facility not found', 'FACILITY_NOT_FOUND');

    return successResponse(res, serializePublicFacility(facility));
  } catch (err) {
    next(err);
  }
});

export default publicRouter;
