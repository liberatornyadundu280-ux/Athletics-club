import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, Input, Modal, PageHeader, Select } from '@/components/ui';
import { ExercisePicker } from '@/components/workouts/ExercisePicker';
import {
  CATEGORY_LABELS,
  PHASE_LABELS,
  categoryOptions,
  eventGroupOptions,
  phaseOptions,
} from '@/constants/exercises';
import { workoutApi } from '@/services/api';
import type { Exercise as LibraryExercise } from '@/types';

type WorkoutLine = {
  exerciseId?: string | null;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  tempo?: string;
  targetZone?: string;
  coachingNotes?: string;
};

const blankExercise = (): WorkoutLine => ({
  name: '',
  sets: 3,
  reps: '8',
  restSeconds: 60,
  tempo: '',
  targetZone: '',
  coachingNotes: '',
});

type NewExerciseForm = {
  name: string;
  description: string;
  category: string;
  phase: string;
  eventGroup: string;
  equipment: string;
  primaryMuscles: string;
};

const blankNewExercise = (): NewExerciseForm => ({
  name: '',
  description: '',
  category: 'strength',
  phase: 'strength',
  eventGroup: 'general',
  equipment: '',
  primaryMuscles: '',
});

function splitList(value: string): string[] {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

export function WorkoutBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customTargetIndex, setCustomTargetIndex] = useState<number | null>(null);
  const [newExercise, setNewExercise] = useState<NewExerciseForm>(blankNewExercise());
  const [creatingExercise, setCreatingExercise] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60);
  const [difficulty, setDifficulty] = useState('intermediate');
  const [tags, setTags] = useState('');
  const [exercises, setExercises] = useState<WorkoutLine[]>([blankExercise()]);

  useEffect(() => {
    let active = true;
    setLibraryLoading(true);

    Promise.all([
      workoutApi.getExercises({ limit: 500 }),
      id ? workoutApi.getWorkout(id) : Promise.resolve(null),
    ])
      .then(([items, workout]) => {
        if (!active) return;
        setLibrary(items);
        if (workout) {
          setName(workout.name);
          setDescription(workout.description || '');
          setDuration(workout.estimatedDuration || 60);
          setDifficulty(workout.difficulty || 'intermediate');
          setTags((workout.tags || []).join(', '));
          setExercises(workout.exercises?.length ? workout.exercises : [blankExercise()]);
        }
      })
      .catch((error: any) => {
        if (active) toast.error(error.message || 'Could not load workout details');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setLibraryLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  const libraryById = useMemo(() => new Map(library.map(item => [item.id, item])), [library]);

  const updateExercise = (index: number, patch: Partial<WorkoutLine>) =>
    setExercises(previous => previous.map((exercise, row) => (row === index ? { ...exercise, ...patch } : exercise)));

  const openPicker = (index: number) => {
    setPickerIndex(index);
    setPickerOpen(true);
  };

  const addFromLibrary = () => {
    const index = exercises.length;
    setExercises(previous => [...previous, blankExercise()]);
    setPickerIndex(index);
    setPickerOpen(true);
  };

  const addCustomExercise = () => {
    const index = exercises.length;
    setExercises(previous => [...previous, blankExercise()]);
    setCustomTargetIndex(index);
    setNewExercise(blankNewExercise());
    setPickerOpen(false);
    setCustomOpen(true);
  };

  const chooseExercise = (exercise: LibraryExercise) => {
    if (pickerIndex === null) return;
    const current = exercises[pickerIndex];
    updateExercise(pickerIndex, {
      exerciseId: exercise.id,
      name: exercise.name,
      // Preserve the coach's dose when swapping; the prescription belongs to the workout,
      // not to the movement that happens to be selected.
      sets: current?.sets ?? 3,
      reps: current?.reps ?? '8',
      restSeconds: current?.restSeconds ?? 60,
      tempo: current?.tempo,
      targetZone: current?.targetZone,
      coachingNotes: current?.coachingNotes,
    });
    toast.success(`${exercise.name} added to the session`);
  };

  const openCustomExercise = (index: number | null = pickerIndex) => {
    setCustomTargetIndex(index);
    setNewExercise(blankNewExercise());
    setPickerOpen(false);
    setCustomOpen(true);
  };

  const createCustomExercise = async () => {
    if (newExercise.name.trim().length < 2) {
      toast.error('Give the exercise a name.');
      return;
    }

    setCreatingExercise(true);
    try {
      const item = await workoutApi.createExercise({
        name: newExercise.name.trim(),
        description: newExercise.description.trim() || undefined,
        category: newExercise.category,
        phase: newExercise.phase,
        eventGroups: [newExercise.eventGroup],
        equipment: splitList(newExercise.equipment),
        primaryMuscles: splitList(newExercise.primaryMuscles),
      });

      setLibrary(previous => [...previous, item]);
      if (customTargetIndex !== null) {
        updateExercise(customTargetIndex, { exerciseId: item.id, name: item.name });
      } else {
        setExercises(previous => [...previous, { ...blankExercise(), exerciseId: item.id, name: item.name }]);
      }
      setCustomOpen(false);
      setNewExercise(blankNewExercise());
      toast.success('Exercise added to your club library');
    } catch (error: any) {
      toast.error(error.message || 'Could not add exercise');
    } finally {
      setCreatingExercise(false);
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (exercises.some(exercise => !exercise.name.trim())) {
      toast.error('Give each exercise a name.');
      return;
    }

    setSaving(true);
    const payload = {
      name: name.trim(),
      description: description.trim(),
      estimatedDuration: Number(duration),
      difficulty,
      tags: tags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean),
      exercises,
    };

    try {
      const workout = id ? await workoutApi.updateWorkout(id, payload) : await workoutApi.createWorkout(payload);
      toast.success(id ? 'Workout updated' : 'Workout saved');
      navigate('/workouts', { replace: true, state: { createdWorkoutId: workout.id } });
    } catch (error: any) {
      toast.error(error.message || 'Could not save workout');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-text-secondary" role="status">
        Loading workout…
      </div>
    );
  }

  return (
    <div className="page-shell mx-auto max-w-4xl">
      <Button variant="ghost" size="sm" className="-ml-2 self-start" onClick={() => navigate('/workouts')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
        Workout library
      </Button>

      <PageHeader
        title={id ? 'Edit workout' : 'Build a workout'}
        description="Write the prescription your athletes will follow at training."
      />

      <form onSubmit={save} className="space-y-5">
        <Card>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            <Input label="Workout name" required maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="Acceleration and starts" />
            <Select label="Difficulty" value={difficulty} onChange={event => setDifficulty(event.target.value)} options={[{ value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }]} />
            <label className="text-sm text-text-secondary sm:col-span-2">
              Description
              <textarea className="mt-1 min-h-20 w-full rounded-lg border border-border bg-cold-900 px-3 py-2 text-text-primary" maxLength={2000} value={description} onChange={event => setDescription(event.target.value)} />
            </label>
            <Input label="Estimated duration (minutes)" type="number" min={1} max={600} required value={duration} onChange={event => setDuration(Number(event.target.value))} />
            <Input label="Tags (comma separated)" value={tags} onChange={event => setTags(event.target.value)} placeholder="speed, track, acceleration" />
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Exercise order</h2>
            <p className="mt-1 text-sm text-text-secondary">Pick a movement from the library, or write a custom step. The dose stays with the workout line.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={addCustomExercise} leftIcon={<Dumbbell className="h-4 w-4" />}>
              Create exercise
            </Button>
            <Button type="button" variant="outline" onClick={addFromLibrary} leftIcon={<Plus className="h-4 w-4" />}>
              Add from library
            </Button>
            <Button type="button" variant="outline" onClick={() => setExercises(previous => [...previous, blankExercise()])} leftIcon={<Plus className="h-4 w-4" />}>
              Add step
            </Button>
          </div>
        </div>

        {exercises.map((exercise, index) => {
          const selected = exercise.exerciseId ? libraryById.get(exercise.exerciseId) : null;

          return (
            <Card key={index}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-text-primary">Step {index + 1}</h3>
                  <Button type="button" variant="ghost" size="sm" disabled={exercises.length <= 1} aria-label={`Remove step ${index + 1}`} onClick={() => setExercises(previous => previous.filter((_, row) => row !== index))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-col gap-3 rounded-lg border border-border bg-cold-900/60 p-3 sm:flex-row sm:items-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-cold-800 text-text-muted">
                    <Dumbbell className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                      {selected ? (selected.clubId ? 'Club exercise' : 'Library exercise') : exercise.exerciseId ? 'Club exercise' : 'Custom step'}
                    </p>
                    <p className="truncate text-sm font-medium text-text-primary">
                      {selected?.name || exercise.name || 'No exercise selected yet'}
                    </p>
                    {selected && (
                      <p className="mt-0.5 truncate text-xs text-text-secondary">
                        {CATEGORY_LABELS[selected.category as keyof typeof CATEGORY_LABELS] || selected.category}
                        {' · '}
                        {PHASE_LABELS[selected.phase as keyof typeof PHASE_LABELS] || selected.phase}
                        {selected.primaryMuscles?.length ? ` · ${selected.primaryMuscles.join(', ')}` : ''}
                      </p>
                    )}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => openPicker(index)} leftIcon={<Dumbbell className="h-4 w-4" />}>
                    {exercise.exerciseId ? 'Swap exercise' : 'Choose from library'}
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Exercise name" required maxLength={100} value={exercise.name} onChange={event => updateExercise(index, { name: event.target.value, exerciseId: null })} />
                  <Input label="Sets" type="number" min={1} max={30} value={exercise.sets} onChange={event => updateExercise(index, { sets: Number(event.target.value) })} />
                  <Input label="Reps / distance" maxLength={40} value={exercise.reps} onChange={event => updateExercise(index, { reps: event.target.value })} placeholder="6 x 30m" />
                  <Input label="Rest (seconds)" type="number" min={0} max={3600} value={exercise.restSeconds} onChange={event => updateExercise(index, { restSeconds: Number(event.target.value) })} />
                  <Input label="Tempo" value={exercise.tempo || ''} onChange={event => updateExercise(index, { tempo: event.target.value })} placeholder="Controlled / 3-1-1" />
                  <Input label="Target zone" value={exercise.targetZone || ''} onChange={event => updateExercise(index, { targetZone: event.target.value })} placeholder="RPE 7, 85% effort" />
                  <label className="text-sm text-text-secondary sm:col-span-2">
                    Coaching notes
                    <textarea className="mt-1 min-h-20 w-full rounded-lg border border-border bg-cold-900 px-3 py-2 text-text-primary" maxLength={500} value={exercise.coachingNotes || ''} onChange={event => updateExercise(index, { coachingNotes: event.target.value })} />
                  </label>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate('/workouts')}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} leftIcon={<Save className="h-4 w-4" />}>
            Save workout
          </Button>
        </div>
      </form>

      <ExercisePicker
        isOpen={pickerOpen}
        exercises={library}
        selectedId={pickerIndex !== null ? exercises[pickerIndex]?.exerciseId : null}
        loading={libraryLoading}
        onClose={() => setPickerOpen(false)}
        onSelect={chooseExercise}
        onCreate={() => openCustomExercise(pickerIndex)}
      />

      <Modal isOpen={customOpen} onClose={() => setCustomOpen(false)} title="Create a club exercise" description="This movement is private to your club. It will appear in the library next time you build a workout." size="md">
        <div className="space-y-4">
          <Input label="Exercise name" value={newExercise.name} onChange={event => setNewExercise(previous => ({ ...previous, name: event.target.value }))} maxLength={100} autoFocus />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Category" value={newExercise.category} onChange={event => setNewExercise(previous => ({ ...previous, category: event.target.value }))} options={categoryOptions} />
            <Select label="Phase" value={newExercise.phase} onChange={event => setNewExercise(previous => ({ ...previous, phase: event.target.value }))} options={phaseOptions} />
            <Select label="Event group" value={newExercise.eventGroup} onChange={event => setNewExercise(previous => ({ ...previous, eventGroup: event.target.value }))} options={eventGroupOptions} />
            <Input label="Equipment" value={newExercise.equipment} onChange={event => setNewExercise(previous => ({ ...previous, equipment: event.target.value }))} placeholder="Barbell, box" />
            <Input label="Primary muscles" value={newExercise.primaryMuscles} onChange={event => setNewExercise(previous => ({ ...previous, primaryMuscles: event.target.value }))} placeholder="Quadriceps, glutes" />
            <label className="text-sm text-text-secondary sm:col-span-2">
              Description
              <textarea className="mt-1 min-h-20 w-full rounded-lg border border-border bg-cold-900 px-3 py-2 text-text-primary" maxLength={500} value={newExercise.description} onChange={event => setNewExercise(previous => ({ ...previous, description: event.target.value }))} placeholder="What the movement is and when to use it." />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCustomOpen(false)}>Cancel</Button>
            <Button onClick={() => void createCustomExercise()} loading={creatingExercise} disabled={newExercise.name.trim().length < 2}>
              Add exercise
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
