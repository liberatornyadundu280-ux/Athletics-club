// src/migrate.ts
// MongoDB schema migration CLI.
//
// Usage:
//   npm run migrate              apply every pending migration
//   npm run migrate:list         show applied and pending migrations without changing anything
//   npm run migrate:down         roll back the most recently applied migration
//   npm run migrate:test         apply migrations to the `stms_test` database
//
// Flags:
//   --db <name>   target a specific database instead of the one in MONGODB_URI
//   --list        report status only
//   --down        roll back the last applied migration
//   --force       permit a rollback while NODE_ENV=production
//
// The CLI opens its own MongoDB connection rather than reusing connectToDatabase(), so a
// migration run does not also trigger the application's index bootstrap.

import { MongoClient, ServerApiVersion } from 'mongodb';
import { env } from './config/env';
import { migrations } from './migrations';
import {
  AppliedMigration,
  applyPendingMigrations,
  getAppliedMigrations,
  getPendingMigrations,
  rollbackLastMigration,
} from './migrations/runner';

type Flags = {
  list: boolean;
  down: boolean;
  force: boolean;
  db: string | null;
};

function printUsage(): void {
  console.log(`
STMS migration runner

  npm run migrate              apply every pending migration
  npm run migrate:list         show applied and pending migrations
  npm run migrate:down         roll back the most recently applied migration
  npm run migrate:test         apply migrations to the stms_test database

Flags:
  --db <name>   target a specific database instead of the one in MONGODB_URI
  --list        report status only
  --down        roll back the last applied migration
  --force       permit a rollback while NODE_ENV=production
`);
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { list: false, down: false, force: false, db: null };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (arg === '--list') {
      flags.list = true;
    } else if (arg === '--down') {
      flags.down = true;
    } else if (arg === '--force') {
      flags.force = true;
    } else if (arg === '--db') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--db requires a database name');
      }
      flags.db = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return flags;
}

function printStatus(databaseName: string, applied: AppliedMigration[]): void {
  const appliedByDate = new Map(applied.map(record => [record._id, record]));

  console.log(`\nDatabase: ${databaseName}\n`);
  for (const migration of migrations) {
    const record = appliedByDate.get(migration.name);
    const status = record ? `applied   ${record.appliedAt.toISOString()}` : 'pending';
    console.log(`  ${status.padEnd(34)} ${migration.name}`);
  }

  for (const record of applied) {
    if (migrations.some(migration => migration.name === record._id)) continue;
    console.log(`  applied-but-unregistered           ${record._id}`);
  }

  console.log(`\n${applied.length} applied, ${migrations.length - applied.length} pending.\n`);
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));

  const client = new MongoClient(env.MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();

  try {
    const db = flags.db ? client.db(flags.db) : client.db();

    if (flags.list) {
      printStatus(db.databaseName, await getAppliedMigrations(db));
      return;
    }

    if (flags.down) {
      if (env.NODE_ENV === 'production' && !flags.force) {
        throw new Error('Refusing to roll back in production without --force.');
      }

      const rolledBack = await rollbackLastMigration(db);
      console.log(
        rolledBack
          ? `Rolled back ${rolledBack.name}.`
          : 'Nothing to roll back — no migrations have been applied.'
      );
      return;
    }

    const pending = await getPendingMigrations(db);
    if (!pending.length) {
      console.log(`Database "${db.databaseName}" is up to date — nothing to apply.`);
      return;
    }

    console.log(`Applying ${pending.length} migration(s) to "${db.databaseName}"...`);

    await applyPendingMigrations(db, {
      onStart: migration => process.stdout.write(`  ${migration.name} ... `),
      onFinish: (_migration, durationMs) => console.log(`done (${durationMs}ms)`),
    });

    console.log(`Applied ${pending.length} migration(s) to "${db.databaseName}".`);
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nMigration failed: ${message}`);
  process.exit(1);
});
