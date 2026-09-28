// apps/backend/src/routes/attendance.routes.ts
// Attendance management routes

import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { asyncHandler } from '../middleware/error-handler';
import { validate } from '../middleware/validation.middleware';
import { requireRole, requirePermission } from '../middleware/rbac.middleware';
import { z } from 'zod';
import { getDatabase } from '../config/database';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { ERROR_CODES } from '@stms/shared/constants/errors';

const router = Router();

// ==================== ZOD SCHEMAS ====================
const createSessionSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    venue: z.string().min(1).max(200),
    type: z.enum(['training', 'competition', 'meeting', 'other']),
    linkedWorkoutId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  }),
});

const updateSessionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    venue: z.string().min(1).max(200).optional(),
    type: z.enum(['training', 'competition', 'meeting', 'other']).optional(),
    linkedWorkoutId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable(),
    status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  }),
});

const markAttendanceSchema = z.object({
  params: z.object({
    sessionId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    athleteId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    status: z.enum(['present', 'absent', 'late', 'excused', 'official_sports_leave']),
    method: z.enum(['manual', 'qr', 'bulk', 'workout_open']).optional(),
    excuseNote: z.string().optional(),
    excuseAttachment: z.string().url().optional().nullable(),
  }),
});

const bulkAttendanceSchema = z.object({
  params: z.object({
    sessionId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    records: z.array(z.object({
      athleteId: z.string().regex(/^[0-9a-fA-F]{24}$/),
      status: z.enum(['present', 'absent', 'late', 'excused', 'official_sports_leave']),
      method: z.enum(['manual', 'qr', 'bulk', 'workout_open']).optional(),
      excuseNote: z.string().optional(),
      excuseAttachment: z.string().url().optional().nullable(),
    })).min(1),
  }),
});

const attendanceQuerySchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    sessionId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['present', 'absent', 'late', 'excused', 'official_sports_leave']).optional(),
    athleteId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
});

const reportQuerySchema = z.object({
  query: z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    athleteId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    groupBy: z.enum(['day', 'week', 'month', 'athlete']).optional(),
  }),
});

const qrScanSchema = z.object({
  body: z.object({
    token: z.string(),
  }),
});

// ==================== ROUTES ====================

/**
 * POST /sessions
 * Create training session
 */
router.post('/sessions',
  requireRole('coach', 'club_admin', 'system_admin'),
  requirePermission('attendance:write'),
  validate(createSessionSchema),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const now = new Date();

    const sessionDoc = {
      ...req.body,
      clubId: new ObjectId(req.clubId),
      date: new Date(req.body.date),
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      status: 'scheduled',
      linkedWorkoutId: req.body.linkedWorkoutId ? new ObjectId(req.body.linkedWorkoutId) : null,
      createdBy: new ObjectId(req.user!.uid),
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('sessions').insertOne(sessionDoc);

    // Generate QR token
    const qrToken = generateQRToken(result.insertedId.toString());

    res.status(201).json({
      status: 'success',
      data: {
        id: result.insertedId.toString(),
        ...sessionDoc,
        createdBy: sessionDoc.createdBy.toString(),
        qrToken,
      },
    });
  })
);

/**
 * GET /sessions
 * List sessions
 */
router.get('/sessions',
  requirePermission('attendance:read'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const clubId = req.clubId;
    const { page = 1, limit = 20, status, type, dateFrom, dateTo } = req.query;

    const filter: any = { clubId: new ObjectId(clubId) };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (dateFrom) filter.date = { ...filter.date, $gte: new Date(dateFrom as string) };
    if (dateTo) filter.date = { ...filter.date, $lte: new Date(dateTo as string) };

    const total = await db.collection('sessions').countDocuments(filter);
    const sessions = await db.collection('sessions')
      .find(filter)
      .sort({ date: -1, startTime: -1 })
      .skip((parseInt(req.query.page as string) - 1) * parseInt(req.query.limit as string) || 0)
      .limit(parseInt(req.query.limit as string) || 20)
      .toArray();

    res.json({
      status: 'success',
      data: sessions.map(s => ({ ...s, id: s._id.toString(), clubId: s.clubId.toString(), linkedWorkoutId: s.linkedWorkoutId?.toString(), createdBy: s.createdBy.toString() })),
      meta: { page: parseInt(req.query.page as string) || 1, limit: parseInt(req.query.limit as string) || 20, total, totalPages: Math.ceil(total / (parseInt(req.query.limit as string) || 20)) },
    });
  })
);

/**
 * GET /sessions/:id
 * Get session details
 */
router.get('/sessions/:id',
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const session = await db.collection('sessions').findOne({ _id: new ObjectId(req.params.id) });

    if (!session) throw new NotFoundError('Session');

    res.json({
      status: 'success',
      data: { ...session, id: session._id.toString(), clubId: session.clubId.toString(), linkedWorkoutId: session.linkedWorkoutId?.toString(), createdBy: session.createdBy.toString() },
    });
  })
);

/**
 * PATCH /sessions/:id
 * Update session
 */
router.patch('/sessions/:id',
  requireRole('coach', 'club_admin', 'system_admin'),
  requirePermission('attendance:write'),
  validate(updateSessionSchema),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const { id } = req.params;

    const updateDoc: any = { updatedAt: new Date() };
    if (req.body.date) updateDoc.date = new Date(req.body.date);
    if (req.body.startTime) updateDoc.startTime = req.body.startTime;
    if (req.body.endTime) updateDoc.endTime = req.body.endTime;
    if (req.body.venue) updateDoc.venue = req.body.venue;
    if (req.body.type) updateDoc.type = req.body.type;
    if (req.body.linkedWorkoutId !== undefined) updateDoc.linkedWorkoutId = req.body.linkedWorkoutId ? new ObjectId(req.body.linkedWorkoutId) : null;
    if (req.body.status) updateDoc.status = req.body.status;

    const result = await db.collection('sessions').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    if (!result) throw new NotFoundError('Session');

    res.json({
      status: 'success',
      data: { ...result, id: result._id.toString(), clubId: result.clubId.toString(), linkedWorkoutId: result.linkedWorkoutId?.toString(), createdBy: result.createdBy.toString() },
    });
  })
);

/**
 * POST /attendance/scan
 * Scan QR code for attendance
 */
router.post('/scan',
  requirePermission('attendance:write'),
  validate(qrScanSchema),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const { token } = req.body;

    // Validate token from Redis
    // const sessionData = await redis.get(`qr_token:${token}`);
    // For now, parse token directly (in production, validate from Redis)
    const sessionId = token; // Simplified - would decode JWT or lookup in Redis

    const session = await db.collection('sessions').findOne({ _id: new ObjectId(sessionId) });
    if (!session) throw new NotFoundError('Invalid or expired QR code');

    // Check if session is active
    const now = new Date();
    const sessionDate = new Date(session.date);
    sessionDate.setHours(parseInt(session.startTime.split(':')[0]), parseInt(session.startTime.split(':')[1]));

    if (session.status === 'cancelled') {
      throw new ForbiddenError('Session is cancelled');
    }

    // Record attendance
    const attendanceRecord = {
      clubId: session.clubId,
      sessionId: session._id,
      athleteId: new ObjectId(req.user!.uid),
      status: 'present' as const,
      method: 'qr' as const,
      markedBy: new ObjectId(req.user!.uid),
      markedAt: new Date(),
    };

    // Upsert attendance record
    await db.collection('attendance_records').updateOne(
      { sessionId: session._id, athleteId: new ObjectId(req.user!.uid) },
      { $set: { ...attendanceRecord, updatedAt: new Date() } },
      { upsert: true }
    );

    res.json({
      status: 'success',
      message: 'Attendance recorded successfully',
      data: { method: 'qr', status: 'present' },
    });
  })
);

/**
 * POST /attendance/manual
 * Manual attendance marking
 */
router.post('/manual',
  requireRole('coach', 'club_admin', 'system_admin'),
  requirePermission('attendance:write'),
  validate(markAttendanceSchema),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const { sessionId } = req.params;
    const { athleteId, status, method, excuseNote, excuseAttachment } = req.body;

    const session = await db.collection('sessions').findOne({ _id: new ObjectId(sessionId) });
    if (!session) throw new NotFoundError('Session');

    const attendanceRecord = {
      clubId: session.clubId,
      sessionId: session._id,
      athleteId: new ObjectId(athleteId),
      status,
      method: method || 'manual',
      markedBy: new ObjectId(req.user!.uid),
      markedAt: new Date(),
      excuseNote,
      excuseAttachment,
    };

    await db.collection('attendance_records').updateOne(
      { sessionId: session._id, athleteId: new ObjectId(athleteId) },
      { $set: { ...attendanceRecord, updatedAt: new Date() } },
      { upsert: true }
    );

    res.json({
      status: 'success',
      message: 'Attendance recorded',
    });
  })
);

/**
 * POST /attendance/bulk
 * Bulk attendance marking
 */
router.post('/bulk',
  requireRole('coach', 'club_admin', 'system_admin'),
  requirePermission('attendance:write'),
  validate(bulkAttendanceSchema),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const { sessionId } = req.params;
    const { records } = req.body;

    const session = await db.collection('sessions').findOne({ _id: new ObjectId(sessionId) });
    if (!session) throw new NotFoundError('Session');

    const operations = records.map((record: any) => ({
      updateOne: {
        filter: { sessionId: session._id, athleteId: new ObjectId(record.athleteId) },
        update: {
          $set: {
            clubId: session.clubId,
            sessionId: session._id,
            athleteId: new ObjectId(record.athleteId),
            status: record.status,
            method: record.method || 'bulk',
            markedBy: new ObjectId(req.user!.uid),
            markedAt: new Date(),
            excuseNote: record.excuseNote,
            excuseAttachment: record.excuseAttachment,
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    await db.collection('attendance_records').bulkWrite(operations);

    res.json({
      status: 'success',
      message: 'Bulk attendance recorded',
      data: { processed: records.length },
    });
  })
);

/**
 * GET /attendance/report
 * Attendance report
 */
router.get('/report',
  requirePermission('attendance:report'),
  validate(reportQuerySchema),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const { from, to, athleteId, groupBy = 'day' } = req.query;
    const clubId = req.clubId;

    const match: any = {
      clubId: new ObjectId(clubId),
      markedAt: { $gte: new Date(from as string), $lte: new Date(to as string) },
    };
    if (athleteId) match.athleteId = new ObjectId(athleteId as string);

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: groupBy === 'athlete' ? '$athleteId' : { $dateToString: { format: '%Y-%m-%d', date: '$markedAt' } },
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          excused: { $sum: { $cond: [{ $in: ['$status', ['excused', 'official_sports_leave']] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const report = await db.collection('attendance_records').aggregate(pipeline).toArray();

    res.json({
      status: 'success',
      data: report,
    });
  })
);

/**
 * GET /attendance/session/:sessionId
 * Get attendance for specific session
 */
router.get('/session/:sessionId',
  validate(attendanceQuerySchema),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const { sessionId } = req.params;
    const { page = 1, limit = 50, status, athleteId } = req.query;

    const session = await db.collection('sessions').findOne({ _id: new ObjectId(sessionId) });
    if (!session) throw new NotFoundError('Session');

    const filter: any = { sessionId: new ObjectId(sessionId) };
    if (status) filter.status = status;
    if (athleteId) filter.athleteId = new ObjectId(athleteId as string);

    const total = await db.collection('attendance_records').countDocuments(filter);
    const records = await db.collection('attendance_records')
      .find(filter)
      .sort({ markedAt: -1 })
      .skip((parseInt(req.query.page as string) - 1) * parseInt(req.query.limit as string) || 0)
      .limit(parseInt(req.query.limit as string) || 50)
      .toArray();

    // Get athlete details
    const athleteIds = records.map(r => r.athleteId);
    const athletes = await db.collection('athletes').find({ _id: { $in: athleteIds } }).toArray();
    const athleteMap = new Map(athletes.map(a => [a._id.toString(), a]));

    const recordsWithAthlete = records.map(r => ({
      ...r,
      id: r._id.toString(),
      athlete: athleteMap.get(r.athleteId.toString()) ? {
        id: athleteMap.get(r.athleteId.toString())!._id.toString(),
        name: `${athleteMap.get(r.athleteId.toString())!.firstName} ${athleteMap.get(r.athleteId.toString())!.lastName}`,
        email: athleteMap.get(r.athleteId.toString())!.email,
      } : null,
    }));

    res.json({
      status: 'success',
      data: recordsWithAthlete,
      meta: { page: parseInt(req.query.page as string) || 1, limit: parseInt(req.query.limit as string) || 50, total, totalPages: Math.ceil(total / (parseInt(req.query.limit as string) || 50)) },
      session: { id: session._id.toString(), date: session.date, venue: session.venue, type: session.type },
    });
  })
);

/**
 * Helper function to generate QR token
 */
function generateQRToken(sessionId: string): string {
  // In production, create a signed JWT with sessionId and expiry
  return `qr_${sessionId}_${Date.now()}`;
}

export default router;
