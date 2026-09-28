// apps/backend/src/migrations/008-analytics-collections.ts
// Migration for analytics collections

import { Db, IndexDescription } from 'mongodb';

export const up = async (db: Db): Promise<void> => {
  // ==================== ANALYTICS ROLLUPS COLLECTION ====================
  await db.createCollection('analytics_rollups', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['clubId', 'date', 'entityType', 'metrics', 'createdAt'],
        properties: {
          clubId: { bsonType: 'objectId' },
          date: { bsonType: 'date' },
          entityType: { enum: ['athlete', 'coach', 'club'] },
          entityId: { bsonType: ['objectId', 'null'] },
          metrics: { bsonType: 'object' },
          createdAt: { bsonType: 'date' },
        },
      },
    },
  });

  const rollupIndexes: IndexDescription[] = [
    { key: { clubId: 1, date: -1 }, name: 'idx_rollups_club_date_desc' },
    { key: { clubId: 1, entityType: 1, entityId: 1, date: -1 }, unique: true, name: 'idx_rollups_unique' },
    { key: { clubId: 1, entityType: 1, date: -1 }, name: 'idx_rollups_club_type_date' },
  ];
  await db.collection('analytics_rollups').createIndexes(rollupIndexes);

  // ==================== CUSTOM REPORTS COLLECTION ====================
  await db.createCollection('custom_reports', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['clubId', 'createdBy', 'name', 'config', 'createdAt', 'updatedAt'],
        properties: {
          clubId: { bsonType: 'objectId' },
          createdBy: { bsonType: 'objectId' },
          name: { bsonType: 'string', minLength: 1, maxLength: 100 },
          description: { bsonType: ['string', 'null'] },
          config: { bsonType: 'object' },
          schedule: { bsonType: ['object', 'null'] },
          lastRunAt: { bsonType: ['date', 'null'] },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  });

  const reportIndexes: IndexDescription[] = [
    { key: { clubId: 1, createdBy: 1 }, name: 'idx_reports_club_creator' },
    { key: { clubId: 1, schedule: 1 }, name: 'idx_reports_schedule' },
  ];
  await db.collection('custom_reports').createIndexes(reportIndexes);

  console.log('Migration 008: Analytics collections created successfully');
};

export const down = async (db: Db): Promise<void> => {
  await db.collection('analytics_rollups').drop().catch(() => {});
  await db.collection('custom_reports').drop().catch(() => {});
  console.log('Migration 008: Rolled back');
};