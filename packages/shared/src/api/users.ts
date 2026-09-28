// @stms/shared - Users API Schemas
// Zod schemas for user management endpoints
// Note: Most auth-related schemas are in api/auth.ts to avoid duplication

import { z } from 'zod';
import { MembershipRole, MembershipStatus } from '../types';
import {
  UserListQuerySchema as AuthUserListQuerySchema,
  SwitchClubRequestSchema as AuthSwitchClubRequestSchema,
  InviteUserRequestSchema as AuthInviteUserRequestSchema,
  UpdateUserRoleRequestSchema as AuthUpdateUserRoleRequestSchema,
  UserResponseSchema as AuthUserResponseSchema,
  PaginatedUsersResponseSchema as AuthPaginatedUsersResponseSchema,
  InviteResponseSchema as AuthInviteResponseSchema,
} from './auth';

// Re-export auth schemas that are used in users API
export const UserListQuerySchema = AuthUserListQuerySchema;
export const SwitchClubRequestSchema = AuthSwitchClubRequestSchema;
export const InviteUserRequestSchema = AuthInviteUserRequestSchema;
export const UpdateUserRoleRequestSchema = AuthUpdateUserRoleRequestSchema;
export const UserResponseSchema = AuthUserResponseSchema;
export const PaginatedUsersResponseSchema = AuthPaginatedUsersResponseSchema;
export const InviteResponseSchema = AuthInviteResponseSchema;

// Aliases for backward compatibility
export const UpdateUserRoleSchema = UpdateUserRoleRequestSchema;
export const InviteUserSchema = InviteUserRequestSchema;

// Re-export types
export type UserListQuery = z.infer<typeof UserListQuerySchema>['query'];
export type SwitchClubRequest = z.infer<typeof SwitchClubRequestSchema>['body'];
export type InviteUserRequest = z.infer<typeof InviteUserRequestSchema>['body'];
export type UpdateUserRoleRequest = z.infer<typeof UpdateUserRoleRequestSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type PaginatedUsersResponse = z.infer<typeof PaginatedUsersResponseSchema>;
export type InviteResponse = z.infer<typeof InviteResponseSchema>;