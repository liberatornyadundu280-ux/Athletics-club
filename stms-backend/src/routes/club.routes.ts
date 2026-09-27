// src/routes/club.routes.ts
// Club management routes

import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { asyncHandler } from '../middleware/error-handler';
import { validate } from '../middleware/validation.middleware';
import { requireRole, requirePermission } from '../middleware/rbac.middleware';
import { verifyClubAccess } from '../middleware/club.middleware';
import { z } from 'zod';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { ERROR_CODES } from '../utils/errors';

const router = Router();

// ==================== ZOD SCHEMAS ====================
const createClubSchema = z.object({
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

const updateClubSchema = z.object({
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

const clubMembersQuerySchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    role: z.enum(['member', 'captain', 'alumni', 'head_coach', 'assistant_coach', 'specialist_coach']).optional(),
    status: z.enum(['active', 'pending', 'transferred_out']).optional(),
  }),
});

// ==================== ROUTES ====================

/**
 * POST /clubs
 * Create new club (system_admin only)
 */
router.post('/',
  requireRole('system_admin'),
  validate(createClubSchema),
  asyncHandler(async (req, res) => {
    const { name, slug, branding, settings } = req.body;
    const now = new Date();

    const db = (await import('../config/database')).getDatabase();

    // Generate slug from name if not provided
    const generatedSlug = slug || name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50);

    // Check slug uniqueness
    const existingSlug = await db.collection('clubs').findOne({ slug: generatedSlug });
    if (existingSlug) {
      throw new ConflictError('Club slug already exists');
    }

    const clubDoc = {
      name,
      slug: generatedSlug,
      branding: {
        logoUrl: null,
        primaryColor: branding?.primaryColor || '#1E3A8A', // Blue
        secondaryColor: branding?.secondaryColor || '#F59E0B', // Gold
      },
      settings: {
        timezone: settings?.timezone || 'Asia/Kolkata',
        attendanceMinPercent: 75,
        workoutVerificationRequired: false,
        notificationDefaults: {},
      },
      createdBy: new ObjectId(req.user!.uid),
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('clubs').insertOne(clubDoc);
    const clubId = result.insertedId;

    // Create club_admin membership for creator
    const membership = {
      userId: new ObjectId(req.user!.uid),
      clubId,
      role: 'head_coach', // system_admin gets head_coach role in club
      status: 'active',
      joinedAt: now,
      invitedBy: null,
      invitedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('club_memberships').insertOne(membership);

    // Update user's clubIds and activeClubId
    await db.collection('users').updateOne(
      { firebaseUid: req.user!.uid },
      {
        $addToSet: { clubIds: clubId },
        $set: { activeClubId: clubId, updatedAt: now },
      }
    );

    // Trigger custom claims refresh
    // In production, call Firebase callable function

    res.status(201).json({
      status: 'success',
      data: {
        id: clubId.toString(),
        ...clubDoc,
        createdBy: clubDoc.createdBy.toString(),
      },
    });
  })
);

/**
 * GET /clubs/:id
 * Get club details (members can view)
 */
router.get('/:id',
  verifyClubAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const db = (await import('../config/database')).getDatabase();
    const club = await db.collection('clubs').findOne({ _id: new ObjectId(id) });

    if (!club) {
      throw new NotFoundError('Club');
    }

    res.json({
      status: 'success',
      data: {
        id: club._id.toString(),
        name: club.name,
        slug: club.slug,
        branding: club.branding,
        settings: club.settings,
        createdBy: club.createdBy.toString(),
        createdAt: club.createdAt.toISOString(),
        updatedAt: club.updatedAt.toISOString(),
      },
    });
  })
);

/**
 * PATCH /clubs/:id
 * Update club settings (club_admin only)
 */
router.patch('/:id',
  requireRole('club_admin', 'system_admin'),
  requirePermission('club:settings'),
  verifyClubAccess,
  validate(updateClubSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { branding, settings } = req.body;

    const db = (await import('../config/database')).getDatabase();

    const updateDoc: any = { updatedAt: new Date() };

    if (branding) {
      if (branding.logoUrl !== undefined) updateDoc['branding.logoUrl'] = branding.logoUrl;
      if (branding.primaryColor) updateDoc['branding.primaryColor'] = branding.primaryColor;
      if (branding.secondaryColor) updateDoc['branding.secondaryColor'] = branding.secondaryColor;
    }

    if (settings) {
      if (settings.timezone) updateDoc['settings.timezone'] = settings.timezone;
      if (settings.attendanceMinPercent !== undefined) updateDoc['settings.attendanceMinPercent'] = settings.attendanceMinPercent;
      if (settings.workoutVerificationRequired !== undefined) updateDoc['settings.workoutVerificationRequired'] = settings.workoutVerificationRequired;
      if (settings.notificationDefaults) updateDoc['settings.notificationDefaults'] = settings.notificationDefaults;
    }

    const result = await db.collection('clubs').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new NotFoundError('Club');
    }

    res.json({
      status: 'success',
      data: {
        id: result._id.toString(),
        name: result.name,
        slug: result.slug,
        branding: result.branding,
        settings: result.settings,
        createdBy: result.createdBy.toString(),
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      },
    });
  })
);

/**
 * GET /clubs/:id/members
 * List club members with membership details (members can view)
 */
router.get('/:id/members',
  verifyClubAccess,
  validate(clubMembersQuerySchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page, limit, role, status } = req.query;

    const db = (await import('../config/database')).getDatabase();

    // Build filter
    const filter: any = { clubId: new ObjectId(id) };
    if (role) filter.role = role;
    if (status) filter.status = status;

    // Get total count
    const total = await db.collection('club_memberships').countDocuments(filter);

    // Get paginated memberships
    const memberships = await db.collection('club_memberships')
      .find(filter)
      .sort({ joinedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Get user details for each membership
    const userIds = memberships.map(m => m.userId);
    const users = await db.collection('users')
      .find({ _id: { $in: userIds } })
      .toArray();

    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    // Format response
    const formattedMembers = memberships.map(membership => {
      const user = userMap.get(membership.userId.toString());
      return {
        user: user ? {
          id: user._id.toString(),
          firebaseUid: user.firebaseUid,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          role: user.role,
          clubIds: user.clubIds.map((id: ObjectId) => id.toString()),
          activeClubId: user.activeClubId?.toString() || null,
          status: user.status,
          lastLoginAt: user.lastLoginAt?.toISOString() || null,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        } : null,
        membership: {
          role: membership.role,
          status: membership.status,
          joinedAt: membership.joinedAt.toISOString(),
          invitedBy: membership.invitedBy?.toString() || null,
        },
      };
    });

    res.json({
      status: 'success',
      data: formattedMembers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

export default router;