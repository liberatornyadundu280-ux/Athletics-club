// src/migrations/002-daily-readiness-and-exercise-enhancements.ts
// Migration for daily_readiness collection and enhanced exercise/workout fields

import { Db, IndexDescription } from 'mongodb';
import { dropIndexesByName, ensureCollection, ensureIndexes } from './helpers';

const READINESS_INDEXES: IndexDescription[] = [
  { key: { clubId: 1, athleteId: 1, date: -1 }, unique: true, name: 'uq_daily_readiness_athlete_date' },
  { key: { clubId: 1, date: -1 }, name: 'idx_daily_readiness_club_date' },
  { key: { clubId: 1, athleteId: 1, createdAt: -1 }, name: 'idx_daily_readiness_club_athlete_created' },
];

const EXERCISE_INDEXES: IndexDescription[] = [
  { key: { clubId: 1, phase: 1 }, name: 'idx_exercises_club_phase' },
  { key: { clubId: 1, energySystem: 1 }, name: 'idx_exercises_club_energy_system' },
  { key: { clubId: 1, movementPattern: 1 }, name: 'idx_exercises_club_movement_pattern' },
  { key: { clubId: 1, contraindications: 1 }, name: 'idx_exercises_club_contraindications' },
];

const WORKOUT_INDEXES: IndexDescription[] = [
  { key: { clubId: 1, periodizationPhase: 1 }, name: 'idx_workouts_club_periodization' },
  { key: { clubId: 1, energySystemFocus: 1 }, name: 'idx_workouts_club_energy_focus' },
  { key: { clubId: 1, templateType: 1 }, name: 'idx_workouts_club_template_type' },
  { key: { clubId: 1, targetEventGroup: 1 }, name: 'idx_workouts_club_target_event' },
];

export const up = async (db: Db): Promise<void> => {
  // ==================== DAILY READINESS COLLECTION ====================
  // `connectToDatabase()` already creates this collection implicitly, so `ensureCollection`
  // applies the validator through `collMod` when it is present rather than failing.
  await ensureCollection(db, 'daily_readiness', {
    bsonType: 'object',
    required: ['clubId', 'athleteId', 'date', 'soreness', 'sleepQuality', 'stressEnergy', 'createdAt', 'updatedAt'],
    properties: {
      clubId: { bsonType: 'objectId' },
      athleteId: { bsonType: 'objectId' },
      date: { bsonType: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      soreness: { bsonType: 'int', minimum: 1, maximum: 5 },
      sleepQuality: { bsonType: 'int', minimum: 1, maximum: 5 },
      stressEnergy: { bsonType: 'int', minimum: 1, maximum: 5 },
      notes: { bsonType: ['string', 'null'], maxLength: 500 },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  });
  await ensureIndexes(db, 'daily_readiness', READINESS_INDEXES);

  // ==================== EXERCISES COLLECTION ENHANCEMENTS ====================
  // Add new fields to existing exercises (additive only, no breaking changes)
  // Fields: phase, energySystem, movementPattern, cnsIntensity, contraindications
  await db.collection('exercises').updateMany(
    { phase: { $exists: false } },
    {
      $set: {
        phase: 'strength',
        energySystem: 'mixed',
        movementPattern: 'unknown',
        cnsIntensity: 3,
        contraindications: [],
        updatedAt: new Date(),
      },
    }
  );
  await ensureIndexes(db, 'exercises', EXERCISE_INDEXES);

  // ==================== WORKOUTS COLLECTION ENHANCEMENTS ====================
  // Add new fields to existing workouts (additive only)
  // Fields: periodizationPhase, energySystemFocus, templateType, targetEventGroup, estimatedRPE, estimatedDurationMinutes
  await db.collection('workouts').updateMany(
    { periodizationPhase: { $exists: false } },
    {
      $set: {
        periodizationPhase: 'pre-comp',
        energySystemFocus: 'mixed',
        templateType: 'strength',
        targetEventGroup: 'unknown',
        estimatedRPE: 6.5,
        estimatedDurationMinutes: 60,
        updatedAt: new Date(),
      },
    }
  );
  await ensureIndexes(db, 'workouts', WORKOUT_INDEXES);

  console.log('Migration 002: Daily readiness + exercise/workout enhancements applied');
};

export const down = async (db: Db): Promise<void> => {
  await db.collection('daily_readiness').drop().catch(() => {});

  // Remove added fields from exercises
  await db.collection('exercises').updateMany(
    {},
    {
      $unset: {
        phase: '',
        energySystem: '',
        movementPattern: '',
        cnsIntensity: '',
        contraindications: '',
      },
    }
  );

  // Remove added fields from workouts
  await db.collection('workouts').updateMany(
    {},
    {
      $unset: {
        periodizationPhase: '',
        energySystemFocus: '',
        templateType: '',
        targetEventGroup: '',
        estimatedRPE: '',
        estimatedDurationMinutes: '',
      },
    }
  );

  // Drop only the indexes this migration created. `dropIndexes()` would also remove the
  // indexes owned by `connectToDatabase()` (idx_exercises_club_name, idx_workouts_club_updated),
  // which the running application still needs.
  await dropIndexesByName(db, 'exercises', EXERCISE_INDEXES.map(index => index.name!));
  await dropIndexesByName(db, 'workouts', WORKOUT_INDEXES.map(index => index.name!));

  console.log('Migration 002: Rolled back');
};
