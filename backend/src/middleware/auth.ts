import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AuthError, ForbiddenError } from '../utils/errors.js';
import { AuthContext, resolveUserAuthContext } from '../authz/scopes.js';
import { UserRole, hasPermission } from '../authz/roles.js';

export interface AuthUser {
  id: string;
  phone: string;
  role: UserRole;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      auth?: AuthContext;
    }
  }
}

export function generateAccessToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      phone: user.phone,
      role: user.role,
      name: user.name,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '30m' }
  );
}

export function generateRefreshToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      phone: user.phone,
    },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AuthError('Authorization header missing or invalid format', 'AUTH_REQUIRED'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser;
    req.user = decoded;

    // Resolve authoritative server-side scope and memberships
    const authContext = await resolveUserAuthContext(decoded.id);
    if (!authContext) {
      return next(new AuthError('User account not found or inactive', 'AUTH_REQUIRED'));
    }

    req.auth = authContext;
    next();
  } catch (err: any) {
    return next(new AuthError(err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token', 'AUTH_REQUIRED'));
  }
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser;
      req.user = decoded;
      const authContext = await resolveUserAuthContext(decoded.id);
      if (authContext) {
        req.auth = authContext;
      }
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new AuthError('Authentication required', 'AUTH_REQUIRED'));
    }
    if (!roles.includes(req.auth.role) && !req.auth.isSuperAdmin) {
      return next(new ForbiddenError(`Operation requires one of roles: ${roles.join(', ')}`, 'FORBIDDEN'));
    }
    next();
  };
}

export function requirePerm(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new AuthError('Authentication required', 'AUTH_REQUIRED'));
    }
    if (!hasPermission(req.auth.role, permission) && !req.auth.isSuperAdmin) {
      return next(new ForbiddenError(`Missing required permission: ${permission}`, 'FORBIDDEN'));
    }
    next();
  };
}
