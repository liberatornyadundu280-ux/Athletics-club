// src/migrations/runner.ts
// Core migration logic, shared by the `npm run migrate` CLI and the seed script.

import { Db } from 'mongodb';
import { migrations, Migration } from './index';

export const APPLIED_COLLECTION = '_migrations';

export type AppliedMigration = {
  _id: string;
  appliedAt: Date;
  durationMs?: number;
};

/** Migrations already recorded as applied, oldest first. */
export async function getAppliedMigrations(db: Db): Promise<AppliedMigration[]> {
  return db
    .collection<AppliedMigration>(APPLIED_COLLECTION)
    .find()
    .sort({ appliedAt: 1 })
    .toArray();
}

/** Registered migrations that have not been applied to this database yet. */
export async function getPendingMigrations(db: Db): Promise<Migration[]> {
  const applied = await getAppliedMigrations(db);
  const appliedNames = new Set(applied.map(record => record._id));
  return migrations.filter(migration => !appliedNames.has(migration.name));
}

/**
 * Apply every pending migration in registry order.
 *
 * A migration records itself only after `up` resolves, so a failure leaves it pending and
 * the next run retries it from the start. That is safe because every migration is written
 * to be idempotent — see src/migrations/helpers.ts.
 */
export async function applyPendingMigrations(
  db: Db,
  hooks: {
    onStart?: (migration: Migration) => void;
    onFinish?: (migration: Migration, durationMs: number) => void;
  } = {}
): Promise<Migration[]> {
  const pending = await getPendingMigrations(db);
  const appliedCollection = db.collection<AppliedMigration>(APPLIED_COLLECTION);

  for (const migration of pending) {
    hooks.onStart?.(migration);

    const startedAt = Date.now();
    await migration.up(db);
    const durationMs = Date.now() - startedAt;

    await appliedCollection.updateOne(
      { _id: migration.name },
      { $set: { appliedAt: new Date(), durationMs } },
      { upsert: true }
    );

    hooks.onFinish?.(migration, durationMs);
  }

  return pending;
}

/** Roll back the most recently applied migration, or return null when there is none. */
export async function rollbackLastMigration(db: Db): Promise<Migration | null> {
  const applied = await getAppliedMigrations(db);
  const last = applied[applied.length - 1];
  if (!last) return null;

  const migration = migrations.find(candidate => candidate.name === last._id);
  if (!migration) {
    throw new Error(
      `The last applied migration "${last._id}" is not in the registry. Restore it before rolling back.`
    );
  }

  await migration.down(db);
  await db.collection<AppliedMigration>(APPLIED_COLLECTION).deleteOne({ _id: migration.name });
  return migration;
}
