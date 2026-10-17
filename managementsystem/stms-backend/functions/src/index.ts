import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

admin.initializeApp();
const db = getFirestore();

// ==================== TYPES ====================
interface UserClaims {
  role: 'system_admin' | 'club_admin' | 'coach' | 'athlete';
  clubIds: string[];
  activeClubId: string | null;
  permissions: string[];
}

interface MembershipDoc {
  userId: string;
  clubId: string;
  role: 'member' | 'captain' | 'alumni' | 'head_coach' | 'assistant_coach' | 'specialist_coach';
  status: 'active' | 'pending' | 'transferred_out';
}

// Permission mapping: role -> permission codes (8-letter system)
const ROLE_PERMISSIONS: Record<string, string[]> = {
  system_admin: ['*'],
  club_admin: [
    'club:read', 'club:write', 'club:settings',
    'user:read', 'user:write', 'user:role', 'user:invite', 'user:delete',
    'athlete:read', 'athlete:write', 'athlete:import',
    'attendance:read', 'attendance:write', 'attendance:report',
    'workout:read', 'workout:write', 'workout:assign', 'workout:template',
    'performance:read', 'performance:write', 'performance:report',
    'injury:read', 'injury:write', 'injury:rtp',
    'permission:read', 'permission:write', 'permission:approve',
    'announcement:read', 'announcement:write', 'announcement:send',
    'analytics:read', 'analytics:report',
  ],
  coach: [
    'athlete:read', 'athlete:write',
    'attendance:read', 'attendance:write',
    'workout:read', 'workout:write', 'workout:assign',
    'performance:read', 'performance:write',
    'injury:read', 'injury:write',
    'permission:read', 'permission:write',
    'announcement:read', 'announcement:write',
    'analytics:read',
  ],
  athlete: [
    'profile:read', 'profile:write',
    'workout:read', 'workout:complete',
    'attendance:read',
    'performance:read',
    'injury:read', 'injury:write:own',
    'permission:read', 'permission:write:own',
    'announcement:read',
    'analytics:read:own',
  ],
};

// ==================== HELPER FUNCTIONS ====================
async function computeUserClaims(userId: string): Promise<UserClaims> {
  // Get user's active memberships
  const membershipsSnap = await db.collection('club_memberships')
    .where('userId', '==', userId)
    .where('status', '==', 'active')
    .get();

  const clubIds: string[] = [];
  let highestRole: UserClaims['role'] = 'athlete';
  const allPermissions = new Set<string>();

  for (const doc of membershipsSnap.docs) {
    const membership = doc.data() as MembershipDoc;
    clubIds.push(membership.clubId);

    // Determine highest role across clubs
    const roleHierarchy = ['athlete', 'coach', 'club_admin', 'system_admin'];
    const membershipRole = membership.role.replace(/_coach$/, '').replace(/head_/, '');
    const currentIdx = roleHierarchy.indexOf(highestRole);
    const newIdx = roleHierarchy.indexOf(membershipRole);
    if (newIdx > currentIdx) {
      highestRole = membershipRole as UserClaims['role'];
    }

    // Add permissions for this role
    const permissions = ROLE_PERMISSIONS[membershipRole] || [];
    permissions.forEach(p => allPermissions.add(p));
  }

  // Get active club from user document
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();
  const activeClubId = userData?.activeClubId || clubIds[0] || null;

  return {
    role: highestRole,
    clubIds,
    activeClubId,
    permissions: Array.from(allPermissions),
  };
}

async function setCustomClaims(uid: string, claims: UserClaims): Promise<void> {
  await admin.auth().setCustomUserClaims(uid, {
    role: claims.role,
    clubIds: claims.clubIds,
    activeClubId: claims.activeClubId,
    permissions: claims.permissions,
  });
}

// ==================== CLOUD FUNCTIONS ====================

/**
 * Sync custom claims when user document changes
 * Trigger: Firestore users/{userId} onWrite
 */
export const syncUserClaims = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const { userId } = context.params;
    const afterData = change.after.data();

    // Skip if document deleted
    if (!afterData) {
      // Revoke all claims on user deletion
      await admin.auth().setCustomUserClaims(userId, {
        role: 'athlete',
        clubIds: [],
        activeClubId: null,
        permissions: ROLE_PERMISSIONS.athlete,
      });
      return;
    }

    // Only sync if relevant fields changed
    const beforeData = change.before.data();
    const relevantFields = ['clubIds', 'activeClubId', 'status', 'role'];
    const shouldSync = !beforeData || relevantFields.some(field =>
      beforeData[field] !== afterData[field]
    );

    if (!shouldSync) {
      return;
    }

    try {
      const claims = await computeUserClaims(userId);
      await setCustomClaims(userId, claims);
      console.log(`Synced claims for user ${userId}:`, claims);
    } catch (error) {
      console.error(`Failed to sync claims for user ${userId}:`, error);
      throw error;
    }
  });

/**
 * Sync custom claims when membership changes
 * Trigger: Firestore club_memberships/{membershipId} onWrite
 */
export const syncMembershipClaims = functions.firestore
  .document('club_memberships/{membershipId}')
  .onWrite(async (change, context) => {
    const afterData = change.after.data();
    const beforeData = change.before.data();

    // Get userId from new or old document
    const userId = afterData?.userId || beforeData?.userId;
    if (!userId) return;

    try {
      const claims = await computeUserClaims(userId);
      await setCustomClaims(userId, claims);
      console.log(`Synced claims via membership for user ${userId}:`, claims);
    } catch (error) {
      console.error(`Failed to sync membership claims for user ${userId}:`, error);
      throw error;
    }
  });

/**
 * Callable function: Manually refresh user claims
 * Called from backend after role/membership changes
 */
export const refreshUserClaims = functions.https.onCall(
  async (data: { userId: string }, context) => {
    // Verify caller is authenticated and has admin role
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const callerClaims = context.auth.token;
    if (!callerClaims.permissions?.includes('user:role') && callerClaims.role !== 'system_admin') {
      throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
    }

    const { userId } = data;
    if (!userId) {
      throw new functions.https.HttpsError('invalid-argument', 'userId required');
    }

    try {
      const claims = await computeUserClaims(userId);
      await setCustomClaims(userId, claims);
      return { success: true, claims };
    } catch (error) {
      console.error(`Failed to refresh claims for user ${userId}:`, error);
      throw new functions.https.HttpsError('internal', 'Failed to refresh claims');
    }
  }
);

/**
 * Callable function: Set user's active club
 */
export const setActiveClub = functions.https.onCall(
  async (data: { userId: string; clubId: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { userId, clubId } = data;
    if (!userId || !clubId) {
      throw new functions.https.HttpsError('invalid-argument', 'userId and clubId required');
    }

    // Verify user is member of this club
    const membershipSnap = await db.collection('club_memberships')
      .where('userId', '==', userId)
      .where('clubId', '==', clubId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (membershipSnap.empty) {
      throw new functions.https.HttpsError('permission-denied', 'User not member of this club');
    }

    // Update user document
    await db.collection('users').doc(userId).update({
      activeClubId: clubId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Recompute and set claims
    const claims = await computeUserClaims(userId);
    await setCustomClaims(userId, claims);

    return { success: true, activeClubId: clubId };
  }
);

/**
 * Scheduled function: Daily claims audit
 * Ensures all users have correct claims (catches edge cases)
 */
export const dailyClaimsAudit = functions.pubsub
  .schedule('0 3 * * *') // 3 AM daily
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    console.log('Starting daily claims audit...');

    const usersSnap = await db.collection('users')
      .where('status', 'in', ['active', 'invited'])
      .get();

    let updated = 0;
    let errors = 0;

    for (const doc of usersSnap.docs) {
      try {
        const claims = await computeUserClaims(doc.id);
        await setCustomClaims(doc.id, claims);
        updated++;
      } catch (error) {
        console.error(`Audit failed for user ${doc.id}:`, error);
        errors++;
      }
    }

    console.log(`Claims audit complete: ${updated} updated, ${errors} errors`);
    return null;
  });