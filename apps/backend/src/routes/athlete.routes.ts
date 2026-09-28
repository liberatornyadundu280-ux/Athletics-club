// apps/backend/src/routes/athlete.routes.ts
// Athlete management routes

import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { asyncHandler } from '../middleware/error-handler';
import { validate } from '../middleware/validation.middleware';
import { requireRole, requirePermission } from '../middleware/rbac.middleware';
import { z } from 'zod';
import { getDatabase } from '../config/database';
import { athleteService } from '../services/athlete.service';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { ERROR_CODES } from '@stms/shared/constants/errors';

const router = Router();

// ==================== ZOD SCHEMAS ====================
const createAthleteSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).max(100),
    lastName: z.string().min(2).max(100),
    email: z.string().email().toLowerCase().max(255),
    phone: z.string().optional(),
    dateOfBirth: z.string().datetime().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    eventSpecialization: z.array(z.string()).optional(),
    personalBest: z.record(z.string()).optional(),
    seasonBest: z.record(z.string()).optional(),
    medicalNotes: z.string().optional(),
    emergencyContact: z.object({
      name: z.string(),
      relationship: z.string(),
      phone: z.string(),
      email: z.string().email().optional(),
    }).optional(),
    school: z.string().optional(),
    grade: z.string().optional(),
    clubId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
});

const updateAthleteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    firstName: z.string().min(2).max(100).optional(),
    lastName: z.string().min(2).max(100).optional(),
    email: z.string().email().toLowerCase().max(255).optional(),
    phone: z.string().optional(),
    dateOfBirth: z.string().datetime().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    eventSpecialization: z.array(z.string()).optional(),
    personalBest: z.record(z.string()).optional(),
    seasonBest: z.record(z.string()).optional(),
    medicalNotes: z.string().optional(),
    emergencyContact: z.object({
      name: z.string(),
      relationship: z.string(),
      phone: z.string(),
      email: z.string().email().optional(),
    }).optional(),
    school: z.string().optional(),
    grade: z.string().optional(),
    status: z.enum(['active', 'injured', 'inactive', 'transferred', 'alumni']).optional(),
  }),
};

const bulkImportSchema = z.object({
  body: z.object({
    athletes: z.array(z.object({
      firstName: z.string().min(2).max(100),
      lastName: z.string().min(2).max(100),
      email: z.string().email().toLowerCase(),
      phone: z.string().optional(),
      dateOfBirth: z.string().datetime().optional(),
      gender: z.enum(['male', 'female', 'other']).optional(),
      eventSpecialization: z.array(z.string()).optional(),
      personalBest: z.record(z.string()).optional(),
      seasonBest: z.record(z.string()).optional(),
      medicalNotes: z.string().optional(),
      emergencyContact: z.object({
        name: z.string(),
        relationship: z.string(),
        phone: z.string(),
        email: z.string().email().optional(),
      }).optional(),
      school: z.string().optional(),
      grade: z.string().optional(),
    })).min(1),
    clubId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
};

const athleteListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    event: z.string().optional(),
    status: z.enum(['active', 'injured', 'inactive', 'transferred', 'alumni']).optional(),
  }),
});

// ==================== ROUTES ====================

/**
 * POST /athletes
 * Create new athlete profile
 */
router.post('/',
  requireRole('coach', 'club_admin', 'system_admin'),
  requirePermission('athlete:write'),
  validate(createAthleteSchema),
  asyncHandler(async (req, res) => {
    const athlete = await athleteService.create({
      ...req.body,
      clubId: req.clubId,
    });

    res.status(201).json({
      status: 'success',
      data: athlete,
    });
  })
);

/**
 * GET /athletes
 * List athletes with filters
 */
router.get('/',
  requireRole('coach', 'club_admin', 'system_admin'),
  requirePermission('athlete:read'),
  validate(athleteListQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, limit, search, event, status } = req.query;
    const clubId = req.clubId;

    const result = await athleteService.list({
      clubId,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 20,
      search: search as string,
      event: event as string,
      status: status as string,
    });

    res.json({
      status: 'success',
      data: result.data,
      meta: result.meta,
    });
  })
);

/**
 * POST /athletes/bulk-import
 * Bulk import athletes from CSV
 */
router.post('/bulk-import',
  requireRole('coach', 'club_admin', 'system_admin'),
  requirePermission('athlete:import'),
  validate(bulkImportSchema),
  asyncHandler(async (req, res) => {
    const { athletes, clubId } = req.body;
    const result = await athleteService.bulkImport(clubId, athletes);

    res.status(201).json({
      status: 'success',
      data: result,
    });
  })
);

/**
 * GET /athletes/:id
 * Get athlete by ID
 */
router.get('/:id',
  requirePermission('athlete:read'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const athlete = await athleteService.getById(id);

    // Verify club access
    if (athlete.clubId !== req.clubId && req.user!.role !== 'system_admin') {
      throw new ForbiddenError('Access denied to this athlete');
    }

    res.json({
      status: 'success',
      data: athlete,
    });
  })
);

/**
 * PATCH /athletes/:id
 * Update athlete
 */
router.patch('/:id',
  requireRole('coach', 'club_admin', 'system_admin'),
  requirePermission('athlete:write'),
  validate(updateAthleteSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const athlete = await athleteService.update(id, req.body);

    res.json({
      status: 'success',
      data: athlete,
    });
  })
);

/**
 * DELETE /athletes/:id
 * Soft delete athlete
 */
router.delete('/:id',
  requireRole('coach', 'club_admin', 'system_admin'),
  requirePermission('athlete:write'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await athleteService.delete(id);
    res.status(204).send();
  })
);

export default router;