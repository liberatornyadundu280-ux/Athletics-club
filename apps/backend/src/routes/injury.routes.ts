// apps/backend/src/routes/injury.routes.ts
// Injury management routes

import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { asyncHandler } from '../middleware/error-handler';
import { requireRole, requirePermission } from '../middleware/rbac.middleware';
import { z } from 'zod';
import { getDatabase } from '../config/database';
import { NotFoundError } from '../utils/errors';

const router = Router();

// ==================== ZOD SCHEMAS ====================
const createInjurySchema = z.object({
  body: z.object({
    athleteId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    type: z.string(),
    bodyPart: z.string(),
    laterality: z.enum(['left', 'right', 'bilateral']),
    onsetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    mechanism: z.string(),
    severity: z.number().int().min(1).max(3),
    diagnosisSource: z.enum(['self', 'coach', 'physio', 'doctor', 'imaging']),
    imaging: z.array(z.string()).optional(),
    rtpProtocolId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  }),
};

const createRehabLogSchema = z.object({
  params: z.object({
    injuryId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    painLevel: z.number().int().min(1).max(10),
    wellnessScore: z.number().int().min(1).max(10),
    exercisesCompleted: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }),
};

const createRTPProtocolSchema = z.object({
  body: z.object({
    injuryType: z.string(),
    stages: z.array(z.object({
      stageNumber: z.number().int().min(1),
      name: z.string(),
      criteria: z.array(z.string()),
      minDays: z.number().int().min(0),
      allowedExercises: z.array(z.string()).optional(),
      restrictedExercises: z.array(z.string()).optional(),
    })),
  }),
};

const updateInjurySchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    type: z.string().optional(),
    bodyPart: z.string().optional(),
    laterality: z.enum(['left', 'right', 'bilateral']).optional(),
    mechanism: z.string().optional(),
    severity: z.number().int().min(1).max(3).optional(),
    diagnosisSource: z.enum(['self', 'coach', 'physio', 'doctor', 'imaging']).optional(),
    imaging: z.array(z.string()).optional(),
    status: z.enum(['active', 'rehabilitating', 'returning', 'resolved', 'chronic']).optional(),
    expectedReturnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    actualReturnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    rtpProtocolId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable(),
  }),
};

// ==================== ROUTES ====================
const router = Router();

/**
 * POST /injuries
 * Report new injury
 */
router.post('/',
  requireRole('coach', 'club_admin', 'system_admin', 'athlete'),
  requirePermission('injury:write'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const now = new Date();

    const injuryDoc = {
      ...req.body,
      clubId: new ObjectId(req.clubId),
      athleteId: new ObjectId(req.body.athleteId),
      onsetDate: new Date(req.body.onsetDate),
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('injuries').insertOne(injuryDoc);

    res.status(201).json({
      status: 'success',
      data: { id: result.insertedId.toString(), ...injuryDoc, athleteId: injuryDoc.athleteId.toString(), clubId: injuryDoc.clubId.toString() },
    });
  })
);

/**
 * GET /injuries
 * List injuries with filters
 */
router.get('/',
  requirePermission('injury:read'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const clubId = req.clubId;
    const { page = 1, limit = 20, status, athleteId, bodyPart } = req.query;

    const filter: any = { clubId: new ObjectId(clubId) };
    if (status) filter.status = status;
    if (athleteId) filter.athleteId = new ObjectId(athleteId as string);
    if (bodyPart) filter.bodyPart = bodyPart as string;

    const total = await db.collection('injuries').countDocuments(filter);
    const injuries = await db.collection('injuries')
      .find(filter)
      .sort({ onsetDate: -1 })
      .skip((parseInt(req.query.page as string) - 1) * parseInt(req.query.limit as string))
      .limit(parseInt(req.query.limit as string) || 20)
      .toArray();

    res.json({
      status: 'success',
      data: injuries.map(i => ({ ...i, id: i._id.toString(), athleteId: i.athleteId.toString(), clubId: i.clubId.toString() })),
      meta: { page: parseInt(req.query.page as string) || 1, limit: parseInt(req.query.limit as string) || 20, total, totalPages: Math.ceil(total / parseInt(req.query.limit as string) || 20) },
    });
  })
);

/**
 * GET /injuries/:id
 * Get injury details
 */
router.get('/:id',
  requirePermission('injury:read'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const injury = await db.collection('injuries').findOne({ _id: new ObjectId(req.params.id) });
    if (!injury) throw new NotFoundError('Injury');

    res.json({
      status: 'success',
      data: { ...injury, id: injury._id.toString(), athleteId: injury.athleteId.toString(), clubId: injury.clubId.toString() },
    });
  })
);

/**
 * PATCH /injuries/:id
 * Update injury
 */
router.patch('/:id',
  requirePermission('injury:write'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const { id } = req.params;

    const updateDoc: any = { updatedAt: new Date() };
    if (req.body.type) updateDoc.type = req.body.type;
    if (req.body.bodyPart) updateDoc.bodyPart = req.body.bodyPart;
    if (req.body.laterality) updateDoc.laterality = req.body.laterality;
    if (req.body.mechanism) updateDoc.mechanism = req.body.mechanism;
    if (req.body.severity) updateDoc.severity = req.body.severity;
    if (req.body.diagnosisSource) updateDoc.diagnosisSource = req.body.diagnosisSource;
    if (req.body.imaging) updateDoc.imaging = req.body.imaging;
    if (req.body.status) updateDoc.status = req.body.status;
    if (req.body.expectedReturnDate) updateDoc.expectedReturnDate = new Date(req.body.expectedReturnDate);
    if (req.body.actualReturnDate) updateDoc.actualReturnDate = new Date(req.body.actualReturnDate);
    if (req.body.rtpProtocolId) updateDoc.rtpProtocolId = new ObjectId(req.body.rtpProtocolId);

    const result = await db.collection('injuries').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    if (!result) throw new NotFoundError('Injury');

    res.json({
      status: 'success',
      data: { ...result, id: result._id.toString(), athleteId: result.athleteId.toString(), clubId: result.clubId.toString() },
    });
  })
);

/**
 * POST /injuries/:id/rehab-logs
 * Add rehab log
 */
router.post('/:id/rehab-logs',
  requirePermission('injury:write'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const now = new Date();

    const logDoc = {
      ...req.body,
      clubId: new ObjectId(req.clubId),
      injuryId: new ObjectId(req.params.id),
      date: new Date(req.body.date),
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('rehab_logs').insertOne(logDoc);

    res.status(201).json({
      status: 'success',
      data: { id: result.insertedId.toString(), ...logDoc, injuryId: logDoc.injuryId.toString(), clubId: logDoc.clubId.toString() },
    });
  })
);

/**
 * GET /injuries/:id/rehab-logs
 * Get rehab logs for injury
 */
router.get('/:id/rehab-logs',
  requirePermission('injury:read'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const { page = 1, limit = 20 } = req.query;

    const total = await db.collection('rehab_logs').countDocuments({ injuryId: new ObjectId(req.params.id) });
    const logs = await db.collection('rehab_logs')
      .find({ injuryId: new ObjectId(req.params.id) })
      .sort({ date: -1 })
      .skip((parseInt(req.query.page as string) - 1) * parseInt(req.query.limit as string))
      .limit(parseInt(req.query.limit as string) || 20)
      .toArray();

    res.json({
      status: 'success',
      data: logs.map(l => ({ ...l, id: l._id.toString(), injuryId: l.injuryId.toString(), clubId: l.clubId.toString() })),
      meta: { page: parseInt(req.query.page as string) || 1, limit: parseInt(req.query.limit as string) || 20, total, totalPages: Math.ceil(total / parseInt(req.query.limit as string) || 20) },
    });
  })
);

/**
 * POST /rtp-protocols
 * Create RTP protocol
 */
router.post('/rtp-protocols',
  requireRole('coach', 'club_admin', 'system_admin'),
  requirePermission('injury:rtp'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const now = new Date();

    const protocolDoc = {
      ...req.body,
      clubId: new ObjectId(req.clubId),
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('rtp_protocols').insertOne(protocolDoc);

    res.status(201).json({
      status: 'success',
      data: { id: result.insertedId.toString(), ...protocolDoc, clubId: protocolDoc.clubId.toString() },
    });
  })
);

/**
 * GET /rtp-protocols
 * List RTP protocols
 */
router.get('/rtp-protocols',
  requirePermission('injury:read'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const clubId = req.clubId;
    const { injuryType } = req.query;

    const filter: any = { clubId: new ObjectId(clubId) };
    if (injuryType) filter.injuryType = injuryType as string;

    const protocols = await db.collection('rtp_protocols')
      .find(filter)
      .toArray();

    res.json({
      status: 'success',
      data: protocols.map(p => ({ ...p, id: p._id.toString(), clubId: p.clubId.toString() })),
    });
  })
);

/**
 * GET /injuries/:id/restrictions
 * Get exercise restrictions for injury
 */
router.get('/:id/restrictions',
  requirePermission('injury:read'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const injury = await db.collection('injuries').findOne({ _id: new ObjectId(req.params.id) });
    if (!injury) throw new NotFoundError('Injury');

    // Get RTP protocol if assigned
    let restrictions: { allowed: string[]; restricted: string[] } = { allowed: [], restricted: [] };
    
    if (injury.rtpProtocolId) {
      const protocol = await db.collection('rtp_protocols').findOne({ _id: injury.rtpProtocolId });
      if (protocol) {
        // Determine current stage based on days since onset
        const daysSinceOnset = Math.ceil((Date.now() - injury.onsetDate.getTime()) / (1000 * 60 * 60 * 24));
        const currentStage = protocol.stages.find(s => s.minDays <= daysSinceOnset) || protocol.stages[protocol.stages.length - 1];
        
        restrictions = {
          allowed: currentStage.allowedExercises || [],
          restricted: currentStage.restrictedExercises || [],
        };
      }
    }

    res.json({
      status: 'success',
      data: {
        injuryId: injury._id.toString(),
        injuryType: injury.type,
        bodyPart: injury.bodyPart,
        laterality: injury.laterality,
        severity: injury.severity,
        status: injury.status,
        restrictions,
        rtpProtocol: injury.rtpProtocolId ? injury.rtpProtocolId.toString() : null,
      },
    });
  })
);

export default router;