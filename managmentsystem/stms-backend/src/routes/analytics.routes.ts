import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { getDatabase } from '../config/database';
import { asyncHandler } from '../middleware/error-handler';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { ForbiddenError, ValidationError } from '../utils/errors';

const router = Router();
const querySchema = z.object({ query: z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }) });
async function ownAthlete(uid: string, clubId: ObjectId) {
  const user = await getDatabase().collection('users').findOne({ firebaseUid: uid, status: 'active' });
  if (!user) throw new ForbiddenError('Your account is not active');
  return getDatabase().collection('athletes').findOne({ clubId, userId: user._id, status: { $nin: ['inactive', 'transferred', 'alumni'] } });
}

router.get('/summary', requirePermission('analytics:read', 'analytics:read:own'), validate(querySchema), asyncHandler(async (req, res) => {
  const { from, to } = querySchema.shape.query.parse(req.query); const end = to ? new Date(`${to}T23:59:59.999Z`) : new Date(); const start = from ? new Date(`${from}T00:00:00.000Z`) : new Date(end.getTime() - 29 * 86400000); const clubId = new ObjectId(req.clubId);
  if (start > end) throw new ValidationError('Start date must be before end date');
  const athlete = req.user!.role === 'athlete' ? await ownAthlete(req.user!.uid, clubId) : null;
  const athleteFilter = athlete ? { athleteId: athlete._id } : {};
  const fromDate = start.toISOString().slice(0, 10); const toDate = end.toISOString().slice(0, 10);
  const db = getDatabase();
  const [athleteCount, sessionCount, recordCounts, attendanceSeries, assignmentStats, resultStats, injuryCount, goalCount, averageDuration] = await Promise.all([
    athlete ? Promise.resolve(1) : db.collection('athletes').countDocuments({ clubId, status: 'active' }),
    db.collection('training_sessions').countDocuments({ clubId, date: { $gte: fromDate, $lte: toDate }, status: { $ne: 'cancelled' } }),
    db.collection('attendance_records').aggregate([{ $match: { clubId, markedAt: { $gte: start, $lte: end }, ...athleteFilter } }, { $group: { _id: '$status', count: { $sum: 1 } } }]).toArray(),
    db.collection('attendance_records').aggregate([{ $match: { clubId, markedAt: { $gte: start, $lte: end }, ...athleteFilter } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$markedAt' } }, present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late', 'excused']] }, 1, 0] } }, total: { $sum: 1 } } }, { $sort: { _id: 1 } }]).toArray(),
    db.collection('workout_assignments').aggregate([{ $match: { clubId, createdAt: { $gte: start, $lte: end }, ...athleteFilter } }, { $group: { _id: null, total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } }]).toArray(),
    db.collection('performance_results').aggregate([{ $match: { clubId, date: { $gte: fromDate, $lte: toDate }, ...athleteFilter } }, { $group: { _id: null, total: { $sum: 1 }, personalBests: { $sum: { $cond: [{ $eq: ['$isPB', true] }, 1, 0] } }, seasonBests: { $sum: { $cond: [{ $eq: ['$isSB', true] }, 1, 0] } } } }]).toArray(),
    db.collection('injuries').countDocuments({ clubId, status: { $in: ['active', 'rehabilitating', 'returning'] }, ...(athlete ? { athleteId: athlete._id } : {}) }),
    db.collection('athlete_goals').countDocuments({ clubId, status: 'active', ...(athlete ? { athleteId: athlete._id } : {}) }),
    db.collection('training_sessions').aggregate([{ $match: { clubId, date: { $gte: fromDate, $lte: toDate }, status: { $ne: 'cancelled' } } }, { $group: { _id: null, averageMinutes: { $avg: { $divide: [{ $subtract: [{ $dateFromString: { dateString: { $concat: ['$date', 'T', '$endTime'] } } }, { $dateFromString: { dateString: { $concat: ['$date', 'T', '$startTime'] } } }] }, 60000] } } } }]).toArray(),
  ]);
  const byStatus = Object.fromEntries(recordCounts.map(row => [row._id, row.count]));
  const totalRecords = Object.values(byStatus).reduce((sum: number, count: any) => sum + count, 0);
  const attendanceNumerator = (byStatus.present || 0) + (byStatus.late || 0) + (byStatus.excused || 0);
  const assignments = assignmentStats[0] || { total: 0, completed: 0 };
  const results = resultStats[0] || { total: 0, personalBests: 0, seasonBests: 0 };
  res.json({ status: 'success', data: { from: fromDate, to: toDate, activeAthletes: athleteCount, sessions: sessionCount, averageSessionMinutes: Math.round(averageDuration[0]?.averageMinutes || 0), attendance: { rate: totalRecords ? Math.round(attendanceNumerator / totalRecords * 100) : 0, present: byStatus.present || 0, late: byStatus.late || 0, absent: byStatus.absent || 0, excused: byStatus.excused || 0, total: totalRecords, series: attendanceSeries.map(row => ({ date: row._id, rate: row.total ? Math.round(row.present / row.total * 100) : 0 })) }, workouts: { assigned: assignments.total, completed: assignments.completed, compliance: assignments.total ? Math.round(assignments.completed / assignments.total * 100) : 0 }, performance: results, activeInjuries: injuryCount, activeGoals: goalCount } });
}));

router.get('/athletes', requirePermission('analytics:report'), validate(querySchema), asyncHandler(async (req, res) => {
  const { from, to } = querySchema.shape.query.parse(req.query); const end = to ? new Date(`${to}T23:59:59.999Z`) : new Date(); const start = from ? new Date(`${from}T00:00:00.000Z`) : new Date(end.getTime() - 29 * 86400000); const clubId = new ObjectId(req.clubId); const db = getDatabase();
  if (start > end) throw new ValidationError('Start date must be before end date');
  const athletes = await db.collection('athletes').find({ clubId, status: 'active' }).sort({ lastName: 1, firstName: 1 }).limit(500).toArray();
  const ids = athletes.map(item => item._id);
  const fromDate = start.toISOString().slice(0, 10); const toDate = end.toISOString().slice(0, 10);
  const [attendance, assignments] = await Promise.all([
    db.collection('attendance_records').aggregate([
      { $match: { clubId, athleteId: { $in: ids }, markedAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$athleteId', total: { $sum: 1 }, attended: { $sum: { $cond: [{ $in: ['$status', ['present', 'late', 'excused']] }, 1, 0] } } } },
    ]).toArray(),
    db.collection('workout_assignments').aggregate([
      { $match: { clubId, athleteId: { $in: ids }, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$athleteId', total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
    ]).toArray(),
  ]);
  const attendanceById = new Map(attendance.map(item => [item._id.toString(), item])); const assignmentsById = new Map(assignments.map(item => [item._id.toString(), item]));
  res.json({ status: 'success', data: athletes.map(item => { const a = attendanceById.get(item._id.toString()); const w = assignmentsById.get(item._id.toString()); return { athleteId: item._id.toString(), name: `${item.firstName} ${item.lastName}`, attendanceRate: a?.total ? Math.round(a.attended / a.total * 100) : 0, attendanceRecords: a?.total || 0, workoutCompliance: w?.total ? Math.round(w.completed / w.total * 100) : 0, workoutsAssigned: w?.total || 0 }; }) });
}));

export default router;
