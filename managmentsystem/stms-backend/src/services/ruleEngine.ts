// src/services/ruleEngine.ts
// Deterministic safety & ordering rules for workout recommendations

import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';

// Types based on STMS collections
interface Exercise {
  _id: ObjectId;
  clubId: ObjectId;
  name: string;
  phase?: 'warmup' | 'explosive' | 'strength' | 'cooldown' | 'mobility';
  energySystem?: 'atp-pcr' | 'glycolytic' | 'aerobic' | 'mixed';
  movementPattern?: string;
  cnsIntensity?: 1 | 2 | 3 | 4 | 5;
  contraindications?: string[];
  primaryMuscles?: string[];
  equipment?: string[];
}

interface Workout {
  _id: ObjectId;
  clubId: ObjectId;
  name: string;
  exercises: WorkoutExercise[];
  periodizationPhase?: 'off-season' | 'pre-comp' | 'competition' | 'transition';
  energySystemFocus?: 'atp-pcr' | 'glycolytic' | 'aerobic' | 'mixed';
  templateType?: 'speed' | 'strength' | 'endurance' | 'technique' | 'recovery' | 'testing';
  targetEventGroup?: string;
  estimatedRPE?: number;
  estimatedDurationMinutes?: number;
}

interface WorkoutExercise {
  exerciseId?: string | ObjectId;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  tempo?: string;
  targetZone?: string;
  coachingNotes?: string;
}

interface Injury {
  _id: ObjectId;
  clubId: ObjectId;
  athleteId: ObjectId;
  type: string;
  bodyPart: string;
  laterality: 'left' | 'right' | 'bilateral' | 'not_applicable';
  severity: 1 | 2 | 3;
  status: 'active' | 'rehabilitating' | 'returning' | 'resolved';
  restrictions: string[];
  expectedReturnDate?: string | null;
}

interface DailyReadiness {
  clubId: ObjectId;
  athleteId: ObjectId;
  date: string;
  soreness: 1 | 2 | 3 | 4 | 5;
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  stressEnergy: 1 | 2 | 3 | 4 | 5;
}

interface SRPELoad {
  acute: number;
  chronic: number;
  acwr: number;
}

interface AthleteProfile {
  _id: ObjectId;
  clubId: ObjectId;
  eventSpecialization: string[];
  status: string;
}

export class RuleEngine {
  /**
   * 1. Filter exercises based on active injuries
   * Removes exercises that contraindicate injured body parts
   */
  static filterExercisesByInjury(exercises: Exercise[], injuries: Injury[]): Exercise[] {
    const activeInjuries = injuries.filter(i => 
      ['active', 'rehabilitating', 'returning'].includes(i.status)
    );

    if (activeInjuries.length === 0) return exercises;

    // Build set of contraindicated body parts
    const contraindicatedParts = new Set<string>();
    for (const injury of activeInjuries) {
      // Add the specific body part
      contraindicatedParts.add(injury.bodyPart.toLowerCase());
      
      // Add laterality-specific parts
      if (injury.laterality === 'left' || injury.laterality === 'bilateral') {
        contraindicatedParts.add(`left ${injury.bodyPart.toLowerCase()}`);
      }
      if (injury.laterality === 'right' || injury.laterality === 'bilateral') {
        contraindicatedParts.add(`right ${injury.bodyPart.toLowerCase()}`);
      }
      
      // Add explicit restrictions
      for (const restriction of injury.restrictions) {
        contraindicatedParts.add(restriction.toLowerCase());
      }
    }

    return exercises.filter(exercise => {
      // Check exercise-level contraindications
      const exerciseContraindications = exercise.contraindications || [];
      for (const contra of exerciseContraindications) {
        if (contraindicatedParts.has(contra.toLowerCase())) {
          return false;
        }
      }

      // Check primary muscles
      const muscles = exercise.primaryMuscles || [];
      for (const muscle of muscles) {
        if (contraindicatedParts.has(muscle.toLowerCase())) {
          return false;
        }
      }

      // Check movement pattern for common injury patterns
      const pattern = exercise.movementPattern?.toLowerCase();
      if (pattern) {
        if (pattern.includes('sprint') && 
            (contraindicatedParts.has('hamstring') || contraindicatedParts.has('achilles') || contraindicatedParts.has('calf'))) {
          return false;
        }
        if (pattern.includes('jump') && 
            (contraindicatedParts.has('knee') || contraindicatedParts.has('ankle') || contraindicatedParts.has('achilles'))) {
          return false;
        }
        if (pattern.includes('hinge') && 
            (contraindicatedParts.has('lower_back') || contraindicatedParts.has('hamstring'))) {
          return false;
        }
        if (pattern.includes('push') && 
            (contraindicatedParts.has('shoulder') || contraindicatedParts.has('elbow'))) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 2. Enforce CNS ordering: Warmup → Explosive → Strength → Cooldown
   * Reorders exercises within a workout to follow proper sequence
   */
  static enforceCNSOrdering(exercises: Exercise[]): Exercise[] {
    const phaseOrder: Record<string, number> = {
      'warmup': 1,
      'mobility': 2,
      'explosive': 3,
      'strength': 4,
      'cooldown': 5,
    };

    // Sort by phase order, then by CNS intensity (lower first within phase)
    return [...exercises].sort((a, b) => {
      const phaseA = phaseOrder[a.phase || 'strength'];
      const phaseB = phaseOrder[b.phase || 'strength'];
      
      if (phaseA !== phaseB) return phaseA - phaseB;
      
      // Within same phase, lower CNS intensity first
      const cnsA = a.cnsIntensity || 3;
      const cnsB = b.cnsIntensity || 3;
      return cnsA - cnsB;
    });
  }

  /**
   * 3. Auto-regulate workout volume based on daily readiness
   * Scales sets/reps based on soreness, sleep, stress, and ACWR
   */
  static autoRegulateWorkout(
    workout: Workout,
    readiness: DailyReadiness | null,
    srpeLoad: SRPELoad | null
  ): Workout {
    let volumeMultiplier = 1.0;
    let intensityMultiplier = 1.0;

    // Readiness-based adjustments
    if (readiness) {
      // High soreness (≥4) reduces volume
      if (readiness.soreness >= 4) {
        volumeMultiplier *= 0.75; // 25% volume reduction
        intensityMultiplier *= 0.85;
      } else if (readiness.soreness === 3) {
        volumeMultiplier *= 0.9;
      }

      // Poor sleep reduces both
      if (readiness.sleepQuality <= 2) {
        volumeMultiplier *= 0.85;
        intensityMultiplier *= 0.9;
      }

      // High stress reduces volume
      if (readiness.stressEnergy <= 2) {
        volumeMultiplier *= 0.9;
      }
    }

    // sRPE load-based adjustments (ACWR)
    if (srpeLoad) {
      const acwr = srpeLoad.acwr;
      
      if (acwr > 1.5) {
        // Significant overtraining risk
        volumeMultiplier *= 0.6;
        intensityMultiplier *= 0.7;
      } else if (acwr > 1.3) {
        // Moderate overtraining risk
        volumeMultiplier *= 0.8;
        intensityMultiplier *= 0.85;
      } else if (acwr < 0.8) {
        // Undertraining - slight increase OK
        volumeMultiplier *= 1.1;
        intensityMultiplier *= 1.05;
      }
    }

    // Clamp multipliers
    volumeMultiplier = Math.max(0.5, Math.min(1.3, volumeMultiplier));
    intensityMultiplier = Math.max(0.7, Math.min(1.2, intensityMultiplier));

    // Apply to workout exercises
    const regulatedExercises = workout.exercises.map(ex => ({
      ...ex,
      sets: Math.max(1, Math.round(ex.sets * volumeMultiplier)),
      // Adjust target zone/intensity if specified
      targetZone: ex.targetZone ? this.adjustTargetZone(ex.targetZone, intensityMultiplier) : ex.targetZone,
      coachingNotes: ex.coachingNotes 
        ? `${ex.coachingNotes} [Auto-regulated: ${Math.round(volumeMultiplier * 100)}% volume, ${Math.round(intensityMultiplier * 100)}% intensity]`
        : `[Auto-regulated: ${Math.round(volumeMultiplier * 100)}% volume, ${Math.round(intensityMultiplier * 100)}% intensity]`,
    }));

    return {
      ...workout,
      exercises: regulatedExercises,
      estimatedRPE: workout.estimatedRPE 
        ? Math.round(workout.estimatedRPE * intensityMultiplier * 10) / 10
        : undefined,
      estimatedDurationMinutes: workout.estimatedDurationMinutes
        ? Math.round(workout.estimatedDurationMinutes * volumeMultiplier)
        : undefined,
    };
  }

  /**
   * Adjust target zone string based on intensity multiplier
   */
  private static adjustTargetZone(targetZone: string, multiplier: number): string {
    // Handle percentage-based zones like "85-95% 1RM" or "RPE 7-8"
    const percentMatch = targetZone.match(/(\d+)\s*-\s*(\d+)\s*%/);
    if (percentMatch) {
      const min = Math.round(parseInt(percentMatch[1]) * multiplier);
      const max = Math.round(parseInt(percentMatch[2]) * multiplier);
      return targetZone.replace(percentMatch[0], `${min}-${max}%`);
    }

    const rpeMatch = targetZone.match(/RPE\s*(\d+)\s*-\s*(\d+)/i);
    if (rpeMatch) {
      const min = Math.round(parseInt(rpeMatch[1]) * multiplier);
      const max = Math.round(parseInt(rpeMatch[2]) * multiplier);
      return targetZone.replace(rpeMatch[0], `RPE ${min}-${max}`);
    }

    return targetZone;
  }

  /**
   * 4. Match workout template based on context
   * Returns best matching templates from library
   */
  static async matchTemplates(
    clubId: ObjectId,
    eventGroup: string,
    periodizationPhase: string,
    focus: string,
    intensityLevel: 'low' | 'moderate' | 'high'
  ): Promise<Workout[]> {
    const db = getDatabase();
    
    const query: Record<string, any> = { 
      clubId, 
      archivedAt: { $exists: false } 
    };

    // Match event group
    if (eventGroup && eventGroup !== 'unknown') {
      query.targetEventGroup = eventGroup;
    }

    // Match periodization phase
    if (periodizationPhase) {
      query.periodizationPhase = periodizationPhase;
    }

    // Match template type based on focus
    const focusToType: Record<string, Workout['templateType']> = {
      'speed': 'speed',
      'power': 'strength',
      'strength': 'strength',
      'endurance': 'endurance',
      'technique': 'technique',
      'recovery': 'recovery',
      'testing': 'testing',
    };
    if (focusToType[focus.toLowerCase()]) {
      query.templateType = focusToType[focus.toLowerCase()];
    }

    const templates = await db.collection('workouts')
      .find(query)
      .sort({ updatedAt: -1 })
      .limit(10)
      .toArray();

    return templates as Workout[];
  }

  /**
   * 5. Select best template and apply rules
   * Main entry point for generating a safe, regulated workout
   */
  static async generateSafeWorkout(
    clubId: ObjectId,
    athleteId: ObjectId,
    mlOutput: {
      focus: string;
      intensity: string;
      rpe: number;
    }
  ): Promise<Workout | null> {
    const db = getDatabase();

    // Get athlete profile
    const athlete = await db.collection('athletes').findOne({ 
      _id: athleteId, 
      clubId,
      status: 'active'
    }) as AthleteProfile | null;
    
    if (!athlete) return null;

    // Get active injuries
    const injuries = await db.collection('injuries').find({
      clubId,
      athleteId,
      status: { $in: ['active', 'rehabilitating', 'returning'] }
    }).toArray() as Injury[];

    // Get latest readiness
    const readiness = await db.collection('daily_readiness').findOne({
      clubId,
      athleteId,
      date: new Date().toISOString().split('T')[0]
    }) as DailyReadiness | null;

    // Calculate sRPE load (last 28 days)
    const srpeLoad = await this.calculateSRPELoad(clubId, athleteId);

    // Determine periodization phase (simplified - could be more sophisticated)
    const month = new Date().getMonth() + 1;
    let periodizationPhase: Workout['periodizationPhase'] = 'pre-comp';
    if (month >= 6 && month <= 8) periodizationPhase = 'competition';
    else if (month >= 10 || month <= 2) periodizationPhase = 'off-season';

    // Get event group
    const eventGroup = athlete.eventSpecialization[0] || 'unknown';
    const eventGroups = {
      sprints: ['100m', '200m', '400m', '60m', '100m_hurdles', '110m_hurdles', '400m_hurdles'],
      middle_distance: ['800m', '1500m', '3000m', 'mile'],
      jumps: ['long_jump', 'triple_jump', 'high_jump', 'pole_vault'],
      throws: ['shot_put', 'discus', 'hammer', 'javelin'],
    };
    let matchedGroup = 'unknown';
    for (const [group, events] of Object.entries(eventGroups)) {
      if (events.includes(eventGroup)) {
        matchedGroup = group;
        break;
      }
    }

    // Map ML intensity to level
    const intensityLevel = mlOutput.rpe >= 8 ? 'high' : (mlOutput.rpe >= 6 ? 'moderate' : 'low');

    // Match templates
    const templates = await this.matchTemplates(
      clubId,
      matchedGroup,
      periodizationPhase,
      mlOutput.focus,
      intensityLevel
    );

    if (templates.length === 0) return null;

    // Select best template (first match for now)
    let selectedTemplate = templates[0];

    // Apply rule 1: Filter exercises by injury
    const allExercises = await this.getExercisesForWorkout(selectedTemplate, clubId);
    const safeExercises = this.filterExercisesByInjury(allExercises, injuries);
    
    selectedTemplate = {
      ...selectedTemplate,
      exercises: selectedTemplate.exercises.filter(we => 
        safeExercises.some(se => se._id.toString() === we.exerciseId?.toString())
      ),
    };

    // Apply rule 2: Enforce CNS ordering
    const orderedExercises = this.enforceCNSOrdering(safeExercises);
    selectedTemplate = {
      ...selectedTemplate,
      exercises: orderedExercises.map((oe, idx) => ({
        ...selectedTemplate.exercises[idx],
        ...oe,
      })),
    };

    // Apply rule 3: Auto-regulate based on readiness
    const regulatedWorkout = this.autoRegulateWorkout(selectedTemplate, readiness, srpeLoad);

    return regulatedWorkout;
  }

  /**
   * Helper: Calculate sRPE load for an athlete
   */
  private static async calculateSRPELoad(clubId: ObjectId, athleteId: ObjectId): Promise<SRPELoad> {
    const db = getDatabase();
    const now = new Date();
    const acuteCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const chronicCutoff = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const [acuteLogs, chronicLogs] = await Promise.all([
      db.collection('workout_logs').find({
        clubId,
        athleteId,
        completedAt: { $gte: acuteCutoff, $lte: now },
        perceivedEffort: { $exists: true }
      }).toArray(),
      db.collection('workout_logs').find({
        clubId,
        athleteId,
        completedAt: { $gte: chronicCutoff, $lte: now },
        perceivedEffort: { $exists: true }
      }).toArray(),
    ]);

    const calcLoad = (logs: any[]) => logs.reduce((sum, log) => {
      const rpe = log.perceivedEffort || 5;
      const duration = log.durationMinutes || 60;
      return sum + (rpe * duration);
    }, 0);

    const acuteLoad = calcLoad(acuteLogs);
    const chronicLoad = calcLoad(chronicLogs);

    return {
      acute: acuteLoad,
      chronic: chronicLoad,
      acwr: chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0,
    };
  }

  /**
   * Helper: Get full exercise objects for a workout
   */
  private static async getExercisesForWorkout(workout: Workout, clubId: ObjectId): Promise<Exercise[]> {
    const db = getDatabase();
    const exerciseIds = workout.exercises
      .map(e => e.exerciseId)
      .filter((id): id is ObjectId => id != null);

    if (exerciseIds.length === 0) return [];

    const exercises = await db.collection('exercises').find({
      _id: { $in: exerciseIds },
      $or: [{ clubId }, { clubId: null }]
    }).toArray();

    return exercises as Exercise[];
  }
}

export default RuleEngine;