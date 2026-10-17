import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { getDatabase } from '../config/database';
import { asyncHandler } from '../middleware/error-handler';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { ForbiddenError, NotFoundError } from '../utils/errors';

const router = Router();
const id = z.string().regex(/^[0-9a-fA-F]{24}$/);
const injuryBody = z.object({ athleteId: id.optional(), type: z.string().trim().min(2).max(100), bodyPart: z.string().trim().min(2).max(60), laterality: z.enum(['left', 'right', 'bilateral', 'not_applicable']), onsetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), mechanism: z.string().max(1200).optional(), severity: z.number().int().min(1).max(3), diagnosisSource: z.enum(['self', 'coach', 'physio', 'doctor', 'other']).default('self'), diagnosis: z.string().max(1200).optional(), expectedReturnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), restrictions: z.array(z.string().max(160)).max(30).default([]), notes: z.string().max(2000).optional() });
const createSchema = z.object({ body: injuryBody });
const wellnessSchema = z.object({ params: z.object({ id }), body: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), pain: z.number().int().min(0).max(10), fatigue: z.number().int().min(0).max(10), sleepHours: z.number().min(0).max(24).optional(), note: z.string().max(500).optional() }) });
const rehabSchema = z.object({ params: z.object({ id }), body: z.object({ name: z.string().trim().min(2).max(100), instructions: z.string().max(1000).optional(), dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }) });
const rtpSchema = z.object({ params: z.object({ id }), body: z.object({ status: z.enum(['active', 'rehabilitating', 'returning', 'resolved']), phase: z.string().max(100).optional(), expectedReturnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), actualReturnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), clearanceNote: z.string().max(1000).optional() }) });
const serialize = (doc: any, includePrivate = true) => ({ id: doc._id.toString(), clubId: doc.clubId.toString(), athleteId: doc.athleteId.toString(), type: doc.type, bodyPart: doc.bodyPart, laterality: doc.laterality, onsetDate: doc.onsetDate, mechanism: includePrivate ? doc.mechanism || '' : undefined, severity: doc.severity, diagnosisSource: doc.diagnosisSource, diagnosis: includePrivate ? doc.diagnosis || '' : undefined, status: doc.status, expectedReturnDate: doc.expectedReturnDate || null, actualReturnDate: doc.actualReturnDate || null, restrictions: doc.restrictions || [], rehabPlan: doc.rehabPlan || [], createdAt: doc.createdAt?.toISOString?.(), updatedAt: doc.updatedAt?.toISOString?.() });

async function findAthlete(req: any, requestedId?: string) {
  const db = getDatabase(); const clubId = new ObjectId(req.clubId);
  if (req.user.role === 'athlete') {
    const user = await db.collection('users').findOne({ firebaseUid: req.user.uid, status: 'active' });
    if (!user) throw new ForbiddenError('Your account is not active');
    const athlete = await db.collection('athletes').findOne({ clubId, userId: user._id, status: 'active' });
    if (!athlete) throw new NotFoundError('Athlete profile linked to your account');
    if (requestedId && athlete._id.toString() !== requestedId) throw new ForbiddenError('You can only access your own injury records');
    return athlete;
  }
  if (!requestedId || !id.safeParse(requestedId).success) throw new NotFoundError('Athlete');
  const athlete = await db.collection('athletes').findOne({ _id: new ObjectId(requestedId), clubId, status: { $nin: ['inactive', 'transferred', 'alumni'] } });
  if (!athlete) throw new NotFoundError('Active athlete in this club');
  return athlete;
}

async function findInjury(injuryId: string, req: any) {
  if (!id.safeParse(injuryId).success) throw new NotFoundError('Injury');
  const injury = await getDatabase().collection('injuries').findOne({ _id: new ObjectId(injuryId), clubId: new ObjectId(req.clubId) });
  if (!injury) throw new NotFoundError('Injury');
  if (req.user.role === 'athlete') await findAthlete(req, injury.athleteId.toString());
  return injury;
}

router.get('/', requirePermission('injury:read'), asyncHandler(async (req, res) => {
  const clubId = new ObjectId(req.clubId); const filter: Record<string, any> = { clubId };
  if (req.user!.role === 'athlete') { const athlete = await findAthlete(req); filter.athleteId = athlete._id; }
  if (typeof req.query.status === 'string') filter.status = req.query.status;
  const rows = await getDatabase().collection('injuries').find(filter).sort({ onsetDate: -1 }).limit(200).toArray();
  res.json({ status: 'success', data: rows.map(row => serialize(row, req.user!.role !== 'athlete')) });
}));

router.post('/', requirePermission('injury:write', 'injury:write:own'), validate(createSchema), asyncHandler(async (req, res) => {
  const input = createSchema.shape.body.parse(req.body); const athlete = await findAthlete(req, req.user!.role === 'athlete' ? undefined : input.athleteId); const now = new Date();
  const doc = { _id: new ObjectId(), clubId: new ObjectId(req.clubId), athleteId: athlete._id, type: input.type, bodyPart: input.bodyPart, laterality: input.laterality, onsetDate: input.onsetDate, mechanism: req.user!.role === 'athlete' ? undefined : input.mechanism, severity: input.severity, diagnosisSource: req.user!.role === 'athlete' ? 'self' : input.diagnosisSource, diagnosis: req.user!.role === 'athlete' ? undefined : input.diagnosis, expectedReturnDate: input.expectedReturnDate || null, restrictions: input.restrictions, notes: req.user!.role === 'athlete' ? undefined : input.notes, status: 'active', rehabPlan: [], createdBy: req.user!.uid, createdAt: now, updatedAt: now };
  await getDatabase().collection('injuries').insertOne(doc); res.status(201).json({ status: 'success', data: serialize(doc, req.user!.role !== 'athlete') });
}));

router.get('/:id', requirePermission('injury:read'), asyncHandler(async (req, res) => { const row = await findInjury(req.params.id, req); res.json({ status: 'success', data: serialize(row, req.user!.role !== 'athlete') }); }));

router.post('/:id/wellness', requirePermission('injury:write', 'injury:write:own'), validate(wellnessSchema), asyncHandler(async (req, res) => {
  const injury = await findInjury(req.params.id, req); const input = wellnessSchema.shape.body.parse(req.body); const now = new Date();
  const row = { _id: new ObjectId(), clubId: new ObjectId(req.clubId), injuryId: injury._id, athleteId: injury.athleteId, ...input, createdBy: req.user!.uid, createdAt: now };
  await getDatabase().collection('injury_wellness').insertOne(row); res.status(201).json({ status: 'success', data: { ...row, id: row._id.toString(), createdAt: row.createdAt.toISOString() } });
}));

router.get('/:id/wellness', requirePermission('injury:read'), asyncHandler(async (req, res) => {
  const injury = await findInjury(req.params.id, req); const rows = await getDatabase().collection('injury_wellness').find({ clubId: new ObjectId(req.clubId), injuryId: injury._id }).sort({ date: -1 }).limit(120).toArray();
  res.json({ status: 'success', data: rows.map(row => ({ id: row._id.toString(), date: row.date, pain: row.pain, fatigue: row.fatigue, sleepHours: row.sleepHours, note: row.note || '' })) });
}));

router.post('/:id/rehab', requirePermission('injury:write'), validate(rehabSchema), asyncHandler(async (req, res) => {
  const injury = await findInjury(req.params.id, req); const task = { _id: new ObjectId(), ...rehabSchema.shape.body.parse(req.body), done: false, createdAt: new Date(), createdBy: req.user!.uid };
  await getDatabase().collection('injuries').updateOne({ _id: injury._id, clubId: new ObjectId(req.clubId) }, { $push: { rehabPlan: task } as any, $set: { status: 'rehabilitating', updatedAt: new Date() } });
  res.status(201).json({ status: 'success', data: { id: task._id.toString(), name: task.name, instructions: task.instructions, dueDate: task.dueDate || null, done: false } });
}));

router.patch('/:id/rtp', requirePermission('injury:rtp'), validate(rtpSchema), asyncHandler(async (req, res) => {
  const injury = await findInjury(req.params.id, req); const input = rtpSchema.shape.body.parse(req.body);
  const result = await getDatabase().collection('injuries').findOneAndUpdate({ _id: injury._id, clubId: new ObjectId(req.clubId) }, { $set: { status: input.status, phase: input.phase || null, expectedReturnDate: input.expectedReturnDate || null, actualReturnDate: input.actualReturnDate || null, clearanceNote: input.clearanceNote || null, updatedAt: new Date() } }, { returnDocument: 'after' });
  res.json({ status: 'success', data: serialize(result, true) });
}));

export default router;
