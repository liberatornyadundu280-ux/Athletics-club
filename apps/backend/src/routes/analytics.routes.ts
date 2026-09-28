// apps/backend/src/routes/analytics.routes.ts
// Analytics routes

import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { asyncHandler } from '../middleware/error-handler';
import { requireRole, requirePermission } from '../middleware/rbac.middleware';
import { z } from 'zod';
import { getDatabase } from '../config/database';
import { NotFoundError } from '../utils/errors';

const router = Router();

// ==================== ZOD SCHEMAS ====================
const analyticsQuerySchema = z.object({
  query: z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    athleteId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    groupBy: z.enum(['day', 'week', 'month', 'athlete']).optional(),
  }),
);

// ==================== ROUTES ====================
const router = Router();

/**
 * GET /athlete/:id
 * Get athlete analytics
 */
router.get('/athlete/:id',
  requirePermission('analytics:read'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { from, to } = req.query;

    // Verify athlete belongs to club
    const athlete = await db.collection('athletes').findOne({ _id: new ObjectId(id) });
    if (!athlete) throw new NotFoundError('Athlete');
    if (athlete.clubId.toString() !== req.clubId && req.user!.role !== 'system_admin') {
      throw new Error('Access denied');
    }

    // Get attendance percentage
    const attendanceFilter = { clubId: new ObjectId(req.clubId), athleteId: new ObjectId(id) };
    if (from && to) {
      attendanceFilter.markedAt = { $gte: new Date(from as string), $lte: new Date(to as string) };
    }

    const totalSessions = await db.collection('attendance_records').countDocuments(attendanceFilter);
    const presentCount = await db.collection('attendance_records').countDocuments({ ...attendanceFilter, status: 'present' });
    const excusedCount = await db.collection('attendance_records').countDocuments({ ...attendanceFilter, status: { $in: ['excused', 'official_sports_leave'] } });
    const attendancePercentage = totalSessions > 0 ? Math.round(((presentCount + excusedCount) / totalSessions) * 100) : 0;

    // Get workout compliance
    const workoutFilter = { clubId: new ObjectId(req.clubId), athleteId: new ObjectId(id) };
    const assignments = await db.collection('workout_assignments').find({ athleteIds: new ObjectId(id) }).toArray();
    let completedWorkouts = 0;
    let totalWorkouts = 0;
    for (const assignment of assignments) {
      const completions = await db.collection('workout_completions').countDocuments({ assignmentId: assignment._id });
      totalWorkouts += 1;
      if (completions > 0) completedWorkouts++;
    }
    const workoutCompliance = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;

    // Get PB progression
    const results = await db.collection('results').find({ athleteId: new ObjectId(id) }).sort({ date: 1 }).toArray();
    const pbProgression = results.map(r => ({
      date: r.date,
      event: r.event,
      result: r.result,
      isPB: r.isPB,
    }));

    // Get goal progress
    const goals = await db.collection('goals').find({ athleteId: new ObjectId(id), status: 'active' }).toArray();
    const goalProgress = goals.map(g => ({
      goalId: g._id.toString(),
      event: g.event,
      target: g.targetValue,
      current: '0', // Would need current best
      progressPercent: 0, // Would calculate
      daysRemaining: Math.ceil((new Date(g.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    });

    // Get injury history
    const injuries = await db.collection('injuries').find({ athleteId: new ObjectId(id) }).toArray();
    const injuryHistory = injuries.map(i => ({
      injuryId: i._id.toString(),
      type: i.type,
      bodyPart: i.bodyPart,
      severity: i.severity,
      status: i.status,
      daysMissed: Math.ceil((Date.now() - i.onsetDate.getTime()) / (1000 * 60 * 60 * 24)),
    }));

    // Calculate ACWR
    const acwr = 1.0; // Simplified

    res.json({
      status: 'success',
      data: {
        attendancePercentage,
        workoutCompliance,
        pbProgression,
        goalProgress,
        injuryHistory,
        acwr,
        recommendedFocus: 'Speed endurance', // Placeholder
      },
    });
  })
);

/**
 * GET /coach
 * Get coach analytics
 */
router.get('/coach',
  requireRole('coach', 'club_admin', 'system_admin'),
  requirePermission('analytics:read'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const clubId = req.clubId;
    const { from, to } = req.query;

    // Get coach's athletes
    const athletes = await db.collection('athletes').find({ clubId: new ObjectId(clubId) }).toArray();
    const athleteIds = athletes.map(a => a._id);

    // Squad attendance heatmap
    const attendanceFilter = { clubId: new ObjectId(clubId) };
    if (from && to) {
      attendanceFilter.markedAt = { $gte: new Date(from as string), $lte: new Date(to as string) };
    }
    const attendance = await db.collection('attendance_records').find(attendanceFilter).toArray();

    // Group by athlete and date
    const heatmap = attendance.reduce((acc, record) => {
      const date = new Date(record.markedAt).toISOString().split('T')[0];
      if (!acc[date]) acc[date] = {};
      if (!acc[date][record.athleteId.toString()]) acc[date][record.athleteId.toString()] = 0;
      if (record.status === 'present' || record.status === 'excused' || record.status === 'official_sports_leave') {
        acc[date][record.athleteId.toString()] = 1;
      }
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Compliance by athlete
    const complianceByAthlete = await Promise.all(athletes.map(async a => {
      const assignments = await db.collection('workout_assignments').find({ athleteIds: a._id }).toArray();
      let assigned = 0, completed = 0;
      for (const assignment of assignments) {
        assigned++;
        const completions = await db.collection('workout_completions').countDocuments({ assignmentId: assignment._id });
        if (completions > 0) completed++;
      }
      return { athleteId: a._id.toString(), athleteName: `${a.firstName} ${a.lastName}`, assigned, completed, percentage: assigned > 0 ? Math.round((completed / assigned) * 100) : 0 };
    }));

    // Injury board
    const activeInjuries = await db.collection('injuries').find({ clubId: new ObjectId(clubId), status: { $in: ['active', 'rehabilitating', 'returning'] } }).toArray();
    const injuryBoard = activeInjuries.map(i => ({
      injuryId: i._id.toString(),
      athleteId: i.athleteId.toString(),
      type: i.type,
      bodyPart: i.bodyPart,
      severity: i.severity,
      status: i.status,
      expectedReturn: i.expectedReturnDate,
    }));

    // Upcoming competitions
    const upcomingComps = await db.collection('competitions').find({ clubId: new ObjectId(clubId), date: { $gte: new Date() } }).sort({ date: 1 }).limit(10).toArray();

    // Permission letter status
    const letterStats = await db.collection('permission_letters').aggregate([
      { $match: { clubId: new ObjectId(clubId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).toArray();

    res.json({
      status: 'success',
      data: {
        squadAttendanceHeatmap: heatmap,
        complianceByAthlete: await complianceByAthlete,
        injuryBoard,
        performanceTrends: [], // Would implement
        upcomingCompetitions: upcomingComps,
        permissionLetterStatus: letterStats,
      },
    });
  })
);

/**
 * GET /club-admin
 * Get club admin analytics
 */
router.get('/club-admin',
  requireRole('club_admin', 'system_admin'),
  requirePermission('analytics:read'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const clubId = req.clubId;
    const { from, to } = req.query;

    // Membership growth
    const athletes = await db.collection('athletes').find({ clubId: new ObjectId(clubId) }).toArray();
    const membershipGrowth = athletes.reduce((acc, a) => {
      const month = new Date(a.createdAt).toISOString().slice(0, 7);
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Participation rates
    const sessions = await db.collection('sessions').find({ clubId: new ObjectId(clubId) }).toArray();
    const attendance = await db.collection('attendance_records').find({ clubId: new ObjectId(clubId) }).toArray();

    const participationRates = sessions.map(s => {
      const attended = attendance.filter(a => a.sessionId.toString() === s._id.toString() && (a.status === 'present' || a.status === 'excused' || a.status === 'official_sports_leave')).length;
      return { sessionId: s._id.toString(), sessionName: s.name, rate: s.athleteIds.length > 0 ? (attended / s.athleteIds.length) * 100 : 0 };
    });

    // Coach workload
    const coaches = await db.collection('users').find({ clubIds: new ObjectId(clubId), role: 'coach' }).toArray();
    const coachWorkload = await Promise.all(coaches.map(async c => {
      const assignments = await db.collection('workout_assignments').find({ createdBy: new ObjectId(c._id) }).toArray();
      const sessions = await db.collection('sessions').find({ createdBy: new ObjectId(c._id) }).toArray();
      return { coachId: c._id.toString(), coachName: c.name, athletes: new Set(assignments.flatMap(a => a.athleteIds.map(id => id.toString()))).size, sessions: sessions.length };
    }));

    // Competition summary
    const competitions = await db.collection('competitions').find({ clubId: new ObjectId(clubId) }).toArray();
    const competitionSummary = {
      total: competitions.length,
      upcoming: competitions.filter(c => new Date(c.date) >= new Date()).length,
      completed: competitions.filter(c => new Date(c.date) < new Date()).length,
    };

    res.json({
      status: 'success',
      data: {
        membershipGrowth,
        participationRates,
        coachWorkload: await coachWorkload,
        facilityUsage: [], // Would implement
        competitionSummary,
      },
    });
  })
);

/**
 * GET /system-admin
 * Get system admin analytics
 */
router.get('/system-admin',
  requireRole('system_admin'),
  requirePermission('analytics:read'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();

    // Platform health
    const activeClubs = await db.collection('clubs').countDocuments({ status: 'active' });
    const totalUsers = await db.collection('users').countDocuments();
    const totalAthletes = await db.collection('athletes').countDocuments();

    // Mock metrics
    const apiLatency = 45; // ms
    const errorRate = 0.02; // %
    const modelPerformance = { accuracy: 0.87, precision: 0.85, recall: 0.82, driftScore: 0.03 };
    const storageCosts = 125.50; // USD/month

    res.json({
      status: 'success',
      data: {
        activeClubs,
        totalUsers,
        totalAthletes,
        apiLatency,
        errorRate,
        modelPerformance,
        storageCosts,
      },
    });
  })
);

export default router;