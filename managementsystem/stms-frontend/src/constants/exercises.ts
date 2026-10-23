// src/constants/exercises.ts
// Vocabulary shared by the exercise picker, filters and library badges.

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

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];
export type ExercisePhase = (typeof EXERCISE_PHASES)[number];
export type EventGroup = (typeof EVENT_GROUPS)[number];
export type ExerciseLevel = (typeof EXERCISE_LEVELS)[number];

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  strength: 'Strength',
  power: 'Power',
  plyometric: 'Plyometric',
  'sprint-drill': 'Sprint drill',
  speed: 'Speed',
  endurance: 'Endurance',
  mobility: 'Mobility',
  jumps: 'Jumps',
  throws: 'Throws',
  core: 'Core',
  recovery: 'Recovery',
};

export const PHASE_LABELS: Record<ExercisePhase, string> = {
  warmup: 'Warm-up',
  mobility: 'Mobility',
  technique: 'Technique',
  speed: 'Speed',
  power: 'Power',
  strength: 'Strength',
  prevention: 'Prevention',
  core: 'Core',
  conditioning: 'Conditioning',
  recovery: 'Recovery',
};

export const EVENT_GROUP_LABELS: Record<EventGroup, string> = {
  sprints: 'Sprints',
  middle_distance: 'Middle distance',
  long_distance: 'Long distance',
  jumps: 'Jumps',
  throws: 'Throws',
  combined: 'Combined events',
  general: 'General',
};

export const LEVEL_LABELS: Record<ExerciseLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const SOURCE_LABELS: Record<string, string> = {
  'free-exercise-db': 'Open library',
  stms: 'STMS track',
  club: 'Club',
  legacy: 'Legacy',
};

export const categoryOptions = EXERCISE_CATEGORIES.map(value => ({
  value,
  label: CATEGORY_LABELS[value],
}));

export const phaseOptions = EXERCISE_PHASES.map(value => ({
  value,
  label: PHASE_LABELS[value],
}));

export const eventGroupOptions = EVENT_GROUPS.map(value => ({
  value,
  label: EVENT_GROUP_LABELS[value],
}));

export const levelOptions = EXERCISE_LEVELS.map(value => ({
  value,
  label: LEVEL_LABELS[value],
}));
