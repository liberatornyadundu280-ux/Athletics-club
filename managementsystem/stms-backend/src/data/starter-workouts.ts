// src/data/starter-workouts.ts
// Editable starter sessions written into every new club.
//
// The pack is a four-week, three-session-per-week 400m block rather than a random set of
// sessions. It follows the way established sprint programmes organise the week:
//
//   - high / low / high, with at least 48 hours between high-CNS sessions;
//   - speed and acceleration work is short, fully recovered and stopped when mechanics drop;
//   - speed endurance is 60–80m at 90–95% with full recovery;
//   - special endurance is race-pace work (200–300m, or split/broken 400m) with full recovery
//     between reps and short recovery inside the split;
//   - tempo is low-intensity aerobic support, not a second hard session;
//   - strength is general and maintained during race-pace weeks rather than maximised.
//
// The structure and dose ranges are informed by public coaching guidance, not copied from a
// paid plan:
//
//   - World Athletics, "The 400 metres", New Studies in Athletics 23:2 (2008)
//     https://worldathletics.org/download/downloadnsa?filename=ee60d9c7-6a54-406c-8c32-7adfd7c01fad.pdf&urlslug=the-400-metres
//   - UK Athletics, Khmel & Lester, "Classifying Sprint Training Methods"
//     https://speedendurance.com/wp-content/uploads/ebooks/UKA-Michael_Khmel&Tony_Lester_CLASSIFYING_SPRINT_TRAINING_METHODS.pdf
//   - Haugen et al., "The Training and Development of Elite Sprint Performance", Sports Med Open (2019)
//     https://pmc.ncbi.nlm.nih.gov/articles/PMC6872694/
//   - NSCA, "Designing Speed Training Sessions" (Developing Speed excerpt)
//     https://www.nsca.com/education/articles/kinetic-select/designing-speed-training-sessions
//   - Australian Athletics, "Energy System Chart"
//     https://coachathletics.com.au/coaching-education/energy-system-chart-how-to-train-maximum-speed-speed-endurance-and-tempo
//
// The 400m paces below are examples for a 52-second runner. They are starting points for a
// coach to adjust, not a universal prescription. The library owns each movement; these files
// own the dose.

import type { EventGroup, EnergySystem } from '../types/exercise';

/** Bump when the pack changes in a way clubs should be able to refresh deliberately. */
export const STARTER_PACK_VERSION = 2;

export type StarterWorkoutIntent = 'high' | 'moderate' | 'low';

export type StarterWorkoutExercise = {
  exercise: string;
  sets: number;
  reps: string;
  restSeconds: number;
  tempo?: string;
  targetZone?: string;
  coachingNotes?: string;
};

export type StarterWorkout = {
  name: string;
  description: string;
  targetEventGroup: EventGroup;
  periodizationPhase: 'off-season' | 'pre-comp' | 'competition' | 'transition';
  energySystemFocus: EnergySystem;
  templateType: 'speed' | 'strength' | 'endurance' | 'technique' | 'recovery' | 'testing';
  estimatedRPE: number;
  estimatedDurationMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  /** The block this session belongs to. Helps a coach see the shape of the week. */
  program: '400m Starter Block';
  week: 1 | 2 | 3 | 4;
  slot: 1 | 2 | 3;
  intent: StarterWorkoutIntent;
  exercises: StarterWorkoutExercise[];
};

export const STARTER_WORKOUTS: StarterWorkout[] = [
  // ==================== WEEK 1 — GENERAL PREPARATION ====================
  {
    name: '400m Wk1 · Acceleration & Strength',
    description:
      'Week 1 high day. Short accelerations build the first-step drive; the strength block is moderate and stops two reps short of failure. Full recovery between sprints, and end the set if posture or speed drops.',
    targetEventGroup: 'sprints',
    periodizationPhase: 'off-season',
    energySystemFocus: 'mixed',
    templateType: 'strength',
    estimatedRPE: 7,
    estimatedDurationMinutes: 80,
    difficulty: 'intermediate',
    tags: ['400m', '4-week block', 'week 1', 'high day', 'acceleration', 'strength'],
    program: '400m Starter Block',
    week: 1,
    slot: 1,
    intent: 'high',
    exercises: [
      {
        exercise: 'Easy Jog',
        sets: 1,
        reps: '8 min',
        restSeconds: 0,
        coachingNotes: 'Build warmth gradually; finish able to talk in short sentences.',
      },
      {
        exercise: 'Leg Swings (Front-to-Back)',
        sets: 2,
        reps: '10 each leg',
        restSeconds: 30,
        coachingNotes: 'Relaxed pendulum; let the range build without forcing it.',
      },
      {
        exercise: 'Hip Circle Walk',
        sets: 2,
        reps: '8 each direction',
        restSeconds: 30,
        coachingNotes: 'Small steps, tall posture, controlled hip circles.',
      },
      {
        exercise: 'Spiderman Lunge with Reach',
        sets: 2,
        reps: '6 each side',
        restSeconds: 45,
        coachingNotes: 'Reach long through the opposite arm; keep the back foot active.',
      },
      {
        exercise: 'A-Skip',
        sets: 3,
        reps: '20m',
        restSeconds: 60,
        targetZone: 'rhythm',
        coachingNotes: 'Knee to hip height, quiet ground contact, tall posture.',
      },
      {
        exercise: '10m Acceleration',
        sets: 4,
        reps: '10m',
        restSeconds: 120,
        targetZone: 'maximal intent',
        coachingNotes: 'Push the ground back for the first three steps; do not cycle the legs.',
      },
      {
        exercise: '20m Acceleration',
        sets: 3,
        reps: '20m',
        restSeconds: 180,
        targetZone: '95% effort',
        coachingNotes: 'Stay patient for 10m, then let the posture rise.',
      },
      {
        exercise: 'Barbell Squat',
        sets: 4,
        reps: '5',
        restSeconds: 180,
        tempo: 'controlled down, fast up',
        targetZone: '80–85% 1RM, 2 reps in reserve',
        coachingNotes: 'Stop the set when bar speed slows noticeably.',
      },
      {
        exercise: 'Romanian Deadlift',
        sets: 3,
        reps: '6',
        restSeconds: 150,
        targetZone: '70–75% 1RM',
        coachingNotes: 'Hips back, ribs down, hamstrings loaded; no lower-back rounding.',
      },
      {
        exercise: 'Copenhagen Adductor',
        sets: 2,
        reps: '30s each side',
        restSeconds: 45,
        coachingNotes: 'Keep the hips level and the movement pain-free.',
      },
      {
        exercise: 'Bird Dog',
        sets: 2,
        reps: '8 each side',
        restSeconds: 45,
        coachingNotes: 'Move slowly; keep the pelvis still as the arm and leg reach.',
      },
      {
        exercise: 'Easy Jog',
        sets: 1,
        reps: '5 min',
        restSeconds: 0,
        coachingNotes: 'Very easy; this is a flush, not more training.',
      },
      {
        exercise: 'Mobility Flow',
        sets: 1,
        reps: '8 min',
        restSeconds: 0,
      },
    ],
  },
  {
    name: '400m Wk1 · Extensive Tempo',
    description:
      'Week 1 low day. Extensive tempo builds aerobic support without adding heavy fatigue. Keep every 200m relaxed and repeatable; if the last rep is slower than the first, stop.',
    targetEventGroup: 'sprints',
    periodizationPhase: 'off-season',
    energySystemFocus: 'aerobic',
    templateType: 'recovery',
    estimatedRPE: 4,
    estimatedDurationMinutes: 50,
    difficulty: 'beginner',
    tags: ['400m', '4-week block', 'week 1', 'low day', 'tempo', 'aerobic'],
    program: '400m Starter Block',
    week: 1,
    slot: 2,
    intent: 'low',
    exercises: [
      {
        exercise: 'Easy Jog',
        sets: 1,
        reps: '8 min',
        restSeconds: 0,
      },
      {
        exercise: 'Leg Swings (Lateral)',
        sets: 2,
        reps: '10 each leg',
        restSeconds: 30,
      },
      {
        exercise: 'Ankle Rock',
        sets: 2,
        reps: '8 each side',
        restSeconds: 30,
        coachingNotes: 'Knee tracks over the toes; keep the heel down.',
      },
      {
        exercise: 'A-Skip',
        sets: 3,
        reps: '20m',
        restSeconds: 60,
      },
      {
        exercise: 'Tempo 200m',
        sets: 8,
        reps: '200m',
        restSeconds: 90,
        targetZone: '65–75% effort (~40–45s per 200m for a 52s runner)',
        coachingNotes: 'Relaxed running; the last rep should look like the first. Walk or jog the recovery.',
      },
      {
        exercise: 'Easy Jog',
        sets: 1,
        reps: '5 min',
        restSeconds: 0,
      },
      {
        exercise: 'Mobility Flow',
        sets: 1,
        reps: '10 min',
        restSeconds: 0,
      },
      {
        exercise: 'Foam Roll Circuit',
        sets: 1,
        reps: '8 min',
        restSeconds: 0,
      },
    ],
  },
  {
    name: '400m Wk1 · Mechanics & Elastic',
    description:
      'Week 1 technique day. Low-volume plyometrics and gait drills teach fast, quiet ground contact. The session ends before fatigue changes the pattern.',
    targetEventGroup: 'sprints',
    periodizationPhase: 'off-season',
    energySystemFocus: 'atp-pcr',
    templateType: 'technique',
    estimatedRPE: 6,
    estimatedDurationMinutes: 65,
    difficulty: 'intermediate',
    tags: ['400m', '4-week block', 'week 1', 'moderate day', 'mechanics', 'plyometric'],
    program: '400m Starter Block',
    week: 1,
    slot: 3,
    intent: 'moderate',
    exercises: [
      {
        exercise: 'Easy Jog',
        sets: 1,
        reps: '6 min',
        restSeconds: 0,
      },
      {
        exercise: 'Toy Soldier Walk',
        sets: 2,
        reps: '10 each leg',
        restSeconds: 30,
        coachingNotes: 'Kick tall, then reach for the opposite toe without bouncing.',
      },
      {
        exercise: 'Leg Swings (Front-to-Back)',
        sets: 2,
        reps: '10 each leg',
        restSeconds: 30,
      },
      {
        exercise: 'Posture Wall Drill',
        sets: 2,
        reps: '10 each leg',
        restSeconds: 45,
        coachingNotes: 'Lean from the ankles, not the waist; keep the hips level.',
      },
      {
        exercise: 'A-Skip',
        sets: 4,
        reps: '20m',
        restSeconds: 60,
        coachingNotes: 'Fast ground contact; do not reach for the next step.',
      },
      {
        exercise: 'B-Skip',
        sets: 3,
        reps: '20m',
        restSeconds: 60,
        coachingNotes: 'Let the lower leg unfold, then strike under the hip.',
      },
      {
        exercise: 'Wicket Run',
        sets: 4,
        reps: '5 wickets',
        restSeconds: 75,
        coachingNotes: 'Short, quick contacts; adjust the spacing if the athlete is reaching.',
      },
      {
        exercise: 'Pogo Hop',
        sets: 3,
        reps: '10',
        restSeconds: 60,
        coachingNotes: 'Stiff ankles, quiet landings, minimal knee bend.',
      },
      {
        exercise: 'Hurdle Hop',
        sets: 3,
        reps: '5',
        restSeconds: 90,
        coachingNotes: 'Low hurdle, soft landings; reset if the rhythm breaks.',
      },
      {
        exercise: 'Single-Leg Romanian Deadlift',
        sets: 3,
        reps: '8 each leg',
        restSeconds: 90,
        coachingNotes: 'Hips square, slow eccentric, no rotation.',
      },
      {
        exercise: 'Mobility Flow',
        sets: 1,
        reps: '8 min',
        restSeconds: 0,
      },
    ],
  },

  // ==================== WEEK 2 — SPEED / SPEED ENDURANCE ====================
  {
    name: '400m Wk2 · Max Velocity',
    description:
      'Week 2 high day. Max-velocity work is the highest-quality session of the week: short volume, full recovery, and no reaching. Build-ups prepare the nervous system; stop if speed or mechanics drop.',
    targetEventGroup: 'sprints',
    periodizationPhase: 'pre-comp',
    energySystemFocus: 'atp-pcr',
    templateType: 'speed',
    estimatedRPE: 8,
    estimatedDurationMinutes: 75,
    difficulty: 'advanced',
    tags: ['400m', '4-week block', 'week 2', 'high day', 'max velocity'],
    program: '400m Starter Block',
    week: 2,
    slot: 1,
    intent: 'high',
    exercises: [
      {
        exercise: 'Easy Jog',
        sets: 1,
        reps: '8 min',
        restSeconds: 0,
      },
      {
        exercise: 'Leg Swings (Front-to-Back)',
        sets: 2,
        reps: '10 each leg',
        restSeconds: 30,
      },
      {
        exercise: 'Hip Circle Walk',
        sets: 2,
        reps: '8 each direction',
        restSeconds: 30,
      },
      {
        exercise: 'A-Skip',
        sets: 3,
        reps: '20m',
        restSeconds: 60,
      },
      {
        exercise: 'Build-Up 60m',
        sets: 2,
        reps: '60m',
        restSeconds: 120,
        targetZone: 'smooth build to 90%',
        coachingNotes: 'Gradual acceleration; do not turn the build-up into a race.',
      },
      {
        exercise: 'Flying 20m',
        sets: 3,
        reps: '20m',
        restSeconds: 240,
        targetZone: '95–100% max velocity',
        coachingNotes: 'Use a 20–30m build-up. Stay tall and relaxed through the flying zone.',
      },
      {
        exercise: 'Flying 30m',
        sets: 2,
        reps: '30m',
        restSeconds: 300,
        targetZone: '95–100% max velocity',
        coachingNotes: 'Stop the set if the athlete starts reaching or straining.',
      },
      {
        exercise: 'Max Velocity Run 60m',
        sets: 2,
        reps: '60m',
        restSeconds: 300,
        targetZone: '95–100% max velocity',
        coachingNotes: 'Relaxed speed; the rep ends when posture or frequency drops.',
      },
      {
        exercise: 'Nordic Hamstring Curl',
        sets: 3,
        reps: '5',
        restSeconds: 90,
        coachingNotes: 'Slow eccentric; use a band or partner if needed.',
      },
      {
        exercise: 'Copenhagen Adductor',
        sets: 2,
        reps: '30s each side',
        restSeconds: 45,
      },
      {
        exercise: 'Easy Jog',
        sets: 1,
        reps: '5 min',
        restSeconds: 0,
      },
      {
        exercise: 'Mobility Flow',
        sets: 1,
        reps: '8 min',
        restSeconds: 0,
      },
    ],
  },
  {
    name: '400m Wk2 · Tempo & Recovery',
    description:
      'Week 2 low day. Flush the legs with relaxed tempo and mobility. No hero reps — this session protects the quality of Friday’s speed endurance.',
    targetEventGroup: 'sprints',
    periodizationPhase: 'pre-comp',
    energySystemFocus: 'aerobic',
    templateType: 'recovery',
    estimatedRPE: 3,
    estimatedDurationMinutes: 45,
    difficulty: 'beginner',
    tags: ['400m', '4-week block', 'week 2', 'low day', 'tempo', 'recovery'],
    program: '400m Starter Block',
    week: 2,
    slot: 2,
    intent: 'low',
    exercises: [
      {
        exercise: 'Easy Jog',
        sets: 1,
        reps: '8 min',
        restSeconds: 0,
      },
      {
        exercise: 'Leg Swings (Front-to-Back)',
        sets: 2,
        reps: '10 each leg',
        restSeconds: 30,
      },
      {
        exercise: 'Tempo 200m',
        sets: 6,
        reps: '200m',
        restSeconds: 90,
        targetZone: '65–75% effort (~40–45s per 200m for a 52s runner)',
        coachingNotes: 'Keep the same rhythm throughout; stop if the athlete is straining.',
      },
      {
        exercise: 'Mobility Flow',
        sets: 1,
        reps: '10 min',
        restSeconds: 0,
      },
      {
        exercise: 'Foam Roll Circuit',
        sets: 1,
        reps: '8 min',
        restSeconds: 0,
      },
      {
        exercise: 'Breathing Reset',
        sets: 1,
        reps: '3 min',
        restSeconds: 0,
      },
    ],
  },
  {
    name: '400m Wk2 · Speed Endurance 3×60',
    description:
      'Week 2 high day. Short speed-endurance repeats at near-maximum speed with full recovery. The goal is to hold mechanics, not to accumulate fatigue. A 52s runner should leave each rep feeling fast, not emptied.',
    targetEventGroup: 'sprints',
    periodizationPhase: 'pre-comp',
    energySystemFocus: 'glycolytic',
    templateType: 'endurance',
    estimatedRPE: 8,
    estimatedDurationMinutes: 70,
    difficulty: 'advanced',
    tags: ['400m', '4-week block', 'week 2', 'high day', 'speed endurance'],
    program: '400m Starter Block',
    week: 2,
    slot: 3,
    intent: 'high',
    exercises: [
      {
        exercise: 'Easy Jog',
        sets: 1,
        reps: '8 min',
        restSeconds: 0,
      },
      {
        exercise: 'Leg Swings (Lateral)',
        sets: 2,
        reps: '10 each leg',
        restSeconds: 30,
      },
      {
        exercise: 'A-Skip',
        sets: 3,
        reps: '20m',
        restSeconds: 60,
      },
      {
        exercise: 'Build-Up 60m',
        sets: 2,
        reps: '60m',
        restSeconds: 120,
        targetZone: 'smooth build to 90%',
      },
      {
        exercise: 'Speed Endurance 3 × 60m',
        sets: 3,
        reps: '60m',
        restSeconds: 360,
        targetZone: '95% of the athlete’s best 60m; full recovery',
        coachingNotes:
          'Stop the set if the athlete cannot reproduce the previous rep or posture collapses. This is not a time trial.',
      },
      {
        exercise: 'Nordic Hamstring Curl',
        sets: 3,
        reps: '5',
        restSeconds: 90,
      },
      {
        exercise: 'Easy Jog',
        sets: 1,
        reps: '5 min',
        restSeconds: 0,
      },
      {
        exercise: 'Mobility Flow',
        sets: 1,
        reps: '8 min',
        restSeconds: 0,
      },
    ],
  },

  // ==================== WEEK 3 — SPECIAL ENDURANCE ====================
  {
    name: '400m Wk3 · Special Endurance 2×200',
    description:
      'Week 3 high day. Race-pace 200s rehearse the speed and posture of the first half of a 400m. Full recovery is non-negotiable; the second rep should match the first. Example for a 52s runner: about 25s per 200m.',
    targetEventGroup: 'sprints',
    periodizationPhase: 'pre-comp',
    energySystemFocus: 'glycolytic',
    templateType: 'endurance',
    estimatedRPE: 9,
    estimatedDurationMinutes: 80,
    difficulty: 'advanced',
    tags: ['400m', '4-week block', 'week 3', 'high day', 'special endurance', 'race pace'],
    program: '400m Starter Block',
    week: 3,
    slot: 1,
    intent: 'high',
    exercises: [
      {
        exercise: 'Easy Jog',
        sets: 1,
        reps: '10 min',
        restSeconds: 0,
      },
      {
        exercise: 'Leg Swings (Front-to-Back)',
        sets: 2,
        reps: '10 each leg',
        restSeconds: 30,
      },
      {
        exercise: 'A-Skip',
        sets: 3,
        reps: '20m',
        restSeconds: 60,
      },
      {
        exercise: 'Build-Up 60m',
        sets: 2,
        reps: '60m',
        restSeconds: 120,
        targetZone: 'smooth build to 90%',
      },
      {
        exercise: 'Special Endurance 2 × 200m',
        sets: 2,
        reps: '200m',
        restSeconds: 480,
        targetZone: '~25s per 200m for a 52s runner; even splits',
        coachingNotes:
          'Record both splits. If the second rep drops off badly, end the session rather than chasing volume.',
      },
      {
        exercise: 'Nordic Hamstring Curl',
        sets: 3,
        reps: '5',
        restSeconds: 90,
      },
      {
        exercise: 'Copenhagen Adductor',
        sets: 2,
        reps: '30s each side',
        restSeconds: 45,
      },
      {
        exercise: 'Easy Jog',
        sets: 1,
        reps: '8 min',
        restSeconds: 0,
      },
      {
        exercise: 'Mobility Flow',
        sets: 1,
        reps: '10 min',
        restSeconds: 0,
      },
    ],
  },
  {
    name: '400m Wk3 · Strength Maintenance',
    description:
      'Week 3 moderate day. Maintain strength without heavy soreness: moderate loads, low volume, clean technique. This supports the race-pace sessions rather than competing with them.',
    targetEventGroup: 'sprints',
    periodizationPhase: 'pre-comp',
    energySystemFocus: 'mixed',
    templateType: 'strength',
    estimatedRPE: 6,
    estimatedDurationMinutes: 60,
    difficulty: 'intermediate',
    tags: ['400m', '4-week block', 'week 3', 'moderate day', 'strength', 'prehab'],
    program: '400m Starter Block',
    week: 3,
    slot: 2,
    intent: 'moderate',
    exercises: [
      {
        exercise: 'Easy Jog',
        sets: 1,
        reps: '6 min',
        restSeconds: 0,
      },
      {
        exercise: 'Leg Swings (Front-to-Back)',
        sets: 2,
        reps: '10 each leg',
        restSeconds: 30,
      },
      {
        exercise: 'Hip Circle Walk',
        sets: 2,
        reps: '8 each direction',
        restSeconds: 30,
      },
      {
        exercise: 'Trap Bar Deadlift',
        sets: 3,
        reps: '3',
        restSeconds: 180,
        targetZone: '85% 1RM, fast concentric',
        coachingNotes: 'Crisp reps; stop if the bar slows or the back rounds.',
      },
      {
        exercise: 'Bulgarian Split Squat',
        sets: 3,
        reps: '6 each leg',
        restSeconds: 90,
        targetZone: 'bodyweight or light dumbbells',
        coachingNotes: 'Front knee tracks over the toes; stay tall.',
      },
      {
        exercise: 'Standing Barbell Calf Raise',
        sets: 3,
        reps: '8',
        restSeconds: 60,
        coachingNotes: 'Full range, pause at the top, slow lower.',
      },
      {
        exercise: 'Pallof Press',
        sets: 3,
        reps: '10 each side',
        restSeconds: 60,
        coachingNotes: 'Resist rotation; breathe out as the arms extend.',
      },
      {
        exercise: 'Copenhagen Adductor',
        sets: 2,
        reps: '30s each side',
        restSeconds: 45,
      },
      {
        exercise: 'Foam Roll Circuit',
        sets: 1,
        reps: '8 min',
        restSeconds: 0,
      },
    ],
  },
  {
    name: '400m Wk3 · Broken 400m',
    description:
      'Week 3 high day. The broken 400m rehearses the second half with a short recovery. Run the first 200m at target pace, take 60–90s, then finish with the same posture. One quality set is enough.',
    targetEventGroup: 'sprints',
    periodizationPhase: 'pre-comp',
    energySystemFocus: 'glycolytic',
    templateType: 'endurance',
    estimatedRPE: 9,
    estimatedDurationMinutes: 75,
    difficulty: 'advanced',
    tags: ['400m', '4-week block', 'week 3', 'high day', 'race model', 'special endurance'],
    program: '400m Starter Block',
    week: 3,
    slot: 3,
    intent: 'high',
    exercises: [
      {
        exercise: 'Easy Jog',
        sets: 1,
        reps: '10 min',
        restSeconds: 0,
      },
      {
        exercise: 'Leg Swings (Lateral)',
        sets: 2,
        reps: '10 each leg',
        restSeconds: 30,
      },
      {
        exercise: 'A-Skip',
        sets: 3,
        reps: '20m',
        restSeconds: 60,
      },
      {
        exercise: 'Build-Up 60m',
        sets: 2,
        reps: '60m',
        restSeconds: 120,
        targetZone: 'smooth build to 90%',
      },
      {
        exercise: 'Broken 400m (200 + 200)',
        sets: 1,
        reps: '400m',
        restSeconds: 600,
        targetZone:
          '200m at ~25s + 60–90s recovery + 200m at ~26–27s for a 52s runner',
        coachingNotes:
          'One quality set. Compare the two halves; a large drop-off means the opening pace was too ambitious.',
      },
      {
        exercise: 'Nordic Hamstring Curl',
        sets: 3,
        reps: '5',
        restSeconds: 90,
      },
      {
        exercise: 'Easy Jog',
        sets: 1,
        reps: '8 min',
        restSeconds: 0,
      },
      {
        exercise: 'Mobility Flow',
        sets: 1,
        reps: '10 min',
        restSeconds: 0,
      },
    ],
  },

  // ==================== WEEK 4 — TAPER / RACE MODEL ====================
  {
    name: '400m Wk4 · Race Activation',
    description:
      'Week 4 taper. Short, sharp work keeps the nervous system ready without adding fatigue. Everything is fast and relaxed; leave the track feeling better than you arrived.',
    targetEventGroup: 'sprints',
    periodizationPhase: 'competition',
    energySystemFocus: 'atp-pcr',
    templateType: 'speed',
    estimatedRPE: 6,
    estimatedDurationMinutes: 55,
    difficulty: 'intermediate',
    tags: ['400m', '4-week block', 'week 4', 'taper', 'activation', 'speed'],
    program: '400m Starter Block',
    week: 4,
    slot: 1,
    intent: 'moderate',
    exercises: [
      {
        exercise: 'Easy Jog',
        sets: 1,
        reps: '8 min',
        restSeconds: 0,
      },
      {
        exercise: 'Leg Swings (Front-to-Back)',
        sets: 2,
        reps: '10 each leg',
        restSeconds: 30,
      },
      {
        exercise: 'A-Skip',
        sets: 3,
        reps: '20m',
        restSeconds: 60,
      },
      {
        exercise: 'Block Start',
        sets: 3,
        reps: '10m',
        restSeconds: 120,
        targetZone: 'crisp first step',
        coachingNotes: 'Full recovery; the goal is quality, not conditioning.',
      },
      {
        exercise: '30m Acceleration',
        sets: 2,
        reps: '30m',
        restSeconds: 180,
        targetZone: '95% effort',
      },
      {
        exercise: 'Flying 20m',
        sets: 2,
        reps: '20m',
        restSeconds: 240,
        targetZone: '95–100% max velocity',
        coachingNotes: 'Stop after two good reps; do not chase a third.',
      },
      {
        exercise: 'Easy Jog',
        sets: 1,
        reps: '5 min',
        restSeconds: 0,
      },
      {
        exercise: 'Mobility Flow',
        sets: 1,
        reps: '8 min',
        restSeconds: 0,
      },
    ],
  },
  {
    name: '400m Wk4 · Split 400m',
    description:
      'Week 4 race model. The 300m sets the position; after 60s the final 100m rehearses the finish. Example for a 52s runner: 38–39s for 300m, then 13–14s for 100m. One set, full recovery.',
    targetEventGroup: 'sprints',
    periodizationPhase: 'competition',
    energySystemFocus: 'glycolytic',
    templateType: 'endurance',
    estimatedRPE: 8,
    estimatedDurationMinutes: 65,
    difficulty: 'advanced',
    tags: ['400m', '4-week block', 'week 4', 'race model', 'special endurance', 'taper'],
    program: '400m Starter Block',
    week: 4,
    slot: 2,
    intent: 'high',
    exercises: [
      {
        exercise: 'Easy Jog',
        sets: 1,
        reps: '10 min',
        restSeconds: 0,
      },
      {
        exercise: 'Leg Swings (Front-to-Back)',
        sets: 2,
        reps: '10 each leg',
        restSeconds: 30,
      },
      {
        exercise: 'A-Skip',
        sets: 3,
        reps: '20m',
        restSeconds: 60,
      },
      {
        exercise: 'Build-Up 60m',
        sets: 1,
        reps: '60m',
        restSeconds: 120,
        targetZone: 'smooth build to 90%',
      },
      {
        exercise: 'Split 400m (300 + 100)',
        sets: 1,
        reps: '400m',
        restSeconds: 600,
        targetZone:
          '300m at ~38–39s + 60s recovery + 100m at ~13–14s for a 52s runner',
        coachingNotes:
          'One set. The 300m should feel controlled, not all-out; the final 100m should be the fastest part of the session.',
      },
      {
        exercise: 'Easy Jog',
        sets: 1,
        reps: '8 min',
        restSeconds: 0,
      },
      {
        exercise: 'Mobility Flow',
        sets: 1,
        reps: '10 min',
        restSeconds: 0,
      },
    ],
  },
  {
    name: '400m Wk4 · Pre-Race Recovery',
    description:
      'Week 4 low day. Very light tempo, mobility and breathing before competition. The work is done; this session protects freshness and confidence.',
    targetEventGroup: 'sprints',
    periodizationPhase: 'competition',
    energySystemFocus: 'aerobic',
    templateType: 'recovery',
    estimatedRPE: 2,
    estimatedDurationMinutes: 35,
    difficulty: 'beginner',
    tags: ['400m', '4-week block', 'week 4', 'low day', 'pre-race', 'recovery'],
    program: '400m Starter Block',
    week: 4,
    slot: 3,
    intent: 'low',
    exercises: [
      {
        exercise: 'Easy Jog',
        sets: 1,
        reps: '8 min',
        restSeconds: 0,
      },
      {
        exercise: 'Leg Swings (Front-to-Back)',
        sets: 2,
        reps: '10 each leg',
        restSeconds: 30,
      },
      {
        exercise: 'Tempo 200m',
        sets: 4,
        reps: '200m',
        restSeconds: 90,
        targetZone: '65–70% effort (~42–47s per 200m for a 52s runner)',
        coachingNotes: 'Easy and relaxed; this is not a fitness session.',
      },
      {
        exercise: 'Mobility Flow',
        sets: 1,
        reps: '10 min',
        restSeconds: 0,
      },
      {
        exercise: 'Breathing Reset',
        sets: 1,
        reps: '3 min',
        restSeconds: 0,
      },
      {
        exercise: 'Foam Roll Circuit',
        sets: 1,
        reps: '8 min',
        restSeconds: 0,
      },
    ],
  },
];
