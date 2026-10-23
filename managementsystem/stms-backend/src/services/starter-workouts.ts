// src/services/starter-workouts.ts
// Write the editable starter sessions into a club.
//
// The starter pack is data, not a special workout type. Once written, each workout is an
// ordinary club workout: a coach can edit, duplicate or delete it. Re-running the seed does
// not overwrite a workout the coach has changed; it only inserts the missing starter names.
//
// `refresh` is an explicit opt-in for a club that wants the updated pack. It still refuses to
// overwrite a workout carrying `coachEdited`, which the API sets the first time a coach saves
// a starter workout. `prune` removes stale starter workouts only when nothing references them.

import { Db, ObjectId } from 'mongodb';
import { STARTER_PACK_VERSION, STARTER_WORKOUTS, type StarterWorkout } from '../data/starter-workouts';

export type SeedStarterWorkoutsOptions = {
  /** Update existing, unedited starter workouts to the current pack. */
  refresh?: boolean;
  /** Remove old starter workouts that are no longer in the pack and have no assignments/logs. */
  prune?: boolean;
};

export type SeedStarterWorkoutsResult = {
  total: number;
  inserted: number;
  updated: number;
  existing: number;
  protectedEdits: number;
  pruned: number;
  retained: number;
  missingExercises: string[];
};

type ExistingStarter = {
  _id: ObjectId;
  name: string;
  coachEdited?: boolean;
  starterPackVersion?: number;
};

function validatePack(): void {
  const names = new Set<string>();
  const problems: string[] = [];

  for (const workout of STARTER_WORKOUTS) {
    if (names.has(workout.name)) problems.push(`Duplicate starter workout: ${workout.name}`);
    names.add(workout.name);

    if (!workout.exercises.length) problems.push(`${workout.name}: has no exercises`);
    for (const line of workout.exercises) {
      if (!line.exercise.trim()) problems.push(`${workout.name}: an exercise line has no name`);
      if (!Number.isInteger(line.sets) || line.sets < 1) problems.push(`${workout.name}: invalid sets for ${line.exercise}`);
      if (!line.reps.trim()) problems.push(`${workout.name}: missing reps for ${line.exercise}`);
    }

    if (workout.week < 1 || workout.week > 4) problems.push(`${workout.name}: week must be 1–4`);
    if (workout.slot < 1 || workout.slot > 3) problems.push(`${workout.name}: slot must be 1–3`);
  }

  if (problems.length) throw new Error(`Starter workout pack is invalid:\n- ${problems.join('\n- ')}`);
}

function toWorkoutDocument(
  workout: StarterWorkout,
  clubId: ObjectId,
  createdBy: string,
  exerciseIds: Map<string, ObjectId>
) {
  return {
    name: workout.name,
    description: workout.description,
    estimatedDuration: workout.estimatedDurationMinutes,
    difficulty: workout.difficulty,
    tags: workout.tags,
    isTemplate: true,
    targetEventGroup: workout.targetEventGroup,
    periodizationPhase: workout.periodizationPhase,
    energySystemFocus: workout.energySystemFocus,
    templateType: workout.templateType,
    estimatedRPE: workout.estimatedRPE,
    estimatedDurationMinutes: workout.estimatedDurationMinutes,
    program: workout.program,
    week: workout.week,
    slot: workout.slot,
    intent: workout.intent,
    clubId,
    createdBy,
    starterPack: true,
    starterPackVersion: STARTER_PACK_VERSION,
    exercises: workout.exercises.map(line => ({
      exerciseId: exerciseIds.get(line.exercise),
      name: line.exercise,
      sets: line.sets,
      reps: line.reps,
      restSeconds: line.restSeconds,
      tempo: line.tempo,
      targetZone: line.targetZone,
      coachingNotes: line.coachingNotes,
    })),
  };
}

export async function seedStarterWorkouts(
  db: Db,
  clubId: ObjectId,
  createdBy: string,
  options: SeedStarterWorkoutsOptions = {}
): Promise<SeedStarterWorkoutsResult> {
  validatePack();

  const exerciseDocs = await db
    .collection('exercises')
    .find({ $or: [{ clubId }, { clubId: null }] })
    .project({ _id: 1, name: 1, clubId: 1 })
    .toArray();

  // Prefer the global library entry when a legacy club exercise shares its name. The picker
  // hides that legacy copy, so a starter workout should not silently link back to it.
  const exerciseIds = new Map<string, ObjectId>();
  for (const exercise of exerciseDocs) {
    const name = exercise.name as string;
    if (!exerciseIds.has(name) || exercise.clubId === null) {
      exerciseIds.set(name, exercise._id as ObjectId);
    }
  }
  const missingExercises = [
    ...new Set(
      STARTER_WORKOUTS.flatMap(workout => workout.exercises.map(line => line.exercise)).filter(
        name => !exerciseIds.has(name)
      )
    ),
  ];

  if (missingExercises.length) {
    throw new Error(
      `Starter workouts reference exercises that are not in the library: ${missingExercises.join(', ')}. Run npm run db:seed:exercises first.`
    );
  }

  const starterDocs = (await db
    .collection('workouts')
    .find({ clubId, starterPack: true })
    .project({ _id: 1, name: 1, coachEdited: 1, starterPackVersion: 1 })
    .toArray()) as ExistingStarter[];

  const existingByName = new Map(starterDocs.map(workout => [workout.name, workout]));
  const packNames = new Set(STARTER_WORKOUTS.map(workout => workout.name));
  const now = new Date();

  let inserted = 0;
  let updated = 0;
  let existing = 0;
  let protectedEdits = 0;

  for (const workout of STARTER_WORKOUTS) {
    const current = existingByName.get(workout.name);
    const document = toWorkoutDocument(workout, clubId, createdBy, exerciseIds);

    if (!current) {
      await db.collection('workouts').insertOne({
        _id: new ObjectId(),
        ...document,
        createdAt: now,
        updatedAt: now,
      });
      inserted += 1;
      continue;
    }

    existing += 1;

    if (!options.refresh) continue;

    if (current.coachEdited) {
      protectedEdits += 1;
      continue;
    }

    await db.collection('workouts').updateOne(
      { _id: current._id, clubId, starterPack: true },
      { $set: { ...document, updatedAt: now } }
    );
    updated += 1;
  }

  let pruned = 0;
  let retained = 0;

  if (options.prune) {
    for (const stale of starterDocs.filter(workout => !packNames.has(workout.name))) {
      if (stale.coachEdited) {
        retained += 1;
        continue;
      }

      const [assignments, logs] = await Promise.all([
        db.collection('workout_assignments').countDocuments({ workoutId: stale._id }),
        db.collection('workout_logs').countDocuments({ workoutId: stale._id }),
      ]);

      if (assignments > 0 || logs > 0) {
        retained += 1;
        continue;
      }

      await db.collection('workouts').deleteOne({ _id: stale._id, clubId, starterPack: true });
      pruned += 1;
    }
  }

  return {
    total: STARTER_WORKOUTS.length,
    inserted,
    updated,
    existing,
    protectedEdits,
    pruned,
    retained,
    missingExercises,
  };
}
