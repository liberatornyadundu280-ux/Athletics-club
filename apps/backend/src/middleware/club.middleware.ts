// apps/backend/src/middleware/club.middleware.ts
// Injects clubId into request for multi-tenant data isolation

import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';
import { ERROR_CODES } from '@stms/shared/constants/errors';

declare global {
  namespace Express {
    interface Request {
      clubId: string;
    }
  }
}

/**
 * Middleware that injects activeClubId as clubId on request
 * Must be used AFTER authenticate middleware
 */
export const injectClubId = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(new ForbiddenError('Authentication required'));
  }

  if (!req.user.activeClubId) {
    return next(new ForbiddenError('No active club selected. Use POST /auth/switch-club first.', {
      code: ERROR_CODES.CLUB_ACCESS_DENIED,
    }));
  }

  req.clubId = req.user.activeClubId;
  next();
};

/**
 * Middleware to verify user has access to a specific club
 * Use for endpoints that take clubId as param (e.g., /clubs/:id)
 */
export const verifyClubAccess = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(new ForbiddenError('Authentication required'));
  }

  const requestedClubId = req.params.clubId || req.params.id;

  if (!requestedClubId) {
    return next();
  }

  // System admins can access any club
  if (req.user.role === 'system_admin') {
    req.clubId = requestedClubId;
    return next();
  }

  // Check if user is member of requested club
  if (!req.user.clubIds.includes(requestedClubId)) {
    return next(new ForbiddenError('Access denied to this club', {
      code: ERROR_CODES.CLUB_ACCESS_DENIED,
    }));
  }

  req.clubId = requestedClubId;
  next();
};

/**
 * Middleware to verify user has active membership in current club
 */
export const requireActiveMembership = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(new ForbiddenError('Authentication required'));
  }

  if (!req.user.activeClubId) {
    return next(new ForbiddenError('No active club selected', {
      code: ERROR_CODES.CLUB_ACCESS_DENIED,
    }));
  }

  // Additional check: verify membership is active (could query DB here)
  // For now, trust the JWT claims which are synced from Firestore
  next();
};