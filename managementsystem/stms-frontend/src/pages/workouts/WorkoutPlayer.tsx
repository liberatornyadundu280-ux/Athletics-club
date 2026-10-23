import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, HeartPulse, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, Input } from '@/components/ui';
import { readinessApi, workoutApi } from '@/services/api';
import { offlineWorkouts } from '@/utils/offline-workouts';

interface Guidance {
  checkedInToday: boolean;
  needsCheckIn: boolean;
  readiness: { soreness: number; sleepQuality: number; stressEnergy: number } | null;
  readinessScore: number | null;
  recentPain: number | null;
  volumePercent: number;
  intensityPercent: number;
  message: string;
}

const today = () => new Date().toISOString().slice(0, 10);

/** 1-5 button row used by the pre-session check-in. */
function Scale({ label, hintLow, hintHigh, value, onChange }: { label: string; hintLow: string; hintHigh: string; value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-body-sm font-medium text-text-primary">{label}</span>
        <span className="num text-caption text-text-muted">{value}/5</span>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1.5" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map(option => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option)}
              className={`num h-10 rounded-radius-md border text-body-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/70 ${
                selected
                  ? 'border-volt bg-volt/15 text-volt'
                  : 'border-border bg-ink/50 text-text-secondary hover:border-white/20 hover:text-text-primary'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-micro text-text-muted">
        <span>{hintLow}</span>
        <span>{hintHigh}</span>
      </div>
    </div>
  );
}

/** 1-10 slider with the value stated as a number, not only a handle position. */
function ScoreSlider({ label, value, onChange, min, max, hint, tone = 'volt' }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number; hint: string; tone?: 'volt' | 'amber' }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-body-sm font-medium text-text-primary">{label}</span>
        <span className={`num text-body-sm font-semibold ${tone === 'amber' ? 'text-amber-400' : 'text-volt'}`}>
          {value}<span className="text-text-muted">/{max}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={event => onChange(Number(event.target.value))}
        className={`mt-3 w-full ${tone === 'amber' ? 'accent-amber-400' : 'accent-volt'}`}
        aria-label={label}
      />
      <span className="mt-1 block text-micro text-text-muted">{hint}</span>
    </div>
  );
}

export function WorkoutPlayer() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [effort, setEffort] = useState(6);
  const [duration, setDuration] = useState(0);
  const [notes, setNotes] = useState('');
  const [pain, setPain] = useState(0);
  const [painLocation, setPainLocation] = useState('');
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  // Pre-session check-in
  const [soreness, setSoreness] = useState(3);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [stressEnergy, setStressEnergy] = useState(3);
  const [savingCheckIn, setSavingCheckIn] = useState(false);

  useEffect(() => {
    let active = true;
    workoutApi.getAssignment(id).then(result => { if (active) { setData(result); void offlineWorkouts.cache(result).catch(() => undefined); } }).catch(async (error: any) => {
      try { const cached = await offlineWorkouts.get(id); if (active && cached) { setData(cached); toast.info('Opened the saved workout from this device'); } else if (active) toast.error(error.message || 'Could not open assigned workout'); }
      catch { if (active) toast.error(error.message || 'Could not open assigned workout'); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const submitCheckIn = async () => {
    setSavingCheckIn(true);
    try {
      await readinessApi.submit({ date: today(), soreness, sleepQuality, stressEnergy });
      // Re-open the assignment so the server can calibrate sets/intensity to this check-in.
      const refreshed = await workoutApi.getAssignment(id);
      setData(refreshed);
      toast.success('Check-in saved — today’s session has been calibrated');
    } catch (error: any) {
      toast.error(error.message || 'Could not save your check-in');
    } finally {
      setSavingCheckIn(false);
    }
  };

  const finish = async () => {
    if (!data) return;
    setSaving(true);
    const payload = {
      durationMinutes: duration || data.workout.estimatedDuration,
      perceivedEffort: effort,
      painLevel: pain,
      ...(pain > 0 && painLocation.trim() ? { painLocation: painLocation.trim() } : {}),
      notes,
      exerciseResults: data.workout.exercises.map((exercise: any, exerciseIndex: number) => ({ exerciseIndex, completedSets: checked[exerciseIndex] ? exercise.sets : 0 })),
    };
    try {
      await workoutApi.complete(id, payload);
      toast.success('Workout saved — your next recommendation will use this');
      navigate('/workouts', { replace: true });
    } catch (error: any) {
      if (!navigator.onLine) {
        try { await offlineWorkouts.enqueue(id, payload); toast.info('Saved on this device. It will sync when you are online.'); navigate('/workouts', { replace: true }); }
        catch { toast.error('Offline save failed. Keep this page open and try again when connected.'); }
      } else toast.error(error.message || 'Could not save workout completion');
    }
    finally { setSaving(false); }
  };

  useEffect(() => {
    const syncPending = async () => {
      if (!navigator.onLine) return;
      try {
        for (const item of await offlineWorkouts.pending()) {
          await workoutApi.complete(item.assignmentId, item.payload);
          await offlineWorkouts.remove(item.id);
          toast.success('Offline workout completion synced');
        }
      } catch { /* Keep queued data for the next connection attempt. */ }
    };
    window.addEventListener('online', syncPending);
    void syncPending();
    return () => window.removeEventListener('online', syncPending);
  }, []);

  if (loading) return <div role="status" className="py-20 text-center text-text-secondary">Opening your workout…</div>;
  if (!data) return <div className="py-16 text-center"><h1 className="text-xl font-semibold text-text-primary">Workout unavailable</h1><p className="mt-2 text-text-secondary">This assignment may have been removed or belongs to another club.</p><Button className="mt-5" variant="outline" onClick={() => navigate('/workouts')}>Back to workouts</Button></div>;

  const { assignment, workout, guidance }: { assignment: any; workout: any; guidance: Guidance | null } = data;
  const complete = assignment.status === 'completed';
  const checkedIn = Boolean(guidance?.checkedInToday);
  const exercises: any[] = workout.exercises || [];
  const doneCount = complete ? exercises.length : exercises.filter((_exercise, index) => checked[index]).length;
  const percent = exercises.length ? Math.round((doneCount / exercises.length) * 100) : 0;

  return (
    <div className="page-shell mx-auto max-w-3xl">
      <Button variant="ghost" size="sm" className="-ml-2 self-start" onClick={() => navigate('/workouts')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
        My workouts
      </Button>

      <section className="surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="stat-label">Today's session</p>
            <h1 className="mt-1.5 font-display text-2xl uppercase leading-[1.02] tracking-[-0.01em] text-text-primary sm:text-[2rem]">
              {workout.name}
            </h1>
            <p className="mt-2 max-w-xl text-body-sm text-text-secondary">
              {workout.description || 'Follow the prescribed work and record how it felt.'}
            </p>
          </div>
          <span className={complete ? 'badge-success' : 'badge-primary'}>{complete ? 'Completed' : assignment.status.replace('_', ' ')}</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-caption text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="num text-text-secondary">{workout.estimatedDuration}</span> minutes
          </span>
          <span>
            Starts <span className="num text-text-secondary">{assignment.startDate}</span>
          </span>
          {assignment.dueDate && (
            <span>
              Due <span className="num text-text-secondary">{assignment.dueDate}</span>
            </span>
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="stat-label">Exercises marked</span>
            <span className="num text-body-sm text-text-primary">
              {doneCount}<span className="text-text-muted">/{exercises.length}</span>
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Exercises marked complete">
            <div className="h-full rounded-full bg-volt transition-[width] duration-300 ease-out" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </section>

      {!complete && guidance?.needsCheckIn && (
        <Card padding="none">
          <CardContent className="space-y-5 p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-radius-md bg-volt/10 text-volt">
                <HeartPulse className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-heading-sm font-semibold text-text-primary">How are you feeling today?</h2>
                <p className="mt-1 text-body-sm text-text-secondary">
                  This adjusts today's sets and intensity before you start — and it is what the recommendation engine reads next time.
                </p>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <Scale label="Soreness" hintLow="None" hintHigh="Very sore" value={soreness} onChange={setSoreness} />
              <Scale label="Sleep" hintLow="Poor" hintHigh="Excellent" value={sleepQuality} onChange={setSleepQuality} />
              <Scale label="Energy" hintLow="Drained" hintHigh="Fresh" value={stressEnergy} onChange={setStressEnergy} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-caption text-text-muted">1 = worst, 5 = best. Your coach can see this check-in.</p>
              <Button loading={savingCheckIn} onClick={() => void submitCheckIn()}>Save check-in</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {guidance && (checkedIn || (guidance.recentPain !== null && guidance.recentPain >= 4)) && (
        <div className="rounded-radius-lg border border-volt/30 bg-volt/[0.06] p-4">
          <p className="text-body-sm font-semibold text-text-primary">
            {checkedIn ? 'Session calibrated to your check-in' : 'Session eased for recent pain'}
          </p>
          <p className="mt-1 text-body-sm text-text-secondary">{guidance.message}</p>
          <div className="num mt-2.5 flex flex-wrap gap-1.5 text-micro text-text-secondary">
            <span className="rounded border border-border px-1.5 py-0.5">Volume {guidance.volumePercent}%</span>
            <span className="rounded border border-border px-1.5 py-0.5">Intensity {guidance.intensityPercent}%</span>
            {guidance.readiness && (
              <span className="rounded border border-border px-1.5 py-0.5">
                Soreness {guidance.readiness.soreness}/5 · Sleep {guidance.readiness.sleepQuality}/5 · Energy {guidance.readiness.stressEnergy}/5
              </span>
            )}
            {guidance.recentPain !== null && guidance.recentPain >= 4 && (
              <span className="rounded border border-amber-500/30 px-1.5 py-0.5 text-amber-400">Recent pain {guidance.recentPain}/10</span>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {exercises.map((exercise: any, index: number) => {
          const marked = checked[index] || complete;
          return (
            <Card key={index} padding="none">
              <CardContent className={`flex items-start gap-3 p-4 transition-colors ${marked ? 'bg-volt/[0.03]' : ''}`}>
                <button
                  type="button"
                  disabled={complete}
                  onClick={() => setChecked(previous => ({ ...previous, [index]: !previous[index] }))}
                  aria-pressed={Boolean(checked[index])}
                  aria-label={`${checked[index] ? 'Mark incomplete' : 'Mark complete'}: ${exercise.name}`}
                  className={`mt-0.5 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/70 ${
                    marked ? 'text-volt' : 'text-text-muted hover:text-text-secondary'
                  } disabled:opacity-60`}
                >
                  {marked ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="num text-micro text-text-muted">{String(index + 1).padStart(2, '0')}</span>
                    <h2 className={`text-body-sm font-semibold ${marked ? 'text-text-secondary' : 'text-text-primary'}`}>{exercise.name}</h2>
                  </div>
                  <p className="num mt-1 text-caption text-text-secondary">
                    {exercise.sets} sets · {exercise.reps} · {exercise.restSeconds}s rest
                    {exercise.targetZone ? ` · ${exercise.targetZone}` : ''}
                  </p>
                  {exercise.coachingNotes && <p className="mt-1.5 text-caption text-text-muted">{exercise.coachingNotes}</p>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!complete && (
        <Card padding="none">
          <CardContent className="space-y-5 p-5">
            <div>
              <h2 className="text-heading-sm font-semibold text-text-primary">How did the session go?</h2>
              <p className="mt-1 text-body-sm text-text-secondary">Effort, pain and notes are stored with the session and used in your next recommendation.</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Duration (minutes)"
                type="number"
                min={0}
                max={600}
                value={duration}
                placeholder={String(workout.estimatedDuration)}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDuration(Number(event.target.value))}
                hint="Leave at 0 to use the planned duration."
              />
              <ScoreSlider label="Session effort (RPE)" value={effort} min={1} max={10} onChange={setEffort} hint="How hard did it feel overall?" />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <ScoreSlider
                label="Pain during or after"
                value={pain}
                min={0}
                max={10}
                onChange={setPain}
                tone="amber"
                hint={pain === 0 ? 'No pain reported' : 'Tell your coach where it hurts.'}
              />
              {pain > 0 ? (
                <Input
                  label="Where does it hurt?"
                  placeholder="e.g. right hamstring, lower back"
                  value={painLocation}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPainLocation(event.target.value)}
                  maxLength={80}
                />
              ) : (
                <div className="flex items-end">
                  <p className="text-caption text-text-muted">Pain is only recorded when you raise the slider above zero.</p>
                </div>
              )}
            </div>

            <label className="block">
              <span className="label">Notes</span>
              <textarea
                className="input min-h-20"
                maxLength={2000}
                value={notes}
                onChange={event => setNotes(event.target.value)}
                placeholder="What felt strong? Anything to tell your coach?"
              />
            </label>

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => navigate('/workouts')}>Not now</Button>
              <Button loading={saving} onClick={() => void finish()}>Save completion</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
