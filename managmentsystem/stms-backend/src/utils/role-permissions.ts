import type { UserRole } from '../types';

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  system_admin: ['*'],
  club_admin: [
    'club:read', 'club:write', 'club:settings',
    'user:read', 'user:write', 'user:role', 'user:invite', 'user:delete',
    'athlete:read', 'athlete:write', 'athlete:import',
    'attendance:read', 'attendance:write', 'attendance:report',
    'workout:read', 'workout:write', 'workout:assign', 'workout:template',
    'performance:read', 'performance:write', 'performance:report',
    'injury:read', 'injury:write', 'injury:rtp',
    'permission:read', 'permission:write', 'permission:approve',
    'announcement:read', 'announcement:write', 'announcement:send',
    'analytics:read', 'analytics:report', 'profile:read', 'profile:write',
  ],
  coach: [
    'athlete:read', 'athlete:write', 'attendance:read', 'attendance:write',
    'workout:read', 'workout:write', 'workout:assign', 'performance:read',
    'performance:write', 'injury:read', 'injury:write', 'injury:rtp',
    'permission:read', 'permission:write', 'announcement:read',
    'profile:read', 'profile:write',
  ],
  athlete: [
    'profile:read', 'profile:write', 'workout:read', 'workout:complete',
    'attendance:read', 'performance:read', 'injury:read', 'injury:write:own',
    'permission:read', 'permission:write:own', 'announcement:read', 'analytics:read:own',
  ],
};

export function permissionsForRole(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role];
}
