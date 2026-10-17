import { createHash, randomBytes } from 'crypto';
import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { getDatabase } from '../config/database';
import { asyncHandler } from '../middleware/error-handler';
import { authenticate } from '../middleware/auth.middleware';
import { injectClubId } from '../middleware/club.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';

const router = Router();
export const publicRouter = Router();
const id = z.string().regex(/^[0-9a-fA-F]{24}$/);
const letterTypes = ['hod', 'faculty', 'hostel', 'competition', 'travel', 'attendance', 'medical_leave', 'training_camp'] as const;
const eventSchema = z.object({ body: z.object({ name: z.string().trim().min(2).max(160), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), venue: z.string().max(180).optional(), type: z.enum(['competition', 'training_camp', 'travel', 'other']).default('competition'), description: z.string().max(2000).optional() }) });
const generateSchema = z.object({ params: z.object({ id }), body: z.object({ athleteIds: z.array(id).min(1).max(250), types: z.array(z.enum(letterTypes)).min(1).max(8) }) });
const approvalSchema = z.object({ params: z.object({ id }), body: z.object({ decision: z.enum(['approved', 'rejected']), note: z.string().max(1000).optional() }) });
const escape = (value: unknown) => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const format = (doc: any) => ({ ...doc, id: doc._id.toString(), clubId: doc.clubId.toString(), eventId: doc.eventId?.toString?.() || null, athleteId: doc.athleteId?.toString?.() || null, createdAt: doc.createdAt?.toISOString?.(), updatedAt: doc.updatedAt?.toISOString?.(), verificationHash: undefined });

async function ownAthlete(req: any) {
  const user = await getDatabase().collection('users').findOne({ firebaseUid: req.user.uid, status: 'active' });
  if (!user) throw new ForbiddenError('Your account is not active');
  const athlete = await getDatabase().collection('athletes').findOne({ clubId: new ObjectId(req.clubId), userId: user._id, status: 'active' });
  if (!athlete) throw new NotFoundError('Athlete profile linked to your account');
  return athlete;
}
async function findLetter(letterId: string, req: any) {
  if (!id.safeParse(letterId).success) throw new NotFoundError('Permission letter');
  const letter = await getDatabase().collection('permission_letters').findOne({ _id: new ObjectId(letterId), clubId: new ObjectId(req.clubId) });
  if (!letter) throw new NotFoundError('Permission letter');
  if (req.user.role === 'athlete') { const athlete = await ownAthlete(req); if (letter.athleteId.toString() !== athlete._id.toString()) throw new ForbiddenError('You can only view your own permission letters'); }
  return letter;
}

router.use(authenticate, injectClubId);
router.get('/events', requirePermission('permission:read'), asyncHandler(async (req, res) => {
  const rows = await getDatabase().collection('permission_events').find({ clubId: new ObjectId(req.clubId) }).sort({ date: -1 }).limit(100).toArray();
  res.json({ status: 'success', data: rows.map(format) });
}));
router.post('/events', requirePermission('permission:write'), validate(eventSchema), asyncHandler(async (req, res) => {
  const input = eventSchema.shape.body.parse(req.body); const now = new Date();
  const doc = { _id: new ObjectId(), clubId: new ObjectId(req.clubId), ...input, status: 'active', createdBy: req.user!.uid, createdAt: now, updatedAt: now };
  await getDatabase().collection('permission_events').insertOne(doc); res.status(201).json({ status: 'success', data: format(doc) });
}));

router.post('/events/:id/letters', requirePermission('permission:write'), validate(generateSchema), asyncHandler(async (req, res) => {
  const { athleteIds, types } = generateSchema.shape.body.parse(req.body); const clubId = new ObjectId(req.clubId); const db = getDatabase();
  const event = await db.collection('permission_events').findOne({ _id: new ObjectId(req.params.id), clubId, status: 'active' });
  if (!event) throw new NotFoundError('Active permission event');
  const ids = [...new Set(athleteIds)].map(value => new ObjectId(value));
  const athletes = await db.collection('athletes').find({ _id: { $in: ids }, clubId, status: { $nin: ['inactive', 'transferred', 'alumni'] } }).toArray();
  if (athletes.length !== ids.length) throw new NotFoundError('One or more athletes in this club');
  const now = new Date(); const docs: any[] = [];
  for (const athlete of athletes) for (const type of new Set(types)) {
    const token = randomBytes(32).toString('base64url');
    const content = [
      `${type.replace('_', ' ').toUpperCase()} REQUEST`, `Athlete: ${escape(`${athlete.firstName} ${athlete.lastName}`)}`, `Email: ${escape(athlete.email)}`,
      `School / grade: ${escape(athlete.school || 'Not recorded')} / ${escape(athlete.grade || 'Not recorded')}`,
      `Event: ${escape(event.name)}`, `Date: ${escape(event.date)}`, `Venue: ${escape(event.venue || 'Not recorded')}`,
      `Emergency contact: ${escape(athlete.emergencyContact?.name || 'Not recorded')} · ${escape(athlete.emergencyContact?.phone || '')}`,
      `Request: ${escape(event.description || `Please grant the athlete permission for ${event.name}.`)}`,
    ].join('\n');
    docs.push({ _id: new ObjectId(), clubId, eventId: event._id, athleteId: athlete._id, templateId: type, content, status: 'draft', verificationHash: createHash('sha256').update(token).digest('hex'), createdBy: req.user!.uid, createdAt: now, updatedAt: now, _verificationToken: token, _athleteName: `${athlete.firstName} ${athlete.lastName}` });
  }
  await db.collection('permission_letters').insertMany(docs.map(({ _verificationToken, _athleteName, ...doc }) => doc));
  const base = (process.env.FRONTEND_URL || req.get('origin') || '').replace(/\/$/, '');
  res.status(201).json({ status: 'success', data: { created: docs.length, letters: docs.map(doc => ({ ...format(doc), athleteName: doc._athleteName, verificationUrl: `${base}/permissions/public/${doc._verificationToken}` })) } });
}));

router.get('/letters', requirePermission('permission:read'), asyncHandler(async (req, res) => {
  const filter: Record<string, any> = { clubId: new ObjectId(req.clubId) };
  if (req.user!.role === 'athlete') filter.athleteId = (await ownAthlete(req))._id;
  const rows = await getDatabase().collection('permission_letters').find(filter).sort({ createdAt: -1 }).limit(250).toArray();
  const athleteIds = [...new Set(rows.map(row => row.athleteId.toString()))].map(value => new ObjectId(value));
  const athletes = await getDatabase().collection('athletes').find({ _id: { $in: athleteIds }, clubId: new ObjectId(req.clubId) }).project({ firstName: 1, lastName: 1 }).toArray();
  const names = new Map(athletes.map(athlete => [athlete._id.toString(), `${athlete.firstName} ${athlete.lastName}`]));
  res.json({ status: 'success', data: rows.map(row => ({ ...format(row), athleteName: names.get(row.athleteId.toString()) || 'Athlete' })) });
}));

router.post('/letters/:id/submit', requirePermission('permission:write', 'permission:write:own'), asyncHandler(async (req, res) => {
  const letter = await findLetter(req.params.id, req);
  if (letter.status !== 'draft' && letter.status !== 'rejected') throw new ConflictError('Only draft or rejected letters can be submitted');
  const updated = await getDatabase().collection('permission_letters').findOneAndUpdate({ _id: letter._id, clubId: new ObjectId(req.clubId) }, { $set: { status: 'submitted', submittedAt: new Date(), updatedAt: new Date() }, $unset: { approvalNote: '' } }, { returnDocument: 'after' });
  res.json({ status: 'success', data: format(updated) });
}));

router.post('/letters/:id/approve', requirePermission('permission:approve'), validate(approvalSchema), asyncHandler(async (req, res) => {
  const letter = await findLetter(req.params.id, req); if (letter.status !== 'submitted') throw new ConflictError('Only submitted letters can be reviewed');
  const { decision, note } = approvalSchema.shape.body.parse(req.body); const now = new Date();
  const updated = await getDatabase().collection('permission_letters').findOneAndUpdate({ _id: letter._id, clubId: new ObjectId(req.clubId), status: 'submitted' }, { $set: { status: decision, approvalNote: note || null, reviewedBy: req.user!.uid, reviewedAt: now, updatedAt: now } }, { returnDocument: 'after' });
  res.json({ status: 'success', data: format(updated) });
}));

publicRouter.get('/:token', asyncHandler(async (req, res) => {
  const hash = createHash('sha256').update(req.params.token).digest('hex');
  const letter = await getDatabase().collection('permission_letters').findOne({ verificationHash: hash });
  if (!letter) throw new NotFoundError('Verified permission letter');
  const event = await getDatabase().collection('permission_events').findOne({ _id: letter.eventId, clubId: letter.clubId });
  res.json({ status: 'success', data: { status: letter.status, type: letter.templateId, event: event?.name || 'Event', date: event?.date || null } });
}));

export default router;
