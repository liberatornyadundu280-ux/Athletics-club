// apps/backend/src/routes/user.routes.ts
// User management routes (club_admin only)

import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { asyncHandler } from '../middleware/error-handler';
import { validate } from '../middleware/validation.middleware';
import { requireRole, requirePermission } from '../middleware/rbac.middleware';
import { z } from 'zod';
import { getDatabase } from '../config/database';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { ERROR_CODES } from '@stms/shared/constants/errors';
import { UserListQuerySchema, UpdateUserRoleSchema, InviteUserSchema } from '@stms/shared/api/users';

const router = Router();

// ==================== ROUTES ====================

/**
 * GET /users
 * List users in current club (club_admin only)
 */
router.get('/',
  requireRole('club_admin', 'system_admin'),
  requirePermission('user:read'),
  validate(UserListQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, limit, search, role, status } = req.query;
    const clubId = req.clubId;

    const db = getDatabase();
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

    // Build filter
    const filter: any = { clubIds: new ObjectId(clubId) };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) filter.role = role;
    if (status) filter.status = status;

    // Get total count
    const total = await db.collection('users').countDocuments(filter);

    // Get paginated results
    const users = await db.collection('users')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .project({ password: 0 })
      .toArray();

    // Format response
    const formattedUsers = users.map(user => ({
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
    }));

    res.json({
      status: 'success',
      data: formattedUsers,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

/**
 * POST /users/invite
 * Invite user to club (club_admin only)
 */
router.post('/invite',
  requireRole('club_admin', 'system_admin'),
  requirePermission('user:invite'),
  validate(InviteUserSchema),
  asyncHandler(async (req, res) => {
    const { email, role, clubId } = req.body;
    const targetClubId = clubId || req.clubId;

    const db = getDatabase();

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });

    // Check if already member of this club
    if (existingUser) {
      const existingMembership = await db.collection('club_memberships').findOne({
        userId: existingUser._id,
        clubId: new ObjectId(targetClubId),
      });

      if (existingMembership) {
        throw new ConflictError('User is already a member of this club');
      }
    }

    // Create invitation (in production, send email with magic link)
    const now = new Date();
    const invitationId = new ObjectId();

    // For now, create membership with pending status
    const membership = {
      _id: invitationId,
      userId: existingUser?._id || new ObjectId(), // Will be set when user accepts
      clubId: new ObjectId(targetClubId),
      role: role.replace('_coach', '').replace('head_', '') as any,
      status: 'pending' as const,
      joinedAt: now,
      invitedBy: new ObjectId(req.user!.uid),
      invitedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('club_memberships').insertOne(membership);

    // TODO: Send invitation email with magic link
    // The magic link would contain the invitationId
    // When user clicks, they complete registration and membership is activated

    const magicLink = `${process.env.FRONTEND_URL}/accept-invitation?token=${invitationId.toString()}`;

    res.status(201).json({
      status: 'success',
      data: {
        invitationId: invitationId.toString(),
        magicLink,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  })
);

/**
 * GET /users/:id
 * Get user by ID (club_admin can view any in club, users can view own)
 */
router.get('/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const requestingUserId = req.user!.uid;
    const isSelf = requestingUserId === id;
    const isAdmin = req.user!.role === 'club_admin' || req.user!.role === 'system_admin';

    if (!isSelf && !isAdmin) {
      throw new ForbiddenError('Not authorized to view this user');
    }

    const db = getDatabase();
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Verify user is in same club (for club_admin)
    if (isAdmin && !user.clubIds.some((clubId: ObjectId) => clubId.toString() === req.clubId)) {
      throw new ForbiddenError('User not in your club');
    }

    res.json({
      status: 'success',
      data: {
        id: user._id.toString(),
        firebaseUid: user.firebaseUid,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        clubIds: user.clubIds.map((clubId: ObjectId) => clubId.toString()),
        activeClubId: user.activeClubId?.toString() || null,
        status: user.status,
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    });
  })
);

/**
 * PATCH /users/:id/role
 * Update user role (club_admin only, cannot change own role)
 */
router.patch('/:id/role',
  requireRole('club_admin', 'system_admin'),
  requirePermission('user:role'),
  validate(UpdateUserRoleSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    const requestingUserId = req.user!.uid;

    if (requestingUserId === id) {
      throw new ForbiddenError('Cannot change your own role');
    }

    const db = getDatabase();

    // Verify user exists and is in club
    const user = await db.collection('users').findOne({
      _id: new ObjectId(id),
      clubIds: new ObjectId(req.clubId),
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Cannot assign system_admin via this endpoint
    if (role === 'system_admin') {
      throw new ForbiddenError('Cannot assign system_admin role');
    }

    // Update role
    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { role, updatedAt: new Date() } }
    );

    // Update membership role
    const membershipRoleMap: Record<string, string> = {
      club_admin: 'head_coach',
      coach: 'assistant_coach',
      athlete: 'member',
    };

    await db.collection('club_memberships').updateOne(
      { userId: new ObjectId(id), clubId: new ObjectId(req.clubId) },
      { $set: { role: membershipRoleMap[role], updatedAt: new Date() } }
    );

    // Trigger custom claims refresh (callable function or wait for Firestore trigger)
    // In production, call the Firebase callable function

    // Fetch updated user
    const updatedUser = await db.collection('users').findOne({ _id: new ObjectId(id) });

    res.json({
      status: 'success',
      data: {
        id: updatedUser!._id.toString(),
        firebaseUid: updatedUser!.firebaseUid,
        email: updatedUser!.email,
        name: updatedUser!.name,
        role: updatedUser!.role,
        clubIds: updatedUser!.clubIds.map((clubId: ObjectId) => clubId.toString()),
        activeClubId: updatedUser!.activeClubId?.toString() || null,
        status: updatedUser!.status,
        lastLoginAt: updatedUser!.lastLoginAt?.toISOString() || null,
        createdAt: updatedUser!.createdAt.toISOString(),
        updatedAt: updatedUser!.updatedAt.toISOString(),
      },
    });
  })
);

/**
 * DELETE /users/:id
 * Soft delete user (club_admin only, cannot delete self)
 */
router.delete('/:id',
  requireRole('club_admin', 'system_admin'),
  requirePermission('user:delete'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const requestingUserId = req.user!.uid;

    if (requestingUserId === id) {
      throw new ForbiddenError('Cannot delete yourself');
    }

    const db = getDatabase();

    const user = await db.collection('users').findOne({
      _id: new ObjectId(id),
      clubIds: new ObjectId(req.clubId),
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Soft delete
    const now = new Date();
    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'deleted',
          deletedAt: now,
          updatedAt: now,
          // Anonymize PII
          email: `deleted_${user._id}@deleted.stms`,
          name: 'Deleted User',
          avatarUrl: null,
        },
      }
    );

    // Update membership status
    await db.collection('club_memberships').updateOne(
      { userId: new ObjectId(id), clubId: new ObjectId(req.clubId) },
      { $set: { status: 'transferred_out', updatedAt: now } }
    );

    // Revoke Firebase tokens
    const { revokeUserClaims } = await import('../config/firebase.js');
    await revokeUserClaims(user.firebaseUid);

    res.status(204).send();
  })
);

export default router;
