// apps/backend/src/migrations/006-injury-collections.ts
// Migration for injury management collections

import { Db, IndexDescription } from 'mongodb';

export const up = async (db: Db): Promise<void> => {
  // ==================== INJURIES COLLECTION ====================
  await db.createCollection('injuries', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['clubId', 'athleteId', 'type', 'bodyPart', 'laterality', 'onsetDate', 'mechanism', 'severity', 'diagnosisSource', 'status', 'createdAt', 'updatedAt'],
        properties: {
          clubId: { bsonType: 'objectId' },
          athleteId: { bsonType: 'objectId' },
          type: { bsonType: 'string', minLength: 1, maxLength: 100 },
          bodyPart: { bsonType: 'string', minLength: 1, maxLength: 50 },
          laterality: { enum: ['left', 'right', 'bilateral'] },
          onsetDate: { bsonType: 'date' },
          mechanism: { bsonType: 'string' },
          severity: { bsonType: 'int', minimum: 1, maximum: 3 },
          diagnosisSource: { enum: ['self', 'coach', 'physio', 'doctor', 'imaging'] },
          imaging: { bsonType: 'array', items: { bsonType: 'string' } },
          status: { enum: ['active', 'rehabilitating', 'returning', 'resolved', 'chronic'] },
          expectedReturnDate: { bsonType: ['date', 'null'] },
          actualReturnDate: { bsonType: ['date', 'null'] },
          rtpProtocolId: { bsonType: ['objectId', 'null'] },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  });

  const injuryIndexes: IndexDescription[] = [
    { key: { clubId: 1, athleteId: 1, status: 1 }, name: 'idx_injuries_athlete_status' },
    { key: { clubId: 1, bodyPart: 1, status: 1 }, name: 'idx_injuries_body_part_status' },
    { key: { clubId: 1, onsetDate: -1 }, name: 'idx_injuries_onset_date_desc' },
    { key: { clubId: 1, severity: 1 }, name: 'idx_injuries_severity' },
    { key: { rtpProtocolId: 1 }, name: 'idx_injuries_rtp_protocol' },
  ];
  await db.collection('injuries').createIndexes(injuryIndexes);

  // ==================== REHAB LOGS COLLECTION ====================
  await db.createCollection('rehab_logs', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['clubId', 'injuryId', 'date', 'painLevel', 'wellnessScore', 'createdAt', 'updatedAt'],
        properties: {
          clubId: { bsonType: 'objectId' },
          injuryId: { bsonType: 'objectId' },
          date: { bsonType: 'date' },
          painLevel: { bsonType: 'int', minimum: 1, maximum: 10 },
          wellnessScore: { bsonType: 'int', minimum: 1, maximum: 10 },
          exercisesCompleted: { bsonType: 'array', items: { bsonType: 'string' } },
          notes: { bsonType: ['string', 'null'] },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  });

  const rehabIndexes: IndexDescription[] = [
    { key: { clubId: 1, injuryId: 1, date: -1 }, name: 'idx_rehab_injury_date_desc' },
    { key: { injuryId: 1, date: -1 }, name: 'idx_rehab_injury_date' },
  ];
  await db.collection('rehab_logs').createIndexes(rehabIndexes);

  // ==================== RTP PROTOCOLS COLLECTION ====================
  await db.createCollection('rtp_protocols', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['clubId', 'injuryType', 'stages', 'createdAt', 'updatedAt'],
        properties: {
          clubId: { bsonType: 'objectId' },
          injuryType: { bsonType: 'string' },
          stages: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              required: ['stageNumber', 'name', 'criteria', 'minDays', 'allowedExercises', 'restrictedExercises'],
              properties: {
                stageNumber: { bsonType: 'int', minimum: 1 },
                name: { bsonType: 'string' },
                criteria: { bsonType: 'array', items: { bsonType: 'string' } },
                minDays: { bsonType: 'int', minimum: 0 },
                allowedExercises: { bsonType: 'array', items: { bsonType: 'string' } },
                restrictedExercises: { bsonType: 'array', items: { bsonType: 'string' } },
              },
            },
          },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  });

  const rtpIndexes: IndexDescription[] = [
    { key: { clubId: 1, injuryType: 1 }, name: 'idx_rtp_club_injury_type' },
  ];
  await db.collection('rtp_protocols').createIndexes(rtpIndexes);

  console.log('Migration 006: Injury collections created successfully');
};

export const down = async (db: Db): Promise<void> => {
  await db.collection('injuries').drop().catch(() => {});
  await db.collection('rehab_logs').drop().catch(() => {});
  await db.collection('rtp_protocols').drop().catch(() => {});
  console.log('Migration 006: Rolled back');
};