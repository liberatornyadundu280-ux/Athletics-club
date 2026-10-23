// src/seed.ts
// Stand up a working STMS environment: schema, a club, staff logins, an athlete roster
// and an exercise catalogue.
//
// Usage:
//   npm run db:seed
//   npm run db:seed -- --club "Northside AC" --admin me@myschool.org
//   npm run db:seed -- --reset-passwords
//
// Flags:
//   --club <name>       club to create (default: Riverside Athletics Club)
//   --admin <email>     system administrator email
//                       (default: FIREBASE_INITIAL_ADMIN_EMAIL, else admin@example.com)
//   --coach <email>     coach email (default: coach@example.com)
//   --reset-passwords   give existing seeded accounts a new password
//   --refresh-starters  update existing starter workouts that a coach has not edited
//   --prune-starters    remove old starter workouts that have no assignments or logs
//   --force             permit seeding while NODE_ENV=production
//
// Re-running is safe: every record is upserted on a natural key (email, slug, club+name).
//
// Login note: the backend authenticates Firebase ID tokens, not raw passwords
// (see POST /auth/firebase). Sign in with the email and password below through the
// frontend, which uses the Firebase client SDK and exchanges the resulting ID token.

import { randomBytes } from 'crypto';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { Db, ObjectId } from 'mongodb';
import { closeDatabaseConnection, connectToDatabase } from './config/database';
import { firebaseAuth, setUserClaims } from './config/firebase';
import { env } from './config/env';
import { applyPendingMigrations } from './migrations/runner';
import { permissionsForRole } from './utils/role-permissions';
import { seedExerciseLibrary } from './services/exercise-library';
import { seedStarterWorkouts } from './services/starter-workouts';
import type { UserRole } from './types';

const DEFAULT_CLUB_NAME = 'Riverside Athletics Club';
// `example.com` is reserved by RFC 2606 and can never be delivered to a real person, so a
// generated coach account can never land in a stranger's inbox.
const DEFAULT_COACH_EMAIL = 'coach@example.com';
const ROSTER_CSV = resolve(__dirname, '../../Docs/AgentsDocumentation/datasets/athlete-roster-sample.csv');

type SeedOptions = {
  clubName: string;
  adminEmail: string;
  coachEmail: string;
  resetPasswords: boolean;
  refreshStarters: boolean;
  pruneStarters: boolean;
  force: boolean;
};

type SeededAccount = {
  email: string;
  /** Null when the account already existed and its password was left untouched. */
  password: string | null;
  uid: string;
  reused: boolean;
};

function printUsage(): void {
  console.log(`
STMS development seed

  npm run db:seed
  npm run db:seed -- --club "Northside AC" --admin me@myschool.org
  npm run db:seed -- --reset-passwords

Flags:
  --club <name>       club to create (default: ${DEFAULT_CLUB_NAME})
  --admin <email>     system administrator email
  --coach <email>     coach email (default: ${DEFAULT_COACH_EMAIL})
  --reset-passwords   give existing seeded accounts a new password
  --refresh-starters  update existing starter workouts that a coach has not edited
  --prune-starters    remove old starter workouts that have no assignments or logs
  --force             permit seeding while NODE_ENV=production
`);
}

function parseFlags(argv: string[]): SeedOptions {
  const adminEmail = process.env.FIREBASE_INITIAL_ADMIN_EMAIL?.trim() || 'admin@example.com';
  const options: SeedOptions = {
    clubName: DEFAULT_CLUB_NAME,
    adminEmail,
    coachEmail: DEFAULT_COACH_EMAIL,
    resetPasswords: false,
    refreshStarters: false,
    pruneStarters: false,
    force: false,
  };

  const readValue = (flag: string, index: number): string => {
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
    return value;
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (arg === '--club') {
      options.clubName = readValue('--club', index);
      index += 1;
    } else if (arg === '--admin') {
      options.adminEmail = readValue('--admin', index).toLowerCase();
      index += 1;
    } else if (arg === '--coach') {
      options.coachEmail = readValue('--coach', index).toLowerCase();
      index += 1;
    } else if (arg === '--reset-passwords') {
      options.resetPasswords = true;
    } else if (arg === '--refresh-starters') {
      options.refreshStarters = true;
    } else if (arg === '--prune-starters') {
      options.pruneStarters = true;
    } else if (arg === '--force') {
      options.force = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  for (const [label, email] of [['--admin', options.adminEmail], ['--coach', options.coachEmail]]) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(`${label} must be a valid email address (received "${email}")`);
    }
  }

  if (options.adminEmail === options.coachEmail) {
    throw new Error('--admin and --coach must be different email addresses');
  }

  return options;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50);
}

function generatePassword(): string {
  return randomBytes(12).toString('base64url');
}

/** Create the Firebase account, or reuse it. Only reuses when a password reset was requested. */
async function ensureFirebaseAccount(
  email: string,
  displayName: string,
  options: { resetPassword: boolean }
): Promise<SeededAccount> {
  let existingUid: string | null = null;

  try {
    const existing = await firebaseAuth.getUserByEmail(email);
    existingUid = existing.uid;
  } catch (error) {
    if ((error as { code?: string }).code !== 'auth/user-not-found') throw error;
  }

  if (existingUid && !options.resetPassword) {
    return { email, password: null, uid: existingUid, reused: true };
  }

  const password = generatePassword();

  if (existingUid) {
    await firebaseAuth.updateUser(existingUid, { password, displayName, emailVerified: true });
    return { email, password, uid: existingUid, reused: true };
  }

  const created = await firebaseAuth.createUser({ email, password, displayName, emailVerified: true });
  return { email, password, uid: created.uid, reused: false };
}

async function upsertUser(
  db: Db,
  input: { firebaseUid: string; email: string; name: string; role: UserRole }
): Promise<ObjectId> {
  const now = new Date();

  await db.collection('users').updateOne(
    { email: input.email },
    {
      $set: {
        firebaseUid: input.firebaseUid,
        email: input.email,
        name: input.name,
        role: input.role,
        permissions: permissionsForRole(input.role),
        status: 'active',
        updatedAt: now,
      },
      $setOnInsert: {
        clubIds: [],
        activeClubId: null,
        avatarUrl: null,
        lastLoginAt: null,
        createdAt: now,
      },
    },
    { upsert: true }
  );

  const user = await db.collection('users').findOne({ email: input.email });
  if (!user) throw new Error(`Failed to write the MongoDB user for ${input.email}`);
  return user._id as ObjectId;
}

async function upsertClub(
  db: Db,
  name: string,
  createdBy: ObjectId
): Promise<{ id: ObjectId; slug: string }> {
  const now = new Date();
  const slug = slugify(name);
  if (!slug) throw new Error(`Club name "${name}" does not produce a usable slug`);

  await db.collection('clubs').updateOne(
    { slug },
    {
      $set: { name, slug, updatedAt: now },
      $setOnInsert: {
        branding: { logoUrl: null, primaryColor: '#1E3A8A', secondaryColor: '#F59E0B' },
        settings: {
          timezone: 'Asia/Kolkata',
          attendanceMinPercent: 75,
          workoutVerificationRequired: false,
          notificationDefaults: {},
        },
        createdBy,
        createdAt: now,
      },
    },
    { upsert: true }
  );

  const club = await db.collection('clubs').findOne({ slug });
  if (!club) throw new Error(`Failed to write the club "${name}"`);
  return { id: club._id as ObjectId, slug };
}

async function upsertMembership(
  db: Db,
  input: { userId: ObjectId; clubId: ObjectId; role: string }
): Promise<void> {
  const now = new Date();

  await db.collection('club_memberships').updateOne(
    { userId: input.userId, clubId: input.clubId },
    {
      $set: { role: input.role, status: 'active', updatedAt: now },
      $setOnInsert: { joinedAt: now, invitedBy: null, invitedAt: null, createdAt: now },
    },
    { upsert: true }
  );
}

async function grantClubToUser(db: Db, userId: ObjectId, clubId: ObjectId): Promise<void> {
  await db.collection('users').updateOne(
    { _id: userId },
    { $addToSet: { clubIds: clubId }, $set: { activeClubId: clubId, updatedAt: new Date() } }
  );
}

function parseRosterCsv(csv: string): Array<Record<string, string>> {
  const lines = csv.split(/\r?\n/).filter(line => line.trim().length > 0);
  const header = lines.shift();
  if (!header) return [];

  const columns = header.split(',').map(column => column.trim());

  return lines.map(line => {
    const values = line.split(',');
    return Object.fromEntries(
      columns.map((column, index) => [column, (values[index] ?? '').trim()])
    );
  });
}

async function seedAthletes(db: Db, clubId: ObjectId, csvPath: string): Promise<number> {
  let csv: string;

  try {
    csv = await readFile(csvPath, 'utf8');
  } catch {
    console.warn(`  Roster dataset not found at ${csvPath} — skipping athletes.`);
    return 0;
  }

  const now = new Date();
  let written = 0;

  for (const row of parseRosterCsv(csv)) {
    if (!row.firstName || !row.email) continue;

    await db.collection('athletes').updateOne(
      { clubId, email: row.email },
      {
        $set: {
          firstName: row.firstName,
          lastName: row.lastName ?? '',
          email: row.email,
          phone: row.phone || null,
          dateOfBirth: row.dateOfBirth || null,
          gender: row.gender === 'male' || row.gender === 'female' ? row.gender : 'other',
          eventSpecialization: (row.eventSpecialization || '')
            .split('|')
            .map(value => value.trim())
            .filter(Boolean),
          school: row.school || null,
          grade: row.grade || null,
          status: 'active',
          updatedAt: now,
        },
        $setOnInsert: {
          clubId,
          userId: null,
          personalBest: {},
          seasonBest: {},
          medicalNotes: null,
          emergencyContact: null,
          createdAt: now,
        },
      },
      { upsert: true }
    );

    written += 1;
  }

  return written;
}

async function syncClaims(db: Db, userId: ObjectId, uid: string, role: UserRole): Promise<void> {
  const user = await db.collection('users').findOne({ _id: userId });
  if (!user) return;

  await setUserClaims(uid, {
    role,
    clubIds: ((user.clubIds as ObjectId[]) ?? []).map(id => id.toString()),
    activeClubId: user.activeClubId ? (user.activeClubId as ObjectId).toString() : null,
    permissions: permissionsForRole(role),
  });
}

function printSummary(input: {
  databaseName: string;
  club: { id: ObjectId; slug: string; name: string };
  athletes: number;
  exercises: number;
  starterWorkouts: string;
  accounts: Array<{ account: SeededAccount; role: UserRole }>;
}): void {
  console.log('\n──────────────────────────────────────────────────────────────');
  console.log('Seed complete');
  console.log('──────────────────────────────────────────────────────────────');
  console.log(`  Database : ${input.databaseName}`);
  console.log(`  Club     : ${input.club.name}  (${input.club.slug}, ${input.club.id.toString()})`);
  console.log(`  Athletes : ${input.athletes}`);
  console.log(`  Exercises: ${input.exercises}`);
  console.log(`  Workouts : ${input.starterWorkouts}`);
  console.log('\n  Sign in through the frontend with:');
  const roleWidth = Math.max(4, ...input.accounts.map(({ role }) => role.length));
  const emailWidth = Math.max(5, ...input.accounts.map(({ account }) => account.email.length));

  console.log(`\n    ${'ROLE'.padEnd(roleWidth)}  ${'EMAIL'.padEnd(emailWidth)}  PASSWORD`);
  console.log(`    ${'─'.repeat(roleWidth)}  ${'─'.repeat(emailWidth)}  ${'─'.repeat(18)}`);

  for (const { account, role } of input.accounts) {
    const password = account.password ?? '(unchanged — use --reset-passwords)';
    console.log(`    ${role.padEnd(roleWidth)}  ${account.email.padEnd(emailWidth)}  ${password}`);
  }

  console.log('\n  Login uses the Firebase client SDK; the app exchanges the ID token with');
  console.log('  POST /auth/firebase. Change these passwords before any shared deployment.');
  console.log('──────────────────────────────────────────────────────────────\n');
}

async function main(): Promise<void> {
  const options = parseFlags(process.argv.slice(2));

  if (env.NODE_ENV === 'production' && !options.force) {
    throw new Error(
      'Refusing to seed a production database — the seed creates accounts with known passwords. Re-run with --force if you are certain.'
    );
  }

  const db = await connectToDatabase();

  try {
    console.log('\nApplying migrations...');
    const appliedMigrations = await applyPendingMigrations(db);
    console.log(
      appliedMigrations.length
        ? `  ${appliedMigrations.length} migration(s) applied`
        : '  schema already up to date'
    );

    console.log('\nSeeding club, staff accounts, roster and exercise library...');

    const adminAccount = await ensureFirebaseAccount(options.adminEmail, 'Seed Administrator', {
      resetPassword: options.resetPasswords,
    });
    const adminUserId = await upsertUser(db, {
      firebaseUid: adminAccount.uid,
      email: adminAccount.email,
      name: 'Seed Administrator',
      role: 'system_admin',
    });

    const club = await upsertClub(db, options.clubName, adminUserId);
    await upsertMembership(db, { userId: adminUserId, clubId: club.id, role: 'head_coach' });
    await grantClubToUser(db, adminUserId, club.id);

    const coachAccount = await ensureFirebaseAccount(options.coachEmail, 'Seed Coach', {
      resetPassword: options.resetPasswords,
    });
    const coachUserId = await upsertUser(db, {
      firebaseUid: coachAccount.uid,
      email: coachAccount.email,
      name: 'Seed Coach',
      role: 'coach',
    });
    await upsertMembership(db, { userId: coachUserId, clubId: club.id, role: 'assistant_coach' });
    await grantClubToUser(db, coachUserId, club.id);

    const athleteCount = await seedAthletes(db, club.id, ROSTER_CSV);
    const exerciseSeed = await seedExerciseLibrary(db);
    const starterWorkouts = await seedStarterWorkouts(db, club.id, coachAccount.uid, {
      refresh: options.refreshStarters,
      prune: options.pruneStarters,
    });

    await syncClaims(db, adminUserId, adminAccount.uid, 'system_admin');
    await syncClaims(db, coachUserId, coachAccount.uid, 'coach');

    const clubDocument = await db.collection('clubs').findOne({ _id: club.id });

    printSummary({
      databaseName: db.databaseName,
      club: { ...club, name: (clubDocument?.name as string) ?? options.clubName },
      athletes: athleteCount,
      exercises: exerciseSeed.total,
      starterWorkouts: [
        `${starterWorkouts.total} starter sessions`,
        `${starterWorkouts.inserted} inserted`,
        `${starterWorkouts.updated} refreshed`,
        `${starterWorkouts.existing - starterWorkouts.updated - starterWorkouts.protectedEdits} unchanged`,
        ...(starterWorkouts.protectedEdits ? [`${starterWorkouts.protectedEdits} coach-edited kept`] : []),
        ...(starterWorkouts.pruned ? [`${starterWorkouts.pruned} pruned`] : []),
        ...(starterWorkouts.retained ? [`${starterWorkouts.retained} stale retained`] : []),
      ].join(', '),
      accounts: [
        { account: adminAccount, role: 'system_admin' },
        { account: coachAccount, role: 'coach' },
      ],
    });
  } finally {
    await closeDatabaseConnection();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nSeed failed: ${message}`);
  process.exit(1);
});
