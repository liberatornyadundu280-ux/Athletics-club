// src/routes/auth.routes.ts
// Authentication routes

import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler';
import { validate } from '../middleware/validation.middleware';
import { authLimiter } from '../middleware/rate-limit.middleware';
import { z } from 'zod';
import { firebaseAuth } from '../config/firebase';
import { setUserClaims, revokeUserClaims } from '../config/firebase';
import { jwt } from '../config/env';
import { generateTokens, hashRefreshToken, storeRefreshToken, revokeRefreshToken, verifyRefreshToken } from '../utils/tokens';
import { UnauthorizedError, ConflictError, ValidationError } from '../utils/errors';
import { ERROR_CODES } from '../utils/errors';

const router = Router();

// ==================== ZOD SCHEMAS ====================
const registerSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase().max(255),
    password: z.string().min(12).max(128),
    role: z.enum(['athlete', 'coach']),
    name: z.string().min(1).max(100),
    clubId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(1),
  }),
});

const googleAuthSchema = z.object({
  body: z.object({
    idToken: z.string().min(1),
    clubId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  }),
});

const switchClubSchema = z.object({
  body: z.object({
    clubId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
});

// ==================== HELPERS ====================
// These would be in a separate auth service - inline for now

const REFRESH_TOKEN_TTL_DAYS = 7;

function generateAccessToken(payload: any): string {
  // Implementation in utils/tokens.ts
  return '';
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
    clubIds: data.clubIds.map(id => new (await import('mongodb')).ObjectId(id)),
    activeClubId: data.activeClubId ? new (await import('mongodb')).ObjectId(data.activeClubId) : null,
    permissions: [], // Will be populated by Cloud Function
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
  const { email, password, role, name, clubId } = req.body;

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

  // Set initial custom claims (will be synced by Cloud Function)
  await setUserClaims(firebaseUid, {
    role,
    clubIds: clubId ? [clubId] : [],
    activeClubId: clubId || null,
    permissions: [],
  });

  // Create MongoDB user document
  const user = await createUserInMongoDB({
    firebaseUid,
    email,
    name,
    role,
    clubIds: clubId ? [clubId] : [],
    activeClubId: clubId || null,
  });

  // Generate tokens
  const { accessToken, refreshToken } = await generateTokens({
    uid: firebaseUid,
    email,
    role,
    clubIds: clubId ? [clubId] : [],
    activeClubId: clubId || null,
    permissions: [],
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

  // Remove sensitive data from response
  const { password: _, ...userWithoutPassword } = user;

  res.status(201).json({
    status: 'success',
    data: {
      accessToken,
      expiresIn: 900,
      tokenType: 'Bearer',
      user: userWithoutPassword,
    },
  });
}));

/**
 * POST /auth/login
 * Login with email/password
 */
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Get user from Firebase
  let firebaseUser;
  try {
    firebaseUser = await firebaseAuth.getUserByEmail(email);
  } catch {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Verify password by trying to sign in with Firebase Admin
  // Note: Firebase Admin doesn't have password verification directly
  // In production, use Firebase Client SDK on frontend or implement custom verification
  // For now, we'll use a simplified approach - in real implementation,
  // the frontend would send the ID token from Firebase Client SDK

  throw new Error('Password verification requires Firebase Client SDK integration');
}));

/**
 * POST /auth/google
 * Login/register with Google OAuth
 */
router.post('/google', authLimiter, validate(googleAuthSchema), asyncHandler(async (req, res) => {
  const { idToken, clubId } = req.body;

  // Verify Google ID token
  const decoded = await firebaseAuth.verifyIdToken(idToken, true);
  const { uid, email, name, picture } = decoded;

  if (!email) {
    throw new UnauthorizedError('Google account must have email');
  }

  // Check if user exists
  let firebaseUser;
  let isNewUser = false;

  try {
    firebaseUser = await firebaseAuth.getUserByEmail(email);
  } catch {
    // Create new user
    firebaseUser = await firebaseAuth.createUser({
      uid,
      email,
      displayName: name,
      photoURL: picture,
      emailVerified: true,
    });
    isNewUser = true;
  }

  // Get or create MongoDB user
  const db = (await import('../config/database')).getDatabase();
  let user = await db.collection('users').findOne({ firebaseUid: firebaseUser.uid });

  if (!user) {
    const now = new Date();
    const userDoc = {
      firebaseUid: firebaseUser.uid,
      email,
      name: name || email.split('@')[0],
      avatarUrl: picture || null,
      role: 'athlete' as const,
      clubIds: clubId ? [new (await import('mongodb')).ObjectId(clubId)] : [],
      activeClubId: clubId ? new (await import('mongodb')).ObjectId(clubId) : null,
      permissions: [],
      status: 'active' as const,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const result = await db.collection('users').insertOne(userDoc);
    user = { ...userDoc, _id: result.insertedId };
  } else {
    // Update last login
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
    );
  }

  // Generate tokens
  const claims = await (await import('../config/firebase')).getUserClaims(firebaseUser.uid);
  const { accessToken, refreshToken } = await generateTokens({
    uid: firebaseUser.uid,
    email,
    role: claims?.role || 'athlete',
    clubIds: claims?.clubIds || [],
    activeClubId: claims?.activeClubId || null,
    permissions: claims?.permissions || [],
  });

  // Store refresh token
  await storeRefreshToken(firebaseUser.uid, refreshToken);

  // Set cookie
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
      accessToken,
      expiresIn: 900,
      tokenType: 'Bearer',
      user: {
        id: user._id.toString(),
        firebaseUid: user.firebaseUid,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        clubIds: user.clubIds.map((id: any) => id.toString()),
        activeClubId: user.activeClubId?.toString() || null,
        status: user.status,
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    },
  });
}));

/**
 * POST /auth/refresh
 * Refresh access token using refresh token cookie
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

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
  const refreshToken = req.cookies?.refreshToken;

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
router.get('/me', asyncHandler(async (req, res) => {
  // User already attached by authenticate middleware
  // This route will be protected by authenticate middleware in app.ts
  res.json({
    status: 'success',
    data: {
      user: req.user,
      permissions: req.user?.permissions || [],
    },
  });
}));

/**
 * POST /auth/switch-club
 * Switch active club context
 */
router.post('/switch-club', validate(switchClubSchema), asyncHandler(async (req, res) => {
  const { clubId } = req.body;
  const userId = req.user!.uid;

  // Verify user is member of this club
  const db = (await import('../config/database')).getDatabase();
  const membership = await db.collection('club_memberships').findOne({
    userId: new (await import('mongodb')).ObjectId(userId),
    clubId: new (await import('mongodb')).ObjectId(clubId),
    status: 'active',
  });

  if (!membership) {
    throw new UnauthorizedError('Not a member of this club', { code: ERROR_CODES.CLUB_ACCESS_DENIED });
  }

  // Update user's active club
  await db.collection('users').updateOne(
    { firebaseUid: userId },
    { $set: { activeClubId: new (await import('mongodb')).ObjectId(clubId), updatedAt: new Date() } }
  );

  // Refresh claims via Cloud Function
  // In production, call the callable function or wait for Firestore trigger
  const claims = await (await import('../config/firebase')).getUserClaims(userId);

  res.json({
    status: 'success',
    data: {
      user: {
        ...req.user,
        activeClubId: clubId,
        clubIds: claims?.clubIds || [],
      },
      permissions: claims?.permissions || [],
    },
  });
}));

export default router;