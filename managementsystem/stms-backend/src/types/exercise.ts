// src/types/exercise.ts
// Canonical vocabulary for the exercise library.
//
// The library is deliberately stricter than the rest of the workout module: coaches filter
// on these values, so a typo in `energySystem` or a free-text `category` would silently
// remove an exercise from search results. Keep these lists in sync with the frontend.

export const EXERCISE_CATEGORIES = [
  'strength',
  'power',
  'plyometric',
  'sprint-drill',
  'speed',
  'endurance',
  'mobility',
  'jumps',
  'throws',
  'core',
  'recovery',
] as const;

export const EXERCISE_PHASES = [
  'warmup',
  'mobility',
  'technique',
  'speed',
  'power',
  'strength',
  'prevention',
  'core',
  'conditioning',
  'recovery',
] as const;

export const ENERGY_SYSTEMS = ['atp-pcr', 'glycolytic', 'aerobic', 'mixed'] as const;

export const EVENT_GROUPS = [
  'sprints',
  'middle_distance',
  'long_distance',
  'jumps',
  'throws',
  'combined',
  'general',
] as const;

export const EXERCISE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

export const EXERCISE_SOURCES = ['free-exercise-db', 'stms', 'club'] as const;

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];
export type ExercisePhase = (typeof EXERCISE_PHASES)[number];
export type EnergySystem = (typeof ENERGY_SYSTEMS)[number];
export type EventGroup = (typeof EVENT_GROUPS)[number];
export type ExerciseLevel = (typeof EXERCISE_LEVELS)[number];
export type ExerciseSource = (typeof EXERCISE_SOURCES)[number];

/**
 * Shape written by the seed scripts. `clubId` is added by the seeder: `null` for the
 * platform library, an ObjectId for a coach-created exercise.
 */
export interface ExerciseSeed {
  name: string;
  description: string;
  category: ExerciseCategory;
  eventGroups: EventGroup[];
  level: ExerciseLevel;
  phase: ExercisePhase;
  energySystem: EnergySystem;
  movementPattern: string;
  cnsIntensity: number;
  equipment: string[];
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  contraindications: string[];
  instructions: string[];
  tags: string[];
  source: ExerciseSource;
  sourceId?: string;
  sourceUrl?: string;
  license: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  createdBy: string;
}
