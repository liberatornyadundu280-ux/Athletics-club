import React, { useMemo, useState } from 'react';
import { Activity, Check, Dumbbell, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { Button, Input, Modal, Select } from '@/components/ui';
import {
  CATEGORY_LABELS,
  EVENT_GROUP_LABELS,
  LEVEL_LABELS,
  PHASE_LABELS,
  SOURCE_LABELS,
  categoryOptions,
  eventGroupOptions,
  levelOptions,
  phaseOptions,
} from '@/constants/exercises';
import type { Exercise } from '@/types';

type ExercisePickerProps = {
  isOpen: boolean;
  exercises: Exercise[];
  selectedId?: string | null;
  loading?: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  onCreate: () => void;
};

function ExerciseThumb({ exercise }: { exercise: Exercise }) {
  const [failed, setFailed] = useState(false);

  if (!exercise.imageUrl || failed) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-border bg-cold-800 text-text-muted">
        {exercise.category === 'sprint-drill' || exercise.category === 'speed' ? (
          <Activity className="h-6 w-6" aria-hidden="true" />
        ) : (
          <Dumbbell className="h-6 w-6" aria-hidden="true" />
        )}
      </div>
    );
  }

  return (
    <img
      src={exercise.imageUrl}
      alt={`${exercise.name} demonstration`}
      className="h-16 w-16 shrink-0 rounded-lg border border-border bg-white object-cover"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'sky' | 'gold' }) {
  const tones = {
    neutral: 'border-border bg-cold-800 text-text-secondary',
    sky: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    gold: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  };

  return <span className={`rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium ${tones[tone]}`}>{children}</span>;
}

export function ExercisePicker({
  isOpen,
  exercises,
  selectedId,
  loading = false,
  onClose,
  onSelect,
  onCreate,
}: ExercisePickerProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [eventGroup, setEventGroup] = useState('');
  const [phase, setPhase] = useState('');
  const [level, setLevel] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // A legacy club exercise can share a name with a new global entry. Keep the legacy record
  // for old workout logs, but do not show two identical names in the picker.
  const available = useMemo(() => {
    const globalNames = new Set(
      exercises.filter(exercise => exercise.clubId === null).map(exercise => exercise.name.toLowerCase())
    );
    return exercises.filter(
      exercise => !(exercise.source === 'legacy' && exercise.clubId !== null && globalNames.has(exercise.name.toLowerCase()))
    );
  }, [exercises]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return available.filter(exercise => {
      if (category && exercise.category !== category) return false;
      if (phase && exercise.phase !== phase) return false;
      if (level && exercise.level !== level) return false;
      if (eventGroup && !(exercise.eventGroups || []).includes(eventGroup)) return false;

      if (!term) return true;
      const haystack = [
        exercise.name,
        exercise.description,
        exercise.category,
        exercise.phase,
        ...(exercise.tags || []),
        ...(exercise.primaryMuscles || []),
        ...(exercise.secondaryMuscles || []),
        ...(exercise.equipment || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [available, category, eventGroup, level, phase, search]);

  const activeFilters = [category, eventGroup, phase, level].filter(Boolean).length;

  const resetFilters = () => {
    setCategory('');
    setEventGroup('');
    setPhase('');
    setLevel('');
  };

  const choose = (exercise: Exercise) => {
    onSelect(exercise);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Exercise library"
      description="Search the STMS catalogue, filter by what the session needs, and add the movement to this workout."
      size="xl"
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search A-skip, squat, hamstring, medicine ball…"
            leftIcon={<Search className="h-4 w-4" />}
            aria-label="Search exercises"
          />
          <Button
            type="button"
            variant={showFilters || activeFilters ? 'primary' : 'outline'}
            onClick={() => setShowFilters(value => !value)}
            leftIcon={<SlidersHorizontal className="h-4 w-4" />}
          >
            Filters{activeFilters ? ` (${activeFilters})` : ''}
          </Button>
        </div>

        {showFilters && (
          <div className="grid gap-3 rounded-lg border border-border bg-cold-800/60 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select label="Category" value={category} onChange={event => setCategory(event.target.value)} options={[{ value: '', label: 'All categories' }, ...categoryOptions]} />
            <Select label="Event group" value={eventGroup} onChange={event => setEventGroup(event.target.value)} options={[{ value: '', label: 'All events' }, ...eventGroupOptions]} />
            <Select label="Phase" value={phase} onChange={event => setPhase(event.target.value)} options={[{ value: '', label: 'All phases' }, ...phaseOptions]} />
            <Select label="Level" value={level} onChange={event => setLevel(event.target.value)} options={[{ value: '', label: 'All levels' }, ...levelOptions]} />
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="button" variant="ghost" size="sm" onClick={resetFilters} disabled={!activeFilters}>
                Clear filters
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 text-sm text-text-secondary">
          <span>
            {loading ? 'Loading library…' : `${filtered.length} of ${available.length} exercises`}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={onCreate} leftIcon={<Plus className="h-4 w-4" />}>
            Create custom exercise
          </Button>
        </div>

        <div className="-mx-1 max-h-[52vh] overflow-y-auto px-1">
          {loading ? (
            <div className="py-16 text-center text-text-secondary" role="status">Loading exercise library…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-6 py-14 text-center">
              <Dumbbell className="mx-auto h-8 w-8 text-text-muted" aria-hidden="true" />
              <p className="mt-3 font-medium text-text-primary">No exercises match those filters</p>
              <p className="mt-1 text-sm text-text-secondary">Clear the filters or add a club-specific exercise.</p>
              <Button type="button" variant="outline" className="mt-4" onClick={onCreate} leftIcon={<Plus className="h-4 w-4" />}>
                Create custom exercise
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map(exercise => {
                const selected = exercise.id === selectedId;
                return (
                  <li key={exercise.id}>
                    <div className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${selected ? 'border-sky-500/50 bg-sky-500/5' : 'border-border bg-cold-900 hover:border-sky-500/30'}`}>
                      <ExerciseThumb key={exercise.imageUrl || exercise.id} exercise={exercise} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-text-primary">{exercise.name}</h3>
                          <Badge tone="sky">{CATEGORY_LABELS[exercise.category as keyof typeof CATEGORY_LABELS] || exercise.category}</Badge>
                          <Badge>{PHASE_LABELS[exercise.phase as keyof typeof PHASE_LABELS] || exercise.phase}</Badge>
                          <Badge>{LEVEL_LABELS[exercise.level] || exercise.level}</Badge>
                          {exercise.source !== 'free-exercise-db' && exercise.source !== 'stms' && (
                            <Badge tone="gold">{SOURCE_LABELS[exercise.source] || exercise.source}</Badge>
                          )}
                        </div>
                        {exercise.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{exercise.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
                          {exercise.primaryMuscles?.length > 0 && <span>{exercise.primaryMuscles.join(', ')}</span>}
                          {exercise.equipment?.length > 0 && <span>{exercise.equipment.join(', ')}</span>}
                          {exercise.eventGroups?.includes('general') === false && (
                            <span>{exercise.eventGroups.map(group => EVENT_GROUP_LABELS[group as keyof typeof EVENT_GROUP_LABELS] || group).join(', ')}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant={selected ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => choose(exercise)}
                        leftIcon={selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        aria-label={`Use ${exercise.name}`}
                      >
                        {selected ? 'Selected' : 'Add'}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
