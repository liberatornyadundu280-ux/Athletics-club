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
const generateSchema = z.object({ body: z.object({ athleteId: id.optional(), trigger: z.string().max(80).default('manual') }) });
const reviewSchema = z.object({ params: z.object({ id }), body: z.object({ status: z.enum(['accepted', 'modified', 'dismissed']), workoutId: id.optional(), coachNote: z.string().max(1000).optional() }) });
const format = (doc: any) => ({ ...doc, id: doc._id.toString(), clubId: doc.clubId.toString(), athleteId: doc.athleteId.toString(), linkedWorkoutId: doc.linkedWorkoutId?.toString() || null, generatedAt: doc.generatedAt?.toISOString?.(), createdAt: doc.createdAt?.toISOString?.() });

router.get('/', requirePermission('workout:read'), asyncHandler(async (req, res) => {
  const db = getDatabase(); const clubId = new ObjectId(req.clubId); const filter: Record<string, any> = { clubId };
  if (req.user!.role === 'athlete') {
    const user = await db.collection('users').findOne({ firebaseUid: req.user!.uid, status: 'active' });
    const athlete = user ? await db.collection('athletes').findOne({ clubId, userId: user._id }) : null;
    if (!athlete) return res.json({ status: 'success', data: [] });
    filter.athleteId = athlete._id;
  } else if (typeof req.query.athleteId === 'string' && id.safeParse(req.query.athleteId).success) filter.athleteId = new ObjectId(req.query.athleteId);
  const rows = await db.collection('recommendations').find(filter).sort({ generatedAt: -1 }).limit(100).toArray();
  const athletes = await db.collection('athletes').find({ _id: { $in: [...new Set(rows.map(row => row.athleteId.toString()))].map(value => new ObjectId(value)) }, clubId }).project({ firstName: 1, lastName: 1 }).toArray();
  const names = new Map(athletes.map(athlete => [athlete._id.toString(), `${athlete.firstName} ${athlete.lastName}`]));
  res.json({ status: 'success', data: rows.map(row => ({ ...format(row), athleteName: names.get(row.athleteId.toString()) || 'Athlete' })) });
}));

router.post('/generate', requirePermission('workout:read'), validate(generateSchema), asyncHandler(async (req, res) => {
  const { athleteId: requestedId, trigger } = generateSchema.shape.body.parse(req.body);
  const db = getDatabase(); const clubId = new ObjectId(req.clubId); let athleteId: ObjectId | null = null;
  if (req.user!.role === 'athlete') {
    const user = await db.collection('users').findOne({ firebaseUid: req.user!.uid, status: 'active' });
    const athlete = user ? await db.collection('athletes').findOne({ clubId, userId: user._id, status: 'active' }) : null;
    athleteId = athlete?._id || null;
  } else if (requestedId) {
    const athlete = await db.collection('athletes').findOne({ _id: new ObjectId(requestedId), clubId, status: 'active' });
    athleteId = athlete?._id || null;
  }
  if (!athleteId) throw new NotFoundError('Active athlete profile in this club');
  const recommendation = await generateRecommendation(clubId, athleteId, trigger, req.user!.uid);
  if (!recommendation) throw new NotFoundError('Active athlete profile in this club');
  res.status(201).json({ status: 'success', data: format(recommendation) });
}));

router.patch('/:id/review', requirePermission('workout:assign'), validate(reviewSchema), asyncHandler(async (req, res) => {
  const input = reviewSchema.shape.body.parse(req.body); const clubId = new ObjectId(req.clubId); const db = getDatabase();
  const recommendation = await db.collection('recommendations').findOne({ _id: new ObjectId(req.params.id), clubId });
  if (!recommendation) throw new NotFoundError('Recommendation');
  if (recommendation.status !== 'pending') throw new ConflictError('This recommendation has already been reviewed');
  let assignmentId: ObjectId | null = null;
  if (input.status === 'accepted' || input.status === 'modified') {
    if (!input.workoutId) throw new ConflictError('Choose a workout to assign when accepting a recommendation');
    const workout = await db.collection('workouts').findOne({ _id: new ObjectId(input.workoutId), clubId, archivedAt: { $exists: false } });
    if (!workout) throw new NotFoundError('Workout in this club');
    const athlete = await db.collection('athletes').findOne({ _id: recommendation.athleteId, clubId, status: 'active' });
    if (!athlete) throw new NotFoundError('Active athlete profile');
    const now = new Date(); const assignment = { _id: new ObjectId(), clubId, workoutId: workout._id, athleteId: athlete._id, startDate: now.toISOString().slice(0, 10), dueDate: null, notes: input.coachNote || null, status: 'assigned', assignedBy: req.user!.uid, recommendationId: recommendation._id, createdAt: now, updatedAt: now };
    await db.collection('workout_assignments').insertOne(assignment); assignmentId = assignment._id;
  }
  const updated = await db.collection('recommendations').findOneAndUpdate({ _id: recommendation._id, clubId, status: 'pending' }, { $set: { status: input.status, linkedWorkoutId: assignmentId, coachNote: input.coachNote || null, reviewedBy: req.user!.uid, reviewedAt: new Date(), updatedAt: new Date() } }, { returnDocument: 'after' });
  res.json({ status: 'success', data: format(updated) });
}));

export default router;
