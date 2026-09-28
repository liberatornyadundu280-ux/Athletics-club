// @stms/shared - Users API Schemas
// Zod schemas for user management endpoints

import { z } from 'zod';
import { MembershipRole, MembershipStatus } from '../types';

// ==================== REQUEST SCHEMAS ====================

export const UserListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    role: z.enum(['club_admin', 'coach', 'athlete']).optional(),
    status: z.enum(['active', 'invited', 'deactivated']).optional(),
  }),
});

export const UpdateUserRoleRequestSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    role: z.enum(['club_admin', 'coach', 'athlete']),
  }),
});

export const InviteUserRequestSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase().max(255),
    role: z.enum(['club_admin', 'coach', 'athlete']),
    clubId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  }),
});

export const SwitchClubRequestSchema = z.object({
  body: z.object({
    clubId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
});

// ==================== RESPONSE SCHEMAS ====================

export const UserResponseSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  firebaseUid: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  role: z.enum(['system_admin', 'club_admin', 'coach', 'athlete']),
  clubIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)),
  activeClubId: z.string().nullable(),
  status: z.enum(['active', 'invited', 'deactivated', 'deleted']),
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

export const InviteResponseSchema = z.object({
  status: z.literal('success'),
  data: z.object({
    invitationId: z.string(),
    magicLink: z.string().url(),
    expiresAt: z.string(),
  }),
});

// ==================== TYPE EXPORTS ====================

export type UserListQuery = z.infer<typeof UserListQuerySchema>['query'];
export type UpdateUserRoleRequest = z.infer<typeof UpdateUserRoleRequestSchema>;
export type InviteUserRequest = z.infer<typeof InviteUserRequestSchema>['body'];
export type SwitchClubRequest = z.infer<typeof SwitchClubRequestSchema>['body'];

export type UserResponse = z.infer<typeof UserResponseSchema>;
export type PaginatedUsersResponse = z.infer<typeof PaginatedUsersResponseSchema>;
export type InviteResponse = z.infer<typeof InviteResponseSchema>;