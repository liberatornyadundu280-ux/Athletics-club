// src/services/exercise-library.ts
// Seed and validate the platform-wide exercise library.
//
// The library is stored in the same `exercises` collection as coach-created movements. A
// global entry has `clubId: null`; a club entry carries the club's ObjectId. Every seeded
// record keeps its source and licence so the catalogue can be audited later.

import { Db } from 'mongodb';
import baseExercises from '../data/exercises.base.json';
import { TRACK_EXERCISES } from '../data/track-exercises';
import type { ExerciseSeed } from '../types/exercise';

const BASE_EXERCISES = baseExercises as ExerciseSeed[];

export const EXERCISE_LIBRARY: ExerciseSeed[] = [...BASE_EXERCISES, ...TRACK_EXERCISES];

export type SeedExerciseLibraryResult = {
  total: number;
  inserted: number;
  updated: number;
  removed: number;
};

/**
 * Fail before writing if the checked-in catalogue has duplicate names or malformed values.
 *
 * Duplicate names are a real risk here because the base dataset and the authored track layer
 * overlap conceptually. Imported records also bring free-text values, so validate the
 * vocabulary rather than trusting the JSON file.
 */
export function validateExerciseLibrary(exercises: ExerciseSeed[] = EXERCISE_LIBRARY): void {
  const names = new Set<string>();
  const problems: string[] = [];

  for (const exercise of exercises) {
    const key = exercise.name.trim().toLowerCase();
    if (!key) problems.push('An exercise has an empty name');
    else if (names.has(key)) problems.push(`Duplicate exercise name: ${exercise.name}`);
    else names.add(key);

    if (!exercise.description?.trim()) problems.push(`${exercise.name}: missing description`);
    if (!exercise.category) problems.push(`${exercise.name}: missing category`);
    if (!exercise.phase) problems.push(`${exercise.name}: missing phase`);
    if (!exercise.energySystem) problems.push(`${exercise.name}: missing energy system`);
    if (!exercise.source) problems.push(`${exercise.name}: missing source`);
    if (!exercise.license) problems.push(`${exercise.name}: missing licence`);
    if (!Array.isArray(exercise.instructions) || exercise.instructions.length === 0) {
      problems.push(`${exercise.name}: needs at least one instruction`);
    }
    if (!Number.isInteger(exercise.cnsIntensity) || exercise.cnsIntensity < 1 || exercise.cnsIntensity > 5) {
      problems.push(`${exercise.name}: CNS intensity must be 1–5`);
    }
    if (!exercise.eventGroups?.length) problems.push(`${exercise.name}: needs an event group`);
  }

  if (problems.length) {
    throw new Error(`Exercise library validation failed:\n- ${problems.join('\n- ')}`);
  }
}

/**
 * Upsert the platform library.
 *
 * `reset` removes seeded entries that are no longer in the catalogue. It keeps the ids of
 * entries that are still present, so existing workout lines stay linked. Coach-created club
 * exercises are never touched, even when the whole library is being refreshed.
 */
export async function seedExerciseLibrary(
  db: Db,
  options: { reset?: boolean } = {}
): Promise<SeedExerciseLibraryResult> {
  validateExerciseLibrary();

  const collection = db.collection('exercises');
  const now = new Date();
  let removed = 0;

  if (options.reset) {
    // Remove only seeded entries that are no longer in the checked-in catalogue. Recreating
    // every row would give unchanged exercises new ObjectIds and silently break the
    // `exerciseId` links in existing workout lines.
    const existing = await collection
      .find({ clubId: null, source: { $in: ['free-exercise-db', 'stms'] } })
      .project({ _id: 1, sourceId: 1, name: 1 })
      .toArray();
    const sourceIds = new Set(EXERCISE_LIBRARY.filter(exercise => exercise.sourceId).map(exercise => exercise.sourceId!));
    const names = new Set(
      EXERCISE_LIBRARY.filter(exercise => !exercise.sourceId).map(exercise => exercise.name.trim().toLowerCase())
    );
    const staleIds = existing
      .filter(exercise =>
        exercise.sourceId
          ? !sourceIds.has(exercise.sourceId as string)
          : !names.has(String(exercise.name).trim().toLowerCase())
      )
      .map(exercise => exercise._id);

    if (staleIds.length) {
      const result = await collection.deleteMany({ _id: { $in: staleIds } });
      removed = result.deletedCount;
    }
  }

  const operations = EXERCISE_LIBRARY.map(exercise => {
    const identity = exercise.sourceId
      ? { clubId: null, sourceId: exercise.sourceId }
      : { clubId: null, name: exercise.name };

    return {
      updateOne: {
        filter: identity,
        update: {
          $set: {
            ...exercise,
            clubId: null,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        upsert: true,
      },
    };
  });

  const result = await collection.bulkWrite(operations, { ordered: false });

  return {
    total: EXERCISE_LIBRARY.length,
    inserted: result.upsertedCount,
    updated: result.modifiedCount,
    removed,
  };
}
