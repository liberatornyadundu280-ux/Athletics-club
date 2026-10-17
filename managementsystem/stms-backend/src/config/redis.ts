// src/config/redis.ts
// Shared Redis client for ML inference and other services

import { createClient, RedisClientType } from 'redis';
import { env } from './env';

let mlRedisClient: RedisClientType | null = null;
let isConnecting = false;
let connectionPromise: Promise<RedisClientType> | null = null;

export async function getMLRedisClient(): Promise<RedisClientType> {
  if (mlRedisClient?.isReady) {
    return mlRedisClient;
  }

  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  isConnecting = true;
  connectionPromise = (async () => {
    const client = createClient({ url: env.REDIS_URL });
    
    client.on('error', (err) => {
      console.error('ML Redis client error:', err);
    });

    client.on('connect', () => {
      console.log('ML Redis client connected');
    });

    client.on('ready', () => {
      console.log('ML Redis client ready');
    });

    client.on('end', () => {
      console.log('ML Redis client disconnected');
    });

    await client.connect();
    mlRedisClient = client;
    isConnecting = false;
    return client;
  })();

  return connectionPromise;
}

export async function closeMLRedisClient(): Promise<void> {
  if (mlRedisClient) {
    await mlRedisClient.quit();
    mlRedisClient = null;
  }
  connectionPromise = null;
}