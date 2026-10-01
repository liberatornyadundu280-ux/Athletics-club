// src/routes/user.routes.ts
// User management routes (club_admin only)

import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { asyncHandler } from '../middleware/error-handler';
import { validate } from '../middleware/validation.middleware';
import { requireRole, requirePermission } from '../middleware/rbac.middleware';
import { z } from 'zod';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import type { UserDocument } from '../types';
import { setUserClaims } from '../config/firebase';
import { permissionsForRole } from '../utils/role-permissions';
import { env } from '../config/env';
import { firebaseAuth } from '../config/firebase';
import { revokeAllUserRefreshTokens } from '../utils/tokens';

const router = Router();
const getClubIds = (user: Partial<UserDocument>): string[] =>
  Array.isArray(user.clubIds) ? user.clubIds.filter(Boolean).map(id => id.toString()) : [];

// ==================== ZOD SCHEMAS ====================
const userListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    role: z.enum(['club_admin', 'coach', 'athlete']).optional(),
    status: z.enum(['active', 'invited', 'deactivated']).optional(),
  }),
});

const platformUserListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    search: z.string().trim().max(120).optional(),
    role: z.enum(['system_admin', 'club_admin', 'coach', 'athlete']).optional(),
    status: z.enum(['active', 'invited', 'deactivated', 'deleted']).optional(),
  }),
});

const updateRoleSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    role: z.enum(['club_admin', 'coach', 'athlete']),
  }),
});

const inviteSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase().max(255),
    role: z.enum(['club_admin', 'coach', 'athlete']),
    clubId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  }),
});

// ==================== ROUTES ====================

/** Global account directory for system administrators. */
router.get('/platform',
  requireRole('system_admin'),
  validate(platformUserListQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, limit, search, role, status } = platformUserListQuerySchema.shape.query.parse(req.query);
    const db = (await import('../config/database')).getDatabase();
    const filter: Record<string, any> = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firebaseUid: { $regex: search, $options: 'i' } },
      ];
    }

    const [total, users] = await Promise.all([
      db.collection('users').countDocuments(filter),
      db.collection<UserDocument>('users')
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
    ]);

    res.json({
      status: 'success',
      data: users.map(user => {
        // Some older accounts predate club membership fields. The platform
        // directory is global, so incomplete club metadata must not prevent
        // otherwise valid accounts from appearing in the list.
        const clubIds = Array.isArray(user.clubIds) ? user.clubIds : [];
        const role = ['system_admin', 'club_admin', 'coach', 'athlete'].includes(user.role)
          ? user.role
          : 'athlete';
        const asIsoDate = (value?: Date | null): string | null => {
          if (!value) return null;
          const date = value instanceof Date ? value : new Date(value);
          return Number.isNaN(date.getTime()) ? null : date.toISOString();
        };

        return {
          id: user._id.toString(), firebaseUid: user.firebaseUid || '', email: user.email || '',
          name: user.name || 'Unnamed account', avatarUrl: user.avatarUrl || null, role,
          clubIds: clubIds.filter(Boolean).map(id => id.toString()),
          activeClubId: user.activeClubId?.toString() || null,
          status: user.status || 'active', lastLoginAt: asIsoDate(user.lastLoginAt),
          createdAt: asIsoDate(user.createdAt) || new Date(0).toISOString(),
          updatedAt: asIsoDate(user.updatedAt) || new Date(0).toISOString(),
        };
      }),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

/** Permanently remove a Firebase identity and its MongoDB account data. */
router.delete('/platform/:id',
  requireRole('system_admin'),
  asyncHandler(async (req, res) => {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) throw new NotFoundError('User');
    const db = (await import('../config/database')).getDatabase();
    const userId = new ObjectId(req.params.id);
    const user = await db.collection<UserDocument>('users').findOne({ _id: userId });
    if (!user) throw new NotFoundError('User');
    if (user.firebaseUid === req.user!.uid) {
      throw new ForbiddenError('You cannot permanently delete your own system administrator account');
    }

    // If a prior attempt deleted Firebase but failed during Mongo cleanup,
    // allow the admin to retry and finish removing the remaining records.
    try {
      await firebaseAuth.deleteUser(user.firebaseUid);
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') throw error;
    }

    try {
      await revokeAllUserRefreshTokens(user.firebaseUid);
    } catch (error) {
      // Removing the Mongo profile below makes any remaining refresh token
      // unusable even if Redis is temporarily unavailable.
      console.warn('Could not clear all Redis refresh sessions during account deletion:', error);
    }
    await db.collection('club_memberships').deleteMany({ userId });
    await db.collection('invitations').deleteMany({
      $or: [{ email: user.email, status: 'pending' }, { acceptedBy: userId }],
    });
    await db.collection('users').deleteOne({ _id: userId });

    res.json({ status: 'success', data: { deleted: true } });
  })
);

/**
 * GET /users
 * List users in current club (club_admin only)
 */
router.get('/',
  requireRole('club_admin', 'system_admin'),
  requirePermission('user:read'),
  validate(userListQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, limit, search, role, status } = userListQuerySchema.shape.query.parse(req.query);
    const clubId = req.clubId;

    const db = (await import('../config/database')).getDatabase();

    // Build filter
    const filter: any = { clubIds: new ObjectId(clubId), status: { $ne: 'deleted' } };
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
    const users = await db.collection<UserDocument>('users')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .project({ password: 0 }) // Exclude password if somehow stored
      .toArray();

    // Format response
    const formattedUsers = users.map(user => ({
      id: user._id.toString(),
      firebaseUid: user.firebaseUid,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      clubIds: getClubIds(user),
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
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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
  validate(inviteSchema),
  asyncHandler(async (req, res) => {
    const { email, role, clubId } = req.body;
    const targetClubId = clubId || req.clubId;

    const db = (await import('../config/database')).getDatabase();
    const actor = await db.collection<UserDocument>('users').findOne({ firebaseUid: req.user!.uid });
    if (!actor) throw new ForbiddenError('User profile not found');
    if (targetClubId !== req.clubId && req.user!.role !== 'system_admin') {
      throw new ForbiddenError('Invitations can only be sent to your active club');
    }
    const club = await db.collection('clubs').findOne({ _id: new ObjectId(targetClubId) });
    if (!club) throw new NotFoundError('Club');

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });

    // Check if already member of this club
    if (existingUser) {
      const existingMembership = await db.collection('club_memberships').findOne({
        userId: existingUser._id,
        clubId: new ObjectId(targetClubId),
        status: 'active',
      });

      if (existingMembership) {
        throw new ConflictError('User is already a member of this club');
      }
    }

    const duplicateInvite = await db.collection('invitations').findOne({ email, clubId: new ObjectId(targetClubId), status: 'pending' });
    if (duplicateInvite) throw new ConflictError('An invitation is already pending for this email');

    const now = new Date();
    const invitationId = new ObjectId();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await db.collection('invitations').insertOne({
      _id: invitationId,
      email,
      role,
      clubId: new ObjectId(targetClubId),
      status: 'pending' as const,
      invitedBy: actor._id,
      invitedAt: now,
      createdAt: now,
      expiresAt,
    });

    const frontendUrl = (env.FRONTEND_URL || env.ALLOWED_ORIGINS[0] || 'http://localhost:5173').replace(/\/$/, '');
    const magicLink = `${frontendUrl}/accept-invitation?token=${invitationId.toString()}`;

    res.status(201).json({
      status: 'success',
      data: {
        invitationId: invitationId.toString(),
        magicLink,
        expiresAt: expiresAt.toISOString(),
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
    const isAdmin = req.user!.role === 'club_admin' || req.user!.role === 'system_admin';

    const db = (await import('../config/database')).getDatabase();
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });

    if (!user) {
      throw new NotFoundError('User');
    }

    const isSelf = user.firebaseUid === req.user!.uid;
    if (!isSelf && !isAdmin) throw new ForbiddenError('Not authorized to view this user');

    // Verify user is in same club (for club_admin)
    if (isAdmin && !getClubIds(user).includes(req.clubId)) {
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
        clubIds: getClubIds(user),
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
  validate(updateRoleSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    const db = (await import('../config/database')).getDatabase();

    // Verify user exists and is in club
    const user = await db.collection('users').findOne({
      _id: new ObjectId(id),
      clubIds: new ObjectId(req.clubId),
    });

    if (!user) {
      throw new NotFoundError('User');
    }
    if (user.firebaseUid === req.user!.uid) throw new ForbiddenError('Cannot change your own role');

    // Cannot assign system_admin via this endpoint
    if (role === 'system_admin') {
      throw new ForbiddenError('Cannot assign system_admin role');
    }

    // Update role
    const permissions = permissionsForRole(role);
    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { role, permissions, updatedAt: new Date() } }
    );

    // Update membership role
    const membershipRoleMap: Record<string, string> = {
      club_admin: 'head_coach', // club_admin maps to head_coach in membership
      coach: 'assistant_coach',
      athlete: 'member',
    };

    await db.collection('club_memberships').updateOne(
      { userId: new ObjectId(id), clubId: new ObjectId(req.clubId) },
      { $set: { role: membershipRoleMap[role], updatedAt: new Date() } }
    );

    await setUserClaims(user.firebaseUid, {
      role,
      clubIds: getClubIds(user),
      activeClubId: user.activeClubId?.toString() || null,
      permissions,
    });

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
        clubIds: getClubIds(updatedUser!),
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
    const db = (await import('../config/database')).getDatabase();

    const user = await db.collection('users').findOne({
      _id: new ObjectId(id),
      clubIds: new ObjectId(req.clubId),
    });

    if (!user) {
      throw new NotFoundError('User');
    }
    if (user.firebaseUid === req.user!.uid) throw new ForbiddenError('Cannot delete yourself');

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
    const { revokeUserClaims } = await import('../config/firebase');
    await revokeUserClaims(user.firebaseUid);

    res.status(204).send();
  })
);

export default router;
