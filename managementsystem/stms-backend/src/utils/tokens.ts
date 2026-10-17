// src/utils/tokens.ts
// JWT token generation and refresh token management.
//
// Refresh tokens live in Redis so that revoking one is effective across instances. When
// Redis is unreachable the process keeps them in memory instead, so local development and
// CI can sign in without running a Redis server. That fallback is reported on first use —
// it is a development convenience, not a production strategy.

import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { createConfiguredRedisClient, isRedisReady } from '../config/redis';
import { env } from '../config/env';
import { ERROR_CODES, UnauthorizedError } from './errors';
import { JWTPayload } from '../types';

const redisClient = createConfiguredRedisClient('Redis token');

// Started in the background and never awaited; while it is pending the memory fallback
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
const REFRESH_TOKEN_TTL_DAYS = 7;
const REFRESH_TOKEN_TTL_SECONDS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;
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
 * In-process stand-in for the handful of Redis commands the refresh-token store uses.
 * Entries carry their own expiry, so a long-running process cannot accumulate stale keys.
 */
class MemoryTokenStore {
  private readonly entries = new Map<string, { value?: string; members?: Set<string>; expiresAt: number }>();

  private live(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }

  setEx(key: string, ttlSeconds: number, value: string): void {
    this.entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  get(key: string): string | null {
    return this.live(key)?.value ?? null;
  }

  del(keys: string | string[]): void {
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      this.entries.delete(key);
    }
  }

  sAdd(key: string, member: string, ttlSeconds: number): void {
    const entry = this.live(key) ?? { members: new Set<string>(), expiresAt: Date.now() + ttlSeconds * 1000 };
    entry.members = entry.members ?? new Set<string>();
    entry.members.add(member);
    this.entries.set(key, entry);
  }

  sRem(key: string, member: string): void {
    this.live(key)?.members?.delete(member);
  }

  sMembers(key: string): string[] {
    return [...(this.live(key)?.members ?? [])];
  }
}

const memoryTokens = new MemoryTokenStore();
let fallbackReported = false;

function reportMemoryFallback(): void {
  if (fallbackReported) return;
  fallbackReported = true;

  if (env.NODE_ENV === 'production') {
    console.error(
      'Redis unavailable — refresh tokens are being held in memory. Sessions will not survive a restart and are NOT shared between instances.'
    );
  } else {
    console.warn('Redis unavailable — refresh tokens are held in memory for this process.');
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
  const payload = JSON.stringify({ userId, createdAt: Date.now() });

  if (!isRedisReady(redisClient)) {
    reportMemoryFallback();
    memoryTokens.setEx(key, REFRESH_TOKEN_TTL_SECONDS, payload);
    memoryTokens.sAdd(indexKey, key, REFRESH_TOKEN_TTL_SECONDS);
    return;
  }

  await redisClient.setEx(key, REFRESH_TOKEN_TTL_SECONDS, payload);
  await redisClient.sAdd(indexKey, key);
  await redisClient.expire(indexKey, REFRESH_TOKEN_TTL_SECONDS);
}

async function readRefreshToken(key: string): Promise<string | null> {
  if (isRedisReady(redisClient)) {
    return redisClient.get(key);
  }
  reportMemoryFallback();
  return memoryTokens.get(key);
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

  const { userId } = JSON.parse(stored);

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
  const stored = await readRefreshToken(key);

  if (!isRedisReady(redisClient)) {
    memoryTokens.del(key);
    if (stored) {
      const { userId } = JSON.parse(stored) as { userId: string };
      memoryTokens.sRem(`${USER_REFRESH_TOKEN_SET_PREFIX}${userId}`, key);
    }
    return;
  }

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

  if (!isRedisReady(redisClient)) {
    reportMemoryFallback();
    const tokenKeys = memoryTokens.sMembers(indexKey);
    memoryTokens.del([...tokenKeys, indexKey]);
    return;
  }

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
