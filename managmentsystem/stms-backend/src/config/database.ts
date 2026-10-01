// src/config/database.ts
// MongoDB connection with connection pooling and graceful shutdown

import { MongoClient, Db, ServerApiVersion } from 'mongodb';
import { env } from './env';

let client: MongoClient;
let db: Db;

export async function connectToDatabase(): Promise<Db> {
  if (db) return db;

  client = new MongoClient(env.MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    maxPoolSize: 100,
    minPoolSize: 10,
    maxIdleTimeMS: 30000,
    waitQueueTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  await client.connect();
  db = client.db();

  // Test connection
  await db.command({ ping: 1 });
  // Athlete profiles are club-scoped and may optionally link to an account.
  // MongoDB creates the collection if needed when these indexes are created.
  await db.collection('athletes').createIndexes([
    { key: { clubId: 1, createdAt: -1 }, name: 'idx_athletes_club_created_desc' },
    {
      key: { clubId: 1, email: 1 },
      unique: true,
      name: 'idx_athletes_club_email_unique',
    },
    {
      key: { clubId: 1, userId: 1 },
      unique: true,
      partialFilterExpression: { userId: { $type: 'objectId' } },
      name: 'idx_athletes_club_user_unique',
    },
    { key: { clubId: 1, status: 1 }, name: 'idx_athletes_club_status' },
    { key: { clubId: 1, eventSpecialization: 1 }, name: 'idx_athletes_club_events' },
  ]);
  await Promise.all([
    db.collection('training_sessions').createIndexes([
      { key: { clubId: 1, date: -1, startTime: 1 }, name: 'idx_sessions_club_date_time' },
      { key: { clubId: 1, status: 1, date: -1 }, name: 'idx_sessions_club_status_date' },
    ]),
    db.collection('attendance_records').createIndexes([
      { key: { clubId: 1, sessionId: 1, athleteId: 1 }, unique: true, name: 'uq_attendance_session_athlete' },
      { key: { clubId: 1, athleteId: 1, markedAt: -1 }, name: 'idx_attendance_athlete_marked' },
    ]),
    db.collection('attendance_qr_tokens').createIndexes([
      { key: { tokenHash: 1 }, unique: true, name: 'uq_attendance_qr_token_hash' },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: 'ttl_attendance_qr_expiry' },
    ]),
    db.collection('exercises').createIndexes([
      { key: { clubId: 1, name: 1 }, name: 'idx_exercises_club_name' },
    ]),
    db.collection('workouts').createIndexes([
      { key: { clubId: 1, updatedAt: -1 }, name: 'idx_workouts_club_updated' },
    ]),
    db.collection('workout_assignments').createIndexes([
      { key: { clubId: 1, athleteId: 1, startDate: -1 }, name: 'idx_assignments_club_athlete_start' },
      { key: { clubId: 1, workoutId: 1, status: 1 }, name: 'idx_assignments_club_workout_status' },
    ]),
    db.collection('workout_logs').createIndexes([
      { key: { clubId: 1, athleteId: 1, completedAt: -1 }, name: 'idx_workout_logs_athlete_completed' },
    ]),
    db.collection('competitions').createIndexes([
      { key: { clubId: 1, date: -1 }, name: 'idx_competitions_club_date' },
    ]),
    db.collection('performance_results').createIndexes([
      { key: { clubId: 1, athleteId: 1, event: 1, date: -1 }, name: 'idx_results_club_athlete_event_date' },
      { key: { clubId: 1, date: -1 }, name: 'idx_results_club_date' },
    ]),
    db.collection('fitness_tests').createIndexes([
      { key: { clubId: 1, athleteId: 1, testType: 1, date: -1 }, name: 'idx_fitness_club_athlete_type_date' },
    ]),
    db.collection('athlete_goals').createIndexes([
      { key: { clubId: 1, athleteId: 1, status: 1, targetDate: 1 }, name: 'idx_goals_club_athlete_status_date' },
    ]),
    db.collection('recommendations').createIndexes([
      { key: { clubId: 1, athleteId: 1, generatedAt: -1 }, name: 'idx_recommendations_club_athlete_created' },
      { key: { clubId: 1, status: 1, generatedAt: -1 }, name: 'idx_recommendations_club_status_created' },
    ]),
    db.collection('injuries').createIndexes([
      { key: { clubId: 1, athleteId: 1, status: 1, onsetDate: -1 }, name: 'idx_injuries_club_athlete_status_date' },
    ]),
    db.collection('injury_wellness').createIndexes([
      { key: { clubId: 1, injuryId: 1, date: -1 }, name: 'idx_injury_wellness_club_injury_date' },
    ]),
    db.collection('permission_events').createIndexes([
      { key: { clubId: 1, date: -1 }, name: 'idx_permission_events_club_date' },
    ]),
    db.collection('permission_letters').createIndexes([
      { key: { clubId: 1, athleteId: 1, createdAt: -1 }, name: 'idx_permission_letters_club_athlete_created' },
      { key: { clubId: 1, status: 1, createdAt: -1 }, name: 'idx_permission_letters_club_status_created' },
      { key: { verificationHash: 1 }, unique: true, name: 'uq_permission_letter_verification_hash' },
    ]),
    db.collection('announcements').createIndexes([
      { key: { clubId: 1, publishedAt: -1 }, name: 'idx_announcements_club_published' },
      { key: { clubId: 1, audience: 1, publishedAt: -1 }, name: 'idx_announcements_club_audience_published' },
    ]),
    db.collection('announcement_reads').createIndexes([
      { key: { clubId: 1, userUid: 1, announcementId: 1 }, unique: true, name: 'uq_announcement_read_user_item' },
    ]),
    db.collection('notification_preferences').createIndexes([
      { key: { clubId: 1, userUid: 1 }, unique: true, name: 'uq_notification_preferences_user_club' },
    ]),
    db.collection('club_enrollment_requests').createIndexes([
      { key: { athleteId: 1, status: 1 }, unique: true, partialFilterExpression: { status: 'pending' }, name: 'uq_enrollment_request_athlete_pending' },
      { key: { clubId: 1, status: 1, createdAt: -1 }, name: 'idx_enrollment_requests_club_status_created' },
    ]),
    db.collection('daily_readiness').createIndexes([
      { key: { clubId: 1, athleteId: 1, date: -1 }, unique: true, name: 'uq_daily_readiness_athlete_date' },
      { key: { clubId: 1, date: -1 }, name: 'idx_daily_readiness_club_date' },
      { key: { clubId: 1, athleteId: 1, createdAt: -1 }, name: 'idx_daily_readiness_club_athlete_created' },
    ]),
  ]);
  console.log('✅ Connected to MongoDB Atlas');

  return db;
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectToDatabase() first.');
  }
  return db;
}

export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

export { client as mongoClient };
