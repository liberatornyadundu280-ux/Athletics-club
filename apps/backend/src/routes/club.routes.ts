// apps/backend/src/routes/club.routes.ts
// Club management routes

import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { asyncHandler } from '../middleware/error-handler';
import { validate } from '../middleware/validation.middleware';
import { requireRole, requirePermission } from '../middleware/rbac.middleware';
import { verifyClubAccess } from '../middleware/club.middleware';
import { z } from 'zod';
import { getDatabase } from '../config/database';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { ERROR_CODES } from '@stms/shared/constants/errors';
import { CreateClubRequestSchema, UpdateClubSettingsSchema, ClubMembersQuerySchema } from '@stms/shared/api/clubs';

const router = Router();

// ==================== ROUTES ====================

/**
 * POST /clubs
 * Create new club (system_admin only)
 */
router.post('/',
  requireRole('system_admin'),
  validate(CreateClubRequestSchema),
  asyncHandler(async (req, res) => {
    const { name, slug, branding, settings } = req.body;
    const now = new Date();

    const db = getDatabase();

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

    const db = getDatabase();
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
  validate(UpdateClubSettingsSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { branding, settings } = req.body;

    const db = getDatabase();

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
  validate(ClubMembersQuerySchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page, limit, role, status } = req.query;

    const db = getDatabase();
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

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
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
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
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

export default router;
