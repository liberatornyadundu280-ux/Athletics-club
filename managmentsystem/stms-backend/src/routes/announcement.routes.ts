import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { getDatabase } from '../config/database';
import { asyncHandler } from '../middleware/error-handler';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { NotFoundError, ValidationError } from '../utils/errors';

const router = Router();
const createSchema = z.object({ body: z.object({ title: z.string().trim().min(3).max(160), message: z.string().trim().min(3).max(5000), audience: z.array(z.enum(['athlete', 'coach', 'club_admin'])).min(1).max(3), pinned: z.boolean().default(false) }) });
const idSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);
const serialize = (row: any, read = false) => ({ id: row._id.toString(), title: row.title, message: row.message, audience: row.audience, pinned: row.pinned, publishedAt: row.publishedAt?.toISOString?.(), read });

router.get('/', requirePermission('announcement:read'), asyncHandler(async (req, res) => {
  const clubId = new ObjectId(req.clubId);
  const audience = req.user!.role;
  const filter = audience === 'system_admin'
    ? { clubId, audience: { $in: ['athlete', 'coach', 'club_admin'] } }
    : { clubId, audience: { $in: [audience] } };
  const rows = await getDatabase().collection('announcements').find(filter).sort({ pinned: -1, publishedAt: -1 }).limit(100).toArray();
  const reads = await getDatabase().collection('announcement_reads').find({ clubId, userUid: req.user!.uid, announcementId: { $in: rows.map(row => row._id) } }).project({ announcementId: 1 }).toArray();
  const readIds = new Set(reads.map(item => item.announcementId.toString()));
  res.json({ status: 'success', data: rows.map(row => serialize(row, readIds.has(row._id.toString()))) });
}));

router.post('/', requirePermission('announcement:write'), validate(createSchema), asyncHandler(async (req, res) => {
  const input = createSchema.shape.body.parse(req.body); const now = new Date();
  const row = { _id: new ObjectId(), clubId: new ObjectId(req.clubId), ...input, publishedAt: now, createdBy: req.user!.uid };
  await getDatabase().collection('announcements').insertOne(row);
  res.status(201).json({ status: 'success', data: serialize(row) });
}));

router.post('/:id/read', requirePermission('announcement:read'), asyncHandler(async (req, res) => {
  if (!idSchema.safeParse(req.params.id).success) throw new NotFoundError('Announcement');
  const db = getDatabase(); const clubId = new ObjectId(req.clubId); const announcementId = new ObjectId(req.params.id);
  const row = await db.collection('announcements').findOne({ _id: announcementId, clubId, audience: { $in: [req.user!.role] } });
  if (!row) throw new NotFoundError('Announcement');
  await db.collection('announcement_reads').updateOne({ clubId, announcementId, userUid: req.user!.uid }, { $setOnInsert: { _id: new ObjectId(), clubId, announcementId, userUid: req.user!.uid, readAt: new Date() } }, { upsert: true });
  res.json({ status: 'success', data: { read: true } });
}));

router.patch('/preferences', requirePermission('announcement:read'), asyncHandler(async (req, res) => {
  const parsed = z.object({ body: z.object({ announcements: z.boolean() }) }).safeParse({ body: req.body });
  if (!parsed.success) throw new ValidationError('Invalid notification preferences');
  await getDatabase().collection('notification_preferences').updateOne({ clubId: new ObjectId(req.clubId), userUid: req.user!.uid }, { $set: { announcements: parsed.data.body.announcements, updatedAt: new Date() }, $setOnInsert: { _id: new ObjectId() } }, { upsert: true });
  res.json({ status: 'success', data: parsed.data.body });
}));

export default router;
