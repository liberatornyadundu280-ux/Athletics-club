// apps/backend/src/middleware/rate-limit.middleware.ts
// Redis-backed rate limiting

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { env } from '../config/env';
import { RateLimitError } from '../utils/errors';

// Create Redis client for rate limiting
const redisClient = createClient({
  url: env.REDIS_URL,
});

redisClient.on('error', (err) => {
  console.error('Rate limit Redis error:', err);
});

redisClient.connect().catch(console.error);

const getRateLimitStore = () => new RedisStore({
  sendCommand: (...args: string[]) => redisClient.sendCommand(args),
});

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