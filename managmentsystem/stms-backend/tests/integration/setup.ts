// tests/integration/setup.ts
// Integration test setup with MongoDB and Redis

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { MongoClient, Db } from 'mongodb';
import { createClient } from 'redis';

// Test database name
const TEST_DB_NAME = 'stms_test';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let mongoClient: MongoClient;
let db: Db;
let redisClient: ReturnType<typeof createClient>;

export async function setupTestDatabase(): Promise<Db> {
  mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  db = mongoClient.db(TEST_DB_NAME);
  return db;
}

export async function setupTestRedis() {
  redisClient = createClient({ url: REDIS_URL });
  redisClient.on('error', (err) => console.error('Test Redis error:', err));
  await redisClient.connect();
  return redisClient;
}

export async function teardownTestDatabase() {
  if (db) {
    // Drop all collections
    const collections = await db.listCollections().toArray();
    for (const coll of collections) {
      await db.collection(coll.name).drop().catch(() => {});
    }
    await mongoClient.close();
  }
  if (redisClient) {
    await redisClient.quit();
  }
}

export async function clearTestData() {
  if (db) {
    const collections = await db.listCollections().toArray();
    for (const coll of collections) {
      await db.collection(coll.name).deleteMany({});
    }
  }
  if (redisClient) {
    await redisClient.flushDb();
  }
}

export { db, redisClient };

// Vitest hooks
beforeAll(async () => {
  await setupTestDatabase();
  await setupTestRedis();
}, 60000);

afterAll(async () => {
  await teardownTestDatabase();
}, 30000);

beforeEach(async () => {
  await clearTestData();
});

afterEach(async () => {
  // Additional cleanup if needed
});