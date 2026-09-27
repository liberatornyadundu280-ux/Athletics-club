// src/types/index.ts
// Shared TypeScript types for the backend

import { Document, ObjectId } from 'mongodb';

// ==================== USER ====================
export interface UserDocument extends Document {
  _id: ObjectId;
  firebaseUid: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: UserRole;
  clubIds: ObjectId[];
  activeClubId?: ObjectId | null;
  permissions: string[];
  status: UserStatus;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export type UserRole = 'system_admin' | 'club_admin' | 'coach' | 'athlete';

export type UserStatus = 'active' | 'invited' | 'deactivated' | 'deleted';

export interface UserResponse {
  id: string;
  firebaseUid: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: UserRole;
  clubIds: string[];
  activeClubId?: string | null;
  status: UserStatus;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==================== CLUB ====================
export interface ClubDocument extends Document {
  _id: ObjectId;
  name: string;
  slug: string;
  branding: ClubBranding;
  settings: ClubSettings;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClubBranding {
  logoUrl?: string | null;
  primaryColor: string; // hex
  secondaryColor: string; // hex
}

export interface ClubSettings {
  timezone: string;
  attendanceMinPercent: number;
  workoutVerificationRequired: boolean;
  notificationDefaults: Record<string, any>;
}

export interface ClubResponse {
  id: string;
  name: string;
  slug: string;
  branding: ClubBranding;
  settings: ClubSettings;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== CLUB MEMBERSHIP ====================
export interface MembershipDocument extends Document {
  _id: ObjectId;
  userId: ObjectId;
  clubId: ObjectId;
  role: MembershipRole;
  status: MembershipStatus;
  joinedAt: Date;
  invitedBy?: ObjectId | null;
  invitedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type MembershipRole =
  | 'member'
  | 'captain'
  | 'alumni'
  | 'head_coach'
  | 'assistant_coach'
  | 'specialist_coach';

export type MembershipStatus = 'active' | 'pending' | 'transferred_out';

export interface MembershipResponse {
  user: UserResponse;
  membership: {
    role: MembershipRole;
    status: MembershipStatus;
    joinedAt: string;
    invitedBy?: string | null;
  };
}

// ==================== AUDIT LOG ====================
export interface AuditLogDocument extends Document {
  _id: ObjectId;
  userId: ObjectId;
  action: string;
  resource: string;
  resourceId?: ObjectId | null;
  clubId: ObjectId;
  metadata?: Record<string, any>;
  timestamp: Date;
  ip: string;
  userAgent: string;
}

// ==================== API RESPONSE ====================
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  code?: string;
  errors?: { field: string; message: string }[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==================== AUTH ====================
export interface RegisterInput {
  email: string;
  password: string;
  role: 'athlete' | 'coach';
  name: string;
  clubId?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface GoogleAuthInput {
  idToken: string;
  clubId?: string;
}

export interface SwitchClubInput {
  clubId: string;
}

export interface TokenPayload {
  accessToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: UserResponse;
}

export interface RefreshPayload {
  accessToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface JWTPayload {
  uid: string;
  email: string;
  role: UserRole;
  clubIds: string[];
  activeClubId: string | null;
  permissions: string[];
}

// ==================== PERMISSIONS ====================
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

// ==================== REQUEST EXTENSIONS ====================
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      clubId: string;
    }
  }
}