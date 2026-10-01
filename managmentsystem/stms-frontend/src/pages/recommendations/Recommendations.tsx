import React, { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { athleteApi, recommendationApi, workoutApi } from '@/services/api';

export function Recommendations() {
  const { user, hasPermission } = useAuth();
  const [items, setItems] = useState<any[]>([]); const [athletes, setAthletes] = useState<any[]>([]); const [workouts, setWorkouts] = useState<any[]>([]);
  const [athleteId, setAthleteId] = useState(''); const [workoutById, setWorkoutById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true); const [generating, setGenerating] = useState(false); const [error, setError] = useState('');
  const canReview = hasPermission('workout:assign'); const isAthlete = user?.role === 'athlete';

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [recommendations, roster, workoutList] = await Promise.all([recommendationApi.get(), canReview ? athleteApi.getAthletes({ limit: 100 }) : Promise.resolve(null), canReview ? workoutApi.getWorkouts() : Promise.resolve([])]);
      setItems(recommendations); setAthletes(roster?.data || []); setWorkouts(workoutList);
    } catch (cause: any) { setError(cause.message || 'Could not load training recommendations'); }
    finally { setLoading(false); }
  }, [canReview]);
  useEffect(() => { void load(); }, [load]);

  const generate = async () => {
    if (canReview && !athleteId) { toast.error('Choose an athlete first.'); return; }
    setGenerating(true);
    try { await recommendationApi.generate({ athleteId: canReview ? athleteId : undefined, trigger: 'manual' }); toast.success('A new training suggestion is ready'); await load(); }
    catch (cause: any) { toast.error(cause.message || 'Could not generate a recommendation'); }
    finally { setGenerating(false); }
  };
  const review = async (item: any, status: 'accepted' | 'dismissed') => {
    const workoutId = workoutById[item.id];
    if (status === 'accepted' && !workoutId) { toast.error('Choose the workout to assign with this recommendation.'); return; }
    try { await recommendationApi.review(item.id, { status, workoutId }); toast.success(status === 'accepted' ? 'Workout assigned' : 'Suggestion dismissed'); await load(); }
    catch (cause: any) { toast.error(cause.message || 'Could not update recommendation'); }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="surface-raised relative overflow-hidden p-6 sm:p-8"><div className="absolute right-0 top-0 h-full w-1.5 bg-gradient-to-b from-sky-400 via-sky-500 to-amber-400" /><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-sky-400">SPRINT 6 · SMART TRAINING</p><h1 className="mt-2 text-3xl font-bold text-text-primary">Training suggestions</h1><p className="mt-2 max-w-2xl text-text-secondary">Suggestions use recent performance, attendance, workout effort, and active injury records. Each card shows the signals behind it.</p></div><Sparkles className="hidden h-8 w-8 text-amber-300 sm:block" /></div></section>
      {canReview && <Card><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end"><Select label="Athlete" value={athleteId} onChange={event => setAthleteId(event.target.value)} options={[{ value: '', label: 'Choose an athlete' }, ...athletes.map(athlete => ({ value: athlete.id, label: `${athlete.firstName} ${athlete.lastName}` }))]} /><Button loading={generating} disabled={!athleteId} onClick={() => void generate()} leftIcon={<RefreshCw className="h-4 w-4" />}>Generate suggestion</Button></CardContent></Card>}
      {isAthlete && <div className="flex justify-end"><Button loading={generating} onClick={() => void generate()} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh my plan</Button></div>}
      <p className="text-xs text-text-muted">Cold-start suggestions use explainable rules, not a trained prediction model. Follow clinician restrictions where applicable.</p>
      {loading ? <div className="py-14 text-center text-text-secondary" role="status">Reading recent training records…</div> : error ? <div className="py-14 text-center"><p role="alert">{error}</p><Button className="mt-4" variant="outline" onClick={() => void load()}>Try again</Button></div> : items.length === 0 ? <Card><CardContent className="py-16 text-center"><Activity className="mx-auto h-10 w-10 text-text-muted" /><h2 className="mt-4 font-semibold text-text-primary">No training suggestions yet</h2><p className="mt-2 text-sm text-text-secondary">Generate one after selecting an athlete, or complete a workout / record a performance to refresh it automatically.</p></CardContent></Card> : <div className="space-y-3">{items.map(item => <Card key={item.id}><CardContent className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-text-primary">{item.focus}</h2><Badge variant={item.status === 'pending' ? 'gold' : item.status === 'accepted' ? 'success' : 'neutral'}>{item.status}</Badge></div><p className="mt-1 text-sm text-text-secondary">{item.athleteName} · {new Date(item.generatedAt).toLocaleString()} · {Math.round((item.confidence || 0) * 100)}% confidence</p></div><Badge variant="outline">{item.modelVersion}</Badge></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-border p-3"><p className="text-xs font-semibold text-text-muted">INTENSITY</p><p className="mt-1 text-sm text-text-primary">{item.intensity}</p></div><div className="rounded-lg border border-border p-3"><p className="text-xs font-semibold text-text-muted">RECOVERY</p><p className="mt-1 text-sm text-text-primary">{item.recovery}</p></div></div><div className="mt-4"><p className="text-xs font-semibold text-text-muted">WHY THIS SUGGESTION</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-secondary">{item.drivers.map((driver: string, index: number) => <li key={index}>{driver}</li>)}</ul></div>{canReview && item.status === 'pending' && <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-end"><Select aria-label={`Workout for ${item.athleteName}`} value={workoutById[item.id] || ''} onChange={event => setWorkoutById(previous => ({ ...previous, [item.id]: event.target.value }))} options={[{ value: '', label: 'Choose workout to assign' }, ...workouts.map(workout => ({ value: workout.id, label: workout.name }))]} /><Button variant="ghost" onClick={() => void review(item, 'dismissed')}>Dismiss</Button><Button onClick={() => void review(item, 'accepted')} disabled={!workoutById[item.id]}>Accept and assign</Button></div>}</CardContent></Card>)}</div>}
    </div>
  );
}
