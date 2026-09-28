// apps/backend/src/routes/auth.routes.ts
// Authentication routes

import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler';
import { validate } from '../middleware/validation.middleware';
import { authLimiter } from '../middleware/rate-limit.middleware';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { RegisterRequestSchema, LoginRequestSchema, GoogleAuthRequestSchema, SwitchClubRequestSchema } from '@stms/shared/api/auth';

const router = Router();

// ==================== ROUTES ====================

/**
 * POST /auth/register
 * Register new user with email/password
 */
router.post('/register', authLimiter, validate(RegisterRequestSchema), asyncHandler(async (req, res) => {
  const { email, password, role, name, clubId } = req.body;
  const result = await authService.register({ email, password, role, name, clubId });

  // Set refresh token cookie
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.status(201).json({
    status: 'success',
    data: {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      tokenType: result.tokenType,
      user: result.user,
    },
  });
}));

/**
 * POST /auth/login
 * Login with email/password
 */
router.post('/login', authLimiter, validate(LoginRequestSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.json({
    status: 'success',
    data: {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      tokenType: result.tokenType,
      user: result.user,
    },
  });
}));

/**
 * POST /auth/google
 * Login/register with Google OAuth
 */
router.post('/google', authLimiter, validate(GoogleAuthRequestSchema), asyncHandler(async (req, res) => {
  const { idToken, clubId } = req.body;
  const result = await authService.loginWithGoogle(idToken, clubId);

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.json({
    status: 'success',
    data: {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      tokenType: result.tokenType,
      user: result.user,
    },
  });
}));

/**
 * POST /auth/refresh
 * Refresh access token using refresh token cookie
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      status: 'error',
      message: 'No refresh token provided',
      code: 'TOKEN_EXPIRED',
    });
  }

  const result = await authService.refreshToken(refreshToken);

  // Set new cookie
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.json({
    status: 'success',
    data: {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      tokenType: result.tokenType,
    },
  });
}));

/**
 * POST /auth/logout
 * Revoke refresh token and clear cookie
 */
router.post('/logout', asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    await authService.logout(refreshToken);
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  res.json({ status: 'success', message: 'Logged out successfully' });
}));

/**
 * GET /auth/me
 * Get current user with permissions
 */
router.get('/me', asyncHandler(async (req, res) => {
  // User already attached by authenticate middleware
  res.json({
    status: 'success',
    data: {
      user: req.user,
      permissions: req.user?.permissions || [],
    },
  });
}));

/**
 * POST /auth/switch-club
 * Switch active club context
 */
router.post('/switch-club', validate(SwitchClubRequestSchema), asyncHandler(async (req, res) => {
  const { clubId } = req.body;
  const userId = req.user!.uid;

  const claims = await authService.switchClub(userId, clubId);

  res.json({
    status: 'success',
    data: {
      user: {
        ...req.user,
        activeClubId: clubId,
        clubIds: claims.clubIds,
      },
      permissions: claims.permissions,
    },
  });
}));

export default router;