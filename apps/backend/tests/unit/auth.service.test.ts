// apps/backend/tests/unit/auth.service.test.ts
// Unit tests for auth service

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UnauthorizedError, ValidationError, ConflictError } from '../../src/utils/errors';
import { ERROR_CODES } from '@stms/shared/constants/errors';

// Mock dependencies
vi.mock('../../src/config/firebase', () => ({
  firebaseAuth: {
    createUser: vi.fn(),
    getUserByEmail: vi.fn(),
    verifyIdToken: vi.fn(),
    setCustomUserClaims: vi.fn(),
  },
  setUserClaims: vi.fn(),
  getUserClaims: vi.fn(),
  revokeUserClaims: vi.fn(),
}));

vi.mock('../../src/config/database', () => ({
  getDatabase: vi.fn(),
}));

vi.mock('../../src/utils/tokens', () => ({
  generateTokens: vi.fn(),
  hashRefreshToken: vi.fn(),
  storeRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
}));

import { firebaseAuth, setUserClaims, getUserClaims } from '../../src/config/firebase';
import { getDatabase } from '../../src/config/database';
import { generateTokens, hashRefreshToken, storeRefreshToken } from '../../src/utils/tokens';

// Import the service after mocks
import { AuthService } from '../../src/services/auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let mockDb: any;
  let mockCollection: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCollection = {
      findOne: vi.fn(),
      insertOne: vi.fn(),
      updateOne: vi.fn(),
      countDocuments: vi.fn(),
      find: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      project: vi.fn().mockReturnThis(),
      toArray: vi.fn(),
    };

    mockDb = {
      collection: vi.fn().mockReturnValue(mockCollection),
    };

    (getDatabase as any).mockResolvedValue(mockDb);

    authService = new AuthService();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('register', () => {
    it('should register new user successfully', async () => {
      const input = {
        email: 'coach@example.com',
        password: 'correct-horse-battery-staple',
        role: 'coach' as const,
        name: 'John Coach',
      };

      // Mock Firebase user not found
      (firebaseAuth.getUserByEmail as any).mockRejectedValue({ code: 'auth/user-not-found' });
      (firebaseAuth.createUser as any).mockResolvedValue({ uid: 'firebase-uid-123' });
      (setUserClaims as any).mockResolvedValue(undefined);

      // Mock MongoDB insert
      mockCollection.insertOne.mockResolvedValue({
        insertedId: 'mongo-id-123',
      });

      // Mock token generation
      (generateTokens as any).mockResolvedValue({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
      });
      (hashRefreshToken as any).mockResolvedValue('hashed-refresh-token');
      (storeRefreshToken as any).mockResolvedValue(undefined);

      const result = await authService.register(input);

      expect(result).toMatchObject({
        accessToken: 'access-token-123',
        expiresIn: 900,
        tokenType: 'Bearer',
        user: expect.objectContaining({
          email: 'coach@example.com',
          name: 'John Coach',
          role: 'coach',
        }),
      });

      expect(firebaseAuth.createUser).toHaveBeenCalledWith({
        email: 'coach@example.com',
        password: 'correct-horse-battery-staple',
        displayName: 'John Coach',
        emailVerified: false,
      });

      expect(setUserClaims).toHaveBeenCalledWith('firebase-uid-123', expect.objectContaining({
        role: 'coach',
        clubIds: [],
        activeClubId: null,
      }));
    });

    it('should throw ConflictError if email already exists', async () => {
      const input = {
        email: 'existing@example.com',
        password: 'password123456',
        role: 'athlete' as const,
        name: 'Existing User',
      };

      (firebaseAuth.getUserByEmail as any).mockResolvedValue({ uid: 'existing-uid' });

      await expect(authService.register(input)).rejects.toThrow(ConflictError);
      await expect(authService.register(input)).rejects.toMatchObject({
        code: ERROR_CODES.CONFLICT,
      });
    });

    it('should throw ValidationError for invalid email', async () => {
      const input = {
        email: 'invalid-email',
        password: 'password123456',
        role: 'athlete' as const,
        name: 'Test User',
      };

      await expect(authService.register(input)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for short password', async () => {
      const input = {
        email: 'test@example.com',
        password: 'short',
        role: 'athlete' as const,
        name: 'Test User',
      };

      await expect(authService.register(input)).rejects.toThrow(ValidationError);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedError for non-existent user', async () => {
      (firebaseAuth.getUserByEmail as any).mockRejectedValue({ code: 'auth/user-not-found' });

      await expect(authService.login('nonexistent@example.com', 'password'))
        .rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for invalid password', async () => {
      (firebaseAuth.getUserByEmail as any).mockResolvedValue({ uid: 'user-123' });
      // Password verification would fail in real implementation

      await expect(authService.login('user@example.com', 'wrongpassword'))
        .rejects.toThrow(UnauthorizedError);
    });
  });

  describe('refreshToken', () => {
    it('should generate new tokens and rotate refresh token', async () => {
      (verifyRefreshToken as any).mockResolvedValue({
        uid: 'user-123',
        email: 'user@example.com',
        role: 'athlete',
        clubIds: [],
        activeClubId: null,
        permissions: [],
      });
      (generateTokens as any).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      (hashRefreshToken as any).mockResolvedValue('new-hashed-refresh');
      (storeRefreshToken as any).mockResolvedValue(undefined);
      (revokeRefreshToken as any).mockResolvedValue(undefined);

      const result = await authService.refreshToken('old-refresh-token');

      expect(result).toMatchObject({
        accessToken: 'new-access-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      });

      expect(revokeRefreshToken).toHaveBeenCalledWith('old-refresh-token');
      expect(storeRefreshToken).toHaveBeenCalledWith('user-123', 'new-refresh-token');
    });

    it('should throw UnauthorizedError for invalid refresh token', async () => {
      (verifyRefreshToken as any).mockRejectedValue(new Error('Token not found'));

      await expect(authService.refreshToken('invalid-token'))
        .rejects.toThrow(UnauthorizedError);
    });
  });

  describe('logout', () => {
    it('should revoke refresh token', async () => {
      (revokeRefreshToken as any).mockResolvedValue(undefined);

      await authService.logout('refresh-token');

      expect(revokeRefreshToken).toHaveBeenCalledWith('refresh-token');
    });
  });

  describe('switchClub', () => {
    it('should switch active club for valid membership', async () => {
      mockCollection.findOne.mockResolvedValue({
        _id: 'membership-123',
        userId: 'user-123',
        clubId: 'club-456',
        status: 'active',
      });
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      (getUserClaims as any).mockResolvedValue({
        role: 'coach',
        clubIds: ['club-456'],
        activeClubId: 'club-456',
        permissions: ['workout:read'],
      });

      const result = await authService.switchClub('user-123', 'club-456');

      expect(result).toMatchObject({
        activeClubId: 'club-456',
        clubIds: ['club-456'],
      });
    });

    it('should throw UnauthorizedError for non-member', async () => {
      mockCollection.findOne.mockResolvedValue(null);

      await expect(authService.switchClub('user-123', 'club-456'))
        .rejects.toThrow(UnauthorizedError);
    });
  });
});