// apps/backend/src/migrations/005-performance-collections.ts
// Migration for performance tracking collections

import { Db, IndexDescription } from 'mongodb';

export const up = async (db: Db): Promise<void> => {
  // ==================== COMPETITIONS COLLECTION ====================
  await db.createCollection('competitions', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['clubId', 'name', 'date', 'venue', 'level', 'createdAt', 'updatedAt'],
        properties: {
          clubId: { bsonType: 'objectId' },
          name: { bsonType: 'string', minLength: 2, maxLength: 200 },
          date: { bsonType: 'date' },
          venue: { bsonType: 'string', minLength: 2, maxLength: 200 },
          level: { enum: ['club', 'district', 'state', 'national', 'international'] },
          events: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              required: ['name', 'type', 'gender', 'ageGroup'],
              properties: {
                name: { bsonType: 'string' },
                type: { enum: ['sprint', 'distance', 'jump', 'throw', 'combined'] },
                gender: { enum: ['male', 'female', 'mixed'] },
                ageGroup: { bsonType: 'string' },
              },
            },
          },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  });

  const competitionIndexes: IndexDescription[] = [
    { key: { clubId: 1, date: -1 }, name: 'idx_competitions_club_date_desc' },
    { key: { clubId: 1, level: 1 }, name: 'idx_competitions_club_level' },
  ];
  await db.collection('competitions').createIndexes(competitionIndexes);

  // ==================== RESULTS COLLECTION ====================
  await db.createCollection('results', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['clubId', 'athleteId', 'competitionId', 'event', 'round', 'result', 'createdAt'],
        properties: {
          clubId: { bsonType: 'objectId' },
          athleteId: { bsonType: 'objectId' },
          competitionId: { bsonType: 'objectId' },
          event: { bsonType: 'string' },
          round: { bsonType: 'string' },
          result: { bsonType: 'string' },
          wind: { bsonType: ['double', 'null'] },
          position: { bsonType: ['int', 'null'] },
          waPoints: { bsonType: ['int', 'null'] },
          isPB: { bsonType: 'bool' },
          isSB: { bsonType: 'bool' },
          createdAt: { bsonType: 'date' },
        },
      },
    },
  });

  const resultIndexes: IndexDescription[] = [
    { key: { clubId: 1, athleteId: 1, event: 1, date: -1 }, name: 'idx_results_athlete_event_date' },
    { key: { clubId: 1, competitionId: 1 }, name: 'idx_results_competition' },
    { key: { clubId: 1, isPB: 1 }, name: 'idx_results_pb' },
    { key: { clubId: 1, isSB: 1 }, name: 'idx_results_sb' },
    { key: { createdAt: -1 }, name: 'idx_results_created_at_desc' },
  ];
  await db.collection('results').createIndexes(resultIndexes);

  // ==================== FITNESS TESTS COLLECTION ====================
  await db.createCollection('fitness_tests', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['clubId', 'athleteId', 'testType', 'value', 'unit', 'date', 'createdAt', 'updatedAt'],
        properties: {
          clubId: { bsonType: 'objectId' },
          athleteId: { bsonType: 'objectId' },
          testType: { enum: ['30m_fly', 'standing_long_jump', 'medicine_ball_throw', 'yo_yo_ir1', '300m_run', 'vertical_jump', 'broad_jump', 'custom'] },
          value: { bsonType: 'number' },
          unit: { bsonType: 'string' },
          date: { bsonType: 'date' },
          percentile: { bsonType: ['int', 'null'], minimum: 0, maximum: 100 },
          notes: { bsonType: ['string', 'null'] },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  });

  const fitnessIndexes: IndexDescription[] = [
    { key: { clubId: 1, athleteId: 1, testType: 1, date: -1 }, name: 'idx_fitness_athlete_test_date' },
    { key: { clubId: 1, testType: 1, date: -1 }, name: 'idx_fitness_test_type_date' },
  ];
  await db.collection('fitness_tests').createIndexes(fitnessIndexes);

  // ==================== GOALS COLLECTION ====================
  await db.createCollection('goals', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['clubId', 'athleteId', 'event', 'targetValue', 'targetDate', 'status', 'createdAt', 'updatedAt'],
        properties: {
          clubId: { bsonType: 'objectId' },
          athleteId: { bsonType: 'objectId' },
          event: { bsonType: 'string' },
          targetValue: { bsonType: 'string' },
          targetDate: { bsonType: 'date' },
          status: { enum: ['active', 'achieved', 'missed', 'archived'] },
          coachNotes: { bsonType: ['string', 'null'] },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  });

  const goalIndexes: IndexDescription[] = [
    { key: { clubId: 1, athleteId: 1, status: 1 }, name: 'idx_goals_athlete_status' },
    { key: { clubId: 1, targetDate: 1 }, name: 'idx_goals_target_date' },
    { key: { clubId: 1, event: 1 }, name: 'idx_goals_event' },
  ];
  await db.collection('goals').createIndexes(goalIndexes);

  console.log('Migration 005: Performance collections created successfully');
};

export const down = async (db: Db): Promise<void> => {
  await db.collection('competitions').drop().catch(() => {});
  await db.collection('results').drop().catch(() => {});
  await db.collection('fitness_tests').drop().catch(() => {});
  await db.collection('goals').drop().catch(() => {});
  console.log('Migration 005: Rolled back');
};