// src/middleware/rate-limit.middleware.ts
// Rate limiting, with a graceful in-process fallback when Redis is unreachable.

import rateLimit, { MemoryStore, Store, Options, ClientRateLimitInfo } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { RedisClientType } from 'redis';
import { createConfiguredRedisClient, isRedisReady } from '../config/redis';

// One dedicated connection for rate limiting. The connection is started in the background
// and never awaited: while it is pending — or if it never succeeds — the resilient store
// below serves every counter from memory.
const redisClient: RedisClientType = createConfiguredRedisClient('Rate limit Redis');

void redisClient.connect().catch(() => {
  // Reported once by attachRedisLogging; the fallback keeps the API usable.
});

export async function closeRateLimitRedisClient(): Promise<void> {
  if (redisClient.isReady) {
    await redisClient.close();
  } else if (redisClient.isOpen) {
    // During a pending connection, destroy instead of queuing QUIT behind it.
    redisClient.destroy();
  }
}

/**
 * A rate-limit store that prefers Redis and falls back to per-process counting.
 *
 * Redis shares counters across instances, which is what production wants. But a limiter
 * that hard-fails when its store is unreachable takes the whole API down with it — and
 * because login sits behind `authLimiter`, a Redis blip would make the system impossible
 * to sign into. Degrading the *strictness* of the limit is far better than degrading
 * availability.
 */
class ResilientRateLimitStore implements Store {
  /** Counters may live in this process only, so keys are not shared between instances. */
  localKeys = true;

  private readonly fallback = new MemoryStore();
  private redisStore: RedisStore | null = null;

  constructor(private readonly client: RedisClientType) {}

  /**
   * Built on first use rather than in the constructor. `RedisStore` eagerly issues its two
   * `SCRIPT LOAD` commands when constructed, and against an unreachable server those sit
   * in the command queue and abort after the command timeout — a stray error at startup
   * for a store we are not even using yet.
   */
  private getRedisStore(): RedisStore {
    this.redisStore ??= new RedisStore({
      prefix: 'stms:rate-limit:',
      sendCommand: (...args: string[]) => this.client.sendCommand(args),
    });
    return this.redisStore;
  }

  init(options: Options): void {
    this.fallback.init(options);
  }

  private async delegate<T>(
    viaRedis: () => Promise<T>,
    viaMemory: () => T | Promise<T>
  ): Promise<T> {
    if (isRedisReady(this.client)) {
      try {
        return await viaRedis();
      } catch {
        // Connection dropped mid-request: serve this request from memory rather than
        // failing it.
      }
    }
    return await viaMemory();
  }

  /**
   * Only used to expose `middleware.getKey`; it plays no part in counting, and the memory
   * store has no equivalent, so it reports "no counter" while Redis is unavailable.
   */
  get(key: string): Promise<ClientRateLimitInfo | undefined> {
    if (!isRedisReady(this.client)) return Promise.resolve(undefined);
    return this.getRedisStore().get(key).catch(() => undefined);
  }

  increment(key: string) {
    return this.delegate(
      () => this.getRedisStore().increment(key),
      () => this.fallback.increment(key)
    );
  }

  decrement(key: string) {
    return this.delegate(
      () => this.getRedisStore().decrement(key),
      () => this.fallback.decrement(key)
    );
  }

  resetKey(key: string) {
    return this.delegate(
      () => this.getRedisStore().resetKey(key),
      () => this.fallback.resetKey(key)
    );
  }

  async resetAll(): Promise<void> {
    await this.fallback.resetAll();
    if (isRedisReady(this.client)) {
      // RedisStore does not implement resetAll; clear the keys it owns directly.
      await this.client
        .keys('stms:rate-limit:*')
        .then((keys) => (keys.length ? this.client.del(keys) : undefined))
        .catch(() => {});
    }
  }

  async shutdown(): Promise<void> {
    await this.fallback.shutdown();
  }
}

/**
 * Each limiter needs its own store instance — express-rate-limit rejects a shared one,
 * because it prefixes keys per limiter and a shared store would double-count. They all
 * share the single Redis connection above.
 */
const getRateLimitStore = () => new ResilientRateLimitStore(redisClient);

/**
 * General API rate limiter: 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  store: getRateLimitStore(),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
  skip: (req) => req.path === '/healthz', // Don't rate limit health checks
});

/**
 * Strict rate limiter for auth endpoints: 5 requests per 15 minutes per IP
 * Skip successful requests to allow legitimate users
 */
export const authLimiter = rateLimit({
  store: getRateLimitStore(),
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `auth:${req.ip}`,
  skipSuccessfulRequests: true,
});

/**
 * Stricter rate limiter for sensitive operations: 10 requests per hour per user
 */
export const sensitiveOperationLimiter = rateLimit({
  store: getRateLimitStore(),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many sensitive operations, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `sensitive:${req.user?.uid || req.ip}`,
});

/**
 * Custom rate limiter factory
 */
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => rateLimit({
  store: getRateLimitStore(),
  windowMs: options.windowMs,
  max: options.max,
  message: options.message || 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${options.keyPrefix}:${req.user?.uid || req.ip}`,
  skipSuccessfulRequests: options.skipSuccessfulRequests,
});

export { redisClient as rateLimitRedisClient };
