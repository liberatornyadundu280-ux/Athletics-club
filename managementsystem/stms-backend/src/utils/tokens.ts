// src/utils/tokens.ts
// JWT token generation and refresh token management

import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { createClient } from 'redis';
import { env } from '../config/env';
import { JWTPayload } from '../types';

const redisClient = createClient({ url: env.REDIS_URL });
let isClosingRedisClient = false;
redisClient.on('error', (err) => {
  if (!isClosingRedisClient) console.error('Redis token error:', err);
});
const redisConnection = redisClient.connect().catch((err) => {
  if (!isClosingRedisClient) console.error('Redis token connection failed:', err);
});

export async function closeTokenRedisClient(): Promise<void> {
  isClosingRedisClient = true;
  if (redisClient.isReady) {
    await redisClient.close();
  } else if (redisClient.isOpen) {
    // During a pending connection, destroy instead of queuing QUIT behind it.
    redisClient.destroy();
  }
  await redisConnection;
}

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 7;
const REFRESH_TOKEN_KEY_PREFIX = 'refresh_token:';
const USER_REFRESH_TOKEN_SET_PREFIX = 'refresh_tokens_by_user:';

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
 * Store refresh token in Redis with TTL
 */
export async function storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
  const hashed = await hashRefreshToken(refreshToken);
  const key = `${REFRESH_TOKEN_KEY_PREFIX}${hashed}`;

  await redisClient.setEx(
    key,
    REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60, // TTL in seconds
    JSON.stringify({ userId, createdAt: Date.now() })
  );
  await redisClient.sAdd(`${USER_REFRESH_TOKEN_SET_PREFIX}${userId}`, key);
  await redisClient.expire(`${USER_REFRESH_TOKEN_SET_PREFIX}${userId}`, REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60);
}

/**
 * Verify refresh token and return payload
 */
export async function verifyRefreshToken(refreshToken: string): Promise<TokenPayload> {
  const hashed = await hashRefreshToken(refreshToken);
  const key = `${REFRESH_TOKEN_KEY_PREFIX}${hashed}`;

  const stored = await redisClient.get(key);
  if (!stored) {
    throw new Error('Refresh token not found or expired');
  }

  const { userId } = JSON.parse(stored);

  // User documents are the source of truth for account and club state.
  const db = (await import('../config/database')).getDatabase();
  const user = await db.collection('users').findOne({ firebaseUid: userId });
  if (!user || user.status !== 'active') {
    throw new Error('User profile not found or inactive');
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
  const hashed = await hashRefreshToken(refreshToken);
  const key = `${REFRESH_TOKEN_KEY_PREFIX}${hashed}`;
  const stored = await redisClient.get(key);
  await redisClient.del(key);
  if (stored) {
    const { userId } = JSON.parse(stored) as { userId: string };
    await redisClient.sRem(`${USER_REFRESH_TOKEN_SET_PREFIX}${userId}`, key);
  }
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  const indexKey = `${USER_REFRESH_TOKEN_SET_PREFIX}${userId}`;
  const tokenKeys = await redisClient.sMembers(indexKey);
  if (tokenKeys.length) await redisClient.del(tokenKeys);
  await redisClient.del(indexKey);
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
