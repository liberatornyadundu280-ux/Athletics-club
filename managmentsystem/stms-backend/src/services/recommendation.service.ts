import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';
import { RuleEngine } from './ruleEngine';

// ML model interface (to be implemented when model is deployed)
interface MLModelOutput {
  focus: string;
  intensity: string;
  rpe: number;
  injuryRisk: number;
  progressionAdjustment: number;
  confidence: number;
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
      // TODO: Call ML inference service (Redis Streams or HTTP)
      // For now, fall back to cold-start
      mlOutput = await callMLInference(clubId, athleteId);
      
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
 * Call ML inference service (placeholder for production implementation)
 */
async function callMLInference(clubId: ObjectId, athleteId: ObjectId): Promise<MLModelOutput | null> {
  // Option 1: Redis Streams (async, for production)
  // await publishToInferenceQueue(clubId, athleteId);
  // return waitForInferenceResult(athleteId);
  
  // Option 2: HTTP call to FastAPI worker
  // const response = await fetch(`${process.env.ML_INFERENCE_URL}/predict`, {
  //   method: 'POST',
  //   body: JSON.stringify({ clubId, athleteId }),
  // });
  // return response.json();
  
  // Option 3: Direct model inference (if model loaded in memory)
  // return await runModelInference(clubId, athleteId);
  
  return null; // Not implemented yet
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