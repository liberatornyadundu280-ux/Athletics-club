// apps/backend/src/migrations/002-athletes-collection.ts
// Migration for athletes collection

import { Db, IndexDescription } from 'mongodb';

export const up = async (db: Db): Promise<void> => {
  await db.createCollection('athletes', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['firstName', 'lastName', 'email', 'clubId', 'status', 'createdAt', 'updatedAt'],
        properties: {
          userId: { bsonType: ['objectId', 'null'] },
          firstName: { bsonType: 'string', minLength: 1, maxLength: 100 },
          lastName: { bsonType: 'string', minLength: 1, maxLength: 100 },
          email: { bsonType: 'string', pattern: '^.+@.+$' },
          phone: { bsonType: ['string', 'null'] },
          dateOfBirth: { bsonType: ['date', 'null'] },
          gender: { enum: ['male', 'female', 'other'] },
          eventSpecialization: { bsonType: 'array', items: { bsonType: 'string' } },
          personalBest: { bsonType: 'object' },
          seasonBest: { bsonType: 'object' },
          medicalNotes: { bsonType: ['string', 'null'] },
          emergencyContact: {
            bsonType: ['object', 'null'],
            properties: {
              name: { bsonType: 'string' },
              relationship: { bsonType: 'string' },
              phone: { bsonType: 'string' },
              email: { bsonType: ['string', 'null'] },
            },
          },
          school: { bsonType: ['string', 'null'] },
          grade: { bsonType: ['string', 'null'] },
          status: { enum: ['active', 'injured', 'inactive', 'transferred', 'alumni'] },
          clubId: { bsonType: 'objectId' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  });

  const indexes: IndexDescription[] = [
    { key: { clubId: 1, status: 1 }, name: 'idx_athletes_club_status' },
    { key: { clubId: 1, eventSpecialization: 1 }, name: 'idx_athletes_club_events' },
    { key: { email: 1 }, name: 'idx_athletes_email' },
    { key: { createdAt: -1 }, name: 'idx_athletes_created_at_desc' },
  ];
  await db.collection('athletes').createIndexes(indexes);

  console.log('Migration 002: Athletes collection created successfully');
};

export const down = async (db: Db): Promise<void> => {
  await db.collection('athletes').drop().catch(() => {});
  console.log('Migration 002: Rolled back');
};