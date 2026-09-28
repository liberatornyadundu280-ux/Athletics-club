import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Textarea } from '@/components/ui';
import { ArrowLeft, Play, Pause, Check, ChevronRight, ChevronLeft, Clock, Settings, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const mockWorkout = {
  id: '1',
  name: 'Sprint Intervals - Week 3',
  description: 'High-intensity sprint training for speed development',
  estimatedDuration: 90,
  difficulty: 'advanced' as const,
  exercises: [
    { id: '1', exerciseId: 'e1', order: 1, sets: 3, reps: '30m', restSeconds: 120, tempo: 'Max', targetZone: 'Speed', coachNotes: 'Focus on explosive start', exercise: { name: '30m Flying Sprint', muscles: ['hamstrings', 'glutes'], equipment: ['cones'] }, difficulty: 'beginner' as const },
    { id: '2', exerciseId: 'e2', order: 2, sets: 4, reps: '60m', restSeconds: 180, tempo: 'Max', targetZone: 'Speed Endurance', coachNotes: 'Maintain form throughout', exercise: { name: '60m Sprint', muscles: ['hamstrings', 'glutes'], equipment: ['cones'] }, difficulty: 'intermediate' as const },
    { id: '3', exerciseId: 'e3', order: 3, sets: 2, reps: '100m', restSeconds: 300, tempo: 'Max', targetZone: 'Speed Endurance', coachNotes: 'Full recovery between sets', exercise: { name: '100m Sprint', muscles: ['hamstrings', 'glutes'], equipment: ['cones'] }, difficulty: 'advanced' as const },
  ],
};

export function WorkoutPlayer() {
  const navigate = useNavigate();
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [completedSets, setCompletedSets] = React.useState<Record<string, number>>({});
  const [notes, setNotes] = React.useState<Record<string, string>>({});

  const exercise = mockWorkout.exercises[currentExerciseIndex];
  const totalExercises = mockWorkout.exercises.length;
  const totalSets = exercise?.sets || 0;
  const progress = ((currentExerciseIndex + (currentSet - 1) / totalSets) / totalExercises) * 100;

  const handleStartRest = () => {
    if (!exercise) return;
    setRestTimer(exercise.restSeconds);
    setIsResting(true);
    setIsPlaying(false);
  };

  const handleCompleteSet = () => {
    if (!exercise) return;
    setCompletedSets(prev => ({ ...prev, [exercise.id]: (prev[exercise.id] || 0) + 1 }));
    if (currentSet < totalSets) {
      setCurrentSet(currentSet + 1);
      handleStartRest();
    } else if (currentExerciseIndex < totalExercises - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSet(1);
    } else {
      setShowComplete(true);
    }
  };

  const handleSkipNext = () => {
    if (currentExerciseIndex < totalExercises - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSet(1);
    }
  };

  const handleSkipPrev = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
      setCurrentSet(1);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Rest timer countdown
  React.useEffect(() => {
    if (isResting && restTimer > 0) {
      const interval = setInterval(() => {
        setRestTimer(prev => {
          if (prev <= 1) {
            setIsResting(false);
            setIsPlaying(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isResting, restTimer]);

  if (!exercise) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/workouts')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-heading-lg font-bold text-surface-900 dark:text-surface-100">{mockWorkout.name}</h1>
          <p className="text-body text-surface-500 dark:text-surface-400">{mockWorkout.description}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6 pb-4 px-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-body-sm font-medium text-surface-900 dark:text-surface-100">
                Exercise {currentExerciseIndex + 1} of {totalExercises}
              </span>
              <Badge variant="primary" size="sm">{currentSet}/{totalSets} sets</Badge>
            </div>
            <span className="text-body-sm text-surface-500">{Math.round(progress)}% complete</span>
          </div>
          <div className="h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Current Exercise */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{exercise.exercise.name}</CardTitle>
              <p className="text-body-sm text-surface-500 mt-1">{exercise.exercise.muscles.join(', ')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="neutral">{exercise.targetZone}</Badge>
              <Badge variant={exercise.difficulty === 'beginner' ? 'success' : exercise.difficulty === 'intermediate' ? 'gold' : 'danger'}>{exercise.difficulty}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Coach Notes */}
          {exercise.coachNotes && (
            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border-l-4 border-primary-500">
              <p className="text-body-sm text-primary-800 dark:text-primary-200"><strong>Coach Notes:</strong> {exercise.coachNotes}</p>
            </div>
          )}

          {/* Set Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  {isResting ? <Clock className="w-6 h-6 text-primary-800 animate-spin" /> : isPlaying ? <Pause className="w-6 h-6 text-primary-800" /> : <Play className="w-6 h-6 text-primary-800" />}
                </div>
                <div>
                  <p className="text-heading-md font-bold text-surface-900 dark:text-surface-100">
                    {isResting ? `Rest: ${formatTime(restTimer)}` : isPlaying ? 'Set in progress' : `Set ${currentSet} of ${totalSets}`}
                  </p>
                  <p className="text-body-sm text-surface-500">{exercise.reps} reps • {exercise.restSeconds}s rest</p>
                </div>
              </div>
              <div className="flex gap-2">
                {!isResting && !isPlaying && (
                  <Button size="lg" onClick={() => { setIsPlaying(true); setTimeout(() => handleStartRest(), 5000); }} leftIcon={<Play className="w-5 h-5" />}>
                    Start Set
                  </Button>
                )}
                {isPlaying && !isResting && (
                  <Button variant="primary" size="lg" onClick={handleCompleteSet} leftIcon={<Check className="w-5 h-5" />}>
                    Complete Set
                  </Button>
                )}
                {isResting && (
                  <Button variant="outline" size="lg" disabled leftIcon={<Clock className="w-5 h-5" />}>
                    Resting: {formatTime(restTimer)}
                  </Button>
                )}
              </div>
            </div>

            {/* Exercise-specific inputs */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Actual Reps" type="number" placeholder={exercise.reps} />
              <Input label="Weight (kg)" type="number" step="0.5" placeholder="Optional" />
              <Input label="RPE (1-10)" type="number" min="1" max="10" placeholder="Rate of Perceived Exertion" />
            </div>

            <Textarea label="Your Notes" placeholder="How did this set feel? Any issues?" rows={2} value={notes[exercise.id] || ''} onChange={e => setNotes(prev => ({ ...prev, [exercise.id]: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleSkipPrev} disabled={currentExerciseIndex === 0} leftIcon={<ChevronLeft className="w-4 h-4" />}>
          Previous
        </Button>
        <div className="flex gap-2">
          {mockWorkout.exercises.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrentExerciseIndex(i); setCurrentSet(1); }}
              className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${i === currentExerciseIndex ? 'bg-primary-500 text-white' : 'bg-surface-200 dark:bg-surface-700 hover:bg-surface-300 dark:hover:bg-surface-600'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <Button variant="outline" onClick={handleSkipNext} disabled={currentExerciseIndex === totalExercises - 1} rightIcon={<ChevronRight className="w-4 h-4" />}>
          Next
        </Button>
      </div>

      {/* Completion Modal */}
      {showComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-elevated max-w-md w-full p-8 text-center animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-heading-md font-bold text-surface-900 dark:text-surface-100 mb-2">Workout Complete!</h3>
            <p className="text-body text-surface-500 dark:text-surface-400 mb-6">Great job! You've completed all exercises.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setShowComplete(false); navigate('/workouts'); }}>
                View Summary
              </Button>
              <Button className="flex-1" onClick={() => { setShowComplete(false); navigate('/dashboard'); }}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}