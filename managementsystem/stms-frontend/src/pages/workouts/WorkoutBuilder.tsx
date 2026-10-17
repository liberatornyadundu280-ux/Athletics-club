import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, Input, Modal, Select } from '@/components/ui';
import { workoutApi } from '@/services/api';

type Exercise = { exerciseId?: string | null; name: string; sets: number; reps: string; restSeconds: number; tempo?: string; targetZone?: string; coachingNotes?: string };
const blankExercise = (): Exercise => ({ name: '', sets: 3, reps: '8', restSeconds: 60, tempo: '', targetZone: '', coachingNotes: '' });

export function WorkoutBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [exerciseModal, setExerciseModal] = useState(false);
  const [library, setLibrary] = useState<any[]>([]);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60);
  const [difficulty, setDifficulty] = useState('intermediate');
  const [tags, setTags] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([blankExercise()]);

  useEffect(() => {
    let active = true;
    Promise.all([workoutApi.getExercises(), id ? workoutApi.getWorkout(id) : Promise.resolve(null)]).then(([items, workout]) => {
      if (!active) return;
      setLibrary(items);
      if (workout) { setName(workout.name); setDescription(workout.description || ''); setDuration(workout.estimatedDuration || 60); setDifficulty(workout.difficulty || 'intermediate'); setTags((workout.tags || []).join(', ')); setExercises(workout.exercises?.length ? workout.exercises : [blankExercise()]); }
    }).catch((error: any) => { if (active) toast.error(error.message || 'Could not load workout details'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const updateExercise = (index: number, patch: Partial<Exercise>) => setExercises(previous => previous.map((exercise, row) => row === index ? { ...exercise, ...patch } : exercise));
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (exercises.some(exercise => !exercise.name.trim())) { toast.error('Give each exercise a name.'); return; }
    setSaving(true);
    const payload = { name: name.trim(), description: description.trim(), estimatedDuration: Number(duration), difficulty, tags: tags.split(',').map(tag => tag.trim()).filter(Boolean), exercises };
    try { const workout = id ? await workoutApi.updateWorkout(id, payload) : await workoutApi.createWorkout(payload); toast.success(id ? 'Workout updated' : 'Workout saved'); navigate('/workouts', { replace: true, state: { createdWorkoutId: workout.id } }); }
    catch (error: any) { toast.error(error.message || 'Could not save workout'); }
    finally { setSaving(false); }
  };

  const addLibraryExercise = async () => {
    if (newExerciseName.trim().length < 2) return;
    try { const item = await workoutApi.createExercise({ name: newExerciseName.trim(), equipment: [], primaryMuscles: [] }); setLibrary(previous => [...previous, item]); const row = exercises.length - 1; updateExercise(row, { exerciseId: item.id, name: item.name }); setNewExerciseName(''); setExerciseModal(false); toast.success('Exercise added to club library'); }
    catch (error: any) { toast.error(error.message || 'Could not add exercise'); }
  };

  if (loading) return <div className="py-20 text-center text-text-secondary" role="status">Loading workout…</div>;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/workouts')} leftIcon={<ArrowLeft className="h-4 w-4" />}>Workout library</Button>
      <section><p className="text-sm font-semibold text-sky-400">WORKOUT DESIGN</p><h1 className="mt-2 text-3xl font-bold text-text-primary">{id ? 'Edit workout' : 'Build a workout'}</h1><p className="mt-2 text-text-secondary">Write the prescription your athletes will follow at training.</p></section>
      <form onSubmit={save} className="space-y-5">
        <Card><CardContent className="grid gap-4 p-5 sm:grid-cols-2"><Input label="Workout name" required maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="Acceleration and starts" /><Select label="Difficulty" value={difficulty} onChange={event => setDifficulty(event.target.value)} options={[{ value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }]} /><label className="text-sm text-text-secondary sm:col-span-2">Description<textarea className="mt-1 min-h-20 w-full rounded-lg border border-border bg-cold-900 px-3 py-2 text-text-primary" maxLength={2000} value={description} onChange={event => setDescription(event.target.value)} /></label><Input label="Estimated duration (minutes)" type="number" min={1} max={600} required value={duration} onChange={event => setDuration(Number(event.target.value))} /><Input label="Tags (comma separated)" value={tags} onChange={event => setTags(event.target.value)} placeholder="speed, track, acceleration" /></CardContent></Card>

        <div className="flex items-end justify-between gap-3"><div><h2 className="text-xl font-semibold text-text-primary">Exercise order</h2><p className="mt-1 text-sm text-text-secondary">Each line stores sets, reps, rest, targets, and coach notes.</p></div><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setExerciseModal(true)}>Add library exercise</Button><Button type="button" variant="outline" onClick={() => setExercises(previous => [...previous, blankExercise()])} leftIcon={<Plus className="h-4 w-4" />}>Add step</Button></div></div>
        {exercises.map((exercise, index) => <Card key={index}><CardContent className="space-y-4 p-5"><div className="flex items-center justify-between"><h3 className="font-semibold text-text-primary">Step {index + 1}</h3><Button type="button" variant="ghost" size="sm" disabled={exercises.length <= 1} aria-label={`Remove step ${index + 1}`} onClick={() => setExercises(previous => previous.filter((_, row) => row !== index))}><Trash2 className="h-4 w-4" /></Button></div><div className="grid gap-4 sm:grid-cols-2">{library.length > 0 && <Select label="From club exercise library" value={exercise.exerciseId || ''} onChange={event => { const option = library.find(item => item.id === event.target.value); updateExercise(index, { exerciseId: option?.id || null, name: option?.name || exercise.name }); }} options={[{ value: '', label: 'Custom exercise' }, ...library.map(item => ({ value: item.id, label: item.name }))]} />}<Input label="Exercise name" required maxLength={100} value={exercise.name} onChange={event => updateExercise(index, { name: event.target.value, exerciseId: null })} /><Input label="Sets" type="number" min={1} max={30} value={exercise.sets} onChange={event => updateExercise(index, { sets: Number(event.target.value) })} /><Input label="Reps / distance" maxLength={40} value={exercise.reps} onChange={event => updateExercise(index, { reps: event.target.value })} placeholder="6 x 30m" /><Input label="Rest (seconds)" type="number" min={0} max={3600} value={exercise.restSeconds} onChange={event => updateExercise(index, { restSeconds: Number(event.target.value) })} /><Input label="Tempo" value={exercise.tempo || ''} onChange={event => updateExercise(index, { tempo: event.target.value })} placeholder="Controlled / 3-1-1" /><Input label="Target zone" value={exercise.targetZone || ''} onChange={event => updateExercise(index, { targetZone: event.target.value })} placeholder="RPE 7, 85% effort" /><label className="text-sm text-text-secondary sm:col-span-2">Coaching notes<textarea className="mt-1 min-h-16 w-full rounded-lg border border-border bg-cold-900 px-3 py-2 text-text-primary" maxLength={500} value={exercise.coachingNotes || ''} onChange={event => updateExercise(index, { coachingNotes: event.target.value })} /></label></div></CardContent></Card>)}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => navigate('/workouts')}>Cancel</Button><Button type="submit" loading={saving} leftIcon={<Save className="h-4 w-4" />}>Save workout</Button></div>
      </form>
      <Modal isOpen={exerciseModal} onClose={() => setExerciseModal(false)} title="Add a club exercise" description="This adds the movement to your club’s private exercise library." size="sm"><div className="space-y-4"><Input label="Exercise name" value={newExerciseName} onChange={event => setNewExerciseName(event.target.value)} maxLength={100} autoFocus /><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setExerciseModal(false)}>Cancel</Button><Button onClick={() => void addLibraryExercise()} disabled={newExerciseName.trim().length < 2}>Add exercise</Button></div></div></Modal>
    </div>
  );
}
