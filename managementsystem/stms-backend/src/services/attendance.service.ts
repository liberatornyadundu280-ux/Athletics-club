import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';

export async function captureWorkoutOpen(athleteId: ObjectId, clubId: ObjectId, workoutId: ObjectId): Promise<void> {
  const db = getDatabase();
  const today = new Date().toISOString().slice(0, 10);
  const session = await db.collection('training_sessions').findOne({ clubId, linkedWorkoutId: workoutId, date: today, status: { $in: ['scheduled', 'in_progress'] } });
  if (!session) return;
  const now = new Date();
  await db.collection('attendance_records').updateOne(
    { clubId, sessionId: session._id, athleteId },
    { $set: { status: 'present', method: 'workout_open', markedAt: now, updatedAt: now }, $setOnInsert: { _id: new ObjectId(), createdAt: now } },
    { upsert: true },
  );
}
