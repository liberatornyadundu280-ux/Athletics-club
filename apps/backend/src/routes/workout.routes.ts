// apps/backend/src/routes/workout.routes.ts
// Workout routes

import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { asyncHandler } from '../middleware/error-handler';
import { validate } from '../middleware/validation.middleware';
import { requireRole, requirePermission } from '../middleware/rbac.middleware';
import { z } from 'zod';
import { getDatabase } from '../config/database';
import { workoutService } from '../services/workout.service';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { ERROR_CODES } from '@stms/shared/constants/errors';

const router = Router();

// ==================== ZOD SCHEMAS ====================
const exerciseSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    description: z.string().optional(),
    muscles: z.array(z.string()).optional(),
    equipment: z.array(z.string()).optional(),
    videoUrl: z.string().url().optional().nullable(),
    cues: z.array(z.string()).optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    intensityPrescription: z.object({
      type: z.enum(['percentage', 'rpe', 'velocity', 'heart_rate']),
      value: z.number(),
      unit: z.string(),
    }).optional(),
    progressionRules: z.object({
      weeklyIncreasePercent: z.number().optional(),
      deloadEveryNWeeks: z.number().int().optional(),
      deloadPercent: z.number().optional(),
    }).optional(),
    isVerified: z.boolean().optional(),
  }),
});

const workoutSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    description: z.string().optional(),
    exercises: z.array(z.object({
      exerciseId: z.string().regex(/^[0-9a-fA-F]{24}$/),
      order: z.number().int().min(1),
      sets: z.number().int().min(1),
      reps: z.union([z.number().int().min(1), z.string()]),
      restSeconds: z.number().int().min(0),
      tempo: z.string().optional(),
      targetZone: z.string().optional(),
      coachNotes: z.string().optional(),
    })).optional(),
    estimatedDuration: z.number().int().min(1).optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    tags: z.array(z.string()).optional(),
    isTemplate: z.boolean().optional(),
  }),
});

const assignmentSchema = z.object({
  body: z.object({
    workoutId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    programId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    athleteIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).min(1),
    groupId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    schedule: z.object({
      type: z.enum(['once', 'recurring']),
      daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
      recurrenceRule: z.string().optional(),
    }).optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional().nullable(),
  }).refine(data => data.workoutId || data.programId, {
    message: 'Either workoutId or programId required',
    path: ['workoutId'],
  }),
});

const completeWorkoutSchema = z.object({
  body: z.object({
    actuals: z.array(z.object({
      exerciseId: z.string().regex(/^[0-9a-fA-F]{24}$/),
      sets: z.array(z.object({
        setNumber: z.number().int().min(1),
        reps: z.number().int().min(1),
        weight: z.number().optional(),
        rpe: z.number().int().min(1).max(10).optional(),
        duration: z.number().int().min(0).optional(),
        distance: z.number().optional(),
        completed: z.boolean(),
      })),
      startedAt: z.string().datetime(),
      completedAt: z.string().datetime().optional(),
      notes: z.string().optional(),
      rating: z.number().int().min(1).max(10).optional(),
    })),
  }),
});

// ==================== EXERCISE ROUTES ====================

/**
 * GET /exercises
 * List exercises (with filters)
 */
router.get('/exercises',
  requirePermission('workout:read'),
  asyncHandler(async (req, res) => {
    const clubId = req.query.clubId as string || req.clubId;
    const { search, muscle, equipment, difficulty } = req.query;

    const exercises = await workoutService.listExercises(clubId, {
      search: search as string,
      muscle: muscle as string,
      equipment: equipment as string,
      difficulty: difficulty as string,
    });

    res.json({
      status: 'success',
      data: exercises,
    });
  })
);

/**
 * POST /exercises
 * Create new exercise (verified coaches only)
 */
router.post('/exercises',
  requireRole('club_admin', 'coach', 'system_admin'),
  requirePermission('workout:write'),
  validate(exerciseSchema),
  asyncHandler(async (req, res) => {
    const exercise = await workoutService.createExercise({
      ...req.body,
      clubId: req.clubId,
      createdBy: req.user!.uid,
    });

    res.status(201).json({
      status: 'success',
      data: exercise,
    });
  })
);

/**
 * GET /workouts
 * List workouts
 */
router.get('/',
  requirePermission('workout:read'),
  asyncHandler(async (req, res) => {
    const clubId = req.clubId;
    const { search, difficulty, isTemplate, page = 1, limit = 20 } = req.query;

    const workouts = await workoutService.listWorkouts(clubId, {
      search: search as string,
      difficulty: difficulty as string,
      isTemplate: isTemplate !== undefined ? isTemplate === 'true' : undefined,
    });

    res.json({
      status: 'success',
      data: workouts,
    });
  })
);

/**
 * POST /workouts
 * Create workout
 */
router.post('/',
  requireRole('coach', 'club_admin', 'system_admin'),
  requirePermission('workout:write'),
  validate(workoutSchema),
  asyncHandler(async (req, res) => {
    const workout = await workoutService.createWorkout({
      ...req.body,
      clubId: req.clubId,
      createdBy: req.user!.uid,
    });

    res.status(201).json({
      status: 'success',
      data: workout,
    });
  })
);

/**
 * GET /workouts/:id
 * Get workout by ID
 */
router.get('/:id',
  requirePermission('workout:read'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const workout = await workoutService.getWorkoutById(id);

    // Check club access
    if (workout.clubId !== req.clubId && req.user!.role !== 'system_admin') {
      throw new ForbiddenError('Access denied to this workout');
    }

    res.json({
      status: 'success',
      data: workout,
    });
  })
);

/**
 * PATCH /workouts/:id
 * Update workout
 */
router.patch('/:id',
  requirePermission('workout:write'),
  validate(workoutSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const workout = await workoutService.updateWorkout(id, req.body);

    res.json({
      status: 'success',
      data: workout,
    });
  })
);

/**
 * DELETE /workouts/:id
 * Delete workout
 */
router.delete('/:id',
  requirePermission('workout:write'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await workoutService.deleteWorkout(id);
    res.status(204).send();
  })
);

/**
 * POST /workouts/assign
 * Assign workout to athletes
 */
router.post('/assign',
  requireRole('coach', 'club_admin', 'system_admin'),
  requirePermission('workout:assign'),
  validate(assignmentSchema),
  asyncHandler(async (req, res) => {
    const assignment = await workoutService.assignWorkout({
      ...req.body,
      clubId: req.clubId,
      createdBy: req.user!.uid,
    });

    res.status(201).json({
      status: 'success',
      data: assignment,
    });
  })
);

/**
 * GET /workouts/today
 * Get athlete's today workouts
 */
router.get('/today',
  requirePermission('workout:read'),
  asyncHandler(async (req, res) => {
    const athleteId = req.user!.uid;
    const clubId = req.clubId;

    const workouts = await workoutService.getTodayWorkouts(athleteId, clubId);

    res.json({
      status: 'success',
      data: workouts,
    });
  })
);

/**
 * POST /workouts/:id/complete
 * Complete workout
 */
router.post('/:id/complete',
  requirePermission('workout:complete'),
  validate(completeWorkoutSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const completion = await workoutService.completeWorkout({
      ...req.body,
      assignmentId: id,
      athleteId: req.user!.uid,
    });

    res.status(201).json({
      status: 'success',
      data: completion,
    });
  })
);

/**
 * GET /workouts/:id/player
 * Get workout player data
 */
router.get('/:id/player',
  requirePermission('workout:read'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const workout = await workoutService.getWorkoutById(id);

    res.json({
      status: 'success',
      data: workout,
    });
  })
);

export default router;
