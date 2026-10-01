// src/app.ts
// Express app setup with all middleware

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { env, getAllowedOrigins } from './config/env';
import { requestLogger } from './middleware/logger.middleware';
import { errorHandler, asyncHandler } from './middleware/error-handler';
import { apiLimiter } from './middleware/rate-limit.middleware';
import { injectClubId } from './middleware/club.middleware';
import { authenticate } from './middleware/auth.middleware';
import { connectToDatabase } from './config/database';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import clubRoutes from './routes/club.routes';
import athleteRoutes from './routes/athlete.routes';
import attendanceRoutes from './routes/attendance.routes';
import workoutRoutes from './routes/workout.routes';
import performanceRoutes from './routes/performance.routes';
import recommendationRoutes from './routes/recommendation.routes';
import permissionRoutes, { publicRouter as publicPermissionRoutes } from './routes/permission.routes';
import injuryRoutes from './routes/injury.routes';
import analyticsRoutes from './routes/analytics.routes';
import announcementRoutes from './routes/announcement.routes';
import readinessRoutes from './routes/readiness.routes';

const app = express();

// ==================== SECURITY MIDDLEWARE ====================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true, // Required for refresh token cookie
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
}));

app.use(compression());

// ==================== BODY PARSING ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== REQUEST LOGGING ====================
app.use(requestLogger);

// ==================== RATE LIMITING ====================
app.use('/api/', apiLimiter);

// ==================== HEALTH CHECK ====================
app.get('/healthz', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
  });
});

// ==================== API ROUTES ====================
const API_PREFIX = '/api/v1';

// Platform account routes are global and are restricted to system_admin in
// user.routes.ts. They must not require an active club. All other user routes
// retain the existing club-context requirement for tenant isolation.
const injectClubContextForUserRoutes = (req: Request, res: Response, next: NextFunction): void => {
  if (req.path === '/platform' || req.path.startsWith('/platform/')) return next();
  return injectClubId(req, res, next);
};

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, authenticate, injectClubContextForUserRoutes, userRoutes);
app.use(`${API_PREFIX}/clubs`, authenticate, clubRoutes);
app.use(`${API_PREFIX}/athletes`, authenticate, injectClubId, athleteRoutes);
app.use(`${API_PREFIX}/attendance`, authenticate, injectClubId, attendanceRoutes);
app.use(`${API_PREFIX}/workouts`, authenticate, injectClubId, workoutRoutes);
app.use(`${API_PREFIX}/performance`, authenticate, injectClubId, performanceRoutes);
app.use(`${API_PREFIX}/recommendations`, authenticate, injectClubId, recommendationRoutes);
app.use(`${API_PREFIX}/permissions/public`, publicPermissionRoutes);
app.use(`${API_PREFIX}/permissions`, permissionRoutes);
app.use(`${API_PREFIX}/injuries`, authenticate, injectClubId, injuryRoutes);
app.use(`${API_PREFIX}/analytics`, authenticate, injectClubId, analyticsRoutes);
app.use(`${API_PREFIX}/announcements`, authenticate, injectClubId, announcementRoutes);
app.use(`${API_PREFIX}/readiness`, authenticate, injectClubId, readinessRoutes);

// ==================== 404 HANDLER ====================
app.use((_req: Request, _res: Response, next: NextFunction) => {
  const error = new Error('Route not found');
  (error as any).statusCode = 404;
  next(error);
});

// ==================== GLOBAL ERROR HANDLER ====================
app.use(errorHandler);

// Initialize database connection
let dbInitialized = false;
export async function initializeApp(): Promise<void> {
  if (!dbInitialized) {
    await connectToDatabase();
    dbInitialized = true;
  }
}

export default app;
