import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { getDatabase } from '../config/database';
import { asyncHandler } from '../middleware/error-handler';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';
import { generateRecommendation } from '../services/recommendation.service';

const router = Router();
const id = z.string().regex(/^[0-9a-fA-F]{24}$/);
const eventName = z.string().trim().min(1).max(80).regex(/^[\p{L}\p{N}][\p{L}\p{N} /_-]*$/u, 'Use letters, numbers, spaces, /, _ or - for an event name');
const competitionSchema = z.object({ body: z.object({ name: z.string().trim().min(2).max(160), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), venue: z.string().max(160).optional(), level: z.enum(['club', 'district', 'state', 'national', 'international']).default('club') }) });
const resultSchema = z.object({ body: z.object({ athleteId: id, competitionId: id.nullable().optional(), event: eventName, round: z.string().max(60).optional(), resultValue: z.number().positive().max(100000), unit: z.enum(['s', 'm', 'cm', 'points', 'reps', 'kg']), wind: z.number().min(-20).max(20).optional(), position: z.number().int().min(1).optional(), meetLevel: z.enum(['club', 'district', 'state', 'national', 'international']).default('club'), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), notes: z.string().max(1000).optional() }) });
const testSchema = z.object({ body: z.object({ athleteId: id, testType: z.string().trim().min(2).max(80), value: z.number().positive().max(100000), unit: z.string().trim().min(1).max(20), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), notes: z.string().max(1000).optional() }) });
const goalSchema = z.object({ body: z.object({ athleteId: id, event: eventName, targetValue: z.number().positive().max(100000), unit: z.enum(['s', 'm', 'cm', 'points', 'reps', 'kg']), targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), coachNotes: z.string().max(1000).optional() }) });
const goalPatchSchema = z.object({ params: z.object({ id }), body: z.object({ status: z.enum(['active', 'completed', 'cancelled']).optional(), coachNotes: z.string().max(1000).optional() }) });
const resultListSchema = z.object({ query: z.object({ athleteId: id.optional(), event: z.string().max(80).optional(), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), limit: z.coerce.number().int().min(1).max(250).default(100) }) });

const serialize = (row: any) => ({ ...row, id: row._id.toString(), clubId: row.clubId.toString(), athleteId: row.athleteId?.toString?.() || null, competitionId: row.competitionId?.toString?.() || null, createdAt: row.createdAt?.toISOString?.(), updatedAt: row.updatedAt?.toISOString?.() });
async function activeAthlete(athleteId: string, clubId: ObjectId) {
  const athlete = await getDatabase().collection('athletes').findOne({ _id: new ObjectId(athleteId), clubId, status: { $nin: ['inactive', 'transferred', 'alumni'] } });
  if (!athlete) throw new NotFoundError('Active athlete in this club');
  return athlete;
}
async function ownAthleteId(uid: string, clubId: ObjectId) {
  const user = await getDatabase().collection('users').findOne({ firebaseUid: uid, status: 'active' });
  if (!user) throw new ForbiddenError('Your account is not active');
  const athlete = await getDatabase().collection('athletes').findOne({ clubId, userId: user._id, status: { $nin: ['inactive', 'transferred', 'alumni'] } });
  return athlete?._id || null;
}

router.get('/competitions', requirePermission('performance:read'), asyncHandler(async (req, res) => {
  const rows = await getDatabase().collection('competitions').find({ clubId: new ObjectId(req.clubId) }).sort({ date: -1 }).limit(200).toArray();
  res.json({ status: 'success', data: rows.map(serialize) });
}));
router.post('/competitions', requirePermission('performance:write'), validate(competitionSchema), asyncHandler(async (req, res) => {
  const input = competitionSchema.shape.body.parse(req.body); const now = new Date();
  const doc = { _id: new ObjectId(), clubId: new ObjectId(req.clubId), ...input, createdBy: req.user!.uid, createdAt: now, updatedAt: now };
  await getDatabase().collection('competitions').insertOne(doc); res.status(201).json({ status: 'success', data: serialize(doc) });
}));

router.get('/results', requirePermission('performance:read'), validate(resultListSchema), asyncHandler(async (req, res) => {
  const query = resultListSchema.shape.query.parse(req.query); const clubId = new ObjectId(req.clubId);
  const athleteId = req.user!.role === 'athlete' ? await ownAthleteId(req.user!.uid, clubId) : (query.athleteId ? new ObjectId(query.athleteId) : null);
  if (req.user!.role === 'athlete' && !athleteId) return res.json({ status: 'success', data: [] });
  const filter: Record<string, any> = { clubId };
  if (athleteId) filter.athleteId = athleteId;
  if (query.event) filter.event = query.event;
  if (query.from || query.to) filter.date = { ...(query.from ? { $gte: query.from } : {}), ...(query.to ? { $lte: query.to } : {}) };
  const rows = await getDatabase().collection('performance_results').find(filter).sort({ date: -1 }).limit(query.limit).toArray();
  const athleteIds = [...new Set(rows.map(row => row.athleteId.toString()))].map(value => new ObjectId(value));
  const athletes = await getDatabase().collection('athletes').find({ _id: { $in: athleteIds }, clubId }).project({ firstName: 1, lastName: 1 }).toArray();
  const names = new Map(athletes.map(row => [row._id.toString(), `${row.firstName} ${row.lastName}`]));
  res.json({ status: 'success', data: rows.map(row => ({ ...serialize(row), athleteName: names.get(row.athleteId.toString()) || 'Athlete' })) });
}));
router.post('/results', requirePermission('performance:write'), validate(resultSchema), asyncHandler(async (req, res) => {
  const input = resultSchema.shape.body.parse(req.body); const clubId = new ObjectId(req.clubId); const db = getDatabase();
  await activeAthlete(input.athleteId, clubId);
  if (input.competitionId && !await db.collection('competitions').findOne({ _id: new ObjectId(input.competitionId), clubId })) throw new NotFoundError('Competition in this club');
  const existing = await db.collection('performance_results').find({ clubId, athleteId: new ObjectId(input.athleteId), event: input.event, unit: input.unit }).toArray();
  const timeBased = input.unit === 's';
  const betterThan = (a: number, b: number) => timeBased ? a < b : a > b;
  const personalBest = !existing.some(row => betterThan(row.resultValue, input.resultValue));
  const seasonKey = `${input.event}:${new Date(`${input.date}T00:00:00Z`).getUTCFullYear()}`;
  const currentSeason = existing.filter(row => row.date?.startsWith(String(new Date(`${input.date}T00:00:00Z`).getUTCFullYear())));
  const seasonBest = !currentSeason.some(row => betterThan(row.resultValue, input.resultValue));
  const now = new Date();
  const doc = { _id: new ObjectId(), clubId, ...input, athleteId: new ObjectId(input.athleteId), competitionId: input.competitionId ? new ObjectId(input.competitionId) : null, isPB: personalBest, isSB: seasonBest, createdBy: req.user!.uid, createdAt: now, updatedAt: now };
  await db.collection('performance_results').insertOne(doc);
  const key = input.event.toLowerCase();
  await db.collection('athletes').updateOne({ _id: new ObjectId(input.athleteId), clubId }, { $set: { ...(personalBest ? { [`personalBest.${key}`]: `${input.resultValue} ${input.unit}` } : {}), ...(seasonBest ? { [`seasonBest.${seasonKey}`]: `${input.resultValue} ${input.unit}` } : {}), updatedAt: now } });
  try { await generateRecommendation(clubId, new ObjectId(input.athleteId), 'performance_result_added', req.user!.uid); }
  catch (error) { console.error('Could not refresh athlete recommendation after performance result', error); }
  res.status(201).json({ status: 'success', data: serialize(doc) });
}));

router.get('/tests', requirePermission('performance:read'), asyncHandler(async (req, res) => {
  const clubId = new ObjectId(req.clubId); const filter: Record<string, any> = { clubId };
  if (req.user!.role === 'athlete') { const athleteId = await ownAthleteId(req.user!.uid, clubId); if (!athleteId) return res.json({ status: 'success', data: [] }); filter.athleteId = athleteId; }
  const rows = await getDatabase().collection('fitness_tests').find(filter).sort({ date: -1 }).limit(250).toArray(); res.json({ status: 'success', data: rows.map(serialize) });
}));
router.post('/tests', requirePermission('performance:write'), validate(testSchema), asyncHandler(async (req, res) => {
  const input = testSchema.shape.body.parse(req.body); const clubId = new ObjectId(req.clubId); await activeAthlete(input.athleteId, clubId);
  const doc = { _id: new ObjectId(), clubId, ...input, athleteId: new ObjectId(input.athleteId), createdBy: req.user!.uid, createdAt: new Date() };
  await getDatabase().collection('fitness_tests').insertOne(doc); res.status(201).json({ status: 'success', data: serialize(doc) });
}));

router.get('/goals', requirePermission('performance:read'), asyncHandler(async (req, res) => {
  const clubId = new ObjectId(req.clubId); const filter: Record<string, any> = { clubId };
  if (req.user!.role === 'athlete') { const athleteId = await ownAthleteId(req.user!.uid, clubId); if (!athleteId) return res.json({ status: 'success', data: [] }); filter.athleteId = athleteId; }
  const rows = await getDatabase().collection('athlete_goals').find(filter).sort({ targetDate: 1 }).limit(250).toArray(); res.json({ status: 'success', data: rows.map(serialize) });
}));
router.post('/goals', requirePermission('performance:write'), validate(goalSchema), asyncHandler(async (req, res) => {
  const input = goalSchema.shape.body.parse(req.body); const clubId = new ObjectId(req.clubId); await activeAthlete(input.athleteId, clubId);
  const now = new Date(); const doc = { _id: new ObjectId(), clubId, ...input, athleteId: new ObjectId(input.athleteId), status: 'active', createdBy: req.user!.uid, createdAt: now, updatedAt: now };
  await getDatabase().collection('athlete_goals').insertOne(doc); res.status(201).json({ status: 'success', data: serialize(doc) });
}));
router.patch('/goals/:id', requirePermission('performance:write'), validate(goalPatchSchema), asyncHandler(async (req, res) => {
  const updated = await getDatabase().collection('athlete_goals').findOneAndUpdate({ _id: new ObjectId(req.params.id), clubId: new ObjectId(req.clubId) }, { $set: { ...goalPatchSchema.shape.body.parse(req.body), updatedAt: new Date() } }, { returnDocument: 'after' });
  if (!updated) throw new NotFoundError('Goal'); res.json({ status: 'success', data: serialize(updated) });
}));

export default router;
