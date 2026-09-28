// apps/backend/src/config/database.ts
// MongoDB connection with connection pooling and graceful shutdown

import { MongoClient, Db, ServerApiVersion } from 'mongodb';
import { env } from './env';

let client: MongoClient;
let db: Db;

export async function connectToDatabase(): Promise<Db> {
  if (db) return db;

  client = new MongoClient(env.MONGODB_URI as string, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    maxPoolSize: 100,
    minPoolSize: 10,
    maxIdleTimeMS: 30000,
    waitQueueTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  await client.connect();
  db = client.db();

  // Test connection
  await db.command({ ping: 1 });
  console.log('✅ Connected to MongoDB Atlas');

  return db;
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectToDatabase() first.');
  }
  return db;
}

export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('SIGINT received, closing database connection...');
  await closeDatabaseConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database connection...');
  await closeDatabaseConnection();
  process.exit(0);
});

export { client as mongoClient };