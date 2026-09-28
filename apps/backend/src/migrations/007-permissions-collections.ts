// apps/backend/src/migrations/007-permissions-collections.ts
// Migration for permission letter collections

import { Db, IndexDescription } from 'mongodb';

export const up = async (db: Db): Promise<void> => {
  // ==================== PERMISSION EVENTS COLLECTION ====================
  await db.createCollection('permission_events', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['clubId', 'name', 'date', 'venue', 'type', 'athleteIds', 'status', 'createdAt', 'updatedAt'],
        properties: {
          clubId: { bsonType: 'objectId' },
          name: { bsonType: 'string', minLength: 2, maxLength: 200 },
          date: { bsonType: 'date' },
          venue: { bsonType: 'string', minLength: 2, maxLength: 200 },
          type: { enum: ['competition', 'training_camp', 'other'] },
          athleteIds: { bsonType: 'array', items: { bsonType: 'objectId' } },
          status: { enum: ['draft', 'active', 'completed', 'cancelled'] },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  });

  const eventIndexes: IndexDescription[] = [
    { key: { clubId: 1, date: -1 }, name: 'idx_perm_events_club_date_desc' },
    { key: { clubId: 1, status: 1 }, name: 'idx_perm_events_status' },
    { key: { athleteIds: 1 }, name: 'idx_perm_events_athletes' },
  ];
  await db.collection('permission_events').createIndexes(eventIndexes);

  // ==================== PERMISSION LETTERS COLLECTION ====================
  await db.createCollection('permission_letters', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['clubId', 'eventId', 'athleteId', 'templateId', 'content', 'status', 'qrCode', 'createdAt', 'updatedAt'],
        properties: {
          clubId: { bsonType: 'objectId' },
          eventId: { bsonType: 'objectId' },
          athleteId: { bsonType: 'objectId' },
          templateId: { bsonType: 'objectId' },
          content: { bsonType: 'string' },
          status: { enum: ['draft', 'submitted', 'approved', 'rejected', 'completed'] },
          qrCode: { bsonType: 'string' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  });

  const letterIndexes: IndexDescription[] = [
    { key: { clubId: 1, eventId: 1, athleteId: 1, templateId: 1 }, unique: true, name: 'idx_perm_letter_unique' },
    { key: { clubId: 1, eventId: 1, status: 1 }, name: 'idx_perm_letters_event_status' },
    { key: { clubId: 1, athleteId: 1, status: 1 }, name: 'idx_perm_letters_athlete_status' },
    { key: { qrCode: 1 }, unique: true, name: 'idx_perm_letters_qr_unique' },
    { key: { createdAt: -1 }, name: 'idx_perm_letters_created_desc' },
  ];
  await db.collection('permission_letters').createIndexes(letterIndexes);

  // ==================== APPROVALS COLLECTION ====================
  await db.createCollection('approvals', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['letterId', 'step', 'approverRole', 'decision', 'createdAt', 'updatedAt'],
        properties: {
          letterId: { bsonType: 'objectId' },
          step: { bsonType: 'int', minimum: 1 },
          approverRole: { enum: ['coach', 'sports_director', 'hod', 'hostel_warden', 'faculty'] },
          approverId: { bsonType: ['objectId', 'null'] },
          decision: { enum: ['pending', 'approved', 'rejected'] },
          comment: { bsonType: ['string', 'null'] },
          decidedAt: { bsonType: ['date', 'null'] },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  });

  const approvalIndexes: IndexDescription[] = [
    { key: { letterId: 1, step: 1 }, unique: true, name: 'idx_approvals_letter_step_unique' },
    { key: { letterId: 1, decision: 1 }, name: 'idx_approvals_letter_decision' },
    { key: { approverId: 1, decision: 1 }, name: 'idx_approvals_approver_decision' },
  ];
  await db.collection('approvals').createIndexes(approvalIndexes);

  // ==================== LETTER TEMPLATES COLLECTION ====================
  await db.createCollection('letter_templates', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['clubId', 'type', 'markdown', 'variables', 'approvalChain', 'createdAt', 'updatedAt'],
        properties: {
          clubId: { bsonType: 'objectId' },
          type: { enum: ['hod_permission', 'faculty_permission', 'hostel_permission', 'competition_participation', 'travel_permission', 'attendance_adjustment', 'medical_leave', 'training_camp_permission'] },
          markdown: { bsonType: 'string' },
          variables: { bsonType: 'array', items: { bsonType: 'string' } },
          approvalChain: { bsonType: 'array', items: { enum: ['coach', 'sports_director', 'hod', 'hostel_warden', 'faculty'] } },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  });

  const templateIndexes: IndexDescription[] = [
    { key: { clubId: 1, type: 1 }, unique: true, name: 'idx_templates_club_type_unique' },
  ];
  await db.collection('letter_templates').createIndexes(templateIndexes);

  console.log('Migration 007: Permission collections created successfully');
};

export const down = async (db: Db): Promise<void> => {
  await db.collection('permission_events').drop().catch(() => {});
  await db.collection('permission_letters').drop().catch(() => {});
  await db.collection('approvals').drop().catch(() => {});
  await db.collection('letter_templates').drop().catch(() => {});
  console.log('Migration 007: Rolled back');
};