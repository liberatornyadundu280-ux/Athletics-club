// apps/backend/src/migrations/001-initial-schema.ts
// MongoDB migration for initial schema

import { Db, IndexDescription } from 'mongodb';

export const up = async (db: Db): Promise<void> => {
  // ==================== USERS COLLECTION ====================
  await db.createCollection('users', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['firebaseUid', 'email', 'name', 'role', 'clubIds', 'status', 'createdAt', 'updatedAt'],
        properties: {
          firebaseUid: { bsonType: 'string' },
          email: { bsonType: 'string', pattern: '^.+@.+$' },
          name: { bsonType: 'string', minLength: 1, maxLength: 100 },
          avatarUrl: { bsonType: ['string', 'null'] },
          role: { enum: ['system_admin', 'club_admin', 'coach', 'athlete'] },
          clubIds: { bsonType: 'array', items: { bsonType: 'objectId' } },
          activeClubId: { bsonType: ['objectId', 'null'] },
          permissions: { bsonType: 'array', items: { bsonType: 'string' } },
          status: { enum: ['active', 'invited', 'deactivated', 'deleted'] },
          lastLoginAt: { bsonType: ['date', 'null'] },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
          deletedAt: { bsonType: ['date', 'null'] },
        },
      },
    },
  });

  const userIndexes: IndexDescription[] = [
    { key: { email: 1 }, unique: true, name: 'idx_users_email_unique' },
    { key: { firebaseUid: 1 }, unique: true, name: 'idx_users_firebase_uid_unique' },
    { key: { clubIds: 1 }, name: 'idx_users_club_ids' },
    { key: { status: 1 }, name: 'idx_users_status' },
    { key: { role: 1 }, name: 'idx_users_role' },
    { key: { createdAt: -1 }, name: 'idx_users_created_at_desc' },
  ];
  await db.collection('users').createIndexes(userIndexes);

  // ==================== CLUBS COLLECTION ====================
  await db.createCollection('clubs', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['name', 'slug', 'branding', 'settings', 'createdBy', 'createdAt', 'updatedAt'],
        properties: {
          name: { bsonType: 'string', minLength: 2, maxLength: 100 },
          slug: { bsonType: 'string', pattern: '^[a-z0-9-]+$', maxLength: 50 },
          branding: {
            bsonType: 'object',
            required: ['primaryColor', 'secondaryColor'],
            properties: {
              logoUrl: { bsonType: ['string', 'null'] },
              primaryColor: { bsonType: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
              secondaryColor: { bsonType: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
            },
          },
          settings: {
            bsonType: 'object',
            properties: {
              timezone: { bsonType: 'string' },
              attendanceMinPercent: { bsonType: 'int', minimum: 0, maximum: 100 },
              workoutVerificationRequired: { bsonType: 'bool' },
              notificationDefaults: { bsonType: 'object' },
            },
          },
          createdBy: { bsonType: 'objectId' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  });

  const clubIndexes: IndexDescription[] = [
    { key: { slug: 1 }, unique: true, name: 'idx_clubs_slug_unique' },
    { key: { createdBy: 1 }, name: 'idx_clubs_created_by' },
    { key: { createdAt: -1 }, name: 'idx_clubs_created_at_desc' },
  ];
  await db.collection('clubs').createIndexes(clubIndexes);

  // ==================== CLUB MEMBERSHIPS COLLECTION ====================
  await db.createCollection('club_memberships', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['userId', 'clubId', 'role', 'status', 'joinedAt', 'createdAt', 'updatedAt'],
        properties: {
          userId: { bsonType: 'objectId' },
          clubId: { bsonType: 'objectId' },
          role: { enum: ['member', 'captain', 'alumni', 'head_coach', 'assistant_coach', 'specialist_coach'] },
          status: { enum: ['active', 'pending', 'transferred_out'] },
          joinedAt: { bsonType: 'date' },
          invitedBy: { bsonType: ['objectId', 'null'] },
          invitedAt: { bsonType: ['date', 'null'] },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  });

  const membershipIndexes: IndexDescription[] = [
    { key: { userId: 1, clubId: 1 }, unique: true, name: 'idx_memberships_user_club_unique' },
    { key: { clubId: 1, status: 1 }, name: 'idx_memberships_club_status' },
    { key: { userId: 1, status: 1 }, name: 'idx_memberships_user_status' },
    { key: { clubId: 1, role: 1 }, name: 'idx_memberships_club_role' },
    { key: { invitedBy: 1 }, name: 'idx_memberships_invited_by' },
  ];
  await db.collection('club_memberships').createIndexes(membershipIndexes);

  // ==================== AUDIT LOGS COLLECTION ====================
  await db.createCollection('audit_logs', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['userId', 'action', 'resource', 'clubId', 'timestamp', 'ip'],
        properties: {
          userId: { bsonType: 'objectId' },
          action: { bsonType: 'string' },
          resource: { bsonType: 'string' },
          resourceId: { bsonType: ['objectId', 'null'] },
          clubId: { bsonType: 'objectId' },
          metadata: { bsonType: 'object' },
          timestamp: { bsonType: 'date' },
          ip: { bsonType: 'string' },
          userAgent: { bsonType: 'string' },
        },
      },
    },
  });

  const auditIndexes: IndexDescription[] = [
    { key: { clubId: 1, timestamp: -1 }, name: 'idx_audit_club_timestamp_desc' },
    { key: { userId: 1, timestamp: -1 }, name: 'idx_audit_user_timestamp_desc' },
    { key: { action: 1, timestamp: -1 }, name: 'idx_audit_action_timestamp_desc' },
    { key: { resource: 1, resourceId: 1 }, name: 'idx_audit_resource' },
    // TTL index - keep audit logs for 7 years (regulatory)
    { key: { timestamp: 1 }, expireAfterSeconds: 7 * 365 * 24 * 60 * 60, name: 'idx_audit_ttl_7y' },
  ];
  await db.collection('audit_logs').createIndexes(auditIndexes);

  // ==================== REFRESH TOKENS COLLECTION ====================
  // Actually stored in Redis with key: `refresh_token:{hashedToken}` -> { userId, clubId, expiresAt }
  // No MongoDB collection needed

  console.log('Migration 001: Initial schema created successfully');
};

export const down = async (db: Db): Promise<void> => {
  await db.collection('users').drop().catch(() => {});
  await db.collection('clubs').drop().catch(() => {});
  await db.collection('club_memberships').drop().catch(() => {});
  await db.collection('audit_logs').drop().catch(() => {});
  console.log('Migration 001: Rolled back');
};