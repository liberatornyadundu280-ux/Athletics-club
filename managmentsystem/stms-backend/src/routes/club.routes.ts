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
import type { MembershipDocument, UserDocument } from '../types';

const router = Router();
const getClubIds = (user: Partial<UserDocument>): string[] =>
  Array.isArray(user.clubIds) ? user.clubIds.filter(Boolean).map(id => id.toString()) : [];

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

const enrollmentRequestSchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/) }),
  body: z.object({ message: z.string().trim().max(500).optional().default('') }),
});

const reviewEnrollmentRequestSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
    requestId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({ status: z.enum(['approved', 'rejected']) }),
});

// ==================== ROUTES ====================

/** Get the current user's active club memberships with club display data. */
router.get('/mine', asyncHandler(async (req, res) => {
  if (!req.user) throw new ForbiddenError('Authentication required');
  const db = (await import('../config/database')).getDatabase();
  const user = await db.collection<UserDocument>('users').findOne({ firebaseUid: req.user.uid, status: 'active' });
  if (!user) throw new ForbiddenError('User profile not found');
  const memberships = await db.collection<MembershipDocument>('club_memberships').find({ userId: user._id, status: 'active' }).toArray();
  const clubIds = [...new Set(memberships.map(membership => membership.clubId.toString()))].map(id => new ObjectId(id));
  const clubs = clubIds.length ? await db.collection('clubs').find({ _id: { $in: clubIds } }).sort({ name: 1 }).toArray() : [];
  res.json({ status: 'success', data: clubs.map(club => ({
    id: club._id.toString(), name: club.name, slug: club.slug,
    branding: club.branding || { logoUrl: null, primaryColor: '#0ea5e9', secondaryColor: '#f59e0b' },
    settings: club.settings || {}, createdBy: club.createdBy?.toString?.() || '',
    createdAt: club.createdAt?.toISOString?.() || null, updatedAt: club.updatedAt?.toISOString?.() || null,
    active: club._id.toString() === user.activeClubId?.toString(),
  })) });
}));

/**
 * GET /clubs/platform
 * List existing clubs and current system-admin membership state.
 */
router.get('/platform',
  requireRole('system_admin'),
  asyncHandler(async (req, res) => {
    const db = (await import('../config/database')).getDatabase();
    const user = await db.collection<UserDocument>('users').findOne({ firebaseUid: req.user!.uid });
    if (!user) throw new ForbiddenError('User profile not found');

    const [clubs, memberships] = await Promise.all([
      db.collection('clubs').find({}).sort({ name: 1 }).toArray(),
      db.collection('club_memberships').find({ userId: user._id }).toArray(),
    ]);
    const membershipByClubId = new Map(memberships.map(membership => [membership.clubId.toString(), membership]));

    res.json({
      status: 'success',
      data: clubs.map(club => {
        const membership = membershipByClubId.get(club._id.toString());
        return {
          id: club._id.toString(),
          name: club.name,
          slug: club.slug,
          branding: club.branding,
          settings: club.settings,
          createdAt: club.createdAt instanceof Date ? club.createdAt.toISOString() : null,
          hasAccess: membership?.status === 'active',
        };
      }),
    });
  })
);

/** Add the signed-in system administrator as an active head coach of a club. */
router.post('/platform/:id/access',
  requireRole('system_admin'),
  asyncHandler(async (req, res) => {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) throw new NotFoundError('Club');
    const db = (await import('../config/database')).getDatabase();
    const clubId = new ObjectId(req.params.id);
    const [club, user] = await Promise.all([
      db.collection('clubs').findOne({ _id: clubId }),
      db.collection<UserDocument>('users').findOne({ firebaseUid: req.user!.uid }),
    ]);
    if (!club) throw new NotFoundError('Club');
    if (!user) throw new ForbiddenError('User profile not found');

    const now = new Date();
    await db.collection('club_memberships').updateOne(
      { userId: user._id, clubId },
      {
        $set: { role: 'head_coach', status: 'active', joinedAt: now, updatedAt: now },
        $setOnInsert: { createdAt: now, invitedBy: null, invitedAt: null },
      },
      { upsert: true }
    );
    const existingClubIds = Array.isArray(user.clubIds) ? user.clubIds : [];
    const clubIds = [...new Map(
      [...existingClubIds, clubId].map(id => [id.toString(), id])
    ).values()];
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { clubIds, ...(!user.activeClubId ? { activeClubId: clubId } : {}), updatedAt: now } }
    );

    res.json({ status: 'success', data: { clubId: clubId.toString(), access: 'active' } });
  })
);

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
    const creator = await db.collection<UserDocument>('users').findOne({ firebaseUid: req.user!.uid });
    if (!creator) throw new ForbiddenError('User profile not found');

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
      createdBy: creator._id,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('clubs').insertOne(clubDoc);
    const clubId = result.insertedId;

    // Create club_admin membership for creator
    const membership = {
      userId: creator._id,
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
    const creatorClubIds = Array.isArray(creator.clubIds) ? creator.clubIds : [];
    const clubIds = [...new Map([...creatorClubIds, clubId].map(id => [id.toString(), id])).values()];
    await db.collection('users').updateOne(
      { _id: creator._id },
      { $set: { clubIds, activeClubId: clubId, updatedAt: now } }
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

/** List public club details and this athlete's latest enrollment status. */
router.get('/discover', asyncHandler(async (req, res) => {
  if (req.user!.role !== 'athlete') throw new ForbiddenError('Only athletes can browse clubs for enrollment');
  const db = (await import('../config/database')).getDatabase();
  const user = await db.collection<UserDocument>('users').findOne({ firebaseUid: req.user!.uid, status: 'active' });
  if (!user) throw new ForbiddenError('User profile not found');

  const [clubs, requests] = await Promise.all([
    db.collection('clubs').find({}, { projection: { name: 1, slug: 1, branding: 1 } }).sort({ name: 1 }).toArray(),
    db.collection('club_enrollment_requests').find({ athleteId: user._id }).sort({ createdAt: -1 }).toArray(),
  ]);
  const latestRequestByClub = new Map<string, typeof requests[number]>();
  for (const request of requests) {
    const clubId = request.clubId.toString();
    if (!latestRequestByClub.has(clubId)) latestRequestByClub.set(clubId, request);
  }

  res.json({
    status: 'success',
    data: clubs.map(club => {
      const request = latestRequestByClub.get(club._id.toString());
      return {
        id: club._id.toString(),
        name: club.name,
        slug: club.slug,
        branding: club.branding || null,
        request: request ? {
          id: request._id.toString(),
          status: request.status,
          message: request.message || '',
          createdAt: request.createdAt.toISOString(),
          reviewedAt: request.reviewedAt?.toISOString() || null,
        } : null,
      };
    }),
  });
}));

/** Submit an enrollment request; membership is granted only after staff approval. */
router.post('/:id/enrollment-requests', validate(enrollmentRequestSchema), asyncHandler(async (req, res) => {
  if (req.user!.role !== 'athlete') throw new ForbiddenError('Only athletes can request club enrollment');
  const db = (await import('../config/database')).getDatabase();
  const athlete = await db.collection<UserDocument>('users').findOne({ firebaseUid: req.user!.uid, status: 'active' });
  if (!athlete) throw new ForbiddenError('User profile not found');

  const clubId = new ObjectId(req.params.id);
  const club = await db.collection('clubs').findOne({ _id: clubId }, { projection: { _id: 1 } });
  if (!club) throw new NotFoundError('Club');
  const activeMembership = await db.collection('club_memberships').findOne({ userId: athlete._id, status: 'active' });
  if (activeMembership) throw new ConflictError('You already belong to an active club');
  const pendingRequest = await db.collection('club_enrollment_requests').findOne({ athleteId: athlete._id, status: 'pending' });
  if (pendingRequest) throw new ConflictError('You already have a pending enrollment request');

  const now = new Date();
  const requestId = new ObjectId();
  try {
    await db.collection('club_enrollment_requests').insertOne({
      _id: requestId,
      athleteId: athlete._id,
      clubId,
      message: req.body.message || '',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      reviewedBy: null,
      reviewedAt: null,
    });
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) {
      throw new ConflictError('You already have a pending enrollment request');
    }
    throw error;
  }

  res.status(201).json({
    status: 'success',
    data: { id: requestId.toString(), clubId: clubId.toString(), status: 'pending', createdAt: now.toISOString() },
  });
}));

/** List pending enrollment requests for authorized staff of a club. */
router.get('/:id/enrollment-requests',
  requireRole('club_admin', 'system_admin'),
  requirePermission('user:read'),
  verifyClubAccess,
  asyncHandler(async (req, res) => {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) throw new NotFoundError('Club');
    const db = (await import('../config/database')).getDatabase();
    const requests = await db.collection('club_enrollment_requests')
      .find({ clubId: new ObjectId(req.params.id), status: 'pending' })
      .sort({ createdAt: 1 })
      .toArray();
    const athleteIds = requests.map(request => request.athleteId);
    const athletes = await db.collection<UserDocument>('users').find({ _id: { $in: athleteIds } }).toArray();
    const athleteById = new Map(athletes.map(athlete => [athlete._id.toString(), athlete]));

    res.json({
      status: 'success',
      data: requests.map(request => {
        const athlete = athleteById.get(request.athleteId.toString());
        return {
          id: request._id.toString(),
          clubId: request.clubId.toString(),
          status: request.status,
          message: request.message || '',
          createdAt: request.createdAt.toISOString(),
          athlete: athlete ? {
            id: athlete._id.toString(),
            name: athlete.name,
            email: athlete.email,
            avatarUrl: athlete.avatarUrl,
          } : null,
        };
      }),
    });
  })
);

/** Approve or reject a pending enrollment request. */
router.patch('/:id/enrollment-requests/:requestId/review',
  requireRole('club_admin', 'system_admin'),
  requirePermission('user:read'),
  verifyClubAccess,
  validate(reviewEnrollmentRequestSchema),
  asyncHandler(async (req, res) => {
    const db = (await import('../config/database')).getDatabase();
    const clubId = new ObjectId(req.params.id);
    const requestId = new ObjectId(req.params.requestId);
    const request = await db.collection('club_enrollment_requests').findOne({ _id: requestId, clubId, status: 'pending' });
    if (!request) throw new NotFoundError('Pending enrollment request');

    const reviewer = await db.collection<UserDocument>('users').findOne({ firebaseUid: req.user!.uid, status: 'active' });
    if (!reviewer) throw new ForbiddenError('User profile not found');
    const now = new Date();
    const updatedRequest = await db.collection('club_enrollment_requests').findOneAndUpdate(
      { _id: requestId, clubId, status: 'pending' },
      { $set: { status: req.body.status, reviewedBy: reviewer._id, reviewedAt: now, updatedAt: now } },
      { returnDocument: 'after' },
    );
    if (!updatedRequest) throw new ConflictError('This enrollment request has already been reviewed');

    if (req.body.status === 'approved') {
      try {
        const activeMembership = await db.collection('club_memberships').findOne({ userId: request.athleteId, status: 'active' });
        if (activeMembership) throw new ConflictError('Athlete already belongs to an active club');
        const athlete = await db.collection<UserDocument>('users').findOne({ _id: request.athleteId, status: 'active' });
        if (!athlete) throw new NotFoundError('Active athlete account');

        await db.collection('club_memberships').updateOne(
          { userId: athlete._id, clubId },
          {
            $set: { role: 'member', status: 'active', joinedAt: now, updatedAt: now },
            $setOnInsert: { createdAt: now, invitedBy: reviewer._id, invitedAt: null },
          },
          { upsert: true },
        );
        const userUpdate = await db.collection<UserDocument>('users').updateOne(
          { _id: athlete._id, status: 'active' },
          { $addToSet: { clubIds: clubId }, $set: { activeClubId: clubId, updatedAt: now } },
        );
        if (!userUpdate.matchedCount) throw new NotFoundError('Active athlete account');
      } catch (error) {
        await db.collection('club_enrollment_requests').updateOne(
          { _id: requestId, status: 'approved', reviewedBy: reviewer._id },
          { $set: { status: 'pending', reviewedBy: null, reviewedAt: null, updatedAt: new Date() } },
        );
        throw error;
      }
    }

    res.json({ status: 'success', data: { id: requestId.toString(), status: req.body.status, reviewedAt: now.toISOString() } });
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
    const { page, limit, role, status } = clubMembersQuerySchema.shape.query.parse(req.query);

    const db = (await import('../config/database')).getDatabase();

    // Build filter
    const filter: any = { clubId: new ObjectId(id) };
    if (role) filter.role = role;
    if (status) filter.status = status;

    // Get total count
    const total = await db.collection('club_memberships').countDocuments(filter);

    // Get paginated memberships
    const memberships = await db.collection<MembershipDocument>('club_memberships')
      .find(filter)
      .sort({ joinedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Get user details for each membership
    const userIds = memberships.map(m => m.userId);
    const users = await db.collection<UserDocument>('users')
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
          clubIds: getClubIds(user),
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
