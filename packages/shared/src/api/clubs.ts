// @stms/shared - Clubs API Schemas
// Zod schemas for club management endpoints

import { z } from 'zod';
import { MembershipRole, MembershipStatus } from '../types';

// ==================== REQUEST SCHEMAS ====================

export const CreateClubRequestSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    slug: z.string().regex(/^[a-z0-9-]+$/).max(50).optional(),
    branding: z.object({
      primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    }).optional(),
    settings: z.object({
      timezone: z.string().optional(),
    }).optional(),
  }),
});

export const UpdateClubSettingsRequestSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    branding: z.object({
      logoUrl: z.string().url().optional().nullable(),
      primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    }).optional(),
    settings: z.object({
      timezone: z.string().optional(),
      attendanceMinPercent: z.number().int().min(0).max(100).optional(),
      workoutVerificationRequired: z.boolean().optional(),
      notificationDefaults: z.record(z.any()).optional(),
    }).optional(),
  }),
});

export const ClubMembersQuerySchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    role: z.enum([
      'member',
      'captain',
      'alumni',
      'head_coach',
      'assistant_coach',
      'specialist_coach',
    ]).optional(),
    status: z.enum(['active', 'pending', 'transferred_out']).optional(),
  }),
});

// ==================== RESPONSE SCHEMAS ====================

export const ClubBrandingSchema = z.object({
  logoUrl: z.string().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const ClubSettingsSchema = z.object({
  timezone: z.string(),
  attendanceMinPercent: z.number().int().min(0).max(100),
  workoutVerificationRequired: z.boolean(),
  notificationDefaults: z.record(z.any()),
});

export const ClubResponseSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  name: z.string(),
  slug: z.string(),
  branding: ClubBrandingSchema,
  settings: ClubSettingsSchema,
  createdBy: z.string().regex(/^[0-9a-fA-F]{24}$/),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ClubMemberResponseSchema = z.object({
  user: z.object({
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
  }),
  membership: z.object({
    role: z.enum([
      'member',
      'captain',
      'alumni',
      'head_coach',
      'assistant_coach',
      'specialist_coach',
    ]),
    status: z.enum(['active', 'pending', 'transferred_out']),
    joinedAt: z.string(),
    invitedBy: z.string().nullable(),
  }),
});

export const PaginatedClubMembersResponseSchema = z.object({
  status: z.literal('success'),
  data: z.array(ClubMemberResponseSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// ==================== TYPE EXPORTS ====================

export type CreateClubRequest = z.infer<typeof CreateClubRequestSchema>['body'];
export type UpdateClubSettingsRequest = z.infer<typeof UpdateClubSettingsRequestSchema>;
export type ClubMembersQuery = z.infer<typeof ClubMembersQuerySchema>['query'];

export type ClubResponse = z.infer<typeof ClubResponseSchema>;
export type ClubMemberResponse = z.infer<typeof ClubMemberResponseSchema>;
export type PaginatedClubMembersResponse = z.infer<typeof PaginatedClubMembersResponseSchema>;