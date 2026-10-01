// src/services/auth.service.ts
// Authentication business logic

import { ObjectId } from 'mongodb';
import { firebaseAuth, setUserClaims, getUserClaims, revokeUserClaims } from '../config/firebase';
import { getDatabase } from '../config/database';
import {
  generateTokens,
  hashRefreshToken,
  storeRefreshToken,
  revokeRefreshToken,
  verifyRefreshToken,
  TokenPair,
} from '../utils/tokens';
import {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../utils/errors';
import { ERROR_CODES } from '../utils/errors';
import { RegisterInput, LoginInput, JWTPayload } from '../types';

export class AuthService {
  private readonly REFRESH_TOKEN_TTL_DAYS = 7;

  /**
   * Register new user with email/password
   */
  async register(input: RegisterInput): Promise<TokenPair & { user: any }> {
    const { email, password, role, name, clubId } = input;

    // Validate input
    this.validateRegistrationInput(input);

    // Check if user already exists in Firebase
    try {
      await firebaseAuth.getUserByEmail(email);
      throw new ConflictError('Email already registered');
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Create Firebase user
    const userRecord = await firebaseAuth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: false,
    });

    const firebaseUid = userRecord.uid;

    // Set initial custom claims
    const initialClubIds = clubId ? [clubId] : [];
    await setUserClaims(firebaseUid, {
      role,
      clubIds: initialClubIds,
      activeClubId: clubId || null,
      permissions: [],
    });

    // Create MongoDB user document
    const db = await getDatabase();
    const now = new Date();

    const userDoc = {
      firebaseUid,
      email,
      name,
      avatarUrl: null,
      role,
      clubIds: initialClubIds.map(id => new ObjectId(id)),
      activeClubId: clubId ? new ObjectId(clubId) : null,
      permissions: [],
      status: 'active' as const,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const result = await db.collection('users').insertOne(userDoc);
    const userId = result.insertedId;

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens({
      uid: firebaseUid,
      email,
      role,
      clubIds: initialClubIds,
      activeClubId: clubId || null,
      permissions: [],
    });

    // Store refresh token
    await storeRefreshToken(firebaseUid, refreshToken);

    // Return user without sensitive data
    const userResponse = {
      id: userId.toString(),
      firebaseUid,
      email,
      name,
      avatarUrl: null,
      role,
      clubIds: initialClubIds,
      activeClubId: clubId || null,
      status: 'active',
      lastLoginAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      tokenType: 'Bearer',
      user: userResponse,
    };
  }

  /**
   * Login with email/password
   * Note: Firebase Admin SDK doesn't verify passwords directly.
   * In production, use Firebase Client SDK on frontend to get ID token,
   * then verify it here with firebaseAuth.verifyIdToken()
   */
  async login(email: string, password: string): Promise<TokenPair & { user: any }> {
    // Get user from Firebase
    let firebaseUser;
    try {
      firebaseUser = await firebaseAuth.getUserByEmail(email);
    } catch {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if user is disabled
    if (firebaseUser.disabled) {
      throw new UnauthorizedError('Account disabled');
    }

    // Get MongoDB user
    const db = await getDatabase();
    const user = await db.collection('users').findOne({ firebaseUid: firebaseUser.uid });

    if (!user) {
      throw new UnauthorizedError('User profile not found');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedError('Account not active');
    }

    // TODO: In production, verify password using Firebase Client SDK flow:
    // 1. Frontend calls firebase.auth().signInWithEmailAndPassword()
    // 2. Frontend gets ID token
    // 3. Frontend sends ID token to backend /auth/login-with-idtoken
    // 4. Backend verifies ID token with firebaseAuth.verifyIdToken()
    // For now, we'll throw an error indicating this needs client SDK integration
    throw new Error('Password verification requires Firebase Client SDK integration. Use /auth/google or implement ID token flow.');
  }

  /**
   * Login with Google ID token
   */
  async loginWithGoogle(idToken: string, clubId?: string): Promise<TokenPair & { user: any }> {
    // Verify Google ID token
    const decoded = await firebaseAuth.verifyIdToken(idToken, true);
    const { uid, email, name, picture } = decoded;

    if (!email) {
      throw new UnauthorizedError('Google account must have email');
    }

    // Check if user exists
    let firebaseUser;
    let isNewUser = false;

    try {
      firebaseUser = await firebaseAuth.getUserByEmail(email);
    } catch {
      // Create new user
      firebaseUser = await firebaseAuth.createUser({
        uid,
        email,
        displayName: name,
        photoURL: picture,
        emailVerified: true,
      });
      isNewUser = true;
    }

    // Get or create MongoDB user
    const db = await getDatabase();
    let user = await db.collection('users').findOne({ firebaseUid: firebaseUser.uid });

    const now = new Date();

    if (!user) {
      const initialClubIds = clubId ? [clubId] : [];
      const userDoc = {
        firebaseUid: firebaseUser.uid,
        email,
        name: name || email.split('@')[0],
        avatarUrl: picture || null,
        role: 'athlete' as const,
        clubIds: initialClubIds.map(id => new ObjectId(id)),
        activeClubId: clubId ? new ObjectId(clubId) : null,
        permissions: [],
        status: 'active' as const,
        lastLoginAt: now,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };

      const result = await db.collection('users').insertOne(userDoc);
      user = { ...userDoc, _id: result.insertedId };
    } else {
      // Update last login and avatar
      await db.collection('users').updateOne(
        { _id: user._id },
        {
          $set: {
            lastLoginAt: now,
            updatedAt: now,
            avatarUrl: picture || user.avatarUrl,
          },
        }
      );
    }

    // Get current claims
    const claims = await getUserClaims(firebaseUser.uid);

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens({
      uid: firebaseUser.uid,
      email,
      role: claims?.role || 'athlete',
      clubIds: claims?.clubIds || [],
      activeClubId: claims?.activeClubId || null,
      permissions: claims?.permissions || [],
    });

    // Store refresh token
    await storeRefreshToken(firebaseUser.uid, refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      tokenType: 'Bearer',
      user: {
        id: user._id.toString(),
        firebaseUid: user.firebaseUid,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        clubIds: user.clubIds.map((id: ObjectId) => id.toString()),
        activeClubId: user.activeClubId?.toString() || null,
        status: user.status,
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    // Verify refresh token and get payload
    const payload = await verifyRefreshToken(refreshToken);

    // Generate new token pair (rotation)
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await generateTokens(payload);

    // Store new refresh token, revoke old
    await storeRefreshToken(payload.uid, newRefreshToken);
    await revokeRefreshToken(refreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
      tokenType: 'Bearer',
    };
  }

  /**
   * Logout - revoke refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    await revokeRefreshToken(refreshToken);
  }

  /**
   * Switch active club
   */
  async switchClub(userId: string, clubId: string): Promise<JWTPayload> {
    const db = await getDatabase();

    // Verify user is member of this club
    const membership = await db.collection('club_memberships').findOne({
      userId: new ObjectId(userId),
      clubId: new ObjectId(clubId),
      status: 'active',
    });

    if (!membership) {
      throw new UnauthorizedError('Not a member of this club', { code: ERROR_CODES.CLUB_ACCESS_DENIED });
    }

    // Update user's active club
    await db.collection('users').updateOne(
      { firebaseUid: userId },
      { $set: { activeClubId: new ObjectId(clubId), updatedAt: new Date() } }
    );

    // Get updated claims
    const claims = await getUserClaims(userId);

    if (!claims) {
      throw new Error('Failed to refresh user claims');
    }

    return {
      uid: userId,
      email: '', // Would be populated from user document
      role: claims.role,
      clubIds: claims.clubIds,
      activeClubId: claims.activeClubId,
      permissions: claims.permissions,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<any> {
    const db = await getDatabase();
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    if (!user) {
      throw new NotFoundError('User');
    }

    return {
      id: user._id.toString(),
      firebaseUid: user.firebaseUid,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      clubIds: user.clubIds.map((id: ObjectId) => id.toString()),
      activeClubId: user.activeClubId?.toString() || null,
      status: user.status,
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, newRole: string, requestingUserId: string): Promise<any> {
    if (requestingUserId === userId) {
      throw new UnauthorizedError('Cannot change your own role');
    }

    if (newRole === 'system_admin') {
      throw new UnauthorizedError('Cannot assign system_admin role');
    }

    const db = await getDatabase();

    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      throw new NotFoundError('User');
    }

    // Update role
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { role: newRole, updatedAt: new Date() } }
    );

    // Update membership role
    const membershipRoleMap: Record<string, string> = {
      club_admin: 'head_coach',
      coach: 'assistant_coach',
      athlete: 'member',
    };

    await db.collection('club_memberships').updateOne(
      { userId: new ObjectId(userId), clubId: user.activeClubId },
      { $set: { role: membershipRoleMap[newRole], updatedAt: new Date() } }
    );

    // Return updated user
    return this.getUserById(userId);
  }

  /**
   * Soft delete user
   */
  async deleteUser(userId: string, requestingUserId: string): Promise<void> {
    if (requestingUserId === userId) {
      throw new UnauthorizedError('Cannot delete yourself');
    }

    const db = await getDatabase();

    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      throw new NotFoundError('User');
    }

    const now = new Date();

    // Soft delete
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          status: 'deleted',
          deletedAt: now,
          updatedAt: now,
          email: `deleted_${user._id}@deleted.stms`,
          name: 'Deleted User',
          avatarUrl: null,
        },
      }
    );

    // Update membership status
    await db.collection('club_memberships').updateOne(
      { userId: new ObjectId(userId), clubId: user.activeClubId },
      { $set: { status: 'transferred_out', updatedAt: now } }
    );

    // Revoke Firebase tokens
    await revokeUserClaims(user.firebaseUid);
  }

  /**
   * Validate registration input
   */
  private validateRegistrationInput(input: RegisterInput): void {
    const errors: { field: string; message: string }[] = [];

    if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      errors.push({ field: 'email', message: 'Valid email required' });
    }

    if (!input.password || input.password.length < 12) {
      errors.push({ field: 'password', message: 'Password must be at least 12 characters' });
    }

    if (!input.name || input.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Name is required' });
    }

    if (!['athlete', 'coach'].includes(input.role)) {
      errors.push({ field: 'role', message: 'Role must be athlete or coach' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors);
    }
  }
}

export const authService = new AuthService();
