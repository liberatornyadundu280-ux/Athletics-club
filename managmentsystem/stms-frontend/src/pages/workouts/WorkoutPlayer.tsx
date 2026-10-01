import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent, Input } from '@/components/ui';
import { workoutApi } from '@/services/api';
import { offlineWorkouts } from '@/utils/offline-workouts';

export function WorkoutPlayer() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [effort, setEffort] = useState(6);
  const [duration, setDuration] = useState(0);
  const [notes, setNotes] = useState('');
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let active = true;
    workoutApi.getAssignment(id).then(result => { if (active) { setData(result); void offlineWorkouts.cache(result).catch(() => undefined); } }).catch(async (error: any) => {
      try { const cached = await offlineWorkouts.get(id); if (active && cached) { setData(cached); toast.info('Opened the saved workout from this device'); } else if (active) toast.error(error.message || 'Could not open assigned workout'); }
      catch { if (active) toast.error(error.message || 'Could not open assigned workout'); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const finish = async () => {
    if (!data) return;
    setSaving(true);
    const payload = { durationMinutes: duration || data.workout.estimatedDuration, perceivedEffort: effort, notes, exerciseResults: data.workout.exercises.map((exercise: any, exerciseIndex: number) => ({ exerciseIndex, completedSets: checked[exerciseIndex] ? exercise.sets : 0 })) };
    try {
      await workoutApi.complete(id, payload);
      toast.success('Workout completion saved'); navigate('/workouts', { replace: true });
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
  const { assignment, workout } = data;
  const complete = assignment.status === 'completed';
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/workouts')} leftIcon={<ArrowLeft className="h-4 w-4" />}>My workouts</Button>
      <section className="surface-raised p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-sky-400">TODAY’S SESSION</p><h1 className="mt-2 text-3xl font-bold text-text-primary">{workout.name}</h1><p className="mt-2 text-text-secondary">{workout.description || 'Follow the prescribed work and record how it felt.'}</p></div><Badge variant={complete ? 'success' : 'primary'}>{complete ? 'Completed' : assignment.status.replace('_', ' ')}</Badge></div><p className="mt-5 inline-flex items-center gap-2 text-sm text-text-muted"><Timer className="h-4 w-4" />{workout.estimatedDuration} minutes · Start date {assignment.startDate}</p></section>
      <div className="space-y-3">{(workout.exercises || []).map((exercise: any, index: number) => <Card key={index}><CardContent className="flex items-start gap-4 p-5"><button type="button" disabled={complete} onClick={() => setChecked(previous => ({ ...previous, [index]: !previous[index] }))} aria-label={`${checked[index] ? 'Mark incomplete' : 'Mark complete'}: ${exercise.name}`} className="mt-0.5 text-sky-400 disabled:opacity-50">{checked[index] || complete ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}</button><div className="min-w-0 flex-1"><h2 className="font-semibold text-text-primary">{exercise.name}</h2><p className="mt-1 text-sm text-text-secondary">{exercise.sets} sets · {exercise.reps} · {exercise.restSeconds}s rest{exercise.targetZone ? ` · ${exercise.targetZone}` : ''}</p>{exercise.coachingNotes && <p className="mt-2 text-sm text-text-muted">{exercise.coachingNotes}</p>}</div></CardContent></Card>)}</div>
      {!complete && <Card><CardContent className="space-y-4 p-5"><h2 className="font-semibold text-text-primary">How did the session go?</h2><div className="grid gap-4 sm:grid-cols-2"><Input label="Duration (minutes)" type="number" min={0} max={600} value={duration} onChange={event => setDuration(Number(event.target.value))} /><label className="text-sm text-text-secondary">Effort · {effort}/10<input type="range" min={1} max={10} value={effort} onChange={event => setEffort(Number(event.target.value))} className="mt-3 w-full accent-sky-400" /></label></div><label className="block text-sm text-text-secondary">Notes<textarea className="mt-1 min-h-20 w-full rounded-lg border border-border bg-cold-900 px-3 py-2 text-text-primary" maxLength={2000} value={notes} onChange={event => setNotes(event.target.value)} placeholder="What felt strong? Anything to tell your coach?" /></label><div className="flex justify-end"><Button loading={saving} onClick={() => void finish()}>Save completion</Button></div></CardContent></Card>}
    </div>
  );
}
