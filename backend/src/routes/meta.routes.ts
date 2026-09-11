import { Router, Request, Response } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { ROLE_PERMISSIONS } from '../authz/roles.js';
import { successResponse } from '../utils/response.js';

const metaRouter = Router();

metaRouter.get('/role-capabilities', optionalAuth, (req: Request, res: Response) => {
  const auth = req.auth;
  if (!auth) {
    return successResponse(res, {
      role: 'CITIZEN',
      permissions: ROLE_PERMISSIONS.CITIZEN,
      facilityIds: [],
      catchmentCodes: [],
      isAuthenticated: false,
    });
  }

  return successResponse(res, {
    role: auth.role,
    name: auth.name,
    userId: auth.userId,
    patientId: auth.patientId,
    facilityIds: auth.facilityIds,
    catchmentCodes: auth.catchmentCodes,
    districtCodes: auth.districtCodes,
    permissions: ROLE_PERMISSIONS[auth.role] || [],
    isAuthenticated: true,
  });
});

export default metaRouter;
