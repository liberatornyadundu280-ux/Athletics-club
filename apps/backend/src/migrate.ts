// apps/backend/src/migrate.ts
// Migration runner for STMS

import { MongoClient, Db } from 'mongodb';
import { env } from './config/env';
import { up as migration001, down as migration001Down } from './migrations/001-initial-schema';
import { up as migration002, down as migration002Down } from './migrations/002-athletes-collection';
import { up as migration003, down as migration003Down } from './migrations/003-workout-collections';
import { up as migration004, down as migration004Down } from './migrations/004-attendance-collections';
import { up as migration005, down as migration005Down } from './migrations/005-performance-collections';
import { up as migration006, down as migration006Down } from './migrations/006-injury-collections';
import { up as migration007, down as migration007Down } from './migrations/007-permissions-collections';
import { up as migration008, down as migration008Down } from './migrations/008-analytics-collections';
import { up as migration009, down as migration009Down } from './migrations/009-daily-readiness-and-exercise-enhancements';

const migrations = [
  { name: '001-initial-schema', up: migration001, down: migration001Down },
  { name: '002-athletes-collection', up: migration002, down: migration002Down },
  { name: '003-workout-collections', up: migration003, down: migration003Down },
  { name: '004-attendance-collections', up: migration004, down: migration004Down },
  { name: '005-performance-collections', up: migration005, down: migration005Down },
  { name: '006-injury-collections', up: migration006, down: migration006Down },
  { name: '007-permissions-collections', up: migration007, down: migration007Down },
  { name: '008-analytics-collections', up: migration008, down: migration008Down },
  { name: '009-daily-readiness-and-exercise-enhancements', up: migration009, down: migration009Down },
];

async function runMigrations(direction: 'up' | 'down' = 'up'): Promise<void> {
  const client = new MongoClient(env.MONGODB_URI as string);
  await client.connect();
  
  const db = client.db();
  
  // Create migrations tracking collection if not exists
  const migrationsCollection = db.collection('schema_migrations');
  await migrationsCollection.createIndex({ name: 1 }, { unique: true });

  const migrationsToRun = direction === 'up' 
    ? migrations 
    : [...migrations].reverse();

  console.log(`Running ${direction} migrations...`);

  for (const migration of migrationsToRun) {
    const executed = await migrationsCollection.findOne({ name: migration.name });
    
    if (direction === 'up') {
      if (executed) {
        console.log(`Skipping ${migration.name} (already executed)`);
        continue;
      }
      
      console.log(`Running migration: ${migration.name}...`);
      try {
        await migration.up(db);
        await migrationsCollection.insertOne({
          name: migration.name,
          executedAt: new Date(),
          direction: 'up',
        });
        console.log(`Completed: ${migration.name}`);
      } catch (error) {
        console.error(`Failed migration ${migration.name}:`, error);
        throw error;
      }
    } else {
      if (!executed) {
        console.log(`Skipping ${migration.name} (not executed)`);
        continue;
      }
      
      console.log(`Rolling back migration: ${migration.name}...`);
      try {
        await migration.down(db);
        await migrationsCollection.deleteOne({ name: migration.name });
        console.log(`Rolled back: ${migration.name}`);
      } catch (error) {
        console.error(`Failed rollback ${migration.name}:`, error);
        throw error;
      }
    }
  }

  console.log(`All ${direction} migrations completed`);
  await client.close();
}

// Run if called directly
if (require.main === module) {
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  runMigrations(direction)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { runMigrations };