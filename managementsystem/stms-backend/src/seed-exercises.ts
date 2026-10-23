// src/seed-exercises.ts
// Seed the platform-wide exercise library without creating accounts or a club.
//
// Usage:
//   npm run db:seed:exercises
//   npm run db:seed:exercises -- --reset
//   npm run db:seed:exercises -- --dry-run
//
// `--reset` removes global seeded entries that are no longer in the checked-in catalogue.
// Coach-created club exercises are never deleted, and existing seed entries keep their ids so
// workout lines stay linked. Re-running without `--reset` is an idempotent upsert.

import { closeDatabaseConnection, connectToDatabase } from './config/database';
import { env } from './config/env';
import { applyPendingMigrations } from './migrations/runner';
import {
  EXERCISE_LIBRARY,
  seedExerciseLibrary,
  validateExerciseLibrary,
} from './services/exercise-library';

type Options = {
  reset: boolean;
  dryRun: boolean;
  force: boolean;
};

function parseOptions(argv: string[]): Options {
  const options: Options = { reset: false, dryRun: false, force: false };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      console.log(`
STMS exercise library seed

  npm run db:seed:exercises
  npm run db:seed:exercises -- --reset
  npm run db:seed:exercises -- --dry-run

Flags:
  --reset    remove seeded entries that are no longer in the catalogue
  --dry-run  validate and count the catalogue without touching the database
  --force    permit seeding while NODE_ENV=production
`);
      process.exit(0);
    }
    if (arg === '--reset') options.reset = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--force') options.force = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function summarise(): void {
  const byCategory = new Map<string, number>();
  const bySource = new Map<string, number>();

  for (const exercise of EXERCISE_LIBRARY) {
    byCategory.set(exercise.category, (byCategory.get(exercise.category) ?? 0) + 1);
    bySource.set(exercise.source, (bySource.get(exercise.source) ?? 0) + 1);
  }

  console.log(`  Total     : ${EXERCISE_LIBRARY.length}`);
  console.log(`  Sources   : ${[...bySource.entries()].map(([name, count]) => `${name} ${count}`).join(', ')}`);
  console.log('  Categories:');
  for (const [category, count] of [...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`    ${category.padEnd(14)} ${count}`);
  }
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));

  validateExerciseLibrary();
  console.log(`Exercise catalogue valid: ${EXERCISE_LIBRARY.length} entries`);
  summarise();

  if (options.dryRun) {
    console.log('\nDry run — database untouched.');
    return;
  }

  if (env.NODE_ENV === 'production' && !options.force) {
    throw new Error('Refusing to seed a production database without --force');
  }

  const db = await connectToDatabase();

  try {
    console.log('\nApplying migrations...');
    const applied = await applyPendingMigrations(db);
    console.log(`  ${applied.length ? `${applied.length} migration(s) applied` : 'schema already up to date'}`);

    console.log('\nSeeding global exercise library...');
    const result = await seedExerciseLibrary(db, { reset: options.reset });

    console.log('\n──────────────────────────────────────────────────────────────');
    console.log('Exercise library seeded');
    console.log('──────────────────────────────────────────────────────────────');
    console.log(`  Catalogue : ${result.total}`);
    console.log(`  Inserted  : ${result.inserted}`);
    console.log(`  Updated   : ${result.updated}`);
    if (options.reset) console.log(`  Removed   : ${result.removed}`);
    console.log('  Club exercises were left untouched.');
    console.log('──────────────────────────────────────────────────────────────\n');
  } finally {
    await closeDatabaseConnection();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nSeed failed: ${message}`);
  process.exit(1);
});
