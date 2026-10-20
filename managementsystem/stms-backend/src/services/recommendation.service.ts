import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';
import { RuleEngine } from './ruleEngine';
import { getMLRedisClient } from '../config/redis';
import { env } from '../config/env';

// ML model interface (to be implemented when model is deployed)
interface MLModelOutput {
  focus: string;
  intensity: string;
  rpe: number;
  injuryRisk: number;
  progressionAdjustment: number;
  confidence: number;
  recovery?: string;
  drivers?: string[];
  modelVersion?: string;
}

// Inference trigger message
interface InferenceTrigger {
  clubId: string;
  athleteId: string;
  trigger: string;
  actorUid: string;
  timestamp: string;
}

// Inference result message (stored in result stream)
interface InferenceResult {
  clubId: string;
  athleteId: string;
  trigger: string;
  focus: string;
  intensity: string;
  rpe: number;
  injuryRisk: number;
  progressionAdjustment: number;
  confidence: number;
  modelVersion: string;
  generatedAt: string;
  recovery?: string;
  drivers?: string[];
  error?: string;
}

// Cold-start rule-based output (existing logic)
interface ColdStartOutput {
  focus: string;
  intensity: string;
  recovery: string;
  drivers: string[];
  confidence: number;
}

export async function generateRecommendation(
  clubId: ObjectId, 
  athleteId: ObjectId, 
  trigger: string, 
  actorUid: string
) {
  const db = getDatabase();
  const athlete = await db.collection('athletes').findOne({ _id: athleteId, clubId, status: 'active' });
  if (!athlete) return null;

  // Check if ML model is available (via env flag or model registry)
  const useML = process.env.ML_MODEL_ENABLED === 'true';
  
  let mlOutput: MLModelOutput | null = null;
  let finalFocus = '';
  let finalIntensity = '';
  let finalRecovery = '';
  let finalDrivers: string[] = [];
  let finalConfidence = 0.35;
  let modelVersion = 'rules-cold-start-v1';

  if (useML) {
    try {
      mlOutput = await callMLInference(clubId, athleteId, trigger, actorUid);
      
      if (mlOutput) {
        finalFocus = mlOutput.focus;
        finalIntensity = mlOutput.intensity;
        finalRecovery = mlOutput.recovery ?? '';
        finalDrivers = mlOutput.drivers ?? [];
        finalConfidence = mlOutput.confidence;
        modelVersion = mlOutput.modelVersion ?? `ml-${process.env.ML_MODEL_VERSION || 'latest'}`;
      }
    } catch (error) {
      console.warn('ML inference failed, falling back to cold-start:', error);
    }
  }

  // If no ML output, use cold-start rules
  if (!mlOutput) {
    const coldStart = await generateColdStartRecommendation(athlete, db, clubId);
    finalFocus = coldStart.focus;
    finalIntensity = coldStart.intensity;
    finalRecovery = coldStart.recovery;
    finalDrivers = coldStart.drivers;
    finalConfidence = coldStart.confidence;
  }

  // Apply Rule Engine for safety and auto-regulation
  let regulatedWorkout = null;
  if (useML && mlOutput) {
    try {
      regulatedWorkout = await RuleEngine.generateSafeWorkout(clubId, athleteId, {
        focus: mlOutput.focus,
        intensity: mlOutput.intensity,
        rpe: mlOutput.rpe,
      });
      
      // Override with rule-engine adjusted values
      if (regulatedWorkout) {
        finalIntensity = regulatedWorkout.estimatedRPE 
          ? `RPE ${regulatedWorkout.estimatedRPE - 1}–${regulatedWorkout.estimatedRPE + 1}`
          : finalIntensity;
        
        // Add auto-regulation note to drivers
        if (regulatedWorkout.exercises.some(e => e.coachingNotes?.includes('Auto-regulated'))) {
          finalDrivers.push('Volume/intensity auto-regulated based on readiness & load');
        }
      }
    } catch (error) {
      console.warn('Rule engine failed:', error);
    }
  }

  // Build final recommendation document
  const now = new Date();
  const doc = {
    _id: new ObjectId(),
    clubId,
    athleteId,
    generatedAt: now,
    trigger,
    focus: finalFocus,
    intensity: finalIntensity,
    recovery: finalRecovery || 'Keep one full recovery day between demanding sessions.',
    drivers: finalDrivers.slice(0, 3),
    confidence: finalConfidence,
    modelVersion,
    status: 'pending',
    createdBy: actorUid,
    createdAt: now,
    updatedAt: now,
    // Store rule engine metadata
    metadata: {
      autoRegulated: !!regulatedWorkout,
      injuryFiltered: regulatedWorkout ? true : false,
      cnsOrdered: regulatedWorkout ? true : false,
    },
  };

  await db.collection('recommendations').insertOne(doc);
  return doc;
}

/**
 * Generate a cold-start recommendation from the athlete's actual record.
 *
 * This is the path used whenever the ML model is disabled, unreachable, or returns nothing —
 * so it has to be honest on its own rather than a placeholder. It reads the same collections
 * the ML feature pipeline uses (workout logs, attendance, injuries, readiness, results) and
 * explains the prescription with the numbers it saw.
 */
async function generateColdStartRecommendation(athlete: any, db: any, clubId: ObjectId): Promise<ColdStartOutput> {
  const athleteId = athlete._id as ObjectId;
  const now = new Date();
  const since28 = new Date(now.getTime() - 28 * 86400000);
  const since7 = new Date(now.getTime() - 7 * 86400000);
  const since90 = new Date(now.getTime() - 90 * 86400000);

  const [logs, attendance, injuries, readiness, results, goals] = await Promise.all([
    db.collection('workout_logs')
      .find({ clubId, athleteId, completedAt: { $gte: since28, $lte: now } })
      .project({ perceivedEffort: 1, durationMinutes: 1, completedAt: 1 })
      .toArray(),
    db.collection('attendance_records')
      .find({ clubId, athleteId, markedAt: { $gte: since28, $lte: now } })
      .project({ status: 1 })
      .toArray(),
    db.collection('injuries')
      .find({ clubId, athleteId, status: { $in: ['active', 'rehabilitating', 'returning'] } })
      .project({ type: 1, bodyPart: 1, laterality: 1, status: 1 })
      .toArray(),
    db.collection('daily_readiness')
      .find({ clubId, athleteId })
      .sort({ date: -1 })
      .limit(1)
      .toArray(),
    db.collection('performance_results')
      .find({ clubId, athleteId, date: { $gte: since90.toISOString().slice(0, 10) } })
      .project({ event: 1, resultValue: 1, unit: 1, isPB: 1, date: 1 })
      .toArray(),
    db.collection('athlete_goals')
      .find({ clubId, athleteId, status: 'active' })
      .project({ event: 1, targetValue: 1, unit: 1 })
      .limit(3)
      .toArray(),
  ]);

  // ---- Load ----
  const loadOf = (rows: any[]) => rows.reduce((sum, row) => sum + (Number(row.perceivedEffort) || 5) * (Number(row.durationMinutes) || 60), 0);
  const acute = loadOf(logs.filter((row: any) => row.completedAt >= since7));
  const chronic = loadOf(logs);
  // Chronic load is a 28-day total, so the comparable weekly average is chronic / 4.
  const acwr = chronic > 0 ? acute / (chronic / 4) : 0;
  const avgRpe = logs.length
    ? logs.reduce((sum: number, row: any) => sum + (Number(row.perceivedEffort) || 0), 0) / logs.length
    : 0;

  // ---- Attendance ----
  const attended = attendance.filter((row: any) => ['present', 'late', 'excused'].includes(row.status)).length;
  const attendanceRate = attendance.length ? attended / attendance.length : 0;

  // ---- Readiness ----
  const latest = readiness[0] as any;
  const soreness = latest ? Number(latest.soreness) : null;
  const sleepQuality = latest ? Number(latest.sleepQuality) : null;
  const stressEnergy = latest ? Number(latest.stressEnergy) : null;
  const readinessLow = soreness !== null && (soreness >= 4 || (sleepQuality ?? 5) <= 2);

  // ---- Performance ----
  const personalBests = results.filter((row: any) => row.isPB === true).length;
  const recentEvents = [...new Set(results.map((row: any) => String(row.event)))];

  const event = String((athlete.eventSpecialization ?? [])[0] ?? '').toLowerCase();
  const injury = injuries[0] as any;

  // ---- Focus ----
  let focus: string;
  if (injury) {
    focus = `Protect the ${injury.laterality && injury.laterality !== 'not_applicable' ? `${injury.laterality} ` : ''}${injury.bodyPart} and maintain the aerobic base`;
  } else if (acwr > 1.5) {
    focus = 'Absorb the recent load before adding intensity';
  } else if (readinessLow) {
    focus = 'Restore readiness before the next demanding session';
  } else if (attendance.length >= 4 && attendanceRate < 0.6) {
    focus = 'Rebuild training consistency';
  } else if (logs.length === 0) {
    focus = 'Establish a baseline week and calibrate training load';
  } else if (event.includes('jump')) {
    focus = 'Sharpen jump-specific power at controlled volume';
  } else if (event.includes('throw') || event.includes('shot') || event.includes('discus') || event.includes('javelin')) {
    focus = 'Develop throw-specific power and trunk transfer';
  } else if (event.includes('800') || event.includes('1500') || event.includes('3000') || event.includes('cross country')) {
    focus = 'Extend aerobic base with controlled threshold work';
  } else if (event.includes('sprint') || event.includes('hurdle')) {
    focus = 'Maintain maximal-velocity quality with full recovery';
  } else {
    focus = 'Build event-specific training consistency';
  }

  // ---- Intensity ----
  let intensity: string;
  if (injury && ['active', 'rehabilitating'].includes(String(injury.status))) intensity = 'Low · RPE 3–5';
  else if (acwr > 1.5) intensity = 'Low · RPE 3–5';
  else if (readinessLow) intensity = 'Low–moderate · RPE 4–6';
  else if (acwr > 0 && acwr < 0.8 && !readinessLow) intensity = 'Moderate–high · RPE 7–8';
  else intensity = 'Moderate · RPE 6–7';

  // ---- Recovery ----
  const recovery = injury
    ? 'Keep one full recovery day between sessions and continue the rehabilitation plan.'
    : acwr > 1.5
      ? 'Schedule two easy days this week; keep the next hard session at least 48 hours away.'
      : readinessLow
        ? 'Prioritise sleep and an easy mobility session before the next hard effort.'
        : 'Keep one full recovery day between demanding sessions.';

  // ---- Drivers (facts the coach can check) ----
  const drivers: string[] = [];

  if (logs.length) {
    drivers.push(
      `${logs.length} completed session${logs.length === 1 ? '' : 's'} in 28 days at an average RPE of ${avgRpe.toFixed(1)}`
    );
  } else {
    drivers.push('No completed sessions in the last 28 days');
  }

  if (injury) {
    drivers.push(
      `${String(injury.status)} ${String(injury.bodyPart)} injury${injury.laterality && injury.laterality !== 'not_applicable' ? ` (${injury.laterality})` : ''}`
    );
  }

  if (latest && readinessLow) {
    drivers.push(`Readiness today: soreness ${soreness}/5, sleep ${sleepQuality}/5, energy ${stressEnergy}/5`);
  }

  if (chronic > 0 && acwr > 1.3) {
    drivers.push(`Acute:chronic workload ratio ${acwr.toFixed(2)} — above the 1.3 caution line`);
  }

  if (attendance.length >= 4) {
    drivers.push(
      `Attended ${attended} of ${attendance.length} sessions in 28 days (${Math.round(attendanceRate * 100)}%)`
    );
  }

  if (personalBests > 0) {
    drivers.push(`${personalBests} personal best${personalBests === 1 ? '' : 's'} in the last 90 days`);
  }

  if (drivers.length < 2 && recentEvents.length) {
    drivers.push(`Recent competition events: ${recentEvents.slice(0, 3).join(', ')}`);
  }

  if (drivers.length < 2 && goals.length) {
    const goal = goals[0] as any;
    drivers.push(`Active goal: ${String(goal.event)} ${String(goal.targetValue)} ${String(goal.unit)}`);
  }

  if (drivers.length < 2) {
    drivers.push('Limited history available, so the plan starts conservatively');
  }

  // ---- Confidence ----
  let confidence = 0.35;
  if (logs.length >= 3) confidence += 0.1;
  if (logs.length >= 10) confidence += 0.05;
  if (attendance.length >= 10) confidence += 0.1;
  if (latest) confidence += 0.05;
  if (results.length >= 3) confidence += 0.05;
  if (injury) confidence -= 0.1;

  return {
    focus,
    intensity,
    recovery,
    drivers: drivers.slice(0, 3),
    confidence: Math.max(0.3, Math.min(0.75, Number(confidence.toFixed(2)))),
  };
}

/**
 * Call ML inference service via Redis Streams
 * Publishes trigger and waits for result from inference worker
 */
async function callMLInference(clubId: ObjectId, athleteId: ObjectId, trigger: string, actorUid: string): Promise<MLModelOutput | null> {
  const streamKey = env.ML_INFERENCE_STREAM_KEY || 'stms:recommendation:triggers';
  const resultStreamKey = `${streamKey}:results`;
  const timeoutMs = parseInt(env.ML_INFERENCE_TIMEOUT_MS || '10000', 10);

  try {
    const redis = await getMLRedisClient();

    // Read results with XREAD rather than a consumer group. With a shared group, a result
    // consumed by the wrong in-flight request was never delivered again (it stayed pending),
    // so concurrent recommendations could silently time out.
    const existing = await redis.xRevRange(resultStreamKey, '+', '-', { COUNT: 1 });
    let cursor = existing && existing.length > 0 ? existing[0].id : '0-0';

    // Generate unique request ID for correlation
    const requestId = `${clubId.toString()}:${athleteId.toString()}:${Date.now()}`;

    // Publish trigger to inference stream
    const triggerMessage: InferenceTrigger = {
      clubId: clubId.toString(),
      athleteId: athleteId.toString(),
      trigger,
      actorUid,
      timestamp: new Date().toISOString(),
    };

    await redis.xAdd(streamKey, '*', {
      requestId,
      data: JSON.stringify(triggerMessage),
    });

    // Wait for result with timeout
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const results = await redis.xRead({ key: resultStreamKey, id: cursor }, { COUNT: 10, BLOCK: 1000 });

      if (!results) continue;

      for (const stream of results) {
        for (const message of stream.messages) {
          cursor = message.id;
          if (message.message.requestId !== requestId) continue;

          const result = JSON.parse(String(message.message.data)) as InferenceResult;

          if (result.error) {
            console.warn('ML inference returned error:', result.error);
            return null;
          }

          return {
            focus: result.focus,
            intensity: result.intensity,
            rpe: result.rpe,
            injuryRisk: result.injuryRisk,
            progressionAdjustment: result.progressionAdjustment,
            confidence: result.confidence,
            recovery: result.recovery,
            drivers: result.drivers,
            modelVersion: result.modelVersion,
          };
        }
      }
    }

    console.warn(`ML inference timeout after ${timeoutMs}ms for request ${requestId}`);
    return null;
  } catch (error) {
    console.error('ML inference failed:', error);
    throw error;
  }
}

export async function getRecommendation(clubId: ObjectId, athleteId: ObjectId) {
  const db = getDatabase();
  return db.collection('recommendations').findOne(
    { clubId, athleteId, status: 'pending' },
    { sort: { generatedAt: -1 } }
  );
}

export async function updateRecommendationStatus(
  recommendationId: ObjectId,
  status: 'accepted' | 'modified' | 'dismissed',
  modifiedBy: string,
  modifications?: { focus?: string; intensity?: string; recovery?: string }
) {
  const db = getDatabase();
  const update: any = { 
    status, 
    updatedAt: new Date(),
    reviewedBy: modifiedBy,
    reviewedAt: new Date(),
  };
  
  if (modifications) {
    update.focus = modifications.focus;
    update.intensity = modifications.intensity;
    update.recovery = modifications.recovery;
  }
  
  return db.collection('recommendations').findOneAndUpdate(
    { _id: recommendationId },
    { $set: update },
    { returnDocument: 'after' }
  );
}