// @stms/shared - Auth API Schemas
// Zod schemas for authentication endpoints

import { z } from 'zod';
import { UserRole, UserStatus } from '../types';

// ==================== REQUEST SCHEMAS ====================

export const RegisterRequestSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase().max(255),
    password: z.string().min(12).max(128),
    role: z.enum([UserRole.ATHLETE, UserRole.COACH]),
    name: z.string().min(1).max(100),
    clubId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  }),
});

export const LoginRequestSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(1),
  }),
});

export const GoogleAuthRequestSchema = z.object({
  body: z.object({
    idToken: z.string().min(1),
    clubId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  }),
});

export const SwitchClubRequestSchema = z.object({
  body: z.object({
    clubId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
});

export const InviteUserRequestSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase().max(255),
    role: z.enum(['club_admin', 'coach', 'athlete']),
    clubId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  }),
});

export const UpdateUserRoleRequestSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    role: z.enum([UserRole.CLUB_ADMIN, UserRole.COACH, UserRole.ATHLETE]),
  }),
});

export const UserListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    role: z.enum([UserRole.CLUB_ADMIN, UserRole.COACH, UserRole.ATHLETE]).optional(),
    status: z.enum([UserStatus.ACTIVE, UserStatus.INVITED, UserStatus.DEACTIVATED]).optional(),
  }),
});

// ==================== RESPONSE SCHEMAS ====================

export const TokenResponseSchema = z.object({
  status: z.literal('success'),
  data: z.object({
    accessToken: z.string(),
    expiresIn: z.number(),
    tokenType: z.literal('Bearer'),
    user: z.object({
      id: z.string().regex(/^[0-9a-fA-F]{24}$/),
      firebaseUid: z.string(),
      email: z.string().email(),
      name: z.string(),
      avatarUrl: z.string().nullable(),
      role: z.nativeEnum(UserRole),
      clubIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)),
      activeClubId: z.string().nullable(),
      status: z.nativeEnum(UserStatus),
      lastLoginAt: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  }),
});

export const RefreshResponseSchema = z.object({
  status: z.literal('success'),
  data: z.object({
    accessToken: z.string(),
    expiresIn: z.number(),
    tokenType: z.literal('Bearer'),
  }),
});

export const AuthMeResponseSchema = z.object({
  status: z.literal('success'),
  data: z.object({
    user: z.object({
      id: z.string().regex(/^[0-9a-fA-F]{24}$/),
      firebaseUid: z.string(),
      email: z.string().email(),
      name: z.string(),
      avatarUrl: z.string().nullable(),
      role: z.nativeEnum(UserRole),
      clubIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)),
      activeClubId: z.string().nullable(),
      status: z.nativeEnum(UserStatus),
      lastLoginAt: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
    permissions: z.array(z.string()),
  }),
});

export const InviteResponseSchema = z.object({
  status: z.literal('success'),
  data: z.object({
    invitationId: z.string(),
    magicLink: z.string().url(),
    expiresAt: z.string(),
  }),
});

export const UserResponseSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  firebaseUid: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  role: z.nativeEnum(UserRole),
  clubIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)),
  activeClubId: z.string().nullable(),
  status: z.nativeEnum(UserStatus),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PaginatedUsersResponseSchema = z.object({
  status: z.literal('success'),
  data: z.array(UserResponseSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// ==================== TYPE EXPORTS ====================

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>['body'];
export type LoginRequest = z.infer<typeof LoginRequestSchema>['body'];
export type GoogleAuthRequest = z.infer<typeof GoogleAuthRequestSchema>['body'];
export type SwitchClubRequest = z.infer<typeof SwitchClubRequestSchema>['body'];
export type InviteUserRequest = z.infer<typeof InviteUserRequestSchema>['body'];
export type UpdateUserRoleRequest = z.infer<typeof UpdateUserRoleRequestSchema>['body'];
export type UserListQuery = z.infer<typeof UserListQuerySchema>['query'];

export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;
export type InviteResponse = z.infer<typeof InviteResponseSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type PaginatedUsersResponse = z.infer<typeof PaginatedUsersResponseSchema>;