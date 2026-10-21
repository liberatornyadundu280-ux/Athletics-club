import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, HeartPulse, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent, Input } from '@/components/ui';
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
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <span className="text-sm text-text-secondary">{value}/5</span>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1.5" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map(option => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={`rounded-lg border py-2 text-sm font-medium transition ${
              value === option
                ? 'border-sky-400 bg-sky-400/15 text-text-primary'
                : 'border-border bg-cold-900 text-text-secondary hover:border-sky-400/50'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-text-muted">
        <span>{hintLow}</span>
        <span>{hintHigh}</span>
      </div>
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/workouts')} leftIcon={<ArrowLeft className="h-4 w-4" />}>My workouts</Button>

      <section className="surface-raised p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-sky-400">TODAY’S SESSION</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">{workout.name}</h1>
            <p className="mt-2 text-text-secondary">{workout.description || 'Follow the prescribed work and record how it felt.'}</p>
          </div>
          <Badge variant={complete ? 'success' : 'primary'}>{complete ? 'Completed' : assignment.status.replace('_', ' ')}</Badge>
        </div>
        <p className="mt-5 inline-flex items-center gap-2 text-sm text-text-muted"><Timer className="h-4 w-4" />{workout.estimatedDuration} minutes · Start date {assignment.startDate}</p>
      </section>

      {!complete && guidance?.needsCheckIn && (
        <Card>
          <CardContent className="space-y-5 p-5">
            <div className="flex items-start gap-3">
              <HeartPulse className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
              <div>
                <h2 className="font-semibold text-text-primary">How are you feeling today?</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  This adjusts today’s sets and intensity before you start — and it is what the recommendation engine reads next time.
                </p>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <Scale label="Muscle soreness" hintLow="None" hintHigh="Very sore" value={soreness} onChange={setSoreness} />
              <Scale label="Sleep quality" hintLow="Poor" hintHigh="Excellent" value={sleepQuality} onChange={setSleepQuality} />
              <Scale label="Energy" hintLow="Drained" hintHigh="Fresh" value={stressEnergy} onChange={setStressEnergy} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-text-muted">1 = worst, 5 = best. Your coach can see this check-in.</p>
              <Button loading={savingCheckIn} onClick={() => void submitCheckIn()}>Save check-in</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {guidance && (checkedIn || (guidance.recentPain !== null && guidance.recentPain >= 4)) && (
        <div className="rounded-xl border border-sky-400/40 bg-sky-400/10 p-4">
          <p className="text-sm font-semibold text-text-primary">{checkedIn ? 'Session calibrated to your check-in' : 'Session eased for recent pain'}</p>
          <p className="mt-1 text-sm text-text-secondary">{guidance.message}</p>
          <p className="mt-2 text-xs text-text-muted">
            Volume {guidance.volumePercent}% · Intensity {guidance.intensityPercent}%
            {guidance.readiness ? ` · Soreness ${guidance.readiness.soreness}/5 · Sleep ${guidance.readiness.sleepQuality}/5 · Energy ${guidance.readiness.stressEnergy}/5` : ''}
            {guidance.recentPain !== null && guidance.recentPain >= 4 ? ` · Recent pain ${guidance.recentPain}/10` : ''}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {(workout.exercises || []).map((exercise: any, index: number) => (
          <Card key={index}>
            <CardContent className="flex items-start gap-4 p-5">
              <button type="button" disabled={complete} onClick={() => setChecked(previous => ({ ...previous, [index]: !previous[index] }))} aria-label={`${checked[index] ? 'Mark incomplete' : 'Mark complete'}: ${exercise.name}`} className="mt-0.5 text-sky-400 disabled:opacity-50">
                {checked[index] || complete ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-text-primary">{exercise.name}</h2>
                <p className="mt-1 text-sm text-text-secondary">{exercise.sets} sets · {exercise.reps} · {exercise.restSeconds}s rest{exercise.targetZone ? ` · ${exercise.targetZone}` : ''}</p>
                {exercise.coachingNotes && <p className="mt-2 text-sm text-text-muted">{exercise.coachingNotes}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!complete && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="font-semibold text-text-primary">How did the session go?</h2>
              <p className="mt-1 text-sm text-text-secondary">Effort, pain and notes are stored with the session and used in your next recommendation.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Duration (minutes)" type="number" min={0} max={600} value={duration} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDuration(Number(event.target.value))} />
              <label className="text-sm text-text-secondary">
                Session effort (RPE) · {effort}/10
                <input type="range" min={1} max={10} value={effort} onChange={event => setEffort(Number(event.target.value))} className="mt-3 w-full accent-sky-400" />
                <span className="mt-1 block text-[11px] text-text-muted">How hard did it feel overall?</span>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-text-secondary">
                Pain during or after · {pain}/10
                <input type="range" min={0} max={10} value={pain} onChange={event => setPain(Number(event.target.value))} className="mt-3 w-full accent-sky-400" />
                <span className="mt-1 block text-[11px] text-text-muted">{pain === 0 ? 'No pain reported' : 'Tell your coach where it hurts below'}</span>
              </label>
              {pain > 0 && (
                <Input label="Where does it hurt?" placeholder="e.g. right hamstring, lower back" value={painLocation} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPainLocation(event.target.value)} maxLength={80} />
              )}
            </div>
            <label className="block text-sm text-text-secondary">
              Notes
              <textarea className="mt-1 min-h-20 w-full rounded-lg border border-border bg-cold-900 px-3 py-2 text-text-primary" maxLength={2000} value={notes} onChange={event => setNotes(event.target.value)} placeholder="What felt strong? Anything to tell your coach?" />
            </label>
            <div className="flex justify-end"><Button loading={saving} onClick={() => void finish()}>Save completion</Button></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
