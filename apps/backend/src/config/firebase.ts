// apps/backend/src/config/firebase.ts
// Firebase Admin SDK initialization

import admin from 'firebase-admin';
import { env } from './env';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Parse private key (handles \n in env var)
const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
    projectId: env.FIREBASE_PROJECT_ID,
  });
}

export const firebaseAuth = admin.auth();
export const firebaseDb: Firestore = getFirestore();

// Configure Firestore settings
firebaseDb.settings({
  ignoreUndefinedProperties: true,
});

// ==================== CUSTOM CLAIMS HELPERS ====================

export interface CustomClaims {
  role: 'system_admin' | 'club_admin' | 'coach' | 'athlete';
  clubIds: string[];
  activeClubId: string | null;
  permissions: string[];
}

/**
 * Set custom claims for a user
 */
export async function setUserClaims(
  uid: string,
  claims: CustomClaims
): Promise<void> {
  await firebaseAuth.setCustomUserClaims(uid, {
    role: claims.role,
    clubIds: claims.clubIds,
    activeClubId: claims.activeClubId,
    permissions: claims.permissions,
  });
}

/**
 * Get current custom claims for a user
 */
export async function getUserClaims(uid: string): Promise<CustomClaims | null> {
  const user = await firebaseAuth.getUser(uid);
  const claims = user.customClaims;

  if (!claims) return null;

  return {
    role: claims.role as CustomClaims['role'],
    clubIds: claims.clubIds as string[],
    activeClubId: claims.activeClubId as string | null,
    permissions: claims.permissions as string[],
  };
}

/**
 * Revoke all custom claims (set to default athlete)
 */
export async function revokeUserClaims(uid: string): Promise<void> {
  await firebaseAuth.setCustomUserClaims(uid, {
    role: 'athlete',
    clubIds: [],
    activeClubId: null,
    permissions: [
      'profile:read', 'profile:write',
      'workout:read', 'workout:complete',
      'attendance:read',
      'performance:read',
      'injury:read', 'injury:write:own',
      'permission:read', 'permission:write:own',
      'announcement:read',
      'analytics:read:own',
    ],
  });
}

/**
 * Verify ID token and return decoded claims
 */
export async function verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  return firebaseAuth.verifyIdToken(idToken, true); // checkRevoked = true
}

/**
 * Create custom token for user (useful for testing)
 */
export async function createCustomToken(uid: string, claims?: Partial<CustomClaims>): Promise<string> {
  return firebaseAuth.createCustomToken(uid, claims);
}