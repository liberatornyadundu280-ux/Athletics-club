// @stms/shared - Role Definitions & Hierarchy
// Single source of truth for all role-related constants

import { UserRole, MembershipRole } from '../types';

// ==================== ROLE HIERARCHY ====================

/**
 * Role hierarchy level (higher = more permissions)
 * SYSTEM_ADMIN > CLUB_ADMIN > COACH > ATHLETE
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SYSTEM_ADMIN]: 4,
  [UserRole.CLUB_ADMIN]: 3,
  [UserRole.COACH]: 2,
  [UserRole.ATHLETE]: 1,
};

/**
 * Check if a role meets minimum required level
 */
export function hasMinRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Get all roles at or above a certain level
 */
export function getRolesAtOrAbove(minRole: UserRole): UserRole[] {
  const minLevel = ROLE_HIERARCHY[minRole];
  return Object.entries(ROLE_HIERARCHY)
    .filter(([, level]) => level >= minLevel)
    .map(([role]) => role as UserRole);
}

// ==================== MEMBERSHIP ROLE MAPPING ====================

/**
 * Maps system UserRole to club MembershipRole
 * Used when creating memberships from user roles
 */
export const USER_ROLE_TO_MEMBERSHIP: Record<UserRole, MembershipRole> = {
  [UserRole.SYSTEM_ADMIN]: MembershipRole.HEAD_COACH,
  [UserRole.CLUB_ADMIN]: MembershipRole.HEAD_COACH,
  [UserRole.COACH]: MembershipRole.ASSISTANT_COACH,
  [UserRole.ATHLETE]: MembershipRole.MEMBER,
};

/**
 * Maps MembershipRole back to UserRole (for display/permissions)
 */
export const MEMBERSHIP_TO_USER_ROLE: Record<MembershipRole, UserRole> = {
  [MembershipRole.HEAD_COACH]: UserRole.CLUB_ADMIN,
  [MembershipRole.ASSISTANT_COACH]: UserRole.COACH,
  [MembershipRole.SPECIALIST_COACH]: UserRole.COACH,
  [MembershipRole.CAPTAIN]: UserRole.ATHLETE,
  [MembershipRole.MEMBER]: UserRole.ATHLETE,
  [MembershipRole.ALUMNI]: UserRole.ATHLETE,
};

// ==================== ROLE DISPLAY ====================

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  [UserRole.SYSTEM_ADMIN]: 'System Administrator',
  [UserRole.CLUB_ADMIN]: 'Club Administrator',
  [UserRole.COACH]: 'Coach',
  [UserRole.ATHLETE]: 'Athlete',
};

export const MEMBERSHIP_DISPLAY_NAMES: Record<MembershipRole, string> = {
  [MembershipRole.HEAD_COACH]: 'Head Coach',
  [MembershipRole.ASSISTANT_COACH]: 'Assistant Coach',
  [MembershipRole.SPECIALIST_COACH]: 'Specialist Coach',
  [MembershipRole.CAPTAIN]: 'Team Captain',
  [MembershipRole.MEMBER]: 'Member',
  [MembershipRole.ALUMNI]: 'Alumni',
};

// ==================== DEFAULT PERMISSIONS BY ROLE ====================

/**
 * Base permissions granted to each role
 * These are the minimum permissions - clubs can grant more via custom claims
 */
export const ROLE_BASE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.SYSTEM_ADMIN]: ['*'], // All permissions
  [UserRole.CLUB_ADMIN]: [
    'club:read',
    'club:write',
    'club:settings',
    'user:read',
    'user:write',
    'user:role',
    'user:invite',
    'user:delete',
    'athlete:read',
    'athlete:write',
    'athlete:import',
    'attendance:read',
    'attendance:write',
    'attendance:report',
    'workout:read',
    'workout:write',
    'workout:assign',
    'workout:template',
    'performance:read',
    'performance:write',
    'performance:report',
    'injury:read',
    'injury:write',
    'injury:rtp',
    'permission:read',
    'permission:write',
    'permission:approve',
    'announcement:read',
    'announcement:write',
    'announcement:send',
    'analytics:read',
    'analytics:report',
  ],
  [UserRole.COACH]: [
    'athlete:read',
    'athlete:write',
    'attendance:read',
    'attendance:write',
    'workout:read',
    'workout:write',
    'workout:assign',
    'performance:read',
    'performance:write',
    'injury:read',
    'injury:write',
    'permission:read',
    'permission:write',
    'announcement:read',
    'announcement:write',
    'analytics:read',
  ],
  [UserRole.ATHLETE]: [
    'profile:read',
    'profile:write',
    'workout:read',
    'workout:complete',
    'attendance:read',
    'performance:read',
    'injury:read',
    'injury:write:own',
    'permission:read',
    'permission:write:own',
    'announcement:read',
    'analytics:read:own',
  ],
};