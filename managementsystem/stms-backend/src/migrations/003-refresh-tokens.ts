// src/migrations/003-refresh-tokens.ts
// Refresh-token storage used when Redis is unreachable.
//
// Refresh tokens normally live in Redis, but the API falls back to MongoDB on machines and
// deployments without it. That fallback must not lose sessions on restart, so the records
// are persisted here. `expiresAt` carries a TTL index, mirroring the Redis key expiry.

import { Db, IndexDescription } from 'mongodb';
import { dropIndexesByName, ensureCollection, ensureIndexes } from './helpers';

const REFRESH_TOKEN_INDEXES: IndexDescription[] = [
  { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: 'ttl_refresh_tokens_expiry' },
  { key: { userId: 1 }, name: 'idx_refresh_tokens_user' },
];

export const up = async (db: Db): Promise<void> => {
  await ensureCollection(db, 'refresh_tokens', {
    bsonType: 'object',
    required: ['userId', 'createdAt', 'expiresAt'],
    properties: {
      _id: { bsonType: 'string' },
      userId: { bsonType: 'string' },
      createdAt: { bsonType: 'date' },
      expiresAt: { bsonType: 'date' },
    },
  });

  await ensureIndexes(db, 'refresh_tokens', REFRESH_TOKEN_INDEXES);
};

export const down = async (db: Db): Promise<void> => {
  // Only the indexes this migration created; dropping the collection would also discard
  // live sessions if a rollback is performed while the fallback store is in use.
  await dropIndexesByName(db, 'refresh_tokens', ['ttl_refresh_tokens_expiry', 'idx_refresh_tokens_user']);
};
