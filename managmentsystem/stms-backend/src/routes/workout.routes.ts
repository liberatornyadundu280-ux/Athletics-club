import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { getDatabase } from '../config/database';
import { asyncHandler } from '../middleware/error-handler';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';
import { captureWorkoutOpen } from '../services/attendance.service';
import { generateRecommendation } from '../services/recommendation.service';

const router = Router();
const id = z.string().regex(/^[0-9a-fA-F]{24}$/);
const exerciseSchema = z.object({ name: z.string().trim().min(2).max(100), description: z.string().max(500).optional(), equipment: z.array(z.string().max(60)).max(10).default([]), primaryMuscles: z.array(z.string().max(60)).max(10).default([]), videoUrl: z.string().url().optional().or(z.literal('')) });
const workoutExerciseSchema = z.object({ exerciseId: id.optional().nullable(), name: z.string().trim().min(2).max(100), sets: z.number().int().min(1).max(30), reps: z.string().trim().min(1).max(40), restSeconds: z.number().int().min(0).max(3600).default(0), tempo: z.string().max(30).optional(), targetZone: z.string().max(80).optional(), coachingNotes: z.string().max(500).optional() });
const workoutSchema = z.object({ name: z.string().trim().min(2).max(120), description: z.string().max(2000).optional(), estimatedDuration: z.number().int().min(1).max(600).default(60), difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'), tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]), exercises: z.array(workoutExerciseSchema).min(1).max(40), isTemplate: z.boolean().default(true) });
const workoutBody = z.object({ body: workoutSchema });
const workoutPatch = z.object({ params: z.object({ id }), body: workoutSchema.partial() });
const assignSchema = z.object({ params: z.object({ id }), body: z.object({ athleteIds: z.array(id).min(1).max(250), startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), notes: z.string().max(1000).optional() }) });
const exerciseBody = z.object({ body: exerciseSchema });
const completeSchema = z.object({ params: z.object({ id }), body: z.object({ durationMinutes: z.number().int().min(0).max(600).optional(), perceivedEffort: z.number().int().min(1).max(10).optional(), notes: z.string().max(2000).optional(), exerciseResults: z.array(z.object({ exerciseIndex: z.number().int().min(0).max(39), completedSets: z.number().int().min(0).max(30), actualReps: z.string().max(40).optional(), notes: z.string().max(500).optional() })).max(40).optional() }) });

function formatDoc(doc: any) { return { ...doc, id: doc._id.toString(), clubId: doc.clubId?.toString() || null, createdAt: doc.createdAt?.toISOString?.(), updatedAt: doc.updatedAt?.toISOString?.() }; }
async function getWorkout(workoutId: string, clubId: ObjectId) {
  if (!id.safeParse(workoutId).success) throw new NotFoundError('Workout');
  const workout = await getDatabase().collection('workouts').findOne({ _id: new ObjectId(workoutId), clubId, archivedAt: { $exists: false } });
  if (!workout) throw new NotFoundError('Workout');
  return workout;
}

async function validateExerciseReferences(exercises: z.infer<typeof workoutExerciseSchema>[], clubId: ObjectId) {
  const exerciseIds = [...new Set(exercises.map(exercise => exercise.exerciseId).filter((value): value is string => Boolean(value)))].map(value => new ObjectId(value));
  if (!exerciseIds.length) return;
  const count = await getDatabase().collection('exercises').countDocuments({ _id: { $in: exerciseIds }, $or: [{ clubId }, { clubId: null }] });
  if (count !== exerciseIds.length) throw new NotFoundError('One or more exercise library records');
}

router.get('/exercises', requirePermission('workout:read'), asyncHandler(async (req, res) => {
  const db = getDatabase(); const clubId = new ObjectId(req.clubId);
  const rows = await db.collection('exercises').find({ $or: [{ clubId }, { clubId: null }] }).sort({ name: 1 }).limit(500).toArray();
  res.json({ status: 'success', data: rows.map(formatDoc) });
}));

router.post('/exercises', requirePermission('workout:write'), validate(exerciseBody), asyncHandler(async (req, res) => {
  const input = exerciseBody.shape.body.parse(req.body); const now = new Date();
  const doc = { _id: new ObjectId(), clubId: new ObjectId(req.clubId), ...input, createdBy: req.user!.uid, createdAt: now, updatedAt: now };
  await getDatabase().collection('exercises').insertOne(doc);
  res.status(201).json({ status: 'success', data: formatDoc(doc) });
}));

router.get('/', requirePermission('workout:read'), asyncHandler(async (req, res) => {
  const rows = await getDatabase().collection('workouts').find({ clubId: new ObjectId(req.clubId), archivedAt: { $exists: false } }).sort({ updatedAt: -1 }).limit(100).toArray();
  res.json({ status: 'success', data: rows.map(formatDoc) });
}));

router.post('/', requirePermission('workout:write'), validate(workoutBody), asyncHandler(async (req, res) => {
  const input = workoutBody.shape.body.parse(req.body); const now = new Date();
  await validateExerciseReferences(input.exercises, new ObjectId(req.clubId));
  const doc = { _id: new ObjectId(), clubId: new ObjectId(req.clubId), ...input, createdBy: req.user!.uid, createdAt: now, updatedAt: now };
  await getDatabase().collection('workouts').insertOne(doc);
  res.status(201).json({ status: 'success', data: formatDoc(doc) });
}));

router.get('/assignments/mine', requirePermission('workout:read'), asyncHandler(async (req, res) => {
  const db = getDatabase(); const clubId = new ObjectId(req.clubId);
  const user = await db.collection('users').findOne({ firebaseUid: req.user!.uid, status: 'active' });
  if (!user) throw new ForbiddenError('Your account is not active');
  const athlete = await db.collection('athletes').findOne({ clubId, userId: user._id, status: 'active' });
  if (!athlete) return res.json({ status: 'success', data: [] });
  const assignments = await db.collection('workout_assignments').find({ clubId, athleteId: athlete._id }).sort({ startDate: -1 }).limit(100).toArray();
  const workoutIds = assignments.map(assignment => assignment.workoutId);
  const workouts = await db.collection('workouts').find({ _id: { $in: workoutIds }, clubId }).toArray();
  const byId = new Map(workouts.map(workout => [workout._id.toString(), workout]));
  res.json({ status: 'success', data: assignments.map(assignment => ({ ...formatDoc(assignment), workout: byId.get(assignment.workoutId.toString()) ? formatDoc(byId.get(assignment.workoutId.toString())) : null })) });
}));

router.get('/assignments', requirePermission('workout:assign'), asyncHandler(async (req, res) => {
  const rows = await getDatabase().collection('workout_assignments').find({ clubId: new ObjectId(req.clubId) }).sort({ startDate: -1 }).limit(250).toArray();
  res.json({ status: 'success', data: rows.map(formatDoc) });
}));

router.get('/:id', requirePermission('workout:read'), asyncHandler(async (req, res) => {
  const workout = await getWorkout(req.params.id, new ObjectId(req.clubId));
  res.json({ status: 'success', data: formatDoc(workout) });
}));

router.get('/assignments/:id', requirePermission('workout:read'), asyncHandler(async (req, res) => {
  if (!id.safeParse(req.params.id).success) throw new NotFoundError('Workout assignment');
  const db = getDatabase(); const clubId = new ObjectId(req.clubId);
  const assignment = await db.collection('workout_assignments').findOne({ _id: new ObjectId(req.params.id), clubId });
  if (!assignment) throw new NotFoundError('Workout assignment');
  const user = await db.collection('users').findOne({ firebaseUid: req.user!.uid });
  if (req.user!.role === 'athlete' && assignment.athleteId.toString() !== user?._id.toString()) throw new ForbiddenError('This workout belongs to another athlete');
  const workout = await getWorkout(assignment.workoutId.toString(), clubId);
  if (req.user!.role === 'athlete') {
    const now = new Date();
    await db.collection('workout_assignments').updateOne({ _id: assignment._id, status: 'assigned' }, { $set: { status: 'in_progress', startedAt: now, updatedAt: now } });
    if (assignment.athleteId) await captureWorkoutOpen(assignment.athleteId, clubId, workout._id);
  }
  res.json({ status: 'success', data: { assignment: formatDoc(assignment), workout: formatDoc(workout) } });
}));

router.post('/:id/assign', requirePermission('workout:assign'), validate(assignSchema), asyncHandler(async (req, res) => {
  const workout = await getWorkout(req.params.id, new ObjectId(req.clubId));
  const { athleteIds, startDate, dueDate, notes } = assignSchema.shape.body.parse(req.body);
  if (dueDate && dueDate < startDate) throw new ConflictError('Due date must be on or after the start date');
  const clubId = new ObjectId(req.clubId); const db = getDatabase();
  const ids = [...new Set(athleteIds)].map(value => new ObjectId(value));
  const athletes = await db.collection('athletes').find({ _id: { $in: ids }, clubId, status: 'active' }).toArray();
  if (athletes.length !== ids.length) throw new NotFoundError('One or more active athletes in this club');
  const now = new Date();
  const assignments = await Promise.all(athletes.map(async athlete => {
    const current = await db.collection('workout_assignments').findOne({ clubId, workoutId: workout._id, athleteId: athlete._id, status: { $in: ['assigned', 'in_progress'] } });
    if (current) return current;
    const doc = { _id: new ObjectId(), clubId, workoutId: workout._id, athleteId: athlete._id, startDate, dueDate: dueDate || null, notes: notes || null, status: 'assigned', assignedBy: req.user!.uid, createdAt: now, updatedAt: now };
    await db.collection('workout_assignments').insertOne(doc); return doc;
  }));
  res.status(201).json({ status: 'success', data: { assigned: assignments.length } });
}));

router.post('/assignments/:id/complete', requirePermission('workout:complete'), validate(completeSchema), asyncHandler(async (req, res) => {
  const db = getDatabase(); const clubId = new ObjectId(req.clubId);
  const assignment = await db.collection('workout_assignments').findOne({ _id: new ObjectId(req.params.id), clubId });
  if (!assignment) throw new NotFoundError('Workout assignment');
  const user = await db.collection('users').findOne({ firebaseUid: req.user!.uid });
  if (req.user!.role === 'athlete' && assignment.athleteId.toString() !== user?._id.toString()) throw new ForbiddenError('This workout belongs to another athlete');
  const input = completeSchema.shape.body.parse(req.body); const now = new Date();
  if (assignment.status === 'completed') throw new ConflictError('This workout is already marked complete');
  await db.collection('workout_assignments').updateOne({ _id: assignment._id, clubId }, { $set: { status: 'completed', completedAt: now, completion: input, updatedAt: now } });
  await db.collection('workout_logs').insertOne({ _id: new ObjectId(), clubId, assignmentId: assignment._id, workoutId: assignment.workoutId, athleteId: assignment.athleteId, ...input, completedAt: now });
  try { await generateRecommendation(clubId, assignment.athleteId, 'workout_completed', req.user!.uid); }
  catch (error) { console.error('Could not refresh athlete recommendation after workout completion', error); }
  res.json({ status: 'success', data: { completed: true, completedAt: now.toISOString() } });
}));

router.patch('/:id', requirePermission('workout:write'), validate(workoutPatch), asyncHandler(async (req, res) => {
  const workout = await getWorkout(req.params.id, new ObjectId(req.clubId));
  const input = workoutPatch.shape.body.parse(req.body);
  if (input.exercises) await validateExerciseReferences(input.exercises, new ObjectId(req.clubId));
  const updated = await getDatabase().collection('workouts').findOneAndUpdate({ _id: workout._id, clubId: new ObjectId(req.clubId) }, { $set: { ...input, updatedAt: new Date() } }, { returnDocument: 'after' });
  res.json({ status: 'success', data: formatDoc(updated) });
}));

router.delete('/:id', requirePermission('workout:write'), asyncHandler(async (req, res) => {
  const workout = await getWorkout(req.params.id, new ObjectId(req.clubId));
  await getDatabase().collection('workouts').updateOne({ _id: workout._id, clubId: new ObjectId(req.clubId) }, { $set: { archivedAt: new Date(), updatedAt: new Date() } });
  res.json({ status: 'success', data: { archived: true } });
}));

export default router;
