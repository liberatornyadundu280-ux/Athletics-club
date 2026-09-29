// src/config/database.ts
// MongoDB connection with connection pooling and graceful shutdown

import { MongoClient, Db, ServerApiVersion } from 'mongodb';
import { env } from './env';

let client: MongoClient;
let db: Db;

export async function connectToDatabase(): Promise<Db> {
  if (db) return db;

  client = new MongoClient(env.MONGODB_URI, {
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
  // Athlete profiles are club-scoped and may optionally link to an account.
  // MongoDB creates the collection if needed when these indexes are created.
  await db.collection('athletes').createIndexes([
    { key: { clubId: 1, createdAt: -1 }, name: 'idx_athletes_club_created_desc' },
    {
      key: { clubId: 1, email: 1 },
      unique: true,
      partialFilterExpression: { clubId: { $type: 'objectId' }, email: { $type: 'string' } },
      name: 'idx_athletes_club_email_unique',
    },
    {
      key: { clubId: 1, userId: 1 },
      unique: true,
      partialFilterExpression: { userId: { $type: 'objectId' } },
      name: 'idx_athletes_club_user_unique',
    },
    { key: { clubId: 1, status: 1 }, name: 'idx_athletes_club_status' },
    { key: { clubId: 1, eventSpecialization: 1 }, name: 'idx_athletes_club_events' },
  ]);
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

export { client as mongoClient };
