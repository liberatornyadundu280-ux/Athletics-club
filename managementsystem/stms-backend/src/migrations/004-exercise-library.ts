// src/migrations/004-exercise-library.ts
// Add the metadata the exercise library needs to be searchable and filterable.
//
// The first two migrations only gave exercises a phase, energy system, movement pattern and
// CNS rating. The library now also stores a category, event groups, level, instructions,
// provenance and an image. Existing records are backfilled additively; coach-created
// exercises keep their `clubId` and are never moved into the global catalogue.

import { Db, IndexDescription } from 'mongodb';
import { dropIndexesByName, ensureIndexes } from './helpers';

const EXERCISE_INDEXES: IndexDescription[] = [
  { key: { clubId: 1, category: 1, name: 1 }, name: 'idx_exercises_club_category_name' },
  { key: { clubId: 1, eventGroups: 1 }, name: 'idx_exercises_club_event_groups' },
  { key: { clubId: 1, level: 1 }, name: 'idx_exercises_club_level' },
  { key: { clubId: 1, source: 1 }, name: 'idx_exercises_club_source' },
  { key: { name: 1 }, name: 'idx_exercises_name' },
];

function categoryFor(phase: string): string {
  if (phase === 'power' || phase === 'explosive') return 'power';
  if (phase === 'technique' || phase === 'speed') return 'sprint-drill';
  if (phase === 'mobility' || phase === 'recovery' || phase === 'cooldown') return 'mobility';
  if (phase === 'core') return 'core';
  if (phase === 'conditioning') return 'endurance';
  return 'strength';
}

function energyFor(value: string | undefined, phase: string): string {
  if (value === 'phosphagen') return 'atp-pcr';
  if (value === 'anaerobic') return phase === 'power' || phase === 'explosive' ? 'atp-pcr' : 'mixed';
  if (value === 'aerobic' || value === 'glycolytic' || value === 'mixed' || value === 'atp-pcr') return value;
  if (phase === 'power' || phase === 'explosive' || phase === 'speed') return 'atp-pcr';
  if (phase === 'mobility' || phase === 'recovery' || phase === 'cooldown') return 'aerobic';
  return 'mixed';
}

export const up = async (db: Db): Promise<void> => {
  const exercises = db.collection('exercises');

  // Backfill in two passes so one update cannot overwrite a value another pass just set.
  await exercises.updateMany(
    { phase: { $exists: false } },
    { $set: { phase: 'strength', updatedAt: new Date() } }
  );

  await exercises.updateMany(
    { phase: 'explosive' },
    { $set: { phase: 'power', updatedAt: new Date() } }
  );
  await exercises.updateMany(
    { phase: 'cooldown' },
    { $set: { phase: 'recovery', updatedAt: new Date() } }
  );

  const legacy = await exercises
    .find({ $or: [{ source: { $exists: false } }, { category: { $exists: false } }] })
    .project({ _id: 1, name: 1, phase: 1, energySystem: 1, description: 1, category: 1 })
    .toArray();

  if (legacy.length) {
    const operations = legacy.map(exercise => {
      const phase = (exercise.phase as string) || 'strength';
      return {
        updateOne: {
          filter: { _id: exercise._id },
          update: {
            $set: {
              category: (exercise.category as string) || categoryFor(phase),
              eventGroups: ['general'],
              level: 'intermediate',
              energySystem: energyFor(exercise.energySystem as string | undefined, phase),
              instructions: exercise.description ? [String(exercise.description)] : [],
              secondaryMuscles: [],
              source: 'legacy',
              license: 'Legacy',
              imageUrl: null,
              updatedAt: new Date(),
            },
          },
        },
      };
    });

    await exercises.bulkWrite(operations, { ordered: false });
  }

  // Normalise the energy-system vocabulary on records that already had one. The old seed
  // used `phosphagen` and `anaerobic`, which the rule engine does not understand.
  await exercises.updateMany(
    { energySystem: 'phosphagen' },
    { $set: { energySystem: 'atp-pcr', updatedAt: new Date() } }
  );
  await exercises.updateMany(
    { energySystem: 'anaerobic' },
    { $set: { energySystem: 'mixed', updatedAt: new Date() } }
  );

  await ensureIndexes(db, 'exercises', EXERCISE_INDEXES);

  console.log('Migration 004: Exercise library metadata and indexes applied');
};

export const down = async (db: Db): Promise<void> => {
  await dropIndexesByName(db, 'exercises', EXERCISE_INDEXES.map(index => index.name!));
  await db.collection('exercises').updateMany(
    {},
    {
      $unset: {
        category: '',
        eventGroups: '',
        level: '',
        instructions: '',
        secondaryMuscles: '',
        source: '',
        sourceId: '',
        sourceUrl: '',
        license: '',
        imageUrl: '',
      },
    }
  );
  console.log('Migration 004: Rolled back');
};
