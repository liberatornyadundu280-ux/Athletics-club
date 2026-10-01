import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ClipboardList, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent, Modal } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { athleteApi, workoutApi } from '@/services/api';

type Workout = { id: string; name: string; description?: string; estimatedDuration: number; difficulty: string; tags?: string[]; exercises?: unknown[] };
type Athlete = { id: string; firstName: string; lastName: string; email: string };
const today = () => new Date().toISOString().slice(0, 10);

export function WorkoutsList() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selected, setSelected] = useState<Workout | null>(null);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dueDate, setDueDate] = useState('');
  const coach = hasPermission('workout:assign');
  const canWrite = hasPermission('workout:write');
  const athleteMode = user?.role === 'athlete';

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (athleteMode) setAssignments(await workoutApi.getMyAssignments());
      else setWorkouts(await workoutApi.getWorkouts());
      if (coach) {
        const roster = await athleteApi.getAthletes({ limit: 100 }); setAthletes(roster.data || []);
      }
    } catch (cause: any) { setError(cause.message || 'Could not load workouts'); }
    finally { setLoading(false); }
  }, [athleteMode, coach]);
  useEffect(() => { void load(); }, [load]);

  const submitAssignment = async () => {
    if (!selected || !selectedAthletes.length) return;
    setSaving(true);
    try { const result = await workoutApi.assign(selected.id, { athleteIds: selectedAthletes, startDate: today(), dueDate: dueDate || undefined }); toast.success(`Assigned to ${result.assigned} athlete${result.assigned === 1 ? '' : 's'}`); setSelected(null); setSelectedAthletes([]); }
    catch (cause: any) { toast.error(cause.message || 'Could not assign this workout'); }
    finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="surface-raised relative overflow-hidden p-6 sm:p-8"><div className="absolute right-0 top-0 h-full w-1.5 bg-gradient-to-b from-sky-400 via-sky-500 to-amber-400" /><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-sky-400">SPRINT 4 · TRAINING PLANS</p><h1 className="mt-2 text-3xl font-bold text-text-primary">{athleteMode ? 'Your workouts' : 'Workout library'}</h1><p className="mt-2 max-w-xl text-text-secondary">{athleteMode ? 'Open an assigned workout to follow the plan and record your session.' : 'Build sessions from exercise prescriptions, then assign them to your athletes.'}</p></div>{canWrite && <Button onClick={() => navigate('/workouts/builder')} leftIcon={<Plus className="h-4 w-4" />}>Create workout</Button>}</div></section>

      {loading ? <div className="py-16 text-center text-text-secondary" role="status">Loading training plans…</div> : error ? <div className="py-14 text-center"><p role="alert" className="text-text-primary">{error}</p><Button className="mt-4" variant="outline" onClick={() => void load()}>Try again</Button></div> : athleteMode ? assignments.length === 0 ? <Card><CardContent className="py-16 text-center"><ClipboardList className="mx-auto h-10 w-10 text-text-muted" /><h2 className="mt-4 font-semibold text-text-primary">No workouts assigned yet</h2><p className="mt-2 text-sm text-text-secondary">Your coach’s assigned sessions will appear here.</p></CardContent></Card> : <div className="grid gap-4 md:grid-cols-2">{assignments.filter(item => item.workout).map(item => <Link key={item.id} to={`/workouts/${item.id}/player`} className="group rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"><Card className="h-full transition-colors group-hover:border-sky-400/50"><CardContent className="p-5"><div className="flex items-center justify-between"><Badge variant={item.status === 'completed' ? 'success' : item.status === 'in_progress' ? 'primary' : 'neutral'}>{item.status.replace('_', ' ')}</Badge><ArrowRight className="h-4 w-4 text-sky-400" /></div><h2 className="mt-4 text-lg font-semibold text-text-primary">{item.workout.name}</h2><p className="mt-1 text-sm text-text-secondary">{item.workout.description || 'Follow this session at your own pace.'}</p><p className="mt-4 text-xs text-text-muted">{item.workout.estimatedDuration} min · Start {item.startDate}{item.dueDate ? ` · Due ${item.dueDate}` : ''}</p></CardContent></Card></Link>)}</div> : workouts.length === 0 ? <Card><CardContent className="py-16 text-center"><ClipboardList className="mx-auto h-10 w-10 text-text-muted" /><h2 className="mt-4 font-semibold text-text-primary">Your exercise library starts here</h2><p className="mt-2 text-sm text-text-secondary">Create a workout and add its exercise prescriptions.</p>{canWrite && <Button className="mt-5" onClick={() => navigate('/workouts/builder')} leftIcon={<Plus className="h-4 w-4" />}>Create workout</Button>}</CardContent></Card> : <div className="grid gap-4 md:grid-cols-2">{workouts.map(workout => <Card key={workout.id}><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-text-primary">{workout.name}</h2><p className="mt-1 text-sm text-text-secondary">{workout.description || 'No description provided.'}</p></div><Badge variant={workout.difficulty === 'beginner' ? 'success' : workout.difficulty === 'advanced' ? 'gold' : 'neutral'}>{workout.difficulty}</Badge></div><p className="mt-4 text-sm text-text-muted">{workout.estimatedDuration} min · {workout.exercises?.length || 0} exercises</p>{workout.tags?.length ? <div className="mt-3 flex flex-wrap gap-1">{workout.tags.map(tag => <Badge key={tag} variant="outline" size="sm">{tag}</Badge>)}</div> : null}<div className="mt-5 flex flex-wrap gap-2">{canWrite && <Button size="sm" variant="outline" onClick={() => navigate(`/workouts/builder/${workout.id}`)}>Edit</Button>}{coach && <Button size="sm" onClick={() => { setSelected(workout); setDueDate(''); }} leftIcon={<Users className="h-4 w-4" />}>Assign</Button>}</div></CardContent></Card>)}</div>}

      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title={`Assign ${selected?.name || 'workout'}`} description="Choose the athletes who should see this plan." size="md"><div className="space-y-4"><label className="block text-sm text-text-secondary">Due date (optional)<input className="mt-1 w-full rounded-lg border border-border bg-cold-900 px-3 py-2 text-text-primary" type="date" min={today()} value={dueDate} onChange={event => setDueDate(event.target.value)} /></label><div className="max-h-72 space-y-2 overflow-y-auto">{athletes.map(athlete => <label key={athlete.id} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm text-text-primary"><input type="checkbox" checked={selectedAthletes.includes(athlete.id)} onChange={event => setSelectedAthletes(previous => event.target.checked ? [...previous, athlete.id] : previous.filter(id => id !== athlete.id))} />{athlete.firstName} {athlete.lastName}<span className="ml-auto text-xs text-text-muted">{athlete.email}</span></label>)}</div><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button><Button loading={saving} disabled={!selectedAthletes.length} onClick={() => void submitAssignment()}>Assign to {selectedAthletes.length || ''}</Button></div></div></Modal>
    </div>
  );
}
