import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, Select, SelectOption } from '@/components/ui';
import { ArrowLeft, Plus, GripVertical, Trash2, Dumbbell, Clock, Save, Download } from 'lucide-react';
import { useNavigate } from 'react/router-dom';
import { Exercise } from '@stms/shared/types';

const mockExercises: Exercise[] = [
  { id: '1', clubId: '1', name: 'Back Squat', description: 'Barbell back squat', muscles: ['quads', 'glutes'], equipment: ['barbell', 'rack'], videoUrl: null, cues: ['Chest up', 'Knees out'], difficulty: 'intermediate', intensityPrescription: { type: 'percentage', value: 80, unit: '%' }, progressionRules: { weeklyIncreasePercent: 2.5, deloadEveryNWeeks: 4, deloadPercent: 50 }, isVerified: true, createdBy: 'u1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: '2', clubId: '1', name: 'Deadlift', description: 'Conventional deadlift', muscles: ['hamstrings', 'glutes', 'back'], equipment: ['barbell'], videoUrl: null, cues: ['Bar close to shins', 'Drive through heels'], difficulty: 'advanced', intensityPrescription: { type: 'percentage', value: 75, unit: '%' }, progressionRules: { weeklyIncreasePercent: 2.5, deloadEveryNWeeks: 4, deloadPercent: 50 }, isVerified: true, createdBy: 'u1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: '3', clubId: '1', name: 'Box Jump', description: 'Plyometric box jump', muscles: ['quads', 'glutes', 'calves'], equipment: ['plyo box'], videoUrl: null, cues: ['Land softly', 'Full extension'], difficulty: 'intermediate', intensityPrescription: { type: 'rpe', value: 8, unit: 'RPE' }, progressionRules: { weeklyIncreasePercent: 0, deloadEveryNWeeks: 4, deloadPercent: 50 }, isVerified: true, createdBy: 'u1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
];

interface WorkoutExercise {
  id: string;
  exerciseId: string;
  order: number;
  sets: number;
  reps: string;
  restSeconds: number;
  tempo: string;
  targetZone: string;
  coachNotes: string;
}

export function WorkoutBuilder() {
  const navigate = useNavigate();
  const { id } = React.useParams<{ id: string }>();
  const isEditing = !!id;

  const [workout, setWorkout] = React.useState({
    name: '',
    description: '',
    difficulty: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    tags: [] as string[],
    exercises: [] as WorkoutExercise[],
  });

  const [exerciseSearch, setExerciseSearch] = React.useState('');

  const difficultyOptions: SelectOption[] = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ];

  const addExercise = (exercise: Exercise) => {
    const newExercise: WorkoutExercise = {
      id: `we-${Date.now()}`,
      exerciseId: exercise.id,
      order: workout.exercises.length + 1,
      sets: 3,
      reps: '8-10',
      restSeconds: 120,
      tempo: '3-0-1-0',
      targetZone: 'Strength',
      coachNotes: '',
    };
    setWorkout(prev => ({ ...prev, exercises: [...prev.exercises, newExercise] }));
  };

  const updateExercise = (exerciseId: string, field: keyof WorkoutExercise, value: any) => {
    setWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => ex.id === exerciseId ? { ...ex, [field]: value } : ex)
    }));
  };

  const removeExercise = (exerciseId: string) => {
    setWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.filter(ex => ex.id !== exerciseId).map((ex, index) => ({ ...ex, order: index + 1 }))
    }));
  };

  const handleSubmit = () => {
    console.log('Save workout:', workout);
    navigate('/workouts');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/workouts')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div>
          <h1 className="text-heading-lg font-bold text-surface-900 dark:text-surface-100">
            {isEditing ? 'Edit Workout' : 'Create Workout'}
          </h1>
          <p className="text-body text-surface-500 dark:text-surface-400">Build your training session</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Exercise Library */}
        <Card className="lg:col-span-1 h-fit sticky top-24">
          <CardHeader>
            <CardTitle>Exercise Library</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Search exercises..."
              leftIcon={<Search className="w-4 h-4" />}
              value={exerciseSearch}
              onChange={e => setExerciseSearch(e.target.value)}
              className="mb-4"
            />
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {mockExercises
                .filter(e => e.name.toLowerCase().includes(exerciseSearch.toLowerCase()))
                .map(exercise => (
                  <button
                    key={exercise.id}
                    onClick={() => addExercise(exercise)}
                    className="w-full p-3 text-left rounded-lg border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-surface-900 dark:text-surface-100">{exercise.name}</p>
                        <p className="text-caption text-surface-500">{exercise.muscles.join(', ')}</p>
                      </div>
                      <Badge variant="neutral" size="sm">{exercise.difficulty}</Badge>
                    </div>
                    <p className="text-body-sm text-surface-500 mt-1">{exercise.description}</p>
                  </button>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Workout Builder */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>Workout Details</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>Export</Button>
                  <Button onClick={handleSubmit} leftIcon={<Save className="w-4 h-4" />}>Save Workout</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input label="Workout Name" placeholder="e.g., Sprint Intervals - Week 3" value={workout.name} onChange={e => setWorkout(prev => ({ ...prev, name: e.target.value }))} />
              <div className="grid gap-4 sm:grid-cols-3">
                <Select label="Difficulty" options={difficultyOptions} value={workout.difficulty} onChange={e => setWorkout(prev => ({ ...prev, difficulty: e.target.value }))} />
                <Input label="Duration (min)" type="number" placeholder="90" />
                <Input label="Tags (comma separated)" placeholder="speed, sprint, intervals" />
              </div>
              <Input label="Description" placeholder="Describe the workout focus and goals" as="textarea" rows={3} value={workout.description} onChange={e => setWorkout(prev => ({ ...prev, description: e.target.value }))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exercises</CardTitle>
            </CardHeader>
            <CardContent>
              {workout.exercises.length === 0 ? (
                <div className="text-center py-12 text-surface-500">
                  <Dumbbell className="w-12 h-12 mx-auto mb-4 text-surface-300 dark:text-surface-600" />
                  <p className="text-body">No exercises added yet</p>
                  <p className="text-body-sm text-surface-500 mt-1">Select exercises from the library on the left</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workout.exercises.map((we, index) => {
                    const exercise = mockExercises.find(e => e.id === we.exerciseId);
                    return (
                      <div key={we.id} className="border border-surface-200 dark:border-surface-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <GripVertical className="w-5 h-5 text-surface-400 cursor-grab" />
                          <span className="text-body-sm text-surface-500 w-6 text-center">{we.order}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-surface-900 dark:text-surface-100">{exercise?.name || 'Unknown Exercise'}</p>
                            <p className="text-body-sm text-surface-500">{exercise?.muscles.join(', ')}</p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-start sm:items-center">
                          <div className="flex items-center gap-2">
                            <label className="text-caption text-surface-500">Sets</label>
                            <input type="number" min="1" max="20" value={we.sets} onChange={e => updateExercise(we.id, 'sets', parseInt(e.target.value))} className="w-16 px-2 py-1 border border-surface-300 dark:border-surface-600 rounded text-body-sm" />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-caption text-surface-500">Reps</label>
                            <input type="text" value={we.reps} onChange={e => updateExercise(we.id, 'reps', e.target.value)} className="w-24 px-2 py-1 border border-surface-300 dark:border-surface-600 rounded text-body-sm" placeholder="8-10" />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-caption text-surface-500">Rest (s)</label>
                            <input type="number" min="0" max="600" value={we.restSeconds} onChange={e => updateExercise(we.id, 'restSeconds', parseInt(e.target.value))} className="w-20 px-2 py-1 border border-surface-300 dark:border-surface-600 rounded text-body-sm" />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-caption text-surface-500">Tempo</label>
                            <input type="text" value={we.tempo} onChange={e => updateExercise(we.id, 'tempo', e.target.value)} className="w-24 px-2 py-1 border border-surface-300 dark:border-surface-600 rounded text-body-sm" placeholder="3-0-1-0" />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-caption text-surface-500">Zone</label>
                            <input type="text" value={we.targetZone} onChange={e => updateExercise(we.id, 'targetZone', e.target.value)} className="w-28 px-2 py-1 border border-surface-300 dark:border-surface-600 rounded text-body-sm" placeholder="Strength" />
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeExercise(we.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <Input label="Coach Notes" placeholder="Optional coaching cues for this exercise..." value={we.coachNotes} onChange={e => updateExercise(we.id, 'coachNotes', e.target.value)} className="w-full sm:w-96" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}