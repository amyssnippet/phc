import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AuthError, ForbiddenError } from '../utils/errors.js';

export interface AuthUser {
  id: string;
  phone: string;
  role: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
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
    { expiresIn: '15m' }
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

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AuthError('Authorization header missing or invalid format', 'AUTH_REQUIRED'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (err: any) {
    return next(new AuthError(err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token', 'AUTH_REQUIRED'));
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser;
      req.user = decoded;
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthError('Authentication required', 'AUTH_REQUIRED'));
    }
    if (!roles.includes(req.user.role) && req.user.role !== 'SUPER_ADMIN') {
      return next(new ForbiddenError(`Operation requires one of roles: ${roles.join(', ')}`, 'FORBIDDEN'));
    }
    next();
  };
}
