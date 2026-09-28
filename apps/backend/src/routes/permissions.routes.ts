// apps/backend/src/routes/permissions.routes.ts
// Permission management routes

import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { asyncHandler } from '../middleware/error-handler';
import { validate } from '../middleware/validation.middleware';
import { requirePermission, requireRole } from '../middleware/rbac.middleware';
import { z } from 'zod';
import { getDatabase } from '../config/database';
import { NotFoundError, ForbiddenError } from '../utils/errors';

const router = Router();

// ==================== ZOD SCHEMAS ====================

const createPermissionRequestSchema = z.object({
  body: z.object({
    userId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    clubId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    permissions: z.array(z.string()).min(1),
    expiresAt: z.string().datetime().optional().nullable(),
    reason: z.string().max(500).optional(),
  }),
});

const updatePermissionRequestSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    permissions: z.array(z.string()).min(1).optional(),
    expiresAt: z.string().datetime().optional().nullable(),
    status: z.enum(['pending', 'approved', 'denied', 'revoked']).optional(),
    reason: z.string().max(500).optional(),
  }),
});

const bulkPermissionRequestSchema = z.object({
  body: z.object({
    userIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).min(1),
    clubId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    permissions: z.array(z.string()).min(1),
    expiresAt: z.string().datetime().optional().nullable(),
    reason: z.string().max(500).optional(),
  }),
});

const permissionListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    userId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    clubId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    status: z.enum(['pending', 'approved', 'denied', 'revoked']).optional(),
    permission: z.string().optional(),
  }),
});

// ==================== ROUTES ====================

/**
 * POST /permissions
 * Grant permissions to a user
 */
router.post('/',
  requireRole('club_admin', 'system_admin'),
  requirePermission('permission:write'),
  validate(createPermissionRequestSchema),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const { userId, clubId, permissions, expiresAt, reason } = req.body;

    // Verify user exists
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) throw new NotFoundError('User');

    // Verify club exists
    const club = await db.collection('clubs').findOne({ _id: new ObjectId(clubId) });
    if (!club) throw new NotFoundError('Club');

    // Check if user is member of club
    const membership = await db.collection('memberships').findOne({
      userId: new ObjectId(userId),
      clubId: new ObjectId(clubId),
      status: 'active',
    });
    if (!membership) {
      throw new ForbiddenError('User is not a member of this club');
    }

    const permission = {
      userId: new ObjectId(userId),
      clubId: new ObjectId(clubId),
      permissions,
      status: 'approved',
      grantedBy: req.user!.uid,
      reason: reason || 'Granted by admin',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('permissions').insertOne(permission);

    res.status(201).json({
      status: 'success',
      data: { ...permission, id: result.insertedId.toString() },
    });
  })
);

/**
 * GET /permissions
 * List permissions with filters
 */
router.get('/',
  requirePermission('permission:read'),
  validate(permissionListQuerySchema),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const { page, limit, userId, clubId, status, permission } = req.query;

    const filter: Record<string, any> = {};

    // Club scope
    if (req.user!.role !== 'system_admin') {
      filter.clubId = new ObjectId(req.clubId);
    } else if (clubId) {
      filter.clubId = new ObjectId(clubId as string);
    }

    if (userId) filter.userId = new ObjectId(userId as string);
    if (status) filter.status = status;
    if (permission) filter.permissions = permission;

    const skip = (Number(page) - 1) * Number(limit);

    const [permissions, total] = await Promise.all([
      db.collection('permissions')
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .toArray(),
      db.collection('permissions').countDocuments(filter),
    ]);

    const formattedPermissions = permissions.map(p => ({
      id: p._id.toString(),
      userId: p.userId.toString(),
      clubId: p.clubId.toString(),
      permissions: p.permissions,
      status: p.status,
      grantedBy: p.grantedBy,
      reason: p.reason,
      expiresAt: p.expiresAt?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    res.json({
      status: 'success',
      data: formattedPermissions,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

/**
 * GET /permissions/:id
 * Get permission by ID
 */
router.get('/:id',
  requirePermission('permission:read'),
  validate(z.object({ params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/) }) })),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const { id } = req.params;

    const permission = await db.collection('permissions').findOne({ _id: new ObjectId(id) });
    if (!permission) throw new NotFoundError('Permission');

    // Check club access
    if (req.user!.role !== 'system_admin' && permission.clubId.toString() !== req.clubId) {
      throw new ForbiddenError('Access denied to this permission');
    }

    res.json({
      status: 'success',
      data: {
        id: permission._id.toString(),
        userId: permission.userId.toString(),
        clubId: permission.clubId.toString(),
        permissions: permission.permissions,
        status: permission.status,
        grantedBy: permission.grantedBy,
        reason: permission.reason,
        expiresAt: permission.expiresAt?.toISOString() || null,
        createdAt: permission.createdAt.toISOString(),
        updatedAt: permission.updatedAt.toISOString(),
      },
    });
  })
);

/**
 * PATCH /permissions/:id
 * Update permission
 */
router.patch('/:id',
  requireRole('club_admin', 'system_admin'),
  requirePermission('permission:write'),
  validate(updatePermissionRequestSchema),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { permissions, expiresAt, status, reason } = req.body;

    const updateDoc: Record<string, any> = { updatedAt: new Date() };
    if (permissions) updateDoc.permissions = permissions;
    if (expiresAt !== undefined) updateDoc.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (status) updateDoc.status = status;
    if (reason) updateDoc.reason = reason;

    const result = await db.collection('permissions').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    if (!result) throw new NotFoundError('Permission');

    res.json({
      status: 'success',
      data: {
        id: result._id.toString(),
        userId: result.userId.toString(),
        clubId: result.clubId.toString(),
        permissions: result.permissions,
        status: result.status,
        grantedBy: result.grantedBy,
        reason: result.reason,
        expiresAt: result.expiresAt?.toISOString() || null,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      },
    });
  })
);

/**
 * DELETE /permissions/:id
 * Revoke permission
 */
router.delete('/:id',
  requireRole('club_admin', 'system_admin'),
  requirePermission('permission:write'),
  validate(z.object({ params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/) }) })),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const { id } = req.params;

    const result = await db.collection('permissions').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { status: 'revoked', updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) throw new NotFoundError('Permission');

    res.json({
      status: 'success',
      message: 'Permission revoked successfully',
    });
  })
);

/**
 * POST /permissions/bulk
 * Bulk grant permissions
 */
router.post('/bulk',
  requireRole('club_admin', 'system_admin'),
  requirePermission('permission:write'),
  validate(bulkPermissionRequestSchema),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const { userIds, clubId, permissions, expiresAt, reason } = req.body;

    // Verify club exists
    const club = await db.collection('clubs').findOne({ _id: new ObjectId(clubId) });
    if (!club) throw new NotFoundError('Club');

    // Verify all users are members of club
    const memberships = await db.collection('memberships').find({
      userId: { $in: userIds.map((uid: string) => new ObjectId(uid)) },
      clubId: new ObjectId(clubId),
      status: 'active',
    }).toArray();

    const memberUserIds = new Set(memberships.map(m => m.userId.toString()));
    const nonMembers = userIds.filter((uid: string) => !memberUserIds.has(uid));
    if (nonMembers.length > 0) {
      throw new ForbiddenError(`Users not members of club: ${nonMembers.join(', ')}`);
    }

    const permissionDocs = userIds.map((userId: string) => ({
      userId: new ObjectId(userId),
      clubId: new ObjectId(clubId),
      permissions,
      status: 'approved',
      grantedBy: req.user!.uid,
      reason: reason || 'Bulk granted by admin',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await db.collection('permissions').insertMany(permissionDocs);

    res.status(201).json({
      status: 'success',
      data: {
        insertedCount: result.insertedCount,
        ids: Object.values(result.insertedIds).map(id => id.toString()),
      },
    });
  })
);

export default router;