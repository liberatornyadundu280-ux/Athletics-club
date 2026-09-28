// apps/backend/src/migrations/004-attendance-collections.ts
// Migration for attendance-related collections

import { Db, IndexDescription } from 'mongodb';

export const up = async (db: Db): Promise<void> => {
  // ==================== SESSIONS COLLECTION ====================
  await db.createCollection('sessions', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['clubId', 'date', 'startTime', 'endTime', 'venue', 'type', 'status', 'createdBy', 'createdAt', 'updatedAt'],
        properties: {
          clubId: { bsonType: 'objectId' },
          date: { bsonType: 'date' },
          startTime: { bsonType: 'string', pattern: '^\\d{2}:\\d{2}$' },
          endTime: { bsonType: 'string', pattern: '^\\d{2}:\\d{2}$' },
          venue: { bsonType: 'string', minLength: 1, maxLength: 200 },
          type: { enum: ['training', 'competition', 'meeting', 'other'] },
          linkedWorkoutId: { bsonType: ['objectId', 'null'] },
          status: { enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] },
          createdBy: { bsonType: 'objectId' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  });

  const sessionIndexes: IndexDescription[] = [
    { key: { clubId: 1, date: -1 }, name: 'idx_sessions_club_date_desc' },
    { key: { clubId: 1, status: 1 }, name: 'idx_sessions_club_status' },
    { key: { linkedWorkoutId: 1 }, name: 'idx_sessions_workout' },
    { key: { createdBy: 1 }, name: 'idx_sessions_created_by' },
  ];
  await db.collection('sessions').createIndexes(sessionIndexes);

  // ==================== ATTENDANCE RECORDS COLLECTION ====================
  await db.createCollection('attendance_records', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['clubId', 'sessionId', 'athleteId', 'status', 'method', 'markedAt', 'createdAt', 'updatedAt'],
        properties: {
          clubId: { bsonType: 'objectId' },
          sessionId: { bsonType: 'objectId' },
          athleteId: { bsonType: 'objectId' },
          status: { enum: ['present', 'absent', 'late', 'excused', 'official_sports_leave'] },
          method: { enum: ['manual', 'qr', 'bulk', 'workout_open'] },
          markedBy: { bsonType: ['objectId', 'null'] },
          markedAt: { bsonType: 'date' },
          excuseNote: { bsonType: ['string', 'null'] },
          excuseAttachment: { bsonType: ['string', 'null'] },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  });

  const attendanceIndexes: IndexDescription[] = [
    { key: { clubId: 1, sessionId: 1, athleteId: 1 }, unique: true, name: 'idx_attendance_session_athlete_unique' },
    { key: { clubId: 1, sessionId: 1, status: 1 }, name: 'idx_attendance_session_status' },
    { key: { clubId: 1, athleteId: 1, markedAt: -1 }, name: 'idx_attendance_athlete_date_desc' },
    { key: { clubId: 1, markedAt: -1 }, name: 'idx_attendance_club_date_desc' },
    { key: { markedBy: 1 }, name: 'idx_attendance_marked_by' },
  ];
  await db.collection('attendance_records').createIndexes(attendanceIndexes);

  console.log('Migration 004: Attendance collections created successfully');
};

export const down = async (db: Db): Promise<void> => {
  await db.collection('sessions').drop().catch(() => {});
  await db.collection('attendance_records').drop().catch(() => {});
  console.log('Migration 004: Rolled back');
};