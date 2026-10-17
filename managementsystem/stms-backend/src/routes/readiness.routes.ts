import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { getDatabase } from '../config/database';
import { asyncHandler } from '../middleware/error-handler';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';

const router = Router();
const id = z.string().regex(/^[0-9a-fA-F]{24}$/);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const readinessBody = z.object({
  date: dateSchema,
  soreness: z.number().int().min(1).max(5),
  sleepQuality: z.number().int().min(1).max(5),
  stressEnergy: z.number().int().min(1).max(5),
  notes: z.string().max(500).optional(),
});

const createSchema = z.object({ body: readinessBody });
const updateSchema = z.object({
  params: z.object({ id }),
  body: readinessBody.partial(),
});
const getSchema = z.object({
  params: z.object({ athleteId: id }),
  query: z.object({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  }),
});
const clubSummarySchema = z.object({
  query: z.object({
    date: dateSchema.optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  }),
});

function serialize(doc: any) {
  return {
    id: doc._id.toString(),
    clubId: doc.clubId.toString(),
    athleteId: doc.athleteId.toString(),
    date: doc.date,
    soreness: doc.soreness,
    sleepQuality: doc.sleepQuality,
    stressEnergy: doc.stressEnergy,
    notes: doc.notes || null,
    createdAt: doc.createdAt?.toISOString?.(),
    updatedAt: doc.updatedAt?.toISOString?.(),
  };
}

async function getAthleteId(req: any, requestedId?: string): Promise<ObjectId> {
  const db = getDatabase();
  const clubId = new ObjectId(req.clubId);

  if (req.user.role === 'athlete') {
    const user = await db.collection('users').findOne({ firebaseUid: req.user.uid, status: 'active' });
    if (!user) throw new ForbiddenError('Your account is not active');
    const athlete = await db.collection('athletes').findOne({ clubId, userId: user._id, status: 'active' });
    if (!athlete) throw new NotFoundError('Athlete profile linked to your account');
    if (requestedId && athlete._id.toString() !== requestedId) throw new ForbiddenError('You can only access your own readiness data');
    return athlete._id;
  }

  if (!requestedId || !id.safeParse(requestedId).success) throw new NotFoundError('Athlete');
  const athlete = await db.collection('athletes').findOne({ _id: new ObjectId(requestedId), clubId, status: { $nin: ['inactive', 'transferred', 'alumni'] } });
  if (!athlete) throw new NotFoundError('Active athlete in this club');
  return athlete._id;
}

// POST /api/v1/readiness - Submit daily readiness (athlete or coach)
router.post('/', requirePermission('profile:write', 'athlete:write'), validate(createSchema), asyncHandler(async (req, res) => {
  const input = createSchema.shape.body.parse(req.body);
  const athleteId = await getAthleteId(req);
  const clubId = new ObjectId(req.clubId);
  const now = new Date();

  // Upsert - one entry per athlete per day
  const result = await getDatabase().collection('daily_readiness').findOneAndUpdate(
    { clubId, athleteId, date: input.date },
    {
      $set: {
        soreness: input.soreness,
        sleepQuality: input.sleepQuality,
        stressEnergy: input.stressEnergy,
        notes: input.notes || null,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        clubId,
        athleteId,
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  res.status(201).json({ status: 'success', data: serialize(result) });
}));

// GET /api/v1/readiness/:athleteId - Get readiness history for an athlete
router.get('/:athleteId', requirePermission('athlete:read', 'profile:read'), validate(getSchema), asyncHandler(async (req, res) => {
  const athleteId = await getAthleteId(req, req.params.athleteId);
  const { from, to, limit } = getSchema.shape.query.parse(req.query);
  const clubId = new ObjectId(req.clubId);

  const filter: Record<string, any> = { clubId, athleteId };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }

  const rows = await getDatabase().collection('daily_readiness')
    .find(filter)
    .sort({ date: -1 })
    .limit(limit)
    .toArray();

  res.json({ status: 'success', data: rows.map(serialize) });
}));

// GET /api/v1/readiness/club/summary - Coach dashboard: team readiness for a date
router.get('/club/summary', requirePermission('athlete:read'), validate(clubSummarySchema), asyncHandler(async (req, res) => {
  const { date, limit } = clubSummarySchema.shape.query.parse(req.query);
  const clubId = new ObjectId(req.clubId);
  const targetDate = date || new Date().toISOString().split('T')[0];

  // Get all active athletes in club
  const athletes = await getDatabase().collection('athletes')
    .find({ clubId, status: 'active' })
    .project({ _id: 1, firstName: 1, lastName: 1, eventSpecialization: 1 })
    .limit(limit)
    .toArray();

  const athleteIds = athletes.map(a => a._id);

  // Get readiness for target date
  const readiness = await getDatabase().collection('daily_readiness')
    .find({ clubId, athleteId: { $in: athleteIds }, date: targetDate })
    .toArray();

  const byAthlete = new Map(readiness.map(r => [r.athleteId.toString(), r]));

  res.json({
    status: 'success',
    data: {
      date: targetDate,
      athletes: athletes.map(a => {
        const r = byAthlete.get(a._id.toString());
        return {
          athleteId: a._id.toString(),
          name: `${a.firstName} ${a.lastName}`,
          eventSpecialization: a.eventSpecialization,
          readiness: r ? {
            soreness: r.soreness,
            sleepQuality: r.sleepQuality,
            stressEnergy: r.stressEnergy,
            notes: r.notes,
            submittedAt: r.updatedAt?.toISOString(),
          } : null,
        };
      }),
    },
  });
}));

export default router;