// src/seed-history.ts
// Give the club a realistic training history so the recommendation engine, dashboards and
// analytics have something to reason about.
//
// `npm run db:seed` stands up the environment (club, logins, roster, exercises). This script
// is the second half: eight weeks of sessions, attendance, workouts, completed logs, results,
// fitness tests, goals, readiness check-ins and a few injuries.
//
// Usage:
//   npm run db:seed:history
//   npm run db:seed:history -- --weeks 12
//   npm run db:seed:history -- --reset      # remove previously generated history first
//   npm run db:seed:history -- --force      # permit running while NODE_ENV=production
//
// Every generated document is tagged `demoSeed: true` so `--reset` only removes what this
// script created, never a coach's real records. Re-running is idempotent: each collection is
// upserted on a natural key.
//
// The generation is deterministic (seeded pseudo-random), so two runs produce the same club
// story — which matters when a reviewer compares screenshots or recommendation output.

import { Db, ObjectId } from 'mongodb';
import { closeDatabaseConnection, connectToDatabase } from './config/database';
import { env } from './config/env';

type Options = {
  weeks: number;
  reset: boolean;
  force: boolean;
  clubName: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DEMO_TAG = { demoSeed: true };

// Collections this script owns. `--reset` clears only rows tagged demoSeed.
const HISTORY_COLLECTIONS = [
  'training_sessions',
  'attendance_records',
  'workouts',
  'workout_assignments',
  'workout_logs',
  'competitions',
  'performance_results',
  'fitness_tests',
  'athlete_goals',
  'daily_readiness',
  'injuries',
  'injury_wellness',
];

function parseOptions(argv: string[]): Options {
  const options: Options = { weeks: 8, reset: false, force: false, clubName: null };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      console.log(`
STMS demo history

  npm run db:seed:history
  npm run db:seed:history -- --weeks 12
  npm run db:seed:history -- --reset
  npm run db:seed:history -- --club "Riverside Athletics Club"

Flags:
  --weeks <n>   how many weeks of history to generate (default: 8)
  --club <name> club to attach the history to (default: the only club, or first by name)
  --reset       delete previously generated (demoSeed) history first
  --force       permit running while NODE_ENV=production
`);
      process.exit(0);
    }

    if (arg === '--weeks') {
      const value = Number(argv[index + 1]);
      if (!Number.isFinite(value) || value < 1 || value > 52) {
        throw new Error('--weeks must be a number between 1 and 52');
      }
      options.weeks = Math.floor(value);
      index += 1;
    } else if (arg === '--club') {
      const value = argv[index + 1];
      if (!value) throw new Error('--club requires a value');
      options.clubName = value;
      index += 1;
    } else if (arg === '--reset') {
      options.reset = true;
    } else if (arg === '--force') {
      options.force = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

/** Deterministic PRNG (mulberry32) so the generated club story is stable across runs. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function daysAgo(reference: Date, days: number): Date {
  return new Date(reference.getTime() - days * DAY_MS);
}

function atUtc(date: string, hours: number, minutes = 0): Date {
  return new Date(`${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`);
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function pick<T>(random: () => number, values: T[]): T {
  return values[Math.floor(random() * values.length)];
}

// ==================== EVENT GROUPING ====================

type EventGroup = 'sprints' | 'middle_distance' | 'long_distance' | 'jumps' | 'throws' | 'combined';

/**
 * Events are stored the way coaches write them ("100m sprint", "long jump"), not the snake_case
 * keys in config.yaml. Normalising here keeps template matching and the rule engine aligned
 * with real roster data.
 */
function eventGroupFor(events: string[]): EventGroup | 'unknown' {
  for (const raw of events) {
    const event = raw.toLowerCase().trim();

    if (event.includes('decathlon') || event.includes('heptathlon')) return 'combined';
    if (event.includes('shot put') || event.includes('discus') || event.includes('javelin') || event.includes('hammer')) return 'throws';
    if (event.includes('jump') || event.includes('vault')) return 'jumps';
    if (event.includes('cross country') || event.includes('marathon') || event.includes('10000')) return 'long_distance';
    if (event.includes('800') || event.includes('1500') || event.includes('3000') || event.includes('mile')) return 'middle_distance';
    if (event.includes('sprint') || event.includes('hurdle')) return 'sprints';
    if (/^(60|100|200|400)m$/.test(event)) return 'sprints';
    if (/^(5000|10000)m$/.test(event)) return 'long_distance';
  }

  return 'unknown';
}

// ==================== WORKOUT TEMPLATES ====================

type ExerciseMap = Map<string, ObjectId>;

type TemplateExercise = {
  exercise: string;
  sets: number;
  reps: string;
  restSeconds: number;
  tempo?: string;
  targetZone?: string;
  coachingNotes?: string;
};

type WorkoutTemplate = {
  name: string;
  description: string;
  targetEventGroup: EventGroup;
  periodizationPhase: 'off-season' | 'pre-comp' | 'competition' | 'transition';
  energySystemFocus: 'atp-pcr' | 'glycolytic' | 'aerobic' | 'mixed';
  templateType: 'speed' | 'strength' | 'endurance' | 'technique' | 'recovery' | 'testing';
  estimatedRPE: number;
  estimatedDurationMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  exercises: TemplateExercise[];
};

const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    name: 'Sprint Speed Development',
    description: 'Maximal-velocity exposure with full recovery, supported by posterior-chain strength.',
    targetEventGroup: 'sprints',
    periodizationPhase: 'off-season',
    energySystemFocus: 'atp-pcr',
    templateType: 'speed',
    estimatedRPE: 8,
    estimatedDurationMinutes: 90,
    difficulty: 'advanced',
    tags: ['speed', 'sprints', 'max-velocity'],
    exercises: [
      { exercise: 'A-Skip Drill', sets: 4, reps: '20m', restSeconds: 60, targetZone: 'rhythm', coachingNotes: 'Tall posture, fast ground contact.' },
      { exercise: 'Flying 30m Sprint', sets: 5, reps: '30m', restSeconds: 240, targetZone: '95-100% max velocity', coachingNotes: 'Full recovery — quality over volume.' },
      { exercise: 'Box Jump', sets: 4, reps: '5', restSeconds: 120, targetZone: 'explosive', coachingNotes: 'Step down, never rebound.' },
      { exercise: 'Back Squat', sets: 4, reps: '5', restSeconds: 180, targetZone: '80-85% 1RM', tempo: 'controlled' },
      { exercise: 'Nordic Hamstring Curl', sets: 3, reps: '6', restSeconds: 90, coachingNotes: 'Slow eccentric, no cramping.' },
      { exercise: 'Plank', sets: 3, reps: '45s', restSeconds: 45 },
      { exercise: 'Mobility Flow', sets: 1, reps: '8 min', restSeconds: 0 },
    ],
  },
  {
    name: 'Sprint Endurance',
    description: 'Speed endurance with incomplete recovery to rehearse race rhythm.',
    targetEventGroup: 'sprints',
    periodizationPhase: 'pre-comp',
    energySystemFocus: 'glycolytic',
    templateType: 'endurance',
    estimatedRPE: 8,
    estimatedDurationMinutes: 75,
    difficulty: 'advanced',
    tags: ['speed-endurance', 'sprints'],
    exercises: [
      { exercise: 'A-Skip Drill', sets: 3, reps: '20m', restSeconds: 60 },
      { exercise: 'Flying 30m Sprint', sets: 3, reps: '30m', restSeconds: 180, targetZone: '95% max velocity' },
      { exercise: 'Bounding', sets: 3, reps: '6 contacts', restSeconds: 120 },
      { exercise: 'Romanian Deadlift', sets: 3, reps: '8', restSeconds: 120, targetZone: '70-75% 1RM' },
      { exercise: 'Plank', sets: 3, reps: '45s', restSeconds: 45 },
      { exercise: 'Mobility Flow', sets: 1, reps: '8 min', restSeconds: 0 },
    ],
  },
  {
    name: 'Strength & Power',
    description: 'General strength block that keeps the athlete robust through the off-season.',
    targetEventGroup: 'sprints',
    periodizationPhase: 'off-season',
    energySystemFocus: 'mixed',
    templateType: 'strength',
    estimatedRPE: 7,
    estimatedDurationMinutes: 80,
    difficulty: 'intermediate',
    tags: ['strength', 'power'],
    exercises: [
      { exercise: 'A-Skip Drill', sets: 3, reps: '20m', restSeconds: 45 },
      { exercise: 'Box Jump', sets: 4, reps: '4', restSeconds: 120 },
      { exercise: 'Back Squat', sets: 5, reps: '5', restSeconds: 180, targetZone: '80-85% 1RM' },
      { exercise: 'Romanian Deadlift', sets: 4, reps: '6', restSeconds: 150, targetZone: '75-80% 1RM' },
      { exercise: 'Bench Press', sets: 4, reps: '6', restSeconds: 150, targetZone: '75-80% 1RM' },
      { exercise: 'Pull-Up', sets: 3, reps: '8', restSeconds: 90 },
      { exercise: 'Nordic Hamstring Curl', sets: 3, reps: '6', restSeconds: 90 },
      { exercise: 'Plank', sets: 3, reps: '60s', restSeconds: 45 },
    ],
  },
  {
    name: 'Jump Technique',
    description: 'Approach rhythm and take-off mechanics at sub-maximal intensity.',
    targetEventGroup: 'jumps',
    periodizationPhase: 'off-season',
    energySystemFocus: 'atp-pcr',
    templateType: 'technique',
    estimatedRPE: 6,
    estimatedDurationMinutes: 75,
    difficulty: 'intermediate',
    tags: ['jumps', 'technique'],
    exercises: [
      { exercise: 'A-Skip Drill', sets: 4, reps: '20m', restSeconds: 60, coachingNotes: 'Same rhythm as the approach.' },
      { exercise: 'Bounding', sets: 4, reps: '6 contacts', restSeconds: 120 },
      { exercise: 'Box Jump', sets: 3, reps: '5', restSeconds: 120 },
      { exercise: 'Back Squat', sets: 3, reps: '5', restSeconds: 180, targetZone: '75-80% 1RM' },
      { exercise: 'Nordic Hamstring Curl', sets: 3, reps: '6', restSeconds: 90 },
      { exercise: 'Mobility Flow', sets: 1, reps: '10 min', restSeconds: 0 },
    ],
  },
  {
    name: 'Jump Power',
    description: 'Short ground contacts and maximal intent, kept fresh for competition.',
    targetEventGroup: 'jumps',
    periodizationPhase: 'pre-comp',
    energySystemFocus: 'atp-pcr',
    templateType: 'strength',
    estimatedRPE: 7,
    estimatedDurationMinutes: 70,
    difficulty: 'advanced',
    tags: ['jumps', 'power'],
    exercises: [
      { exercise: 'A-Skip Drill', sets: 3, reps: '20m', restSeconds: 60 },
      { exercise: 'Box Jump', sets: 5, reps: '3', restSeconds: 150, coachingNotes: 'Maximal intent, minimal ground time.' },
      { exercise: 'Bounding', sets: 3, reps: '6 contacts', restSeconds: 150 },
      { exercise: 'Romanian Deadlift', sets: 3, reps: '6', restSeconds: 120, targetZone: '70-75% 1RM' },
      { exercise: 'Plank', sets: 3, reps: '45s', restSeconds: 45 },
    ],
  },
  {
    name: 'Throw Power',
    description: 'Rotational power and overhead strength for the throwing events.',
    targetEventGroup: 'throws',
    periodizationPhase: 'off-season',
    energySystemFocus: 'mixed',
    templateType: 'strength',
    estimatedRPE: 7,
    estimatedDurationMinutes: 80,
    difficulty: 'intermediate',
    tags: ['throws', 'power'],
    exercises: [
      { exercise: 'Mobility Flow', sets: 1, reps: '8 min', restSeconds: 0 },
      { exercise: 'Med Ball Overhead Throw', sets: 5, reps: '4', restSeconds: 120, coachingNotes: 'Throw through the wall, not at it.' },
      { exercise: 'Back Squat', sets: 4, reps: '5', restSeconds: 180, targetZone: '80-85% 1RM' },
      { exercise: 'Bench Press', sets: 4, reps: '6', restSeconds: 150, targetZone: '75-80% 1RM' },
      { exercise: 'Pull-Up', sets: 3, reps: '8', restSeconds: 90 },
      { exercise: 'Plank', sets: 3, reps: '45s', restSeconds: 45 },
    ],
  },
  {
    name: 'Aerobic Base',
    description: 'Steady aerobic volume with strides, the backbone of the middle-distance week.',
    targetEventGroup: 'middle_distance',
    periodizationPhase: 'off-season',
    energySystemFocus: 'aerobic',
    templateType: 'endurance',
    estimatedRPE: 6,
    estimatedDurationMinutes: 70,
    difficulty: 'beginner',
    tags: ['endurance', 'aerobic'],
    exercises: [
      { exercise: 'Mobility Flow', sets: 1, reps: '10 min', restSeconds: 0 },
      { exercise: 'A-Skip Drill', sets: 3, reps: '20m', restSeconds: 60 },
      { exercise: 'Bounding', sets: 3, reps: '6 contacts', restSeconds: 90 },
      { exercise: 'Romanian Deadlift', sets: 3, reps: '8', restSeconds: 120, targetZone: '65-70% 1RM' },
      { exercise: 'Plank', sets: 3, reps: '60s', restSeconds: 45 },
      { exercise: 'Mobility Flow', sets: 1, reps: '8 min', restSeconds: 0 },
    ],
  },
  {
    name: 'Recovery & Mobility',
    description: 'Low-intensity flush session after a hard block or competition.',
    targetEventGroup: 'sprints',
    periodizationPhase: 'transition',
    energySystemFocus: 'aerobic',
    templateType: 'recovery',
    estimatedRPE: 3,
    estimatedDurationMinutes: 45,
    difficulty: 'beginner',
    tags: ['recovery', 'mobility'],
    exercises: [
      { exercise: 'Mobility Flow', sets: 1, reps: '12 min', restSeconds: 0 },
      { exercise: 'Plank', sets: 2, reps: '30s', restSeconds: 30 },
      { exercise: 'Nordic Hamstring Curl', sets: 2, reps: '5', restSeconds: 60 },
      { exercise: 'Mobility Flow', sets: 1, reps: '10 min', restSeconds: 0 },
    ],
  },
];

// ==================== PERFORMANCE BASELINES ====================

type PerformanceBaseline = {
  unit: 's' | 'm' | 'cm';
  base: number;
  /** Seconds per week of realistic improvement. */
  improvement: number;
  wind: boolean;
};

const EVENT_BASELINES: Record<string, PerformanceBaseline> = {
  '100m sprint': { unit: 's', base: 12.9, improvement: 0.035, wind: true },
  '200m sprint': { unit: 's', base: 26.4, improvement: 0.06, wind: true },
  '400m sprint': { unit: 's', base: 58.5, improvement: 0.22, wind: false },
  '100m hurdles': { unit: 's', base: 16.4, improvement: 0.09, wind: true },
  '110m hurdles': { unit: 's', base: 17.2, improvement: 0.1, wind: true },
  '400m hurdles': { unit: 's', base: 68.0, improvement: 0.3, wind: false },
  '800m': { unit: 's', base: 143.0, improvement: 0.7, wind: false },
  '1500m': { unit: 's', base: 305.0, improvement: 1.4, wind: false },
  '3000m': { unit: 's', base: 660.0, improvement: 3.0, wind: false },
  'cross country': { unit: 's', base: 1320.0, improvement: 5.0, wind: false },
  'long jump': { unit: 'm', base: 5.35, improvement: 0.028, wind: true },
  'triple jump': { unit: 'm', base: 11.2, improvement: 0.06, wind: true },
  'high jump': { unit: 'm', base: 1.55, improvement: 0.008, wind: false },
  'shot put': { unit: 'm', base: 9.4, improvement: 0.06, wind: false },
  'discus': { unit: 'm', base: 26.0, improvement: 0.2, wind: false },
  'javelin': { unit: 'm', base: 32.0, improvement: 0.25, wind: false },
};

function baselineFor(event: string): PerformanceBaseline {
  return EVENT_BASELINES[event] ?? { unit: 's', base: 13.2, improvement: 0.04, wind: false };
}

// ==================== SEEDING ====================

type SeedContext = {
  db: Db;
  clubId: ObjectId;
  coachUid: string;
  today: Date;
  weeks: number;
};

async function findClub(db: Db, clubName: string | null) {
  if (clubName) {
    const club = await db.collection('clubs').findOne({ name: clubName });
    if (!club) throw new Error(`No club named "${clubName}" — run npm run db:seed first.`);
    return club;
  }

  const clubs = await db.collection('clubs').find({}).sort({ name: 1 }).limit(2).toArray();
  if (clubs.length === 0) throw new Error('No club found — run npm run db:seed first.');
  return clubs[0];
}

/** Athlete users without a profile can never see their own plan. Give them one. */
async function ensureAthleteProfiles(db: Db, clubId: ObjectId): Promise<number> {
  const users = await db
    .collection('users')
    .find({ role: 'athlete', status: 'active' })
    .toArray();

  let created = 0;
  const now = new Date();

  for (const user of users) {
    const existing = await db.collection('athletes').findOne({ clubId, userId: user._id });
    if (existing) continue;

    const email = String(user.email ?? '');
    if (!email) continue;

    // A roster row may already exist for this email but without a userId.
    const byEmail = await db.collection('athletes').findOne({ clubId, email });
    if (byEmail) {
      await db.collection('athletes').updateOne(
        { _id: byEmail._id },
        { $set: { userId: user._id, status: 'active', updatedAt: now } }
      );
      created += 1;
      continue;
    }

    const nameParts = String(user.name ?? email.split('@')[0]).trim().split(/\s+/);
    await db.collection('athletes').insertOne({
      _id: new ObjectId(),
      clubId,
      userId: user._id,
      firstName: nameParts[0] || 'Athlete',
      lastName: nameParts.slice(1).join(' ') || '',
      email,
      phone: null,
      dateOfBirth: null,
      gender: 'other',
      eventSpecialization: ['100m sprint', '200m sprint'],
      school: null,
      grade: null,
      status: 'active',
      personalBest: {},
      seasonBest: {},
      medicalNotes: null,
      emergencyContact: null,
      ...DEMO_TAG,
      createdAt: now,
      updatedAt: now,
    });
    created += 1;
  }

  return created;
}

async function seedWorkouts(context: SeedContext, exercises: ExerciseMap): Promise<number> {
  const { db, clubId, coachUid } = context;
  const now = new Date();

  for (const template of WORKOUT_TEMPLATES) {
    const workoutExercises = template.exercises
      .map((entry) => {
        const exerciseId = exercises.get(entry.exercise);
        if (!exerciseId) return null;
        return {
          exerciseId,
          name: entry.exercise,
          sets: entry.sets,
          reps: entry.reps,
          restSeconds: entry.restSeconds,
          ...(entry.tempo ? { tempo: entry.tempo } : {}),
          ...(entry.targetZone ? { targetZone: entry.targetZone } : {}),
          ...(entry.coachingNotes ? { coachingNotes: entry.coachingNotes } : {}),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    if (workoutExercises.length === 0) continue;

    await db.collection('workouts').updateOne(
      { clubId, name: template.name },
      {
        $set: {
          description: template.description,
          estimatedDuration: template.estimatedDurationMinutes,
          difficulty: template.difficulty,
          tags: template.tags,
          exercises: workoutExercises,
          isTemplate: true,
          targetEventGroup: template.targetEventGroup,
          periodizationPhase: template.periodizationPhase,
          energySystemFocus: template.energySystemFocus,
          templateType: template.templateType,
          estimatedRPE: template.estimatedRPE,
          estimatedDurationMinutes: template.estimatedDurationMinutes,
          ...DEMO_TAG,
          updatedAt: now,
        },
        $setOnInsert: { _id: new ObjectId(), clubId, createdBy: coachUid, createdAt: now },
      },
      { upsert: true }
    );
  }

  return WORKOUT_TEMPLATES.length;
}

async function seedSessions(context: SeedContext): Promise<Array<{ id: ObjectId; date: string; title: string; type: string }>> {
  const { db, clubId, coachUid, today, weeks } = context;

  const start = startOfUtcDay(daysAgo(today, weeks * 7 - 1));
  const weekdaySlots = [
    { day: 2, title: 'Track Session', start: '17:00', end: '18:30' }, // Tuesday
    { day: 4, title: 'Strength Session', start: '17:00', end: '18:30' }, // Thursday
    { day: 6, title: 'Weekend Session', start: '08:00', end: '10:00' }, // Saturday
  ];

  const ops: any[] = [];

  for (let week = 0; week < weeks; week += 1) {
    for (const slot of weekdaySlots) {
      const date = new Date(start.getTime() + (week * 7 + slot.day) * DAY_MS);
      if (date > today) continue;

      const dateString = isoDate(date);
      // One testing week and one competition week give the history believable texture.
      const isTesting = week === Math.floor(weeks / 2) && slot.day === 2;
      const isCompetition = week === weeks - 2 && slot.day === 6;

      const type = isCompetition ? 'competition' : isTesting ? 'testing' : 'training';
      const title = isCompetition
        ? 'District Championships'
        : isTesting
          ? 'Fitness Testing'
          : slot.title;

      const doc = {
        clubId,
        date: dateString,
        startTime: slot.start,
        endTime: slot.end,
        venue: isCompetition ? 'District Stadium' : 'Riverside Track',
        title,
        type,
        status: 'completed',
        linkedWorkoutId: null,
        notes: isCompetition ? 'Team travel by bus at 06:00.' : null,
        createdBy: coachUid,
        ...DEMO_TAG,
        createdAt: atUtc(dateString, 12),
        updatedAt: atUtc(dateString, 20),
      };

      ops.push({
        updateOne: {
          filter: { clubId, date: dateString, title },
          update: { $set: doc, $setOnInsert: { _id: new ObjectId() } },
          upsert: true,
        },
      });
    }
  }

  if (ops.length) await db.collection('training_sessions').bulkWrite(ops, { ordered: false });

  const stored = await db
    .collection('training_sessions')
    .find({ clubId, demoSeed: true })
    .sort({ date: 1 })
    .toArray();

  // Keep the generation deterministic: the slot list is fixed, so the same club story is
  // produced on every run.
  return stored.map((session) => ({
    id: session._id as ObjectId,
    date: String(session.date),
    title: String(session.title),
    type: String(session.type),
  }));
}

async function seedAttendance(
  context: SeedContext,
  sessions: Array<{ id: ObjectId; date: string; title: string; type: string }>,
  athletes: Array<{ _id: ObjectId; firstName: string }>
): Promise<number> {
  const { db, clubId, coachUid } = context;
  const ops: any[] = [];

  for (let index = 0; index < athletes.length; index += 1) {
    const athlete = athletes[index];
    // Reliable athletes attend ~92%, struggling ones ~68%: the spread is what makes the
    // attendance features meaningful.
    const reliability = 0.68 + ((index * 13) % 25) / 100;
    const random = createRandom(9000 + index);

    for (const session of sessions) {
      const roll = random();
      let status: 'present' | 'late' | 'excused' | 'absent';
      if (roll < reliability) status = random() < 0.08 ? 'late' : 'present';
      else if (roll < reliability + 0.06) status = 'excused';
      else status = 'absent';

      const markedAt = new Date(atUtc(session.date, 18, 30).getTime() + Math.floor(random() * 45) * 60000);

      ops.push({
        updateOne: {
          filter: { clubId, sessionId: session.id, athleteId: athlete._id },
          update: {
            $set: {
              status,
              method: random() < 0.25 ? 'qr' : 'manual',
              note: status === 'excused' ? 'Family commitment' : null,
              markedBy: coachUid,
              markedAt,
              ...DEMO_TAG,
              updatedAt: markedAt,
            },
            $setOnInsert: { _id: new ObjectId(), clubId, sessionId: session.id, athleteId: athlete._id, createdAt: markedAt },
          },
          upsert: true,
        },
      });
    }
  }

  if (ops.length) await db.collection('attendance_records').bulkWrite(ops, { ordered: false });
  return ops.length;
}

async function seedAssignmentsAndLogs(
  context: SeedContext,
  athletes: Array<{ _id: ObjectId; eventSpecialization?: string[]; firstName: string }>,
  sessions: Array<{ date: string }>
): Promise<{ assignments: number; logs: number }> {
  const { db, clubId, coachUid } = context;
  const workouts = await db
    .collection('workouts')
    .find({ clubId, archivedAt: { $exists: false } })
    .toArray();
  const byName = new Map(workouts.map((workout) => [workout.name as string, workout]));

  // One read for attendance, one for existing assignments: the athlete x session matrix is
  // small, and this keeps the whole seed to a handful of round trips.
  const attendance = await db
    .collection('attendance_records')
    .find({ clubId, demoSeed: true })
    .project({ athleteId: 1, markedAt: 1, status: 1 })
    .toArray();
  const attendanceByAthleteDate = new Map(
    attendance.map((record) => [
      `${String(record.athleteId)}|${isoDate(record.markedAt as Date)}`,
      String(record.status),
    ])
  );

  const existingAssignments = await db
    .collection('workout_assignments')
    .find({ clubId, demoSeed: true })
    .project({ workoutId: 1, athleteId: 1, startDate: 1 })
    .toArray();
  const assignmentIds = new Map(
    existingAssignments.map((row) => [
      `${String(row.workoutId)}|${String(row.athleteId)}|${String(row.startDate)}`,
      row._id as ObjectId,
    ])
  );

  const assignmentOps: any[] = [];
  const logOps: any[] = [];
  let logs = 0;

  const templateForGroup: Record<string, string> = {
    sprints: 'Sprint Speed Development',
    middle_distance: 'Aerobic Base',
    long_distance: 'Aerobic Base',
    jumps: 'Jump Technique',
    throws: 'Throw Power',
    combined: 'Strength & Power',
    unknown: 'Strength & Power',
  };

  for (let index = 0; index < athletes.length; index += 1) {
    const athlete = athletes[index];
    const group = eventGroupFor(athlete.eventSpecialization ?? []);
    const random = createRandom(4100 + index);

    const primary = byName.get(templateForGroup[group] ?? 'Strength & Power');
    const secondary = byName.get('Strength & Power');
    const recovery = byName.get('Recovery & Mobility');
    const templates = [primary, secondary, recovery].filter((value): value is NonNullable<typeof value> => Boolean(value));

    // Six most recent completed sessions become assignments; attendance decides completion.
    const recent = sessions.slice(-6);

    for (let slot = 0; slot < recent.length; slot += 1) {
      const session = recent[slot];
      const workout = templates[slot % templates.length];
      if (!workout) continue;

      const startDate = session.date;
      const dueDate = isoDate(new Date(new Date(`${startDate}T00:00:00.000Z`).getTime() + 2 * DAY_MS));

      const attendanceStatus = attendanceByAthleteDate.get(`${String(athlete._id)}|${startDate}`);
      const attended = attendanceStatus ? ['present', 'late'].includes(attendanceStatus) : false;
      const status = attended ? 'completed' : 'assigned';
      const completedAt = attended
        ? atUtc(startDate, 18, 45 + Math.floor(random() * 10))
        : null;
      const durationMinutes = 45 + Math.floor(random() * 40);
      const perceivedEffort = 5 + Math.floor(random() * 4);

      const key = `${String(workout._id)}|${String(athlete._id)}|${startDate}`;
      const assignmentId = assignmentIds.get(key) ?? new ObjectId();
      assignmentIds.set(key, assignmentId);

      const assignment = {
        clubId,
        workoutId: workout._id,
        athleteId: athlete._id,
        startDate,
        dueDate,
        notes: null,
        status,
        assignedBy: coachUid,
        ...DEMO_TAG,
        updatedAt: completedAt ?? atUtc(startDate, 12),
        ...(completedAt
          ? {
              completedAt,
              startedAt: atUtc(startDate, 17, 5),
              completion: { durationMinutes, perceivedEffort, exerciseResults: [] },
            }
          : {}),
      };

      assignmentOps.push({
        updateOne: {
          filter: { _id: assignmentId },
          update: { $set: assignment, $setOnInsert: { _id: assignmentId, createdAt: atUtc(startDate, 12) } },
          upsert: true,
        },
      });

      if (completedAt) {
        logOps.push({
          updateOne: {
            filter: { clubId, assignmentId },
            update: {
              $set: {
                clubId,
                assignmentId,
                workoutId: workout._id,
                athleteId: athlete._id,
                durationMinutes,
                perceivedEffort,
                notes: null,
                exerciseResults: [],
                completedAt,
                ...DEMO_TAG,
              },
              $setOnInsert: { _id: new ObjectId() },
            },
            upsert: true,
          },
        });
        logs += 1;
      }
    }
  }

  if (assignmentOps.length) await db.collection('workout_assignments').bulkWrite(assignmentOps, { ordered: false });
  if (logOps.length) await db.collection('workout_logs').bulkWrite(logOps, { ordered: false });

  return { assignments: assignmentOps.length, logs };
}

async function seedCompetitionsAndResults(
  context: SeedContext,
  athletes: Array<{ _id: ObjectId; eventSpecialization?: string[]; firstName: string }>
): Promise<{ competitions: number; results: number }> {
  const { db, clubId, coachUid, today, weeks } = context;
  const now = new Date();

  const competitions = [
    { name: 'Riverside Club Time Trial', date: isoDate(daysAgo(today, weeks * 7 - 10)), level: 'club', venue: 'Riverside Track' },
    { name: 'District Championships', date: isoDate(daysAgo(today, 12)), level: 'district', venue: 'District Stadium' },
    { name: 'State Qualifier', date: isoDate(daysAgo(today, 5)), level: 'state', venue: 'State Sports Complex' },
  ];

  const competitionIds: Array<{ id: ObjectId; name: string; date: string; level: string }> = [];

  const competitionOps = competitions.map((competition) => ({
    updateOne: {
      filter: { clubId, name: competition.name, date: competition.date },
      update: {
        $set: { ...competition, ...DEMO_TAG, updatedAt: now },
        $setOnInsert: { _id: new ObjectId(), clubId, createdBy: coachUid, createdAt: now },
      },
      upsert: true,
    },
  }));

  if (competitionOps.length) await db.collection('competitions').bulkWrite(competitionOps, { ordered: false });

  const storedCompetitions = await db
    .collection('competitions')
    .find({ clubId, demoSeed: true })
    .toArray();
  for (const stored of storedCompetitions) {
    competitionIds.push({
      id: stored._id as ObjectId,
      name: String(stored.name),
      date: String(stored.date),
      level: String(stored.level),
    });
  }

  const resultOps: any[] = [];
  const athleteOps: any[] = [];

  for (let index = 0; index < athletes.length; index += 1) {
    const athlete = athletes[index];
    const events = (athlete.eventSpecialization ?? []).filter((event) => EVENT_BASELINES[event]);
    if (events.length === 0) continue;

    const random = createRandom(7300 + index);
    const weeklyBest = new Map<string, number>();

    for (let week = 0; week < weeks; week += 1) {
      const event = events[week % events.length];
      const baseline = baselineFor(event);
      const date = isoDate(daysAgo(today, (weeks - week) * 7 - 2));
      const drift = baseline.base - baseline.improvement * week;
      const noise = baseline.unit === 's' ? (random() - 0.5) * 0.18 : (random() - 0.5) * 0.08;
      const raw = drift + noise;
      const resultValue = round(baseline.unit === 's' ? Math.max(raw, baseline.base * 0.85) : Math.max(raw, baseline.base * 0.9), 2);

      const previous = weeklyBest.get(event);
      const better = previous === undefined || (baseline.unit === 's' ? resultValue < previous : resultValue > previous);
      if (better) weeklyBest.set(event, resultValue);

      const competition = competitionIds[week % competitionIds.length];

      resultOps.push({
        updateOne: {
          filter: { clubId, athleteId: athlete._id, event, date },
          update: {
            $set: {
              clubId,
              athleteId: athlete._id,
              competitionId: competition?.id ?? null,
              event,
              round: 'final',
              resultValue,
              unit: baseline.unit,
              wind: baseline.wind ? round((random() - 0.5) * 3.2, 1) : null,
              position: 1 + Math.floor(random() * 6),
              meetLevel: competition?.level ?? 'club',
              date,
              notes: null,
              isPB: better,
              isSB: better,
              createdBy: coachUid,
              ...DEMO_TAG,
              updatedAt: now,
            },
            $setOnInsert: { _id: new ObjectId(), createdAt: now },
          },
          upsert: true,
        },
      });
    }

    // Mirror the API behaviour: keep the athlete's PB/SB summary in step with the results.
    const personalBest: Record<string, string> = {};
    const seasonBest: Record<string, string> = {};
    for (const [event, value] of weeklyBest) {
      personalBest[event.toLowerCase()] = `${value} ${baselineFor(event).unit}`;
      seasonBest[`${event.toLowerCase()}:${today.getUTCFullYear()}`] = `${value} ${baselineFor(event).unit}`;
    }
    athleteOps.push({
      updateOne: {
        filter: { _id: athlete._id, clubId },
        update: { $set: { personalBest, seasonBest, updatedAt: now } },
      },
    });
  }

  if (resultOps.length) await db.collection('performance_results').bulkWrite(resultOps, { ordered: false });
  if (athleteOps.length) await db.collection('athletes').bulkWrite(athleteOps, { ordered: false });

  return { competitions: competitions.length, results: resultOps.length };
}

async function seedFitnessAndGoals(
  context: SeedContext,
  athletes: Array<{ _id: ObjectId; eventSpecialization?: string[]; firstName: string }>
): Promise<{ tests: number; goals: number }> {
  const { db, clubId, coachUid, today } = context;
  const now = new Date();

  const testOps: any[] = [];
  const goalOps: any[] = [];

  for (let index = 0; index < athletes.length; index += 1) {
    const athlete = athletes[index];
    const random = createRandom(5100 + index);

    const battery = [
      { testType: '30m Sprint', value: round(4.35 + random() * 0.5, 2), unit: 's' },
      { testType: 'Standing Long Jump', value: round(185 + random() * 45, 1), unit: 'cm' },
      { testType: 'Yo-Yo Intermittent Recovery', value: round(16.2 + random() * 3.4, 1), unit: 'level' },
    ];

    for (const test of battery) {
      const date = isoDate(daysAgo(today, 21 + Math.floor(random() * 10)));
      testOps.push({
        updateOne: {
          filter: { clubId, athleteId: athlete._id, testType: test.testType, date },
          update: {
            $set: { ...test, notes: null, createdBy: coachUid, ...DEMO_TAG, updatedAt: now },
            $setOnInsert: { _id: new ObjectId(), clubId, athleteId: athlete._id, date, createdAt: now },
          },
          upsert: true,
        },
      });
    }

    const event = (athlete.eventSpecialization ?? [])[0];
    if (!event) continue;
    const baseline = baselineFor(event);
    const targetValue = round(
      baseline.unit === 's' ? baseline.base * 0.97 : baseline.base * 1.04,
      baseline.unit === 's' ? 2 : 1
    );

    goalOps.push({
      updateOne: {
        filter: { clubId, athleteId: athlete._id, event },
        update: {
          $set: {
            targetValue,
            unit: baseline.unit,
            targetDate: isoDate(daysAgo(today, -60)),
            coachNotes: 'Build towards the state qualifier.',
            status: 'active',
            ...DEMO_TAG,
            updatedAt: now,
          },
          $setOnInsert: { _id: new ObjectId(), clubId, athleteId: athlete._id, event, createdBy: coachUid, createdAt: now },
        },
        upsert: true,
      },
    });
  }

  if (testOps.length) await db.collection('fitness_tests').bulkWrite(testOps, { ordered: false });
  if (goalOps.length) await db.collection('athlete_goals').bulkWrite(goalOps, { ordered: false });

  return { tests: testOps.length, goals: goalOps.length };
}

async function seedReadiness(
  context: SeedContext,
  athletes: Array<{ _id: ObjectId; firstName: string }>
): Promise<number> {
  const { db, clubId, today } = context;
  const ops: any[] = [];

  for (let index = 0; index < athletes.length; index += 1) {
    const athlete = athletes[index];
    const random = createRandom(3100 + index);

    // Three weeks of check-ins, weekdays only — roughly what a disciplined squad produces.
    for (let day = 20; day >= 0; day -= 1) {
      const date = daysAgo(today, day);
      const weekday = date.getUTCDay();
      if (weekday === 0 || weekday === 6) continue;
      if (random() < 0.15) continue; // a few missed check-ins, as in real life

      const dateString = isoDate(date);
      const soreness = 1 + Math.floor(random() * 4);
      const sleepQuality = 2 + Math.floor(random() * 4);
      const stressEnergy = 2 + Math.floor(random() * 4);

      ops.push({
        updateOne: {
          filter: { clubId, athleteId: athlete._id, date: dateString },
          update: {
            $set: {
              soreness,
              sleepQuality,
              stressEnergy,
              notes: soreness >= 4 ? 'Heavy legs after the weekend session.' : null,
              ...DEMO_TAG,
              updatedAt: atUtc(dateString, 7),
            },
            $setOnInsert: { _id: new ObjectId(), clubId, athleteId: athlete._id, date: dateString, createdAt: atUtc(dateString, 7) },
          },
          upsert: true,
        },
      });
    }
  }

  if (ops.length) await db.collection('daily_readiness').bulkWrite(ops, { ordered: false });
  return ops.length;
}

/**
 * A handful of injuries: two active, one returning, and a resolved history so the injury
 * features (and the rule engine's contraindication filter) have something real to act on.
 */
async function seedInjuries(
  context: SeedContext,
  athletes: Array<{ _id: ObjectId; eventSpecialization?: string[]; firstName: string }>
): Promise<number> {
  const { db, clubId, coachUid, today } = context;
  const now = new Date();

  const plans: Array<{
    athleteIndex: number;
    type: string;
    bodyPart: string;
    laterality: 'left' | 'right' | 'bilateral' | 'not_applicable';
    severity: 1 | 2 | 3;
    status: 'active' | 'rehabilitating' | 'returning' | 'resolved';
    restrictions: string[];
    onsetDaysAgo: number;
    expectedReturnDays: number | null;
  }> = [
    {
      athleteIndex: 2,
      type: 'Hamstring strain',
      bodyPart: 'hamstring',
      laterality: 'left',
      severity: 2,
      status: 'rehabilitating',
      restrictions: ['hamstring', 'sprinting', 'max velocity'],
      onsetDaysAgo: 11,
      expectedReturnDays: 18,
    },
    {
      athleteIndex: 5,
      type: 'Ankle sprain',
      bodyPart: 'ankle',
      laterality: 'right',
      severity: 1,
      status: 'returning',
      restrictions: ['ankle', 'jumping', 'plyometrics'],
      onsetDaysAgo: 24,
      expectedReturnDays: 7,
    },
    {
      athleteIndex: 8,
      type: 'Patellar tendinopathy',
      bodyPart: 'knee',
      laterality: 'bilateral',
      severity: 1,
      status: 'resolved',
      restrictions: ['knee'],
      onsetDaysAgo: 70,
      expectedReturnDays: null,
    },
  ];

  const injuryOps: any[] = [];
  const wellnessOps: any[] = [];

  for (const plan of plans) {
    const athlete = athletes[plan.athleteIndex];
    if (!athlete) continue;

    const onsetDate = isoDate(daysAgo(today, plan.onsetDaysAgo));
    const expectedReturnDate = plan.expectedReturnDays === null ? null : isoDate(daysAgo(today, -plan.expectedReturnDays));

    injuryOps.push({
      updateOne: {
        filter: { clubId, athleteId: athlete._id, type: plan.type, onsetDate },
        update: {
          $set: {
            bodyPart: plan.bodyPart,
            laterality: plan.laterality,
            severity: plan.severity,
            status: plan.status,
            mechanism: 'Non-contact, during a training session',
            diagnosisSource: 'physio',
            diagnosis: `${plan.type} confirmed by club physio`,
            expectedReturnDate,
            actualReturnDate: plan.status === 'resolved' ? isoDate(daysAgo(today, 42)) : null,
            restrictions: plan.restrictions,
            notes: null,
            rehabPlan: [],
            createdBy: coachUid,
            ...DEMO_TAG,
            updatedAt: now,
          },
          $setOnInsert: { _id: new ObjectId(), clubId, athleteId: athlete._id, onsetDate, createdAt: now },
        },
        upsert: true,
      },
    });

    // Wellness entries only make sense while the injury is live.
    if (plan.status === 'resolved') continue;

    const random = createRandom(8100 + plan.athleteIndex);
    for (let day = 6; day >= 0; day -= 1) {
      const date = isoDate(daysAgo(today, day));
      const fatigue = 3 + Math.floor(random() * 4);
      wellnessOps.push({
        updateOne: {
          filter: { clubId, athleteId: athlete._id, injuryType: plan.type, date },
          update: {
            $set: {
              pain: Math.max(0, 6 - Math.floor((6 - day) / 2) + Math.floor(random() * 2)),
              fatigue,
              sleepHours: round(6 + random() * 3, 1),
              note: null,
              ...DEMO_TAG,
              updatedAt: now,
            },
            $setOnInsert: {
              _id: new ObjectId(),
              clubId,
              athleteId: athlete._id,
              injuryType: plan.type,
              date,
              createdBy: coachUid,
              createdAt: now,
            },
          },
          upsert: true,
        },
      });
    }
  }

  if (injuryOps.length) await db.collection('injuries').bulkWrite(injuryOps, { ordered: false });
  if (wellnessOps.length) await db.collection('injury_wellness').bulkWrite(wellnessOps, { ordered: false });

  return injuryOps.length;
}

async function resetHistory(db: Db, clubId: ObjectId): Promise<Record<string, number>> {
  const removed: Record<string, number> = {};

  for (const name of HISTORY_COLLECTIONS) {
    const result = await db.collection(name).deleteMany({ clubId, demoSeed: true });
    removed[name] = result.deletedCount ?? 0;
  }

  return removed;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));

  if (env.NODE_ENV === 'production' && !options.force) {
    throw new Error('Refusing to write demo history while NODE_ENV=production. Re-run with --force if you are certain.');
  }

  const db = await connectToDatabase();

  try {
    const club = await findClub(db, options.clubName);
    const clubId = club._id as ObjectId;

    const coach = (await db.collection('users').findOne({ role: 'coach', status: 'active' })) ??
      (await db.collection('users').findOne({ role: 'system_admin', status: 'active' }));
    if (!coach) throw new Error('No coach or administrator account found — run npm run db:seed first.');

    if (options.reset) {
      const removed = await resetHistory(db, clubId);
      const total = Object.values(removed).reduce((sum, value) => sum + value, 0);
      console.log(`\nRemoved ${total} previously generated document(s).`);
    }

    console.log(`\nGenerating ${options.weeks} week(s) of history for ${club.name as string}...`);

    const profilesCreated = await ensureAthleteProfiles(db, clubId);
    if (profilesCreated) console.log(`  Created ${profilesCreated} missing athlete profile(s) for athlete logins`);

    const exerciseDocs = await db.collection('exercises').find({ clubId }).toArray();
    const exercises: ExerciseMap = new Map(exerciseDocs.map((exercise) => [exercise.name as string, exercise._id as ObjectId]));
    if (exercises.size === 0) throw new Error('No exercises found for this club — run npm run db:seed first.');

    const workload = await db
      .collection<{
        _id: ObjectId;
        firstName: string;
        lastName?: string;
        eventSpecialization?: string[];
      }>('athletes')
      .find({ clubId, status: { $nin: ['inactive', 'transferred', 'alumni'] } })
      .sort({ lastName: 1, firstName: 1 })
      .toArray();

    const context: SeedContext = {
      db,
      clubId,
      coachUid: String(coach.firebaseUid ?? ''),
      today: startOfUtcDay(new Date()),
      weeks: options.weeks,
    };

    const workoutCount = await seedWorkouts(context, exercises);
    const sessions = await seedSessions(context);
    const attendanceCount = await seedAttendance(context, sessions, workload);
    const { assignments, logs } = await seedAssignmentsAndLogs(context, workload, sessions);
    const { competitions, results } = await seedCompetitionsAndResults(context, workload);
    const { tests, goals } = await seedFitnessAndGoals(context, workload);
    const readinessCount = await seedReadiness(context, workload);
    const injuryCount = await seedInjuries(context, workload);

    console.log('\n──────────────────────────────────────────────────────────────');
    console.log('Demo history ready');
    console.log('──────────────────────────────────────────────────────────────');
    console.log(`  Database      : ${db.databaseName}`);
    console.log(`  Club          : ${club.name as string}`);
    console.log(`  Athletes      : ${workload.length}`);
    console.log(`  Workouts      : ${workoutCount} templates`);
    console.log(`  Sessions      : ${sessions.length}`);
    console.log(`  Attendance    : ${attendanceCount} records`);
    console.log(`  Assignments   : ${assignments} (${logs} completed logs)`);
    console.log(`  Competitions  : ${competitions} (${results} results)`);
    console.log(`  Fitness tests : ${tests}`);
    console.log(`  Goals         : ${goals}`);
    console.log(`  Readiness     : ${readinessCount} check-ins`);
    console.log(`  Injuries      : ${injuryCount}`);
    console.log('\n  Next: open the app and generate a recommendation, or run the inference worker.');
    console.log('──────────────────────────────────────────────────────────────\n');
  } finally {
    await closeDatabaseConnection();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nSeed history failed: ${message}`);
  process.exit(1);
});
