// src/middleware/rbac.middleware.ts
// Role-Based Access Control middleware

import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';
import { ERROR_CODES } from '../utils/errors';

// Permission system: 8-letter codes mapped from role
// club_admin, coach, athlete permissions defined in Firebase functions

export type Permission =
  // Club
  | 'club:read' | 'club:write' | 'club:settings'
  // User management
  | 'user:read' | 'user:write' | 'user:role' | 'user:invite' | 'user:delete'
  // Athlete
  | 'athlete:read' | 'athlete:write' | 'athlete:import'
  // Attendance
  | 'attendance:read' | 'attendance:write' | 'attendance:report'
  // Workout
  | 'workout:read' | 'workout:write' | 'workout:assign' | 'workout:template'
  // Performance
  | 'performance:read' | 'performance:write' | 'performance:report'
  // Injury
  | 'injury:read' | 'injury:write' | 'injury:rtp'
  // Permission letters
  | 'permission:read' | 'permission:write' | 'permission:approve'
  // Announcements
  | 'announcement:read' | 'announcement:write' | 'announcement:send'
  // Analytics
  | 'analytics:read' | 'analytics:report'
  // Profile (athlete own)
  | 'profile:read' | 'profile:write'
  | 'workout:complete'
  | 'injury:write:own'
  | 'permission:write:own'
  | 'analytics:read:own';

export type Role = 'system_admin' | 'club_admin' | 'coach' | 'athlete';

// Role hierarchy for inheritance checks
const ROLE_HIERARCHY: Record<Role, number> = {
  system_admin: 4,
  club_admin: 3,
  coach: 2,
  athlete: 1,
};

/**
 * Middleware to require specific role(s)
 */
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    const userRole = req.user.role;

    // System admin bypasses all role checks
    if (userRole === 'system_admin') {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return next(new ForbiddenError(
        `Requires one of: ${allowedRoles.join(', ')}`,
        { code: ERROR_CODES.FORBIDDEN }
      ));
    }

    next();
  };
};

/**
 * Middleware to require specific permission(s)
 * Checks user's permissions array from JWT claims
 */
export const requirePermission = (...requiredPermissions: Permission[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    const userPermissions = req.user.permissions || [];

    // System admin has all permissions
    if (req.user.role === 'system_admin' || userPermissions.includes('*')) {
      return next();
    }

    const hasPermission = requiredPermissions.some(p => userPermissions.includes(p));

    if (!hasPermission) {
      return next(new ForbiddenError(
        `Requires permission: ${requiredPermissions.join(' or ')}`,
        { code: ERROR_CODES.FORBIDDEN }
      ));
    }

    next();
  };
};

/**
 * Middleware to require minimum role level
 * Uses role hierarchy: system_admin > club_admin > coach > athlete
 */
export const requireMinRole = (minRole: Role) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel < requiredLevel) {
      return next(new ForbiddenError(
        `Requires minimum role: ${minRole}`,
        { code: ERROR_CODES.FORBIDDEN }
      ));
    }

    next();
  };
};

/**
 * Middleware to check if user owns the resource or has admin permission
 * Use for athlete updating own profile, etc.
 */
export const requireOwnershipOrPermission = (
  getResourceUserId: (req: Request) => string,
  adminPermission: Permission
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    const resourceUserId = getResourceUserId(req);

    // Allow if owner
    if (req.user.uid === resourceUserId) {
      return next();
    }

    // Allow if has admin permission
    const userPermissions = req.user.permissions || [];
    if (req.user.role === 'system_admin' || userPermissions.includes(adminPermission)) {
      return next();
    }

    return next(new ForbiddenError(
      'Not authorized to access this resource',
      { code: ERROR_CODES.FORBIDDEN }
    ));
  };
};