// src/migrations/helpers.ts
// Shared helpers for writing idempotent migrations.

import { Db, IndexDescription } from 'mongodb';

type ValidationOptions = {
  validationLevel?: 'strict' | 'moderate';
  validationAction?: 'error' | 'warn';
};

/**
 * Create a collection with a JSON schema validator, or update the validator when the
 * collection already exists.
 *
 * `db.createCollection()` throws `NamespaceExists` (code 48) on an existing collection.
 * That case is common here because `connectToDatabase()` creates several of these
 * collections implicitly through `createIndexes()`. Using this helper instead means a
 * migration can be re-run at any time and still converge on the intended validation
 * rules, instead of failing the first time the app has already been started.
 */
export async function ensureCollection(
  db: Db,
  name: string,
  jsonSchema: Record<string, unknown>,
  options: ValidationOptions = {}
): Promise<'created' | 'validator-updated'> {
  const validator = { $jsonSchema: jsonSchema };
  const validationLevel = options.validationLevel ?? 'strict';
  const validationAction = options.validationAction ?? 'error';

  const exists = await db.listCollections({ name }, { nameOnly: true }).hasNext();

  if (!exists) {
    await db.createCollection(name, { validator, validationLevel, validationAction });
    return 'created';
  }

  await db.command({ collMod: name, validator, validationLevel, validationAction });
  return 'validator-updated';
}

/**
 * Create only the indexes that are missing.
 *
 * `createIndexes()` is already idempotent for identical definitions, but it fails when an
 * index with the same name exists under a different key pattern — which happens when
 * `connectToDatabase()` has already created a competing index. Skipping those keeps a
 * migration from aborting halfway through.
 *
 * A collection that does not exist yet is created implicitly by `createIndexes()`;
 * `collection.indexes()` would throw `NamespaceNotFound` in that case, so it is only
 * called once the collection is known to exist.
 */
export async function ensureIndexes(
  db: Db,
  collection: string,
  indexes: IndexDescription[]
): Promise<void> {
  const exists = await db.listCollections({ name: collection }, { nameOnly: true }).hasNext();

  if (!exists) {
    await db.collection(collection).createIndexes(indexes);
    return;
  }

  const existing = new Set(
    (await db.collection(collection).indexes()).map(index => index.name)
  );
  const pending = indexes.filter(index => !existing.has(index.name));
  if (pending.length) {
    await db.collection(collection).createIndexes(pending);
  }
}

/**
 * Drop indexes by name, ignoring ones that are not present.
 * Used by migration rollbacks so they remove only what they created.
 */
export async function dropIndexesByName(
  db: Db,
  collection: string,
  names: string[]
): Promise<void> {
  for (const name of names) {
    await db.collection(collection).dropIndex(name).catch(() => {});
  }
}
