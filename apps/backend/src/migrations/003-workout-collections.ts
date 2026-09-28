// apps/backend/src/migrations/003-workout-collections.ts
// Migration for workout-related collections

import { Db, IndexDescription } from 'mongodb';

export const up = async (db: Db): Promise<void> => {
  // ==================== EXERCISES COLLECTION ====================
  await db.createCollection('exercises', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['name', 'clubId', 'createdBy', 'createdAt', 'updatedAt'],
        properties: {
          clubId: { bsonType: ['objectId', 'null'] },
          name: { bsonType: 'string', minLength: 2, maxLength: 100 },
          description: { bsonType: ['string', 'null'] },
          muscles: { bsonType: 'array', items: { bsonType: 'string' } },
          equipment: { bsonType: 'array', items: { bsonType: 'string' } },
          videoUrl: { bsonType: ['string', 'null'] },
          cues: { bsonType: 'array', items: { bsonType: 'string' } },
          difficulty: { enum: ['beginner', 'intermediate', 'advanced'] },
          intensityPrescription: {
            bsonType: 'object',
            required: ['type', 'value', 'unit'],
            properties: {
              type: { enum: ['percentage', 'rpe', 'velocity', 'heart_rate'] },
              value: { bsonType: 'number' },
              unit: { bsonType: 'string' },
            },
          },
          progressionRules: {
            bsonType: 'object',
            required: ['weeklyIncreasePercent', 'deloadEveryNWeeks', 'deloadPercent'],
            properties: {
              weeklyIncreasePercent: { bsonType: 'number' },
              deloadEveryNWeeks: { bsonType: 'int', minimum: 0 },
              deloadPercent: { bsonType: 'number' },
            },
          },
          isVerified: { bsonType: 'bool' },
          createdBy: { bsonType: 'objectId' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  });

  const exerciseIndexes: IndexDescription[] = [
    { key: { clubId: 1, name: 1 }, name: 'idx_exercises_club_name' },
    { key: { clubId: 1, isVerified: 1 }, name: 'idx_exercises_club_verified' },
    { key: { muscles: 1 }, name: 'idx_exercises_muscles' },
    { key: { difficulty: 1 }, name: 'idx_exercises_difficulty' },
  ];
  await db.collection('exercises').createIndexes(exerciseIndexes);

  // ==================== WORKOUTS COLLECTION ====================
  await db.createCollection('workouts', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['name', 'clubId', 'createdBy', 'createdAt', 'updatedAt'],
        properties: {
          clubId: { bsonType: 'objectId' },
          name: { bsonType: 'string', minLength: 2, maxLength: 100 },
          description: { bsonType: ['string', 'null'] },
          exercises: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              required: ['exerciseId', 'order', 'sets', 'reps', 'restSeconds'],
              properties: {
                exerciseId: { bsonType: 'objectId' },
                order: { bsonType: 'int', minimum: 1 },
                sets: { bsonType: 'int', minimum: 1 },
                reps: { bsonType: ['int', 'string'] },
                restSeconds: { bsonType: 'int', minimum: 0 },
                tempo: { bsonType: ['string', 'null'] },
                targetZone: { bsonType: ['string', 'null'] },
                coachNotes: { bsonType: ['string', 'null'] },
              },
            },
          },
          estimatedDuration: { bsonType: 'int', minimum: 1 },
          difficulty: { enum: ['beginner', 'intermediate', 'advanced'] },
          tags: { bsonType: 'array', items: { bsonType: 'string' } },
          isTemplate: { bsonType: 'bool' },
          createdBy: { bsonType: 'objectId' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  });

  const workoutIndexes: IndexDescription[] = [
    { key: { clubId: 1, createdBy: 1 }, name: 'idx_workouts_club_creator' },
    { key: { clubId: 1, isTemplate: 1 }, name: 'idx_workouts_club_template' },
    { key: { clubId: 1, difficulty: 1 }, name: 'idx_workouts_club_difficulty' },
    { key: { createdAt: -1 }, name: 'idx_workouts_created_at_desc' },
  ];
  await db.collection('workouts').createIndexes(workoutIndexes);

  // ==================== PROGRAMS COLLECTION ====================
  await db.createCollection('programs', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['name', 'clubId', 'weeks', 'createdBy', 'createdAt', 'updatedAt'],
        properties: {
          clubId: { bsonType: 'objectId' },
          name: { bsonType: 'string', minLength: 2, maxLength: 100 },
          description: { bsonType: ['string', 'null'] },
          weeks: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              required: ['weekNumber', 'workouts'],
              properties: {
                weekNumber: { bsonType: 'int', minimum: 1 },
                workouts: {
                  bsonType: 'array',
                  items: {
                    bsonType: 'object',
                    required: ['workoutId', 'day', 'progressionPercent'],
                    properties: {
                      workoutId: { bsonType: 'objectId' },
                      day: { bsonType: 'int', minimum: 1, maximum: 7 },
                      progressionPercent: { bsonType: 'number' },
                    },
                  },
                },
                deload: { bsonType: 'bool' },
              },
            },
          },
          createdBy: { bsonType: 'objectId' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  });

  const programIndexes: IndexDescription[] = [
    { key: { clubId: 1, createdBy: 1 }, name: 'idx_programs_club_creator' },
  ];
  await db.collection('programs').createIndexes(programIndexes);

  // ==================== WORKOUT ASSIGNMENTS COLLECTION ====================
  await db.createCollection('workout_assignments', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['clubId', 'athleteIds', 'schedule', 'startDate', 'createdBy', 'createdAt', 'updatedAt'],
        properties: {
          clubId: { bsonType: 'objectId' },
          workoutId: { bsonType: ['objectId', 'null'] },
          programId: { bsonType: ['objectId', 'null'] },
          athleteIds: { bsonType: 'array', items: { bsonType: 'objectId' } },
          groupId: { bsonType: ['objectId', 'null'] },
          schedule: {
            bsonType: 'object',
            required: ['type'],
            properties: {
              type: { enum: ['once', 'recurring'] },
              daysOfWeek: { bsonType: 'array', items: { bsonType: 'int', minimum: 0, maximum: 6 } },
              recurrenceRule: { bsonType: ['string', 'null'] },
            },
          },
          startDate: { bsonType: 'date' },
          endDate: { bsonType: ['date', 'null'] },
          createdBy: { bsonType: 'objectId' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  });

  const assignmentIndexes: IndexDescription[] = [
    { key: { clubId: 1, athleteIds: 1 }, name: 'idx_assignments_club_athletes' },
    { key: { clubId: 1, startDate: 1 }, name: 'idx_assignments_club_date' },
    { key: { workoutId: 1 }, name: 'idx_assignments_workout' },
    { key: { programId: 1 }, name: 'idx_assignments_program' },
  ];
  await db.collection('workout_assignments').createIndexes(assignmentIndexes);

  // ==================== WORKOUT COMPLETIONS COLLECTION ====================
  await db.createCollection('workout_completions', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['assignmentId', 'athleteId', 'actuals', 'startedAt', 'createdAt', 'updatedAt'],
        properties: {
          assignmentId: { bsonType: 'objectId' },
          athleteId: { bsonType: 'objectId' },
          actuals: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              required: ['exerciseId', 'sets'],
              properties: {
                exerciseId: { bsonType: 'objectId' },
                sets: {
                  bsonType: 'array',
                  items: {
                    bsonType: 'object',
                    required: ['setNumber', 'reps', 'completed'],
                    properties: {
                      setNumber: { bsonType: 'int', minimum: 1 },
                      reps: { bsonType: 'int', minimum: 0 },
                      weight: { bsonType: ['double', 'null'] },
                      rpe: { bsonType: ['int', 'null'] },
                      duration: { bsonType: ['int', 'null'] },
                      distance: { bsonType: ['double', 'null'] },
                      completed: { bsonType: 'bool' },
                    },
                  },
                },
              },
            },
          },
          startedAt: { bsonType: 'date' },
          completedAt: { bsonType: ['date', 'null'] },
          syncedAt: { bsonType: ['date', 'null'] },
          notes: { bsonType: ['string', 'null'] },
          rating: { bsonType: ['int', 'null'], minimum: 1, maximum: 10 },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  });

  const completionIndexes: IndexDescription[] = [
    { key: { assignmentId: 1, athleteId: 1 }, unique: true, name: 'idx_completions_assignment_athlete_unique' },
    { key: { athleteId: 1, completedAt: -1 }, name: 'idx_completions_athlete_date_desc' },
  ];
  await db.collection('workout_completions').createIndexes(completionIndexes);

  console.log('Migration 003: Workout collections created successfully');
};

export const down = async (db: Db): Promise<void> => {
  await db.collection('exercises').drop().catch(() => {});
  await db.collection('workouts').drop().catch(() => {});
  await db.collection('programs').drop().catch(() => {});
  await db.collection('workout_assignments').drop().catch(() => {});
  await db.collection('workout_completions').drop().catch(() => {});
  console.log('Migration 003: Rolled back');
};