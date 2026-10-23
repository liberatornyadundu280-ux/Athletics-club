import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ClipboardList, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, EmptyState, Input, Modal, PageHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { athleteApi, workoutApi } from '@/services/api';

type Workout = { id: string; name: string; description?: string; estimatedDuration: number; difficulty: string; tags?: string[]; exercises?: unknown[] };
type Athlete = { id: string; firstName: string; lastName: string; email: string };
const today = () => new Date().toISOString().slice(0, 10);

const difficultyTone: Record<string, string> = {
  beginner: 'badge-success',
  intermediate: 'badge-neutral',
  advanced: 'badge-amber',
};

const assignmentStatus: Record<string, { label: string; className: string }> = {
  assigned: { label: 'Assigned', className: 'badge-neutral' },
  in_progress: { label: 'In progress', className: 'badge-primary' },
  completed: { label: 'Completed', className: 'badge-success' },
};

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

  const openAssign = (workout: Workout) => {
    setSelected(workout);
    setDueDate('');
    setSelectedAthletes([]);
  };

  return (
    <div className="page-shell">
      <PageHeader
        title={athleteMode ? 'My workouts' : 'Workouts'}
        description={
          athleteMode
            ? 'Open an assigned session, follow the plan and record what you did.'
            : 'Build sessions from exercise prescriptions, then assign them to your athletes.'
        }
        meta={
          <>
            <span className="inline-flex items-baseline gap-1.5">
              <span className="num text-text-secondary">
                {loading ? '—' : athleteMode ? assignments.length : workouts.length}
              </span>{' '}
              {athleteMode ? 'assignments' : 'in the library'}
            </span>
            {coach && (
              <span className="inline-flex items-baseline gap-1.5">
                <span className="num text-text-secondary">{athletes.length}</span> athletes available
              </span>
            )}
          </>
        }
        actions={
          canWrite && (
            <Button onClick={() => navigate('/workouts/builder')} leftIcon={<Plus className="h-4 w-4" />}>
              Create workout
            </Button>
          )
        }
      />

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2" role="status" aria-label="Loading workouts">
          {[0, 1, 2, 3].map(item => (
            <div key={item} className="surface space-y-3 p-4">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-5 w-2/3" />
              <div className="skeleton h-3 w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <Card padding="none">
          <EmptyState
            icon={<ClipboardList className="h-5 w-5" />}
            title="Workouts could not be loaded"
            description={error}
            action={<Button variant="outline" onClick={() => void load()}>Try again</Button>}
          />
        </Card>
      ) : athleteMode ? (
        assignments.length === 0 ? (
          <Card padding="none">
            <EmptyState
              icon={<ClipboardList className="h-5 w-5" />}
              title="No workouts assigned yet"
              description="When your coach assigns a session it appears here, ready to open."
              action={<Button variant="outline" onClick={() => navigate('/dashboard')}>Back to today</Button>}
            />
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {assignments.filter(item => item.workout).map(item => {
              const status = assignmentStatus[item.status] || assignmentStatus.assigned;
              return (
                <Link
                  key={item.id}
                  to={`/workouts/${item.id}/player`}
                  className="surface group flex flex-col p-4 transition-colors hover:border-volt/40 hover:bg-raise focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/70"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={status.className}>{status.label}</span>
                    <span className="num text-caption text-text-muted">{item.workout.estimatedDuration} min</span>
                  </div>
                  <h2 className="mt-3 font-display text-xl uppercase leading-tight text-text-primary">
                    {item.workout.name}
                  </h2>
                  <p className="mt-1.5 line-clamp-2 text-body-sm text-text-secondary">
                    {item.workout.description || 'Follow this session at your own pace.'}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-caption text-text-muted">
                    <span className="num">
                      {item.workout.exercises?.length || 0} exercises · {item.dueDate ? `due ${item.dueDate}` : `from ${item.startDate}`}
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-volt">
                      Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      ) : workouts.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<ClipboardList className="h-5 w-5" />}
            title="Your exercise library starts here"
            description="Create a workout and add its exercise prescriptions. Starter sessions may already be waiting — refresh once your club is seeded."
            action={
              canWrite && (
                <Button onClick={() => navigate('/workouts/builder')} leftIcon={<Plus className="h-4 w-4" />}>
                  Create workout
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {workouts.map(workout => (
            <Card key={workout.id} padding="none" className="flex flex-col">
              <CardContent className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 flex-1 truncate text-heading-sm font-semibold text-text-primary">{workout.name}</h2>
                  <span className={difficultyTone[workout.difficulty] || 'badge-neutral'}>{workout.difficulty}</span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-body-sm text-text-secondary">
                  {workout.description || 'No description provided.'}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-muted">
                  <span className="num">{workout.estimatedDuration} min</span>
                  <span className="num">{workout.exercises?.length || 0} exercises</span>
                </div>

                {workout.tags?.length ? (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {workout.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="rounded border border-border px-1.5 py-0.5 text-micro text-text-muted">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {canWrite && (
                    <Button size="sm" variant="outline" onClick={() => navigate(`/workouts/builder/${workout.id}`)}>
                      Edit
                    </Button>
                  )}
                  {coach && (
                    <Button size="sm" onClick={() => openAssign(workout)} leftIcon={<Users className="h-4 w-4" />}>
                      Assign
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={`Assign ${selected?.name || 'workout'}`}
        description="Choose the athletes who should see this plan."
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Due date (optional)"
            type="date"
            min={today()}
            value={dueDate}
            onChange={event => setDueDate(event.target.value)}
          />
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {athletes.length === 0 && <p className="text-body-sm text-text-muted">No athletes on the roster yet.</p>}
            {athletes.map(athlete => {
              const checked = selectedAthletes.includes(athlete.id);
              return (
                <label
                  key={athlete.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-radius-md border p-3 text-body-sm transition-colors ${
                    checked ? 'border-volt/40 bg-volt/[0.05]' : 'border-border hover:bg-white/[0.03]'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-volt"
                    checked={checked}
                    onChange={event => setSelectedAthletes(previous => event.target.checked ? [...previous, athlete.id] : previous.filter(id => id !== athlete.id))}
                  />
                  <span className="text-text-primary">
                    {athlete.firstName} {athlete.lastName}
                  </span>
                  <span className="ml-auto truncate text-caption text-text-muted">{athlete.email}</span>
                </label>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
            <Button loading={saving} disabled={!selectedAthletes.length} onClick={() => void submitAssignment()}>
              Assign to {selectedAthletes.length || ''}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
