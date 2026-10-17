// src/config/redis.ts
// Shared Redis client factory.
//
// Redis is an enhancement, not a hard requirement. The rate limiter and the refresh-token
// store both degrade to an in-process fallback when it is unreachable, and ML inference
// falls back to the rule engine. That keeps local development and CI working without a
// Redis server, while production still uses the shared instance.

import { createClient, RedisClientType } from 'redis';
import { env } from './env';

const REDIS_TIMEOUT_MS = 15000;
const MAX_RECONNECT_DELAY_MS = 30000;

/**
 * Reduce a node-redis connection failure to a single readable line.
 *
 * An unreachable server raises an `AggregateError` holding one error per resolved address
 * (`::1` and `127.0.0.1`), so the raw value prints as dozens of lines.
 */
export function describeRedisError(error: unknown): string {
  const candidate = error as {
    code?: string;
    message?: string;
    errors?: Array<{ code?: string; address?: string; port?: number }>;
  };

  const inner = candidate?.errors?.[0];
  const code = inner?.code ?? candidate?.code;

  if (code === 'ECONNREFUSED') {
    const target = inner?.address ? `${inner.address}:${inner.port ?? ''}` : 'the configured host';
    return `connection refused at ${target}`;
  }

  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return 'host not found';
  }

  if (code) return code;

  return (candidate?.message ?? String(error)).split('\n')[0];
}

/**
 * Log the first failure of an outage, then stay quiet until the client recovers.
 *
 * node-redis retries on its own, so without this an absent server prints a full stack
 * trace on every attempt, indefinitely.
 */
export function attachRedisLogging(client: RedisClientType, label: string): void {
  let outageReported = false;

  client.on('error', (error) => {
    if (outageReported) return;
    outageReported = true;
    console.warn(`[${label}] unavailable: ${describeRedisError(error)}`);
  });

  client.on('ready', () => {
    if (outageReported) console.log(`[${label}] reconnected`);
    outageReported = false;
  });
}

export function createConfiguredRedisClient(label = 'Redis'): RedisClientType {
  const client = createClient({
    url: env.REDIS_URL,
    socket: {
      connectTimeout: REDIS_TIMEOUT_MS,
      // Keep retrying so the process recovers when Redis starts later, with a capped
      // backoff so an absent server is not hammered.
      reconnectStrategy: (retries: number) =>
        Math.min(250 * 2 ** Math.min(retries, 7), MAX_RECONNECT_DELAY_MS),
    },
    commandOptions: { timeout: REDIS_TIMEOUT_MS },
  });

  attachRedisLogging(client, label);
  return client;
}

/** True once the client has completed its handshake and can serve commands. */
export function isRedisReady(client: RedisClientType): boolean {
  return client.isReady;
}

let mlRedisClient: RedisClientType | null = null;

/**
 * Return a *ready* ML inference client.
 *
 * This deliberately does not await `connect()`. Against an unreachable server that promise
 * never settles, because node-redis keeps retrying — so awaiting it would stall every
 * recommendation request for the full command timeout. The connection is started in the
 * background instead and this throws immediately until it is ready; `callMLInference`
 * catches that and the caller falls back to the rule engine within the same request.
 */
export async function getMLRedisClient(): Promise<RedisClientType> {
  if (mlRedisClient?.isReady) return mlRedisClient;

  if (!mlRedisClient) {
    mlRedisClient = createConfiguredRedisClient('ML Redis');
    void mlRedisClient.connect().catch(() => {
      // Reported once by attachRedisLogging; callers fall back to the rule engine.
    });
  }

  throw new Error('Redis is not available; ML inference is disabled for this request');
}

export async function closeMLRedisClient(): Promise<void> {
  const client = mlRedisClient;
  mlRedisClient = null;
  if (!client) return;

  if (client.isReady) {
    await client.quit().catch(() => {});
  } else if (client.isOpen) {
    // A pending connection would queue QUIT behind its own retries, so cut it instead.
    client.destroy();
  }
}
