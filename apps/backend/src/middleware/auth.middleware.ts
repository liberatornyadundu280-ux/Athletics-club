// apps/backend/src/middleware/auth.middleware.ts
// JWT authentication middleware with RS256 verification

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { ERROR_CODES } from '@stms/shared/constants/errors';

export interface JWTPayload {
  uid: string;
  email: string;
  role: 'system_admin' | 'club_admin' | 'coach' | 'athlete';
  clubIds: string[];
  activeClubId: string | null;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.slice(7); // Remove 'Bearer '

    // Verify RS256 token
    const payload = jwt.verify(token, env.JWT_PUBLIC_KEY, {
      algorithms: ['RS256'],
      issuer: 'stms-backend',
      audience: 'stms-frontend',
    }) as JWTPayload;

    // Additional validation
    if (!payload.uid || !payload.email) {
      throw new UnauthorizedError('Invalid token payload');
    }

    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError('Token expired', { code: ERROR_CODES.TOKEN_EXPIRED }));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new UnauthorizedError('Invalid token', { code: ERROR_CODES.TOKEN_INVALID }));
    }
    next(error);
  }
};

/**
 * Optional authentication - doesn't throw if no token
 * Useful for public endpoints that can benefit from user context
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.slice(7);
    const payload = jwt.verify(token, env.JWT_PUBLIC_KEY, {
      algorithms: ['RS256'],
      issuer: 'stms-backend',
      audience: 'stms-frontend',
    }) as JWTPayload;

    req.user = payload;
    next();
  } catch {
    // Silently ignore invalid tokens for optional auth
    next();
  }
};