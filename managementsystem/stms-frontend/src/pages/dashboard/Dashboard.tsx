import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  HeartPulse,
  Megaphone,
  Users,
} from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui';
import { ActivityFeed, ActivityFeedProps } from '@/components/ui/ActivityFeed';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressRing, Sparkline } from '@/components/ui/Data';
import { LaneDay, WeekLane } from '@/components/ui/WeekLane';
import { useAuth } from '@/context/AuthContext';
import { analyticsApi, announcementApi, athleteApi, attendanceApi, workoutApi } from '@/services/api';

/* ============================================================
   Shapes returned by the read-only endpoints this screen uses.
   ============================================================ */

interface AnalyticsSummary {
  activeAthletes: number;
  sessions: number;
  averageSessionMinutes: number;
  attendance: {
    rate: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    total: number;
    series: { date: string; rate: number }[];
  };
  workouts: { assigned: number; completed: number; compliance: number };
  performance: { total: number; personalBests: number; seasonBests: number };
  activeInjuries: number;
  activeGoals: number;
}

interface SessionRow {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  venue: string;
  type: 'training' | 'competition' | 'meeting' | 'testing';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

interface AssignmentRow {
  id: string;
  athleteId: string;
  workoutId: string | null;
  startDate: string;
  dueDate: string | null;
  status: 'assigned' | 'in_progress' | 'completed';
  notes: string | null;
  updatedAt?: string;
  completedAt?: string;
  workout?: {
    id: string;
    name: string;
    description: string | null;
    estimatedDuration: number;
    exercises: unknown[];
  } | null;
}

interface AnnouncementRow {
  id: string;
  title: string;
  message: string;
  pinned: boolean;
  publishedAt?: string;
  read: boolean;
}

/* ============================================================
   Dates. Local, not UTC — a session dated 2026-10-22 belongs to
   the 22nd wherever the coach is standing.
   ============================================================ */

const pad = (value: number) => String(value).padStart(2, '0');
const toISODate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function startOfWeek(date: Date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - offset);
  return monday;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function timeAgo(value?: string | null) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function longDate(date: Date) {
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function shortDate(date: Date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function durationLabel(minutes: number) {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

const sessionStatus: Record<SessionRow['status'], { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'badge-neutral' },
  in_progress: { label: 'Live', className: 'badge-primary' },
  completed: { label: 'Done', className: 'badge-success' },
  cancelled: { label: 'Cancelled', className: 'badge-danger' },
};

const settled = <T,>(result: PromiseSettledResult<T>, fallback: T): T =>
  result.status === 'fulfilled' ? result.value : fallback;

export function Dashboard() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);

  const isAthlete = user?.role === 'athlete';
  const canReadAthletes = hasPermission('athlete:read');
  const canAssign = hasPermission('workout:assign');
  const canReadWorkouts = hasPermission('workout:read');
  const canReadAnnouncements = hasPermission('announcement:read');
  const needsClub = isAthlete && !user?.activeClubId && (user?.clubIds?.length ?? 0) === 0;

  const today = useMemo(() => new Date(), []);
  const todayISO = toISODate(today);
  const weekStart = useMemo(() => startOfWeek(today), [today]);
  const weekStartISO = toISODate(weekStart);
  const weekEndISO = toISODate(addDays(weekStart, 6));
  const monthStartISO = toISODate(addDays(today, -29));

  const load = useCallback(async () => {
    if (!user?.activeClubId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const [summaryResult, sessionResult, assignmentResult, athleteResult, workoutResult, announcementResult] =
      await Promise.allSettled([
        analyticsApi.getSummary({ from: monthStartISO, to: todayISO }),
        attendanceApi.getSessions({ from: weekStartISO, to: weekEndISO, limit: 100 }),
        canAssign
          ? workoutApi.getAssignments()
          : canReadWorkouts
            ? workoutApi.getMyAssignments()
            : Promise.resolve([]),
        canReadAthletes ? athleteApi.getAthletes({ limit: 200, status: 'active' }) : Promise.resolve(null),
        canReadAthletes ? workoutApi.getWorkouts() : Promise.resolve([]),
        canReadAnnouncements ? announcementApi.get() : Promise.resolve([]),
      ]);

    setSummary(settled(summaryResult, null as AnalyticsSummary | null));
    setSessions(settled(sessionResult, { data: [] as SessionRow[] }).data || []);
    setAssignments(settled(assignmentResult, [] as AssignmentRow[]));
    setAthletes(settled(athleteResult, null as any)?.data || []);
    setWorkouts(settled(workoutResult, [] as any[]));
    setAnnouncements(settled(announcementResult, [] as AnnouncementRow[]));
    setLoading(false);
  }, [
    user?.activeClubId,
    canAssign,
    canReadAthletes,
    canReadWorkouts,
    canReadAnnouncements,
    monthStartISO,
    todayISO,
    weekStartISO,
    weekEndISO,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ---------- derived ---------- */

  const todaysSessions = useMemo(
    () =>
      sessions
        .filter(session => session.date === todayISO && session.status !== 'cancelled')
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [sessions, todayISO]
  );

  const weekSessionCount = useMemo(
    () => sessions.filter(session => session.status !== 'cancelled').length,
    [sessions]
  );

  const nextSession = todaysSessions.find(
    session => session.status === 'scheduled' || session.status === 'in_progress'
  );

  const weekDays: LaneDay[] = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const day = addDays(weekStart, index);
      const iso = toISODate(day);
      const daySessions = sessions.filter(session => session.date === iso && session.status !== 'cancelled');
      const isToday = iso === todayISO;

      let state: LaneDay['state'] = 'rest';
      if (daySessions.length) {
        if (iso < todayISO) state = daySessions.some(session => session.status === 'completed') ? 'done' : 'missed';
        else state = 'planned';
      }

      return { date: iso, label: WEEKDAY_LABELS[index], dayNumber: day.getDate(), state, isToday };
    });
  }, [sessions, todayISO, weekStart]);

  const athleteNames = useMemo(() => {
    const map = new Map<string, string>();
    athletes.forEach(athlete => {
      map.set(athlete.id, `${athlete.firstName} ${athlete.lastName}`.trim());
    });
    return map;
  }, [athletes]);

  const workoutNames = useMemo(() => {
    const map = new Map<string, string>();
    workouts.forEach(workout => map.set(workout.id, workout.name));
    return map;
  }, [workouts]);

  const openAssignments = useMemo(
    () =>
      assignments
        .filter(assignment => assignment.status !== 'completed')
        .sort((a, b) => String(a.dueDate || a.startDate).localeCompare(String(b.dueDate || b.startDate))),
    [assignments]
  );

  const nextAssignment = openAssignments[0];

  const feedItems: ActivityFeedProps['items'] = useMemo(() => {
    return [...assignments]
      .sort((a, b) =>
        String(b.completedAt || b.updatedAt || b.startDate).localeCompare(String(a.completedAt || a.updatedAt || a.startDate))
      )
      .slice(0, 6)
      .map(assignment => {
        const workoutName =
          assignment.workout?.name || workoutNames.get(assignment.workoutId || '') || 'Workout';
        const athleteName = assignment.workout
          ? undefined
          : athleteNames.get(assignment.athleteId);

        const verb =
          assignment.status === 'completed' ? 'completed' : assignment.status === 'in_progress' ? 'started' : 'was assigned';

        return {
          id: assignment.id,
          title: athleteName ? `${athleteName} ${verb} ${workoutName}` : `${workoutName}`,
          detail: assignment.workout
            ? assignment.status === 'completed'
              ? 'Session logged'
              : assignment.status === 'in_progress'
                ? 'In progress'
                : `Started ${assignment.startDate}`
            : assignment.status === 'completed'
              ? 'Session logged'
              : assignment.notes || `Started ${assignment.startDate}`,
          time: timeAgo(assignment.completedAt || assignment.updatedAt || assignment.startDate),
          tone: assignment.status === 'completed' ? 'success' : assignment.status === 'in_progress' ? 'volt' : 'neutral',
          onClick: athleteName
            ? () => navigate(`/athletes/${assignment.athleteId}`)
            : () => navigate(`/workouts/${assignment.id}/player`),
        } as const;
      });
  }, [assignments, athleteNames, workoutNames, navigate]);

  const announcementItems = announcements.slice(0, 3);
  const sparkPoints = (summary?.attendance.series || []).slice(-14).map(point => point.rate);
  const doneDays = weekDays.filter(day => day.state === 'done').length;
  const trainingDays = weekDays.filter(day => day.state !== 'rest').length;

  const primaryAction = isAthlete
    ? nextAssignment
      ? { label: 'Start session', onClick: () => navigate(`/workouts/${nextAssignment.id}/player`) }
      : { label: 'My workouts', onClick: () => navigate('/workouts') }
    : nextSession
      ? { label: 'Mark attendance', onClick: () => navigate(`/attendance/session/${nextSession.id}`) }
      : { label: 'Open attendance', onClick: () => navigate('/attendance') };

  const secondaryAction = isAthlete
    ? { label: 'My progress', onClick: () => navigate('/performance') }
    : { label: 'Athletes', onClick: () => navigate('/athletes') };

  return (
    <div className="page-shell">
      {/* ---------- header ---------- */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-[2.25rem] uppercase leading-none tracking-[0.01em] text-text-primary sm:text-[2.75rem]">
            Today
          </h1>
          <p className="mt-2 max-w-2xl text-body-sm text-text-secondary">
            {longDate(today)} · Week of {shortDate(weekStart)} ·{' '}
            <span className="num">{weekSessionCount}</span> {weekSessionCount === 1 ? 'session' : 'sessions'} this week
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
          <Button onClick={primaryAction.onClick} rightIcon={<ArrowRight className="h-4 w-4" />}>
            {primaryAction.label}
          </Button>
        </div>
      </header>

      {needsClub && (
        <section className="surface flex flex-col gap-4 border-l-2 border-l-amber-400 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-text-primary">Choose your training club</h2>
            <p className="mt-1 text-body-sm text-text-secondary">Browse clubs and send a request to join one.</p>
          </div>
          <Button onClick={() => navigate('/clubs/enroll')} leftIcon={<Building2 className="h-4 w-4" />}>
            Find a club
          </Button>
        </section>
      )}

      {/* ---------- the week ---------- */}
      <WeekLane days={weekDays} />

      {/* ---------- numbers ---------- */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Training numbers">
        <div className="surface flex items-center justify-between gap-4 p-4 sm:col-span-2">
          <div className="min-w-0">
            <p className="stat-label">{isAthlete ? 'My attendance' : 'Attendance'}</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="num text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-text-primary">
                {loading ? '—' : summary?.attendance.rate ?? 0}
              </span>
              <span className="text-body-sm font-medium text-text-muted">%</span>
            </div>
            <p className="mt-1.5 truncate text-caption text-text-muted">
              {loading
                ? 'Loading the last 30 days…'
                : `${summary?.attendance.total ?? 0} check-ins · ${summary?.attendance.present ?? 0} present, ${summary?.attendance.absent ?? 0} absent`}
            </p>
          </div>
          <div className="w-28 shrink-0 sm:w-36">
            {sparkPoints.length > 1 ? (
              <Sparkline
                points={sparkPoints}
                height={46}
                label={`Attendance rate over the last ${sparkPoints.length} recorded days`}
              />
            ) : (
              <div className="h-[46px] w-full rounded border border-dashed border-border" aria-hidden="true" />
            )}
          </div>
        </div>

        <div className="surface flex flex-col justify-between gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="stat-label">{isAthlete ? 'My compliance' : 'Workout compliance'}</span>
            <ClipboardList className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="num text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-text-primary">
                {loading ? '—' : summary?.workouts.compliance ?? 0}
              </span>
              <span className="text-body-sm font-medium text-text-muted">%</span>
            </div>
            <p className="mt-1.5 text-caption text-text-muted">
              {summary ? `${summary.workouts.completed} of ${summary.workouts.assigned} assignments` : 'Last 30 days'}
            </p>
          </div>
        </div>

        <div className="surface flex flex-col justify-between gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="stat-label">{isAthlete ? 'Personal bests' : 'On the roster'}</span>
            {isAthlete ? (
              <Dumbbell className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
            ) : (
              <Users className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
            )}
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="num text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-text-primary">
                {loading
                  ? '—'
                  : isAthlete
                    ? summary?.performance.personalBests ?? 0
                    : summary?.activeAthletes ?? 0}
              </span>
              <span className="text-body-sm font-medium text-text-muted">
                {isAthlete ? 'PBs' : 'active'}
              </span>
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-caption text-text-muted">
              {isAthlete ? (
                <>
                  <Dumbbell className="h-3.5 w-3.5" aria-hidden="true" />
                  {summary?.performance.total ?? 0} results · {summary?.activeGoals ?? 0} open goals
                </>
              ) : (
                <>
                  <HeartPulse
                    className={summary?.activeInjuries ? 'h-3.5 w-3.5 text-danger-400' : 'h-3.5 w-3.5'}
                    aria-hidden="true"
                  />
                  {summary?.activeInjuries ?? 0} injured · {summary?.activeGoals ?? 0} open goals
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ---------- the day + the noise ---------- */}
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-4">
          {isAthlete ? (
            <Card padding="none">
              <CardContent className="p-0">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-volt" aria-hidden="true" />
                    <h2 className="text-heading-sm font-semibold text-text-primary">Your training</h2>
                  </div>
                  <Link
                    to="/workouts"
                    className="text-caption font-medium text-text-muted transition-colors hover:text-volt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/70"
                  >
                    All workouts
                  </Link>
                </div>

                {loading ? (
                  <div className="space-y-3 p-4">
                    <div className="skeleton h-5 w-2/3" />
                    <div className="skeleton h-3.5 w-1/3" />
                  </div>
                ) : nextAssignment ? (
                  <div className="p-4">
                    <Link
                      to={`/workouts/${nextAssignment.id}/player`}
                      className="group block rounded-radius-lg border border-volt/25 bg-volt/[0.05] p-4 transition-colors hover:border-volt/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="section-label text-volt">
                          {nextAssignment.status === 'in_progress' ? 'In progress' : 'Up next'}
                        </p>
                        <span className="num text-caption text-text-muted">
                          {nextAssignment.dueDate ? `Due ${nextAssignment.dueDate}` : `From ${nextAssignment.startDate}`}
                        </span>
                      </div>
                      <h3 className="mt-2 font-display text-2xl uppercase leading-tight text-text-primary">
                        {nextAssignment.workout?.name || 'Assigned workout'}
                      </h3>
                      <p className="mt-1.5 text-body-sm text-text-secondary">
                        {nextAssignment.workout?.description || 'Follow this session at your own pace.'}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-text-muted">
                        {nextAssignment.workout?.estimatedDuration ? (
                          <span className="num">{durationLabel(nextAssignment.workout.estimatedDuration)}</span>
                        ) : null}
                        {nextAssignment.workout?.exercises?.length ? (
                          <span className="num">{nextAssignment.workout.exercises.length} exercises</span>
                        ) : null}
                        <span className="inline-flex items-center gap-1 font-medium text-volt">
                          Start session <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      </div>
                    </Link>

                    {openAssignments.length > 1 && (
                      <ul className="mt-3 divide-y divide-border/60">
                        {openAssignments.slice(1, 4).map(assignment => (
                          <li key={assignment.id}>
                            <Link
                              to={`/workouts/${assignment.id}/player`}
                              className="flex items-center justify-between gap-3 py-2.5 text-body-sm transition-colors hover:text-volt"
                            >
                              <span className="truncate text-text-primary">
                                {assignment.workout?.name || 'Assigned workout'}
                              </span>
                              <span className="num shrink-0 text-caption text-text-muted">{assignment.startDate}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <EmptyState
                    compact
                    icon={<Dumbbell className="h-5 w-5" />}
                    title="Nothing assigned right now"
                    description="When your coach publishes a session it lands here, ready to open."
                    action={
                      <Button variant="outline" size="sm" onClick={() => navigate('/workouts')}>
                        Open workouts
                      </Button>
                    }
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            <Card padding="none">
              <CardContent className="p-0">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-volt" aria-hidden="true" />
                    <h2 className="text-heading-sm font-semibold text-text-primary">Today's sessions</h2>
                    <span className="num text-caption text-text-muted">{todaysSessions.length}</span>
                  </div>
                  <Link
                    to="/attendance"
                    className="text-caption font-medium text-text-muted transition-colors hover:text-volt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/70"
                  >
                    Full schedule
                  </Link>
                </div>

                {loading ? (
                  <div className="space-y-3 p-4">
                    <div className="skeleton h-4 w-1/2" />
                    <div className="skeleton h-4 w-2/3" />
                    <div className="skeleton h-4 w-1/3" />
                  </div>
                ) : todaysSessions.length ? (
                  <ul className="divide-y divide-border/60">
                    {todaysSessions.map(session => {
                      const badge = sessionStatus[session.status];
                      const isNext = nextSession?.id === session.id;
                      return (
                        <li key={session.id}>
                          <Link
                            to={`/attendance/session/${session.id}`}
                            className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-volt/70"
                          >
                            <span
                              className={`num w-[86px] shrink-0 text-body-sm ${isNext ? 'text-volt' : 'text-text-secondary'}`}
                            >
                              {session.startTime}–{session.endTime}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="truncate text-body-sm font-medium text-text-primary">
                                  {session.title}
                                </span>
                                {isNext && (
                                  <span
                                    className="h-1.5 w-1.5 shrink-0 animate-pulse-soft rounded-full bg-volt"
                                    aria-label="Next up"
                                  />
                                )}
                              </span>
                              <span className="mt-0.5 block truncate text-caption capitalize text-text-muted">
                                {session.venue} · {session.type}
                              </span>
                            </span>
                            <span className={`${badge.className} hidden sm:inline-flex`}>{badge.label}</span>
                            <ArrowRight
                              className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-volt"
                              aria-hidden="true"
                            />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyState
                    compact
                    icon={<CalendarDays className="h-5 w-5" />}
                    title="No session on the board today"
                    description="Rest day, or nothing published yet. The week's schedule is one tap away."
                    action={
                      <Button variant="outline" size="sm" onClick={() => navigate('/attendance')}>
                        View the schedule
                      </Button>
                    }
                  />
                )}
              </CardContent>
            </Card>
          )}

          <Card padding="none">
            <CardContent className="p-0">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <h2 className="text-heading-sm font-semibold text-text-primary">
                  {isAthlete ? 'Your activity' : 'Recent activity'}
                </h2>
                <Link
                  to="/workouts"
                  className="text-caption font-medium text-text-muted transition-colors hover:text-volt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/70"
                >
                  Workouts
                </Link>
              </div>
              {loading ? (
                <div className="space-y-3 p-4">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-4 w-2/3" />
                  <div className="skeleton h-4 w-1/2" />
                </div>
              ) : (
                <ActivityFeed
                  items={feedItems}
                  emptyLabel={
                    isAthlete
                      ? 'Nothing logged yet. Completed sessions will appear here.'
                      : 'No workout activity yet. Assign a session and it will show up here.'
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* right rail */}
        <div className="space-y-4">
          <Card padding="none">
            <CardContent className="p-0">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-text-muted" aria-hidden="true" />
                  <h2 className="text-heading-sm font-semibold text-text-primary">Announcements</h2>
                </div>
                {canReadAnnouncements && (
                  <Link
                    to="/announcements"
                    className="text-caption font-medium text-text-muted transition-colors hover:text-volt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/70"
                  >
                    All
                  </Link>
                )}
              </div>

              {loading ? (
                <div className="space-y-3 p-4">
                  <div className="skeleton h-4 w-2/3" />
                  <div className="skeleton h-4 w-1/2" />
                </div>
              ) : announcementItems.length ? (
                <ul className="divide-y divide-border/60">
                  {announcementItems.map(item => (
                    <li key={item.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to="/announcements"
                          className="min-w-0 text-body-sm font-medium text-text-primary transition-colors hover:text-volt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/70"
                        >
                          {item.title}
                        </Link>
                        {!item.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-volt" aria-label="Unread" />}
                      </div>
                      <p className="mt-1 line-clamp-2 text-caption leading-relaxed text-text-secondary">{item.message}</p>
                      <p className="num mt-1.5 text-micro text-text-muted">{timeAgo(item.publishedAt)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  compact
                  icon={<Megaphone className="h-5 w-5" />}
                  title="No announcements"
                  description="Club notices appear here as soon as they are published."
                />
              )}
            </CardContent>
          </Card>

          <Card padding="none">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-heading-sm font-semibold text-text-primary">
                  {isAthlete ? 'This week' : 'Week at a glance'}
                </h2>
                <span className="num text-caption text-text-muted">
                  {weekSessionCount} {weekSessionCount === 1 ? 'session' : 'sessions'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <ProgressRing
                  value={doneDays}
                  max={Math.max(trainingDays, 1)}
                  size={64}
                  strokeWidth={5}
                  label="Sessions completed this week"
                >
                  <span className="num text-caption font-semibold text-text-primary">
                    {trainingDays ? `${doneDays}/${trainingDays}` : '—'}
                  </span>
                </ProgressRing>
                <div className="min-w-0 flex-1 space-y-1.5 text-caption text-text-secondary">
                  <p className="flex items-center gap-2">
                    <span className="h-1 w-4 rounded-full bg-volt" aria-hidden="true" /> Completed this week
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="h-1 w-4 rounded-full bg-white/25" aria-hidden="true" /> Still to come
                  </p>
                  {summary?.averageSessionMinutes ? (
                    <p className="num pt-1 text-text-muted">{durationLabel(summary.averageSessionMinutes)} average session</p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
