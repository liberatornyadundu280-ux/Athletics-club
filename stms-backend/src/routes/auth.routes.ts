// src/routes/auth.routes.ts
// Authentication routes

import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error-handler';
import { validate } from '../middleware/validation.middleware';
import { authLimiter } from '../middleware/rate-limit.middleware';
import { z } from 'zod';
import { firebaseAuth } from '../config/firebase';
import { setUserClaims } from '../config/firebase';
import { generateTokens, storeRefreshToken, revokeRefreshToken, verifyRefreshToken } from '../utils/tokens';
import { UnauthorizedError, ConflictError } from '../utils/errors';
import { ERROR_CODES } from '../utils/errors';
import type { UserDocument } from '../types';
import { permissionsForRole } from '../utils/role-permissions';

const router = Router();
const getClubIds = (user: Partial<UserDocument>): string[] =>
  Array.isArray(user.clubIds) ? user.clubIds.filter(Boolean).map(id => id.toString()) : [];

// ==================== ZOD SCHEMAS ====================
const registerSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase().max(255),
    password: z.string().min(12).max(128),
    role: z.enum(['athlete', 'coach']),
    name: z.string().min(1).max(100),
  }),
});

const googleAuthSchema = z.object({
  body: z.object({
    idToken: z.string().min(1),
  }),
});

const firebaseAuthHandler = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  const decoded = await firebaseAuth.verifyIdToken(idToken, true);
  const { uid, email, name, picture } = decoded;
  if (!email) throw new UnauthorizedError('Firebase account must have an email');

  const firebaseUser = await firebaseAuth.getUser(uid);
  const db = (await import('../config/database')).getDatabase();
  let user = await db.collection<UserDocument>('users').findOne({ firebaseUid: uid });
  const now = new Date();

  if (!user) {
    const userDoc = {
      firebaseUid: uid,
      email: firebaseUser.email || email,
      name: firebaseUser.displayName || name || email.split('@')[0],
      avatarUrl: firebaseUser.photoURL || picture || null,
      role: 'athlete' as const,
      clubIds: [],
      activeClubId: null,
      permissions: permissionsForRole('athlete'),
      status: 'active' as const,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    const inserted = await db.collection('users').insertOne(userDoc);
    user = { ...userDoc, _id: inserted.insertedId } as UserDocument;
  } else {
    if (user.status !== 'active') throw new UnauthorizedError('This account is not active');
    if (!user.permissions?.length) {
      user.permissions = permissionsForRole(user.role);
      await db.collection('users').updateOne({ _id: user._id }, { $set: { permissions: user.permissions } });
      await setUserClaims(uid, {
        role: user.role,
        clubIds: getClubIds(user),
        activeClubId: user.activeClubId?.toString() || null,
        permissions: user.permissions,
      });
    }
    user.lastLoginAt = now;
    user.updatedAt = now;
    await db.collection('users').updateOne({ _id: user._id }, { $set: { lastLoginAt: now, updatedAt: now } });
  }

  const clubIds = getClubIds(user);
  const claims = {
    role: user.role,
    clubIds,
    activeClubId: user.activeClubId?.toString() || null,
    permissions: user.permissions || [],
  };
  const { accessToken, refreshToken, expiresIn, tokenType } = await generateTokens({ uid, email: user.email, ...claims });
  await storeRefreshToken(uid, refreshToken);
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.json({
    status: 'success',
    data: {
      accessToken, expiresIn, tokenType, permissions: claims.permissions,
      user: {
        id: user._id.toString(), firebaseUid: user.firebaseUid, email: user.email,
        name: user.name, avatarUrl: user.avatarUrl || null, role: user.role,
        clubIds, activeClubId: claims.activeClubId, status: user.status,
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
        createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString(),
      },
    },
  });
});

const switchClubSchema = z.object({
  body: z.object({
    clubId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
});

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
  }),
});

const acceptInvitationSchema = z.object({
  body: z.object({ token: z.string().regex(/^[0-9a-fA-F]{24}$/) }),
});

// ==================== HELPERS ====================
// These would be in a separate auth service - inline for now

const REFRESH_TOKEN_TTL_DAYS = 7;

function readCookie(req: { headers: { cookie?: string } }, name: string): string | undefined {
  const entry = req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : undefined;
}

async function createUserInFirebase(email: string, password: string, displayName: string): Promise<string> {
  const userRecord = await firebaseAuth.createUser({
    email,
    password,
    displayName,
    emailVerified: false,
  });
  return userRecord.uid;
}

async function createUserInMongoDB(data: {
  firebaseUid: string;
  email: string;
  name: string;
  role: string;
  clubIds: string[];
  activeClubId: string | null;
}): Promise<any> {
  const db = (await import('../config/database')).getDatabase();
  const now = new Date();

  const userDoc = {
    firebaseUid: data.firebaseUid,
    email: data.email,
    name: data.name,
    avatarUrl: null,
    role: data.role,
    clubIds: data.clubIds.map(id => new ObjectId(id)),
    activeClubId: data.activeClubId ? new ObjectId(data.activeClubId) : null,
    permissions: permissionsForRole(data.role as 'athlete' | 'coach'),
    status: 'active' as const,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const result = await db.collection('users').insertOne(userDoc);
  return { ...userDoc, _id: result.insertedId };
}

// ==================== ROUTES ====================

/**
 * POST /auth/register
 * Register new user with email/password
 */
router.post('/register', authLimiter, validate(registerSchema), asyncHandler(async (req, res) => {
  const { email, password, role, name } = req.body;

  // Check if user already exists in Firebase
  try {
    await firebaseAuth.getUserByEmail(email);
    throw new ConflictError('Email already registered');
  } catch (error: any) {
    if (error.code !== 'auth/user-not-found') {
      throw error;
    }
  }

  // Create Firebase user
  const firebaseUid = await createUserInFirebase(email, password, name);

  // Set role-based claims; club access is granted only through an invitation.
  await setUserClaims(firebaseUid, {
    role,
    clubIds: [],
    activeClubId: null,
    permissions: permissionsForRole(role),
  });

  // Create MongoDB user document
  const user = await createUserInMongoDB({
    firebaseUid,
    email,
    name,
    role,
    clubIds: [],
    activeClubId: null,
  });

  // Generate tokens
  const { accessToken, refreshToken } = await generateTokens({
    uid: firebaseUid,
    email,
    role,
    clubIds: [],
    activeClubId: null,
    permissions: permissionsForRole(role),
  });

  // Store refresh token
  await storeRefreshToken(firebaseUid, refreshToken);

  // Set refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.status(201).json({
    status: 'success',
    data: {
      accessToken,
      expiresIn: 900,
      tokenType: 'Bearer',
      permissions: permissionsForRole(role),
      user: {
        id: user._id.toString(), firebaseUid: user.firebaseUid, email: user.email,
        name: user.name, avatarUrl: user.avatarUrl || null, role: user.role,
        clubIds: getClubIds(user),
        activeClubId: user.activeClubId?.toString() || null, status: user.status,
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
        createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString(),
      },
    },
  });
}));

/**
 * POST /auth/google
 * Login/register with Google OAuth
 */
router.post('/firebase', authLimiter, validate(googleAuthSchema), firebaseAuthHandler);
router.post('/google', authLimiter, validate(googleAuthSchema), firebaseAuthHandler);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token cookie
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const refreshToken = readCookie(req, 'refreshToken');

  if (!refreshToken) {
    throw new UnauthorizedError('No refresh token provided', { code: ERROR_CODES.TOKEN_EXPIRED });
  }

  // Verify refresh token
  const payload = await verifyRefreshToken(refreshToken);

  // Generate new tokens (rotation)
  const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await generateTokens(payload);

  // Store new refresh token, revoke old
  await storeRefreshToken(payload.uid, newRefreshToken);
  await revokeRefreshToken(refreshToken);

  // Set new cookie
  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.json({
    status: 'success',
    data: {
      accessToken: newAccessToken,
      expiresIn: 900,
      tokenType: 'Bearer',
    },
  });
}));

/**
 * POST /auth/logout
 * Revoke refresh token and clear cookie
 */
router.post('/logout', asyncHandler(async (req, res) => {
  const refreshToken = readCookie(req, 'refreshToken');

  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  res.json({ status: 'success', message: 'Logged out successfully' });
}));

/**
 * GET /auth/me
 * Get current user with permissions
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const db = (await import('../config/database')).getDatabase();
  const user = await db.collection<UserDocument>('users').findOne({ firebaseUid: req.user!.uid });
  if (!user || user.status !== 'active') throw new UnauthorizedError('User profile not found');

  res.json({
    status: 'success',
    data: {
      user: {
        id: user._id.toString(), firebaseUid: user.firebaseUid, email: user.email,
        name: user.name, avatarUrl: user.avatarUrl || null, role: user.role,
        clubIds: getClubIds(user),
        activeClubId: user.activeClubId?.toString() || null, status: user.status,
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
        createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString(),
      },
      permissions: user.permissions?.length ? user.permissions : req.user!.permissions || permissionsForRole(user.role),
    },
  });
}));

router.patch('/me', authenticate, validate(updateProfileSchema), asyncHandler(async (req, res) => {
  const db = (await import('../config/database')).getDatabase();
  const user = await db.collection<UserDocument>('users').findOne({ firebaseUid: req.user!.uid });
  if (!user || user.status !== 'active') throw new UnauthorizedError('User profile not found');

  const now = new Date();
  await db.collection('users').updateOne(
    { _id: user._id },
    { $set: { name: req.body.name, updatedAt: now } }
  );
  await firebaseAuth.updateUser(user.firebaseUid, { displayName: req.body.name });
  res.json({
    status: 'success',
    data: {
      user: {
        id: user._id.toString(), firebaseUid: user.firebaseUid, email: user.email,
        name: req.body.name, avatarUrl: user.avatarUrl || null, role: user.role,
        clubIds: getClubIds(user),
        activeClubId: user.activeClubId?.toString() || null, status: user.status,
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
        createdAt: user.createdAt.toISOString(), updatedAt: now.toISOString(),
      },
      permissions: user.permissions?.length ? user.permissions : req.user!.permissions || permissionsForRole(user.role),
    },
  });
}));

router.post('/accept-invitation', authenticate, validate(acceptInvitationSchema), asyncHandler(async (req, res) => {
  const db = (await import('../config/database')).getDatabase();
  const invitationId = new ObjectId(req.body.token);
  const invitation = await db.collection('invitations').findOne({ _id: invitationId, status: 'pending' });
  if (!invitation || invitation.expiresAt <= new Date()) throw new UnauthorizedError('Invitation is invalid or expired');

  const user = await db.collection<UserDocument>('users').findOne({ firebaseUid: req.user!.uid });
  if (!user || user.status !== 'active') throw new UnauthorizedError('User profile not found');
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new UnauthorizedError('Sign in with the email address this invitation was sent to');
  }

  const currentMembership = await db.collection('club_memberships').findOne<any>({
    userId: user._id,
    clubId: invitation.clubId,
  });
  if (currentMembership?.status === 'active') throw new ConflictError('You are already a member of this club');

  const role = invitation.role as 'club_admin' | 'coach' | 'athlete';
  const membershipRole = role === 'club_admin' ? 'head_coach' : role === 'coach' ? 'assistant_coach' : 'member';
  const now = new Date();
  const membershipFields = {
    role: membershipRole,
    status: 'active',
    joinedAt: now,
    invitedBy: invitation.invitedBy,
    invitedAt: invitation.invitedAt,
    updatedAt: now,
  };
  if (currentMembership) {
    await db.collection('club_memberships').updateOne({ _id: currentMembership._id }, { $set: membershipFields });
  } else {
    await db.collection('club_memberships').insertOne({
      userId: user._id,
      clubId: invitation.clubId,
      ...membershipFields,
      createdAt: now,
    });
  }
  await db.collection('invitations').updateOne({ _id: invitationId }, { $set: { status: 'accepted', acceptedAt: now, acceptedBy: user._id } });

  // If the coach added an athlete profile before the athlete created an STMS
  // account, connect that club-scoped profile once the invitation is accepted.
  if (role === 'athlete') {
    await db.collection('athletes').updateOne(
      { clubId: invitation.clubId, email: user.email.toLowerCase(), $or: [{ userId: null }, { userId: { $exists: false } }] },
      { $set: { userId: user._id, updatedAt: now } },
    );
  }

  const effectiveRole = user.role === 'system_admin' ? 'system_admin' : role;
  const permissions = permissionsForRole(effectiveRole);
  const existingClubIds = Array.isArray(user.clubIds) ? user.clubIds : [];
  const clubIds = [...new Set([...existingClubIds.map((id: ObjectId) => id.toString()), invitation.clubId.toString()])];
  await db.collection('users').updateOne(
    { _id: user._id },
    { $set: { role: effectiveRole, permissions, clubIds: clubIds.map(id => new ObjectId(id)), activeClubId: invitation.clubId, updatedAt: now } }
  );
  await setUserClaims(user.firebaseUid, {
    role: effectiveRole,
    clubIds,
    activeClubId: invitation.clubId.toString(),
    permissions,
  });

  const { accessToken, refreshToken, expiresIn, tokenType } = await generateTokens({
    uid: user.firebaseUid,
    email: user.email,
    role: effectiveRole,
    clubIds,
    activeClubId: invitation.clubId.toString(),
    permissions,
  });
  await storeRefreshToken(user.firebaseUid, refreshToken);
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.json({
    status: 'success',
    data: {
      accessToken, expiresIn, tokenType, permissions,
      user: {
        id: user._id.toString(), firebaseUid: user.firebaseUid, email: user.email,
        name: user.name, avatarUrl: user.avatarUrl || null, role: effectiveRole,
        clubIds, activeClubId: invitation.clubId.toString(), status: user.status,
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
        createdAt: user.createdAt.toISOString(), updatedAt: now.toISOString(),
      },
    },
  });
}));

/**
 * POST /auth/switch-club
 * Switch active club context
 */
router.post('/switch-club', authenticate, validate(switchClubSchema), asyncHandler(async (req, res) => {
  const { clubId } = req.body;
  const userId = req.user!.uid;

  // Verify user is member of this club
  const db = (await import('../config/database')).getDatabase();
  const user = await db.collection('users').findOne({ firebaseUid: userId });
  if (!user) throw new UnauthorizedError('User profile not found');

  const membership = await db.collection('club_memberships').findOne({
    userId: user._id,
    clubId: new ObjectId(clubId),
    status: 'active',
  });

  if (!membership) {
    throw new UnauthorizedError('Not a member of this club', { code: ERROR_CODES.CLUB_ACCESS_DENIED });
  }

  const roleFromMembership: Record<string, 'club_admin' | 'coach' | 'athlete'> = {
    head_coach: 'club_admin', assistant_coach: 'coach', specialist_coach: 'coach',
    member: 'athlete', captain: 'athlete', alumni: 'athlete',
  };
  const role: UserDocument['role'] = req.user!.role === 'system_admin' ? 'system_admin' : roleFromMembership[membership.role] || req.user!.role;
  const permissions = permissionsForRole(role);

  // Update user's active club
  await db.collection('users').updateOne(
    { firebaseUid: userId },
    { $set: { activeClubId: new ObjectId(clubId), role, permissions, updatedAt: new Date() } }
  );

  const activeMemberships = await db.collection('club_memberships').distinct('clubId', { userId: user._id, status: 'active' });
  const clubIds = activeMemberships.map((id: ObjectId) => id.toString());
  await db.collection('users').updateOne(
    { _id: user._id },
    { $set: { clubIds: activeMemberships, activeClubId: new ObjectId(clubId), updatedAt: new Date() } },
  );
  const updatedClaims = {
    role,
    clubIds,
    activeClubId: clubId,
    permissions,
  };
  await setUserClaims(userId, updatedClaims);
  const tokenPair = await generateTokens({ uid: userId, email: user.email, ...updatedClaims });
  await storeRefreshToken(userId, tokenPair.refreshToken);
  res.cookie('refreshToken', tokenPair.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.json({
    status: 'success',
    data: {
      accessToken: tokenPair.accessToken,
      expiresIn: tokenPair.expiresIn,
      user: {
        id: user._id.toString(),
        firebaseUid: user.firebaseUid,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl || null,
        role,
        activeClubId: clubId,
        clubIds,
        status: user.status,
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: new Date().toISOString(),
      },
      permissions: updatedClaims.permissions,
    },
  });
}));

export default router;
