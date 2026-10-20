// src/utils/tokens.ts
// JWT token generation and refresh token management.
//
// Refresh tokens live in Redis so that revoking one is effective across instances. When
// Redis is unreachable — the normal state on a developer machine with no Redis — they fall
// back to MongoDB rather than to process memory. Memory would drop every session whenever
// the API restarts, which is exactly the "stay signed in" behaviour a browser expects;
// MongoDB is already a hard dependency and survives restarts. Either fallback is reported
// on first use.

import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { createConfiguredRedisClient, isRedisReady } from '../config/redis';
import { env } from '../config/env';
import { ERROR_CODES, UnauthorizedError } from './errors';
import { JWTPayload } from '../types';

const redisClient = createConfiguredRedisClient('Redis token');

// Started in the background and never awaited; while it is pending the Mongo fallback
// handles every operation.
void redisClient.connect().catch(() => {
  // Reported once by attachRedisLogging.
});

export async function closeTokenRedisClient(): Promise<void> {
  if (redisClient.isReady) {
    await redisClient.close();
  } else if (redisClient.isOpen) {
    // During a pending connection, destroy instead of queuing QUIT behind it.
    redisClient.destroy();
  }
}

const ACCESS_TOKEN_TTL = '15m';

/**
 * How long a session survives without being used. The refresh token rotates on every
 * access-token renewal (every 15 minutes of activity), so an active session never expires;
 * this bound only applies to an idle one. Override with REFRESH_TOKEN_TTL_DAYS.
 */
export const REFRESH_TOKEN_TTL_DAYS = Number(env.REFRESH_TOKEN_TTL_DAYS) || 30;
const REFRESH_TOKEN_TTL_SECONDS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;
const REFRESH_TOKEN_KEY_PREFIX = 'refresh_token:';
const USER_REFRESH_TOKEN_SET_PREFIX = 'refresh_tokens_by_user:';
const REFRESH_TOKEN_COLLECTION = 'refresh_tokens';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface TokenPayload {
  uid: string;
  email: string;
  role: JWTPayload['role'];
  clubIds: string[];
  activeClubId: string | null;
  permissions: string[];
}

interface StoredRefreshToken {
  userId: string;
  createdAt: number;
}

interface RefreshTokenDocument {
  _id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

async function getRefreshTokenCollection() {
  const db = (await import('../config/database')).getDatabase();
  return db.collection<RefreshTokenDocument>(REFRESH_TOKEN_COLLECTION);
}

let fallbackReported = false;

function reportMongoFallback(): void {
  if (fallbackReported) return;
  fallbackReported = true;

  if (env.NODE_ENV === 'production') {
    console.error(
      'Redis unavailable — refresh tokens are being stored in MongoDB. Sessions survive restarts, but every refresh now costs a database round-trip; restore Redis for production.'
    );
  } else {
    console.warn('Redis unavailable — refresh tokens are stored in MongoDB for this process.');
  }
}

// Allow the warning to be raised again if Redis recovers and then drops out later.
redisClient.on('ready', () => {
  fallbackReported = false;
});

/**
 * Generate access token (RS256) and refresh token
 */
export async function generateTokens(payload: TokenPayload): Promise<TokenPair> {
  const accessToken = jwt.sign(
    {
      sub: payload.uid,
      email: payload.email,
      role: payload.role,
      clubIds: payload.clubIds,
      activeClubId: payload.activeClubId,
      permissions: payload.permissions,
    },
    env.JWT_PRIVATE_KEY,
    {
      algorithm: 'RS256',
      expiresIn: ACCESS_TOKEN_TTL,
      issuer: 'stms-backend',
      audience: 'stms-frontend',
    }
  );

  // Generate cryptographically secure refresh token
  const refreshToken = generateRefreshToken();

  return { accessToken, refreshToken, expiresIn: 900, tokenType: 'Bearer' };
}

/**
 * Generate secure random refresh token
 */
function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Hash refresh token for storage
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Store refresh token with a TTL
 */
export async function storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
  const key = `${REFRESH_TOKEN_KEY_PREFIX}${hashRefreshToken(refreshToken)}`;
  const indexKey = `${USER_REFRESH_TOKEN_SET_PREFIX}${userId}`;

  if (isRedisReady(redisClient)) {
    const payload = JSON.stringify({ userId, createdAt: Date.now() });
    await redisClient.setEx(key, REFRESH_TOKEN_TTL_SECONDS, payload);
    await redisClient.sAdd(indexKey, key);
    await redisClient.expire(indexKey, REFRESH_TOKEN_TTL_SECONDS);
    return;
  }

  reportMongoFallback();
  const now = new Date();
  await (await getRefreshTokenCollection()).updateOne(
    { _id: key },
    {
      $set: {
        userId,
        createdAt: now,
        expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      },
    },
    { upsert: true }
  );
}

async function readRefreshToken(key: string): Promise<StoredRefreshToken | null> {
  if (isRedisReady(redisClient)) {
    const stored = await redisClient.get(key);
    return stored ? (JSON.parse(stored) as StoredRefreshToken) : null;
  }

  reportMongoFallback();
  const document = await (await getRefreshTokenCollection()).findOne({ _id: key });
  return document ? { userId: document.userId, createdAt: document.createdAt.getTime() } : null;
}

/**
 * Verify refresh token and return payload
 */
export async function verifyRefreshToken(refreshToken: string): Promise<TokenPayload> {
  const key = `${REFRESH_TOKEN_KEY_PREFIX}${hashRefreshToken(refreshToken)}`;
  const stored = await readRefreshToken(key);

  if (!stored) {
    // A revoked or expired token is a normal client condition, not a server fault; it must
    // be a 401 so the app can prompt for a fresh sign-in instead of showing a 500.
    throw new UnauthorizedError('Refresh token not found or expired', { code: ERROR_CODES.TOKEN_EXPIRED });
  }

  const { userId } = stored;

  // User documents are the source of truth for account and club state.
  const db = (await import('../config/database')).getDatabase();
  const user = await db.collection('users').findOne({ firebaseUid: userId });
  if (!user || user.status !== 'active') {
    throw new UnauthorizedError('User profile not found or inactive', { code: ERROR_CODES.UNAUTHORIZED });
  }

  // Preserve permission claims where present, while taking club membership
  // and role from the persisted account record.
  const { getUserClaims } = await import('../config/firebase');
  const claims = await getUserClaims(userId);

  return {
    uid: userId,
    email: user.email,
    role: user.role,
    clubIds: user.clubIds.map((id: { toString(): string }) => id.toString()),
    activeClubId: user.activeClubId?.toString() || null,
    permissions: user.permissions?.length ? user.permissions : claims?.permissions || [],
  };
}

/**
 * Revoke (delete) refresh token
 */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const key = `${REFRESH_TOKEN_KEY_PREFIX}${hashRefreshToken(refreshToken)}`;

  if (isRedisReady(redisClient)) {
    const stored = await readRefreshToken(key);
    await redisClient.del(key);
    if (stored) {
      await redisClient.sRem(`${USER_REFRESH_TOKEN_SET_PREFIX}${stored.userId}`, key);
    }
    return;
  }

  await (await getRefreshTokenCollection()).deleteOne({ _id: key });
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  const indexKey = `${USER_REFRESH_TOKEN_SET_PREFIX}${userId}`;

  if (isRedisReady(redisClient)) {
    const tokenKeys = await redisClient.sMembers(indexKey);
    if (tokenKeys.length) await redisClient.del(tokenKeys);
    await redisClient.del(indexKey);
    return;
  }

  reportMongoFallback();
  await (await getRefreshTokenCollection()).deleteMany({ userId });
}

/**
 * Verify access token (for middleware)
 */
export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, env.JWT_PUBLIC_KEY, {
    algorithms: ['RS256'],
    issuer: 'stms-backend',
    audience: 'stms-frontend',
  }) as JWTPayload;
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}
