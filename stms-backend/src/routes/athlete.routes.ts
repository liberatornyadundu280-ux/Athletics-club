import { Router } from 'express';
import { ObjectId, type Filter } from 'mongodb';
import { z } from 'zod';
import { getDatabase } from '../config/database';
import { asyncHandler } from '../middleware/error-handler';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import type { AthleteDocument, UserDocument } from '../types';
import { ConflictError, NotFoundError } from '../utils/errors';

const router = Router();
const genders = ['male', 'female', 'other'] as const;
const athleteStatuses = ['active', 'injured', 'inactive', 'transferred', 'alumni'] as const;
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Use a valid date in YYYY-MM-DD format');

const emergencyContactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  relationship: z.string().trim().min(1).max(60),
  phone: z.string().trim().min(3).max(30),
  email: z.union([z.string().email().max(255), z.literal(''), z.null()]).optional(),
}).nullable().optional();

const athleteFields = {
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255).transform(value => value.toLowerCase()),
  phone: z.union([z.string().trim().max(30), z.null()]).optional(),
  dateOfBirth: z.union([dateOnly, z.literal(''), z.null()]).optional(),
  gender: z.enum(genders),
  eventSpecialization: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
  medicalNotes: z.union([z.string().max(2000), z.null()]).optional(),
  emergencyContact: emergencyContactSchema,
  school: z.union([z.string().trim().max(120), z.null()]).optional(),
  grade: z.union([z.string().trim().max(40), z.null()]).optional(),
  status: z.enum(athleteStatuses).default('active'),
};

const createAthleteSchema = z.object({
  params: z.object({}),
  body: z.object(athleteFields),
});

const updateAthleteSchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/) }),
  body: z.object({ ...athleteFields, eventSpecialization: athleteFields.eventSpecialization.optional(), status: z.enum(athleteStatuses).optional() }).partial(),
});

const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    search: z.string().trim().max(100).optional(),
    status: z.enum(athleteStatuses).optional(),
    event: z.string().trim().max(60).optional(),
  }),
});

const idSchema = z.object({ params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/) }) });
const importSchema = z.object({ body: z.object({ rows: z.array(z.unknown()).min(1).max(250) }) });
type AthleteInput = z.infer<typeof createAthleteSchema>['body'];

function formatAthlete(athlete: AthleteDocument) {
  return {
    id: athlete._id.toString(),
    userId: athlete.userId?.toString() || null,
    firstName: athlete.firstName,
    lastName: athlete.lastName,
    email: athlete.email,
    phone: athlete.phone || null,
    dateOfBirth: athlete.dateOfBirth || null,
    gender: athlete.gender,
    eventSpecialization: Array.isArray(athlete.eventSpecialization) ? athlete.eventSpecialization : [],
    personalBest: athlete.personalBest || {},
    seasonBest: athlete.seasonBest || {},
    medicalNotes: athlete.medicalNotes || null,
    emergencyContact: athlete.emergencyContact || null,
    school: athlete.school || null,
    grade: athlete.grade || null,
    status: athlete.status || 'active',
    clubId: athlete.clubId.toString(),
    createdAt: athlete.createdAt?.toISOString?.() || new Date(0).toISOString(),
    updatedAt: athlete.updatedAt?.toISOString?.() || new Date(0).toISOString(),
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findAccountLink(email: string, clubId: ObjectId): Promise<ObjectId | null> {
  const db = getDatabase();
  const user = await db.collection<UserDocument>('users').findOne({ email, status: 'active' });
  if (!user) return null;
  const activeMembership = await db.collection('club_memberships').findOne({ userId: user._id, clubId, status: 'active' });
  return activeMembership ? user._id : null;
}

function normalizeInput(input: Partial<AthleteInput>) {
  return {
    ...input,
    email: input.email?.toLowerCase(),
    phone: input.phone || null,
    dateOfBirth: input.dateOfBirth || null,
    eventSpecialization: input.eventSpecialization || [],
    medicalNotes: input.medicalNotes || null,
    emergencyContact: input.emergencyContact ? { ...input.emergencyContact, email: input.emergencyContact.email || null } : null,
    school: input.school || null,
    grade: input.grade || null,
    updatedAt: new Date(),
  };
}

async function ensureUniqueEmail(email: string, clubId: ObjectId, exceptId?: ObjectId) {
  const filter: Record<string, unknown> = { email, clubId };
  if (exceptId) filter._id = { $ne: exceptId };
  if (await getDatabase().collection('athletes').findOne(filter)) {
    throw new ConflictError('An athlete with this email already exists in the active club');
  }
}

router.get('/', requirePermission('athlete:read'), validate(listSchema), asyncHandler(async (req, res) => {
  const { page, limit, search, status, event } = listSchema.shape.query.parse(req.query);
  const clubId = new ObjectId(req.clubId);
  const filter: Filter<AthleteDocument> = { clubId };
  if (status) filter.status = status;
  else filter.status = { $nin: ['inactive', 'transferred', 'alumni'] };
  if (event) filter.eventSpecialization = event;
  if (search) {
    const expression = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ firstName: expression }, { lastName: expression }, { email: expression }, { school: expression }];
  }

  const db = getDatabase();
  const [total, athletes] = await Promise.all([
    db.collection<AthleteDocument>('athletes').countDocuments(filter),
    db.collection<AthleteDocument>('athletes').find(filter)
      .sort({ lastName: 1, firstName: 1 }).skip((page - 1) * limit).limit(limit).toArray(),
  ]);
  res.json({ status: 'success', data: athletes.map(formatAthlete), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

router.get('/:id', requirePermission('athlete:read'), validate(idSchema), asyncHandler(async (req, res) => {
  const athlete = await getDatabase().collection<AthleteDocument>('athletes').findOne({ _id: new ObjectId(req.params.id), clubId: new ObjectId(req.clubId) });
  if (!athlete) throw new NotFoundError('Athlete');
  res.json({ status: 'success', data: formatAthlete(athlete) });
}));

router.post('/', requirePermission('athlete:write'), validate(createAthleteSchema), asyncHandler(async (req, res) => {
  const input = createAthleteSchema.shape.body.parse(req.body);
  const clubId = new ObjectId(req.clubId);
  const db = getDatabase();
  await ensureUniqueEmail(input.email, clubId);
  const now = new Date();
  const doc = {
    _id: new ObjectId(), clubId, userId: await findAccountLink(input.email, clubId),
    ...normalizeInput(input), personalBest: {}, seasonBest: {}, createdAt: now,
  } as AthleteDocument;
  await db.collection<AthleteDocument>('athletes').insertOne(doc);
  res.status(201).json({ status: 'success', data: formatAthlete(doc) });
}));

router.post('/import', requirePermission('athlete:import'), validate(importSchema), asyncHandler(async (req, res) => {
  const { rows } = importSchema.shape.body.parse(req.body);
  const clubId = new ObjectId(req.clubId);
  const db = getDatabase();
  const results: { row: number; email?: string; status: 'created' | 'error'; message?: string }[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const parsed = z.object(athleteFields).safeParse(rows[index]);
    if (!parsed.success) {
      results.push({ row: index + 2, status: 'error', message: parsed.error.issues[0]?.message || 'Invalid row' });
      continue;
    }
    const input = parsed.data;
    try {
      await ensureUniqueEmail(input.email, clubId);
      const now = new Date();
      const doc = {
        _id: new ObjectId(), clubId, userId: await findAccountLink(input.email, clubId),
        ...normalizeInput(input), personalBest: {}, seasonBest: {}, createdAt: now,
      } as AthleteDocument;
      await db.collection<AthleteDocument>('athletes').insertOne(doc);
      results.push({ row: index + 2, email: input.email, status: 'created' });
    } catch (error: any) {
      const duplicate = error?.code === 11000;
      results.push({ row: index + 2, email: input.email, status: 'error', message: duplicate ? 'An athlete with this email already exists in the active club' : (error instanceof Error ? error.message : 'Could not import this row') });
    }
  }

  const created = results.filter(result => result.status === 'created').length;
  res.status(created ? 201 : 200).json({ status: 'success', data: { created, failed: results.length - created, results } });
}));

router.patch('/:id', requirePermission('athlete:write'), validate(updateAthleteSchema), asyncHandler(async (req, res) => {
  const id = new ObjectId(req.params.id);
  const clubId = new ObjectId(req.clubId);
  const input = updateAthleteSchema.shape.body.parse(req.body);
  const db = getDatabase();
  const existing = await db.collection<AthleteDocument>('athletes').findOne({ _id: id, clubId });
  if (!existing) throw new NotFoundError('Athlete');
  if (input.email) await ensureUniqueEmail(input.email, clubId, id);
  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const field of ['firstName', 'lastName', 'email', 'gender', 'eventSpecialization', 'medicalNotes', 'school', 'grade', 'status'] as const) {
    if (input[field] !== undefined) update[field] = input[field];
  }
  if (input.email) update.email = input.email.toLowerCase();
  if (input.phone !== undefined) update.phone = input.phone || null;
  if (input.dateOfBirth !== undefined) update.dateOfBirth = input.dateOfBirth || null;
  if (input.emergencyContact !== undefined) {
    update.emergencyContact = input.emergencyContact ? { ...input.emergencyContact, email: input.emergencyContact.email || null } : null;
  }
  if (input.medicalNotes === '') update.medicalNotes = null;
  if (input.school === '') update.school = null;
  if (input.grade === '') update.grade = null;
  if (!existing.userId || (input.email && input.email !== existing.email)) {
    update.userId = await findAccountLink(input.email || existing.email, clubId);
  }
  const result = await db.collection<AthleteDocument>('athletes').findOneAndUpdate(
    { _id: id, clubId }, { $set: update }, { returnDocument: 'after' },
  );
  if (!result) throw new NotFoundError('Athlete');
  res.json({ status: 'success', data: formatAthlete(result) });
}));

router.delete('/:id', requirePermission('athlete:write'), validate(idSchema), asyncHandler(async (req, res) => {
  const result = await getDatabase().collection<AthleteDocument>('athletes').updateOne(
    { _id: new ObjectId(req.params.id), clubId: new ObjectId(req.clubId) },
    { $set: { status: 'inactive', updatedAt: new Date() } },
  );
  if (!result.matchedCount) throw new NotFoundError('Athlete');
  res.json({ status: 'success', data: { archived: true } });
}));

export default router;
