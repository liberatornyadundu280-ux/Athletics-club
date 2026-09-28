// @stms/shared - Permission Definitions
// 8-letter permission codes for fine-grained access control

// ==================== PERMISSION CODES ====================

export const PERMISSIONS = {
  // Club management
  CLUB: {
    READ: 'club:read' as const,
    WRITE: 'club:write' as const,
    SETTINGS: 'club:settings' as const,
  },

  // User management
  USER: {
    READ: 'user:read' as const,
    WRITE: 'user:write' as const,
    ROLE: 'user:role' as const,
    INVITE: 'user:invite' as const,
    DELETE: 'user:delete' as const,
  },

  // Athlete management
  ATHLETE: {
    READ: 'athlete:read' as const,
    WRITE: 'athlete:write' as const,
    IMPORT: 'athlete:import' as const,
  },

  // Attendance
  ATTENDANCE: {
    READ: 'attendance:read' as const,
    WRITE: 'attendance:write' as const,
    REPORT: 'attendance:report' as const,
  },

  // Workout
  WORKOUT: {
    READ: 'workout:read' as const,
    WRITE: 'workout:write' as const,
    ASSIGN: 'workout:assign' as const,
    TEMPLATE: 'workout:template' as const,
  },

  // Performance
  PERFORMANCE: {
    READ: 'performance:read' as const,
    WRITE: 'performance:write' as const,
    REPORT: 'performance:report' as const,
  },

  // Injury
  INJURY: {
    READ: 'injury:read' as const,
    WRITE: 'injury:write' as const,
    RTP: 'injury:rtp' as const,
  },

  // Permission letters
  PERMISSION: {
    READ: 'permission:read' as const,
    WRITE: 'permission:write' as const,
    APPROVE: 'permission:approve' as const,
  },

  // Announcements
  ANNOUNCEMENT: {
    READ: 'announcement:read' as const,
    WRITE: 'announcement:write' as const,
    SEND: 'announcement:send' as const,
  },

  // Analytics
  ANALYTICS: {
    READ: 'analytics:read' as const,
    REPORT: 'analytics:report' as const,
  },

  // Profile (own)
  PROFILE: {
    READ: 'profile:read' as const,
    WRITE: 'profile:write' as const,
  },

  // Workout completion (own)
  WORKOUT_COMPLETE: 'workout:complete' as const,

  // Injury write (own)
  INJURY_WRITE_OWN: 'injury:write:own' as const,

  // Permission write (own)
  PERMISSION_WRITE_OWN: 'permission:write:own' as const,

  // Analytics read (own)
  ANALYTICS_READ_OWN: 'analytics:read:own' as const,
} as const;

// ==================== PERMISSION GROUPS ====================

export const PERMISSION_GROUPS = {
  CLUB: Object.values(PERMISSIONS.CLUB),
  USER: Object.values(PERMISSIONS.USER),
  ATHLETE: Object.values(PERMISSIONS.ATHLETE),
  ATTENDANCE: Object.values(PERMISSIONS.ATTENDANCE),
  WORKOUT: Object.values(PERMISSIONS.WORKOUT),
  PERFORMANCE: Object.values(PERMISSIONS.PERFORMANCE),
  INJURY: Object.values(PERMISSIONS.INJURY),
  PERMISSION: Object.values(PERMISSIONS.PERMISSION),
  ANNOUNCEMENT: Object.values(PERMISSIONS.ANNOUNCEMENT),
  ANALYTICS: Object.values(PERMISSIONS.ANALYTICS),
  PROFILE: Object.values(PERMISSIONS.PROFILE),
} as const;

// ==================== ALL PERMISSIONS FLAT LIST ====================

export const ALL_PERMISSIONS = [
  ...Object.values(PERMISSIONS.CLUB),
  ...Object.values(PERMISSIONS.USER),
  ...Object.values(PERMISSIONS.ATHLETE),
  ...Object.values(PERMISSIONS.ATTENDANCE),
  ...Object.values(PERMISSIONS.WORKOUT),
  ...Object.values(PERMISSIONS.PERFORMANCE),
  ...Object.values(PERMISSIONS.INJURY),
  ...Object.values(PERMISSIONS.PERMISSION),
  ...Object.values(PERMISSIONS.ANNOUNCEMENT),
  ...Object.values(PERMISSIONS.ANALYTICS),
  ...Object.values(PERMISSIONS.PROFILE),
  PERMISSIONS.WORKOUT_COMPLETE,
  PERMISSIONS.INJURY_WRITE_OWN,
  PERMISSIONS.PERMISSION_WRITE_OWN,
  PERMISSIONS.ANALYTICS_READ_OWN,
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

// ==================== PERMISSION UTILITIES ====================

/**
 * Check if a permission string is valid
 */
export function isValidPermission(permission: string): permission is Permission {
  return ALL_PERMISSIONS.includes(permission as Permission);
}

/**
 * Get all permissions for a group
 */
export function getPermissionsForGroup(group: keyof typeof PERMISSION_GROUPS): Permission[] {
  return PERMISSION_GROUPS[group];
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermission(userPermissions: string[], required: Permission[]): boolean {
  return required.some((p) => userPermissions.includes(p));
}

/**
 * Check if user has all required permissions
 */
export function hasAllPermissions(userPermissions: string[], required: Permission[]): boolean {
  return required.every((p) => userPermissions.includes(p));
}

/**
 * Check if user has a specific permission or wildcard
 */
export function hasPermission(userPermissions: string[], permission: Permission): boolean {
  return userPermissions.includes(permission) || userPermissions.includes('*');
}