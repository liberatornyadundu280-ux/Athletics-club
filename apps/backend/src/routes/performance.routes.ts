// apps/backend/src/routes/performance.routes.ts
// Performance tracking routes

import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { asyncHandler } from '../middleware/error-handler';
import { requireRole, requirePermission } from '../middleware/rbac.middleware';
import { z } from 'zod';
import { getDatabase } from '../config/database';
import { NotFoundError } from '../utils/errors';

const router = Router();

// ==================== ZOD SCHEMAS ====================
const createCompetitionSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(200),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    venue: z.string().min(2).max(200),
    level: z.enum(['club', 'district', 'state', 'national', 'international']),
    events: z.array(z.object({
      name: z.string(),
      type: z.enum(['sprint', 'distance', 'jump', 'throw', 'combined']),
      gender: z.enum(['male', 'female', 'mixed']),
      ageGroup: z.string(),
    })).optional(),
  }),
});

const createResultSchema = z.object({
  body: z.object({
    athleteId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    competitionId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    event: z.string(),
    round: z.string(),
    result: z.string(),
    wind: z.number().optional(),
    position: z.number().int().optional(),
  }),
});

const createFitnessTestSchema = z.object({
  body: z.object({
    athleteId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    testType: z.enum(['30m_fly', 'standing_long_jump', 'medicine_ball_throw', 'yo_yo_ir1', '300m_run', 'vertical_jump', 'broad_jump', 'custom']),
    value: z.number(),
    unit: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    percentile: z.number().int().min(0).max(100).optional(),
    notes: z.string().optional(),
  }),
});

const createGoalSchema = z.object({
  body: z.object({
    athleteId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    event: z.string(),
    targetValue: z.string(),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    coachNotes: z.string().optional(),
  }),
});

const updateGoalSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    targetValue: z.string().optional(),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    status: z.enum(['active', 'achieved', 'missed', 'archived']).optional(),
    coachNotes: z.string().optional(),
  }),
});

// ==================== ROUTES ====================

/**
 * POST /competitions
 * Create competition
 */
router.post('/competitions',
  requireRole('coach', 'club_admin', 'system_admin'),
  requirePermission('performance:write'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const now = new Date();

    const competitionDoc = {
      ...req.body,
      clubId: new ObjectId(req.clubId),
      date: new Date(req.body.date),
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('competitions').insertOne(competitionDoc);

    res.status(201).json({
      status: 'success',
      data: { id: result.insertedId.toString(), ...competitionDoc, clubId: competitionDoc.clubId.toString() },
    });
  })
);

/**
 * GET /competitions
 * List competitions
 */
router.get('/competitions',
  requirePermission('performance:read'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const clubId = req.clubId;
    const { page = 1, limit = 20 } = req.query;

    const total = await db.collection('competitions').countDocuments({ clubId: new ObjectId(clubId) });
    const competitions = await db.collection('competitions')
      .find({ clubId: new ObjectId(clubId) })
      .sort({ date: -1 })
      .skip((parseInt(req.query.page as string) - 1) * parseInt(req.query.limit as string))
      .limit(parseInt(req.query.limit as string) || 20)
      .toArray();

    res.json({
      status: 'success',
      data: competitions.map(c => ({ ...c, id: c._id.toString(), clubId: c.clubId.toString() })),
      meta: { page: parseInt(req.query.page as string) || 1, limit: parseInt(req.query.limit as string) || 20, total, totalPages: Math.ceil(total / parseInt(req.query.limit as string) || 20) },
    });
  })
);

/**
 * GET /competitions/:id
 * Get competition details
 */
router.get('/competitions/:id',
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const competition = await db.collection('competitions').findOne({ _id: new ObjectId(req.params.id) });
    if (!competition) throw new NotFoundError('Competition');

    res.json({
      status: 'success',
      data: { ...competition, id: competition._id.toString(), clubId: competition.clubId.toString() },
    });
  })
);

/**
 * POST /results
 * Create competition result
 */
router.post('/results',
  requireRole('coach', 'club_admin', 'system_admin'),
  requirePermission('performance:write'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const now = new Date();

    // Auto-detect PB/SB
    const existingResults = await db.collection('results').find({
      athleteId: new ObjectId(req.body.athleteId),
      event: req.body.event,
    }).toArray();

    const pbResult = existingResults.find(r => r.result === req.body.result || 
      (parseFloat(r.result) > parseFloat(req.body.result) && ['100m', '200m', '400m', '800m', '1500m', '5000m', '10000m'].includes(req.body.event)));
    const sbResult = existingResults.find(r => r.result === req.body.result || 
      (parseFloat(r.result) > parseFloat(req.body.result) && ['100m', '200m', '400m', '800m', '1500m', '5000m', '10000m'].includes(req.body.event)));

    const resultDoc = {
      ...req.body,
      clubId: new ObjectId(req.clubId),
      athleteId: new ObjectId(req.body.athleteId),
      competitionId: new ObjectId(req.body.competitionId),
      isPB: false, // Logic would be more complex in production
      isSB: false,
      createdAt: now,
    };

    const result = await db.collection('results').insertOne(resultDoc);

    res.status(201).json({
      status: 'success',
      data: { id: result.insertedId.toString(), ...resultDoc, athleteId: resultDoc.athleteId.toString(), competitionId: resultDoc.competitionId.toString() },
    });
  })
);

/**
 * GET /results
 * List results with filters
 */
router.get('/results',
  requirePermission('performance:read'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const clubId = req.clubId;
    const { page = 1, limit = 20, athleteId, competitionId, event } = req.query;

    const filter: any = { clubId: new ObjectId(clubId) };
    if (athleteId) filter.athleteId = new ObjectId(athleteId as string);
    if (competitionId) filter.competitionId = new ObjectId(competitionId as string);
    if (event) filter.event = event as string;

    const total = await db.collection('results').countDocuments(filter);
    const results = await db.collection('results')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(req.query.page as string) - 1) * parseInt(req.query.limit as string))
      .limit(parseInt(req.query.limit as string) || 20)
      .toArray();

    res.json({
      status: 'success',
      data: results.map(r => ({ ...r, id: r._id.toString(), athleteId: r.athleteId.toString(), competitionId: r.competitionId.toString() })),
      meta: { page: parseInt(req.query.page as string) || 1, limit: parseInt(req.query.limit as string) || 20, total, totalPages: Math.ceil(total / parseInt(req.query.limit as string) || 20) },
    });
  })
);

/**
 * POST /fitness-tests
 * Create fitness test
 */
router.post('/fitness-tests',
  requireRole('coach', 'club_admin', 'system_admin'),
  requirePermission('performance:write'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const now = new Date();

    const testDoc = {
      ...req.body,
      clubId: new ObjectId(req.clubId),
      athleteId: new ObjectId(req.body.athleteId),
      date: new Date(req.body.date),
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('fitness_tests').insertOne(testDoc);

    res.status(201).json({
      status: 'success',
      data: { id: result.insertedId.toString(), ...testDoc, athleteId: testDoc.athleteId.toString(), clubId: testDoc.clubId.toString() },
    });
  })
);

/**
 * GET /fitness-tests
 * List fitness tests
 */
router.get('/fitness-tests',
  requirePermission('performance:read'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const clubId = req.clubId;
    const { page = 1, limit = 20, athleteId, testType } = req.query;

    const filter: any = { clubId: new ObjectId(clubId) };
    if (athleteId) filter.athleteId = new ObjectId(athleteId as string);
    if (testType) filter.testType = testType;

    const total = await db.collection('fitness_tests').countDocuments(filter);
    const tests = await db.collection('fitness_tests')
      .find(filter)
      .sort({ date: -1 })
      .skip((parseInt(req.query.page as string) - 1) * parseInt(req.query.limit as string))
      .limit(parseInt(req.query.limit as string) || 20)
      .toArray();

    res.json({
      status: 'success',
      data: tests.map(t => ({ ...t, id: t._id.toString(), athleteId: t.athleteId.toString(), clubId: t.clubId.toString() })),
      meta: { page: parseInt(req.query.page as string) || 1, limit: parseInt(req.query.limit as string) || 20, total, totalPages: Math.ceil(total / parseInt(req.query.limit as string) || 20) },
    });
  })
);

/**
 * POST /goals
 * Create goal
 */
router.post('/goals',
  requirePermission('performance:write'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const now = new Date();

    const goalDoc = {
      ...req.body,
      clubId: new ObjectId(req.clubId),
      athleteId: new ObjectId(req.body.athleteId),
      targetDate: new Date(req.body.targetDate),
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('goals').insertOne(goalDoc);

    res.status(201).json({
      status: 'success',
      data: { id: result.insertedId.toString(), ...goalDoc, athleteId: goalDoc.athleteId.toString(), clubId: goalDoc.clubId.toString() },
    });
  })
);

/**
 * GET /goals
 * List goals
 */
router.get('/goals',
  requirePermission('performance:read'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const clubId = req.clubId;
    const { page = 1, limit = 20, athleteId, status } = req.query;

    const filter: any = { clubId: new ObjectId(clubId) };
    if (athleteId) filter.athleteId = new ObjectId(athleteId as string);
    if (status) filter.status = status;

    const total = await db.collection('goals').countDocuments(filter);
    const goals = await db.collection('goals')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(req.query.page as string) - 1) * parseInt(req.query.limit as string))
      .limit(parseInt(req.query.limit as string) || 20)
      .toArray();

    res.json({
      status: 'success',
      data: goals.map(g => ({ ...g, id: g._id.toString(), athleteId: g.athleteId.toString(), clubId: g.clubId.toString() })),
      meta: { page: parseInt(req.query.page as string) || 1, limit: parseInt(req.query.limit as string) || 20, total, totalPages: Math.ceil(total / parseInt(req.query.limit as string) || 20) },
    });
  })
);

/**
 * PATCH /goals/:id
 * Update goal
 */
router.patch('/goals/:id',
  requirePermission('performance:write'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const { id } = req.params;

    const updateDoc: any = { updatedAt: new Date() };
    if (req.body.targetValue) updateDoc.targetValue = req.body.targetValue;
    if (req.body.targetDate) updateDoc.targetDate = new Date(req.body.targetDate);
    if (req.body.status) updateDoc.status = req.body.status;
    if (req.body.coachNotes) updateDoc.coachNotes = req.body.coachNotes;

    const result = await db.collection('goals').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    if (!result) throw new NotFoundError('Goal');

    res.json({
      status: 'success',
      data: { ...result, id: result._id.toString(), athleteId: result.athleteId.toString(), clubId: result.clubId.toString() },
    });
  })
);

export default router;
