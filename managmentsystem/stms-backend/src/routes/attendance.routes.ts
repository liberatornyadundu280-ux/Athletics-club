import { createHash, randomBytes } from 'crypto';
import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { env } from '../config/env';
import { getDatabase } from '../config/database';
import { asyncHandler } from '../middleware/error-handler';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';

const router = Router();
const id = z.string().regex(/^[0-9a-fA-F]{24}$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const sessionTypes = ['training', 'competition', 'meeting', 'testing'] as const;
const sessionStates = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const;
const attendanceStates = ['present', 'late', 'absent', 'excused'] as const;
const sessionBody = z.object({
  title: z.string().trim().min(2).max(120), date, startTime: z.string().regex(/^\d{2}:\d{2}$/), endTime: z.string().regex(/^\d{2}:\d{2}$/),
  venue: z.string().trim().min(1).max(160), type: z.enum(sessionTypes).default('training'), linkedWorkoutId: id.nullable().optional(), notes: z.string().max(2000).optional(),
});
const newSessionSchema = z.object({ body: sessionBody });
const patchSessionSchema = z.object({ params: z.object({ id }), body: sessionBody.partial().extend({ status: z.enum(sessionStates).optional() }) });
const listSchema = z.object({ query: z.object({ from: date.optional(), to: date.optional(), status: z.enum(sessionStates).optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25) }) });
const attendanceSchema = z.object({ body: z.object({ records: z.array(z.object({ athleteId: id, status: z.enum(attendanceStates), note: z.string().max(500).optional() })).min(1).max(250) }) });
const qrSchema = z.object({ params: z.object({ id }), body: z.object({ expiresInMinutes: z.number().int().min(1).max(60).default(15) }) });
const qrCheckinSchema = z.object({ params: z.object({ token: z.string().min(32).max(128) }) });

function serializeSession(value: any) {
  return { ...value, id: value._id.toString(), clubId: value.clubId.toString(), createdBy: value.createdBy?.toString() || null, createdAt: value.createdAt?.toISOString?.(), updatedAt: value.updatedAt?.toISOString?.() };
}

function toIso(value: Date | undefined) { return value?.toISOString?.() || null; }

async function findSession(sessionId: string, clubId: string) {
  if (!id.safeParse(sessionId).success) throw new NotFoundError('Training session');
  const session = await getDatabase().collection('training_sessions').findOne({ _id: new ObjectId(sessionId), clubId: new ObjectId(clubId) });
  if (!session) throw new NotFoundError('Training session');
  return session;
}

router.get('/sessions', requirePermission('attendance:read'), validate(listSchema), asyncHandler(async (req, res) => {
  const { from, to, status, page, limit } = listSchema.shape.query.parse(req.query);
  const filter: Record<string, any> = { clubId: new ObjectId(req.clubId) };
  if (status) filter.status = status;
  if (from || to) filter.date = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  const collection = getDatabase().collection('training_sessions');
  const [total, rows] = await Promise.all([collection.countDocuments(filter), collection.find(filter).sort({ date: -1, startTime: 1 }).skip((page - 1) * limit).limit(limit).toArray()]);
  res.json({ status: 'success', data: rows.map(serializeSession), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

router.post('/sessions', requirePermission('attendance:write'), validate(newSessionSchema), asyncHandler(async (req, res) => {
  const input = newSessionSchema.shape.body.parse(req.body);
  if (input.endTime <= input.startTime) throw new ConflictError('End time must be after start time');
  const now = new Date();
  const doc = { _id: new ObjectId(), clubId: new ObjectId(req.clubId), ...input, status: 'scheduled', createdBy: req.user!.uid, createdAt: now, updatedAt: now };
  const result = await getDatabase().collection('training_sessions').insertOne(doc);
  res.status(201).json({ status: 'success', data: serializeSession({ ...doc, _id: result.insertedId }) });
}));

router.get('/sessions/:id', requirePermission('attendance:read'), asyncHandler(async (req, res) => {
  if (!id.safeParse(req.params.id).success) throw new NotFoundError('Training session');
  const session = await findSession(req.params.id, req.clubId);
  const records = await getDatabase().collection('attendance_records').find({ clubId: new ObjectId(req.clubId), sessionId: session._id }).sort({ updatedAt: -1 }).toArray();
  const athleteIds = records.map(record => record.athleteId);
  const athletes = await getDatabase().collection('athletes').find({ _id: { $in: athleteIds }, clubId: new ObjectId(req.clubId) }).project({ firstName: 1, lastName: 1, email: 1 }).toArray();
  const names = new Map(athletes.map(athlete => [athlete._id.toString(), athlete]));
  res.json({ status: 'success', data: { session: serializeSession(session), attendance: records.map(record => ({ id: record._id.toString(), athleteId: record.athleteId.toString(), athlete: names.get(record.athleteId.toString()) || null, status: record.status, method: record.method, note: record.note || null, markedAt: toIso(record.markedAt) })) } });
}));

router.patch('/sessions/:id', requirePermission('attendance:write'), validate(patchSessionSchema), asyncHandler(async (req, res) => {
  const input = patchSessionSchema.shape.body.parse(req.body);
  const collection = getDatabase().collection('training_sessions');
  const existing = await findSession(req.params.id, req.clubId);
  if (input.startTime && input.endTime && input.endTime <= input.startTime) throw new ConflictError('End time must be after start time');
  const updated = await collection.findOneAndUpdate({ _id: existing._id, clubId: new ObjectId(req.clubId) }, { $set: { ...input, updatedAt: new Date() } }, { returnDocument: 'after' });
  if (input.status === 'completed') {
    const db = getDatabase();
    const athletes = await db.collection('athletes').find({ clubId: new ObjectId(req.clubId), status: { $nin: ['inactive', 'transferred', 'alumni'] } }).project({ _id: 1 }).toArray();
    const now = new Date();
    if (athletes.length) await db.collection('attendance_records').bulkWrite(athletes.map(athlete => ({ updateOne: {
      filter: { clubId: new ObjectId(req.clubId), sessionId: existing._id, athleteId: athlete._id },
      update: { $setOnInsert: { _id: new ObjectId(), status: 'absent', method: 'manual', markedBy: req.user!.uid, markedAt: now, createdAt: now, updatedAt: now } },
      upsert: true,
    } })), { ordered: false });
  }
  res.json({ status: 'success', data: serializeSession(updated) });
}));

router.get('/sessions/:id/records', requirePermission('attendance:read'), asyncHandler(async (req, res) => {
  if (!id.safeParse(req.params.id).success) throw new NotFoundError('Training session');
  const session = await findSession(req.params.id, req.clubId);
  const db = getDatabase();
  const [athletes, records] = await Promise.all([
    db.collection('athletes').find({ clubId: new ObjectId(req.clubId), status: { $nin: ['inactive', 'transferred', 'alumni'] } }).sort({ lastName: 1, firstName: 1 }).project({ firstName: 1, lastName: 1, email: 1 }).toArray(),
    db.collection('attendance_records').find({ clubId: new ObjectId(req.clubId), sessionId: session._id }).toArray(),
  ]);
  const byAthlete = new Map(records.map(record => [record.athleteId.toString(), record]));
  res.json({ status: 'success', data: athletes.map(athlete => { const record = byAthlete.get(athlete._id.toString()); return { athleteId: athlete._id.toString(), name: `${athlete.firstName} ${athlete.lastName}`, email: athlete.email, status: record?.status || null, method: record?.method || null, note: record?.note || null }; }) });
}));

router.post('/sessions/:id/mark', requirePermission('attendance:write'), validate(attendanceSchema), asyncHandler(async (req, res) => {
  const session = await findSession(req.params.id, req.clubId);
  if (session.status === 'cancelled') throw new ConflictError('Attendance cannot be recorded for a cancelled session');
  const { records } = attendanceSchema.shape.body.parse(req.body);
  const clubId = new ObjectId(req.clubId);
  const db = getDatabase();
  const athleteIds = [...new Set(records.map(record => record.athleteId))].map(value => new ObjectId(value));
  const count = await db.collection('athletes').countDocuments({ _id: { $in: athleteIds }, clubId });
  if (count !== athleteIds.length) throw new NotFoundError('One or more athletes in this club');
  const now = new Date();
  const result = await Promise.all(records.map(record => db.collection('attendance_records').updateOne(
    { clubId, sessionId: session._id, athleteId: new ObjectId(record.athleteId) },
    { $set: { status: record.status, note: record.note || null, method: 'manual', markedBy: req.user!.uid, markedAt: now, updatedAt: now }, $setOnInsert: { _id: new ObjectId(), createdAt: now } },
    { upsert: true },
  )));
  res.json({ status: 'success', data: { saved: result.length } });
}));

router.post('/sessions/:id/qr', requirePermission('attendance:write'), validate(qrSchema), asyncHandler(async (req, res) => {
  const session = await findSession(req.params.id, req.clubId);
  if (session.status === 'cancelled' || session.status === 'completed') throw new ConflictError('Check-in is unavailable for this session');
  const { expiresInMinutes } = qrSchema.shape.body.parse(req.body);
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  await getDatabase().collection('attendance_qr_tokens').insertOne({ _id: new ObjectId(), clubId: new ObjectId(req.clubId), sessionId: session._id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt, createdBy: req.user!.uid, createdAt: new Date() });
  const origin = (env.FRONTEND_URL || req.get('origin') || '').replace(/\/$/, '');
  res.status(201).json({ status: 'success', data: { checkInUrl: `${origin}/attendance/check-in/${token}`, expiresAt: expiresAt.toISOString() } });
}));

router.post('/qr/:token/check-in', requirePermission('workout:complete'), validate(qrCheckinSchema), asyncHandler(async (req, res) => {
  const tokenHash = createHash('sha256').update(req.params.token).digest('hex');
  const now = new Date();
  const qr = await getDatabase().collection('attendance_qr_tokens').findOne({ tokenHash, clubId: new ObjectId(req.clubId), expiresAt: { $gt: now } });
  if (!qr) throw new NotFoundError('Valid check-in link');
  const db = getDatabase();
  const user = await db.collection('users').findOne({ firebaseUid: req.user!.uid, status: 'active' });
  if (!user) throw new ForbiddenError('Your account is not active');
  const athlete = await db.collection('athletes').findOne({ userId: user._id, clubId: new ObjectId(req.clubId), status: 'active' });
  if (!athlete) throw new ForbiddenError('An active athlete profile linked to your account is required to check in');
  const session = await db.collection('training_sessions').findOne({ _id: qr.sessionId, clubId: new ObjectId(req.clubId), status: { $in: ['scheduled', 'in_progress'] } });
  if (!session) throw new ConflictError('This session is not accepting check-ins');
  await db.collection('attendance_records').updateOne({ clubId: new ObjectId(req.clubId), sessionId: session._id, athleteId: athlete._id }, { $set: { status: 'present', method: 'qr', markedBy: req.user!.uid, markedAt: now, updatedAt: now }, $setOnInsert: { _id: new ObjectId(), createdAt: now } }, { upsert: true });
  res.json({ status: 'success', data: { checkedIn: true, session: session.title } });
}));

router.get('/reports/summary', requirePermission('attendance:report'), asyncHandler(async (req, res) => {
  const from = typeof req.query.from === 'string' && date.safeParse(req.query.from).success ? req.query.from : '0000-01-01';
  const to = typeof req.query.to === 'string' && date.safeParse(req.query.to).success ? req.query.to : '9999-12-31';
  const clubId = new ObjectId(req.clubId);
  const sessions = await getDatabase().collection('training_sessions').find({ clubId, date: { $gte: from, $lte: to }, status: { $ne: 'cancelled' } }).toArray();
  const sessionIds = sessions.map(session => session._id);
  const counts = await getDatabase().collection('attendance_records').aggregate([
    { $match: { clubId, sessionId: { $in: sessionIds } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]).toArray();
  const byStatus = Object.fromEntries(counts.map(row => [row._id, row.count]));
  const total = Object.values(byStatus).reduce((sum: number, value: any) => sum + value, 0);
  const credit = (byStatus.present || 0) + (byStatus.late || 0) + (byStatus.excused || 0);
  res.json({ status: 'success', data: { from, to, sessionCount: sessions.length, records: total, present: byStatus.present || 0, late: byStatus.late || 0, absent: byStatus.absent || 0, excused: byStatus.excused || 0, attendanceRate: total ? Math.round((credit / total) * 100) : 0 } });
}));

export default router;
