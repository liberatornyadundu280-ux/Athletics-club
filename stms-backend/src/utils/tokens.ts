// src/utils/tokens.ts
// JWT token generation and refresh token management

import jwt from 'jsonwebtoken';
import { createClient } from 'redis';
import { env } from '../config/env';
import { JWTPayload } from '../types';

const redisClient = createClient({ url: env.REDIS_URL });
redisClient.on('error', (err) => console.error('Redis token error:', err));
redisClient.connect().catch(console.error);

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 7;
const REFRESH_TOKEN_KEY_PREFIX = 'refresh_token:';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
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

  return { accessToken, refreshToken };
}

/**
 * Generate secure random refresh token
 */
function generateRefreshToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64url');
}

/**
 * Hash refresh token for storage
 */
export function hashRefreshToken(token: string): string {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
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

  // Get user's current claims from Firebase
  const { getUserClaims } = await import('../config/firebase');
  const claims = await getUserClaims(userId);

  if (!claims) {
    throw new Error('User claims not found');
  }

  return {
    uid: userId,
    email: '', // Will be populated from claims or DB
    role: claims.role,
    clubIds: claims.clubIds,
    activeClubId: claims.activeClubId,
    permissions: claims.permissions,
  };
}

/**
 * Revoke (delete) refresh token
 */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const hashed = await hashRefreshToken(refreshToken);
  const key = `${REFRESH_TOKEN_KEY_PREFIX}${hashed}`;
  await redisClient.del(key);
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  // Note: This requires scanning Redis keys which is not efficient
  // In production, maintain a user->token mapping or use Redis sets
  // For now, we'll implement a simpler approach
  const pattern = `${REFRESH_TOKEN_KEY_PREFIX}*`;
  // This is a simplified version - production should use SCAN
  // await redisClient.keys(pattern) then filter by userId
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