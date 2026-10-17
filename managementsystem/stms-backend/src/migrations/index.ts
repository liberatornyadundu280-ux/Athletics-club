// src/migrations/index.ts
// Ordered migration registry.
//
// Append new migrations to the end. Never reorder or rename an applied entry — the runner
// records these names in the `_migrations` collection, and a rename would make an applied
// migration look pending and run twice.

import { Db } from 'mongodb';
import * as initialSchema from './001-initial-schema';
import * as dailyReadiness from './002-daily-readiness-and-exercise-enhancements';

export type Migration = {
  /** Stable identifier recorded in the `_migrations` collection. */
  name: string;
  up: (db: Db) => Promise<void>;
  down: (db: Db) => Promise<void>;
};

export const migrations: Migration[] = [
  { name: '001-initial-schema', up: initialSchema.up, down: initialSchema.down },
  { name: '002-daily-readiness-and-exercise-enhancements', up: dailyReadiness.up, down: dailyReadiness.down },
];
