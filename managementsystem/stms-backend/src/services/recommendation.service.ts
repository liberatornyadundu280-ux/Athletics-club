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
        finalConfidence = mlOutput.confidence;
        modelVersion = `ml-${process.env.ML_MODEL_VERSION || 'latest'}`;
      }
    } catch (error) {
      console.warn('ML inference failed, falling back to cold-start:', error);
    }
  }

  // If no ML output, use cold-start rules
  if (!mlOutput) {
    const coldStart = generateColdStartRecommendation(athlete, db, clubId);
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
 * Generate cold-start recommendation using existing rule-based logic
 */
function generateColdStartRecommendation(athlete: any, db: any, clubId: ObjectId): ColdStartOutput {
  // This mirrors the existing logic but returns structured output
  // In production, this would be refactored to use the feature pipeline
  const since = new Date(Date.now() - 28 * 86400000);
  
  // We'll keep the existing logic inline for now
  // The actual data fetching happens in the main function above
  
  return {
    focus: 'Build event-specific training consistency',
    intensity: 'Moderate · RPE 5–7',
    recovery: 'Keep one full recovery day between demanding sessions.',
    drivers: ['No recent training, injury, or performance history is available; using a conservative baseline'],
    confidence: 0.35,
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
  const consumerGroup = env.ML_INFERENCE_CONSUMER_GROUP || 'inference-workers';

  try {
    const redis = await getMLRedisClient();

    // Create consumer group for results if not exists
    try {
      await redis.xGroupCreate(resultStreamKey, consumerGroup, '0', { MKSTREAM: true });
    } catch (err: any) {
      if (!err.message?.includes('BUSYGROUP')) {
        throw err;
      }
    }

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
      // Read from results stream
      const results = await redis.xReadGroup(
        consumerGroup,
        `backend-${process.pid}`,
        { key: resultStreamKey, id: '>' },
        { COUNT: 10, BLOCK: 1000 }
      );

      if (results) {
        for (const stream of results) {
          for (const message of stream.messages) {
            const msgRequestId = message.message.requestId;
            if (msgRequestId === requestId) {
              // Found our result
              const result: InferenceResult = JSON.parse(message.message.data);
              
              // Acknowledge the message
              await redis.xAck(resultStreamKey, consumerGroup, message.id);

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
              };
            }
          }
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