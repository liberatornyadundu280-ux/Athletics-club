import React, { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Card, CardContent, EmptyState, PageHeader, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { athleteApi, recommendationApi, workoutApi } from '@/services/api';

const statusTone: Record<string, string> = {
  pending: 'badge-amber',
  accepted: 'badge-success',
  dismissed: 'badge-neutral',
};

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
      setItems(recommendations);
      setAthletes(roster?.data || []);
      setAthleteId(current => current || roster?.data?.[0]?.id || '');
      setWorkouts(workoutList);
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

  const pendingCount = items.filter(item => item.status === 'pending').length;
  const selectedWorkouts = workouts.filter(workout => Object.values(workoutById).includes(workout.id));

  return (
    <div className="page-shell">
      <PageHeader
        title="Training suggestions"
        description="Each suggestion is built from recent performance, attendance, workout effort and active injuries — with the signals behind it stated plainly."
        meta={
          <span className="inline-flex items-baseline gap-1.5">
            <span className="num text-text-secondary">{loading ? '—' : items.length}</span> suggestions ·{' '}
            <span className="num text-text-secondary">{pendingCount}</span> awaiting review
          </span>
        }
        actions={
          canReview ? (
            <>
              <Select
                aria-label="Athlete"
                value={athleteId}
                onChange={event => setAthleteId(event.target.value)}
                className="w-[200px]"
                options={[
                  { value: '', label: 'Choose an athlete' },
                  ...athletes.map(athlete => ({ value: athlete.id, label: `${athlete.firstName} ${athlete.lastName}` })),
                ]}
              />
              <Button loading={generating} disabled={!athleteId} onClick={() => void generate()} leftIcon={<Sparkles className="h-4 w-4" />}>
                Generate
              </Button>
            </>
          ) : isAthlete ? (
            <Button loading={generating} onClick={() => void generate()} leftIcon={<RefreshCw className="h-4 w-4" />}>
              Refresh my plan
            </Button>
          ) : undefined
        }
      />

      {canReview && !loading && athletes.length === 0 && (
        <Card padding="none">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-heading-sm font-semibold text-text-primary">Add athletes before generating</h2>
              <p className="mt-1 text-body-sm text-text-secondary">
                This club has no active athlete profiles yet. Import the roster or add an athlete to enable recommendations.
              </p>
            </div>
            <Link className="btn btn-primary btn-sm shrink-0" to="/athletes">
              Open athlete roster
            </Link>
          </div>
        </Card>
      )}

      <p className="max-w-3xl text-caption leading-relaxed text-text-muted">
        Suggestions provide a training focus, intensity, recovery guidance and supporting signals. Pick a saved workout
        below a pending suggestion to inspect the complete exercise prescription before assigning it. Cold-start
        suggestions use explainable rules, not a trained prediction model. Follow clinician restrictions where applicable.
      </p>

      {selectedWorkouts.length > 0 && (
        <section className="surface p-4" aria-label="Selected workout details">
          <h2 className="text-heading-sm font-semibold text-text-primary">Selected workout details</h2>
          <div className="mt-3 space-y-5">
            {selectedWorkouts.map(workout => (
              <div key={workout.id} className="border-t border-border pt-4 first:border-0 first:pt-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-text-primary">{workout.name}</h3>
                  <p className="num text-caption text-text-secondary">
                    {workout.estimatedDuration} min · {workout.difficulty}
                  </p>
                </div>
                {workout.description && <p className="mt-1 text-body-sm text-text-secondary">{workout.description}</p>}
                <ol className="mt-3 divide-y divide-border/60">
                  {(workout.exercises || []).map((exercise: any, index: number) => (
                    <li key={`${workout.id}-${index}`} className="border-l-2 border-volt/50 py-2 pl-3">
                      <h4 className="text-body-sm font-medium text-text-primary">
                        <span className="num mr-1.5 text-text-muted">{index + 1}.</span>
                        {exercise.name}
                      </h4>
                      <p className="num mt-1 text-caption text-text-secondary">
                        {exercise.sets} sets · {exercise.reps} · {exercise.restSeconds}s rest
                      </p>
                      {(exercise.tempo || exercise.targetZone) && (
                        <p className="mt-1 text-caption text-text-secondary">
                          {[exercise.tempo && `Tempo: ${exercise.tempo}`, exercise.targetZone && `Target: ${exercise.targetZone}`]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                      {exercise.coachingNotes && <p className="mt-1 text-caption text-text-muted">Coach notes: {exercise.coachingNotes}</p>}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading training suggestions">
          {[0, 1].map(item => (
            <div key={item} className="surface space-y-3 p-5">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-16 w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <Card padding="none">
          <EmptyState
            icon={<Activity className="h-5 w-5" />}
            title="Suggestions could not be loaded"
            description={error}
            action={<Button variant="outline" onClick={() => void load()}>Try again</Button>}
          />
        </Card>
      ) : items.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<Sparkles className="h-5 w-5" />}
            title="No training suggestions yet"
            description="Generate one after selecting an athlete, or complete a workout or record a performance to refresh it automatically."
            action={
              (canReview || isAthlete) && (
                <Button loading={generating} disabled={canReview && !athleteId} onClick={() => void generate()}>
                  Generate a suggestion
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <Card key={item.id} padding="none">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-heading-sm font-semibold text-text-primary">{item.focus}</h2>
                      <span className={statusTone[item.status] || 'badge-neutral'}>{item.status}</span>
                    </div>
                    <p className="mt-1 text-caption text-text-secondary">
                      {item.athleteName} · <span className="num">{new Date(item.generatedAt).toLocaleString()}</span> ·{' '}
                      <span className="num text-text-primary">{Math.round((item.confidence || 0) * 100)}%</span> confidence
                    </p>
                  </div>
                  <span className="rounded border border-border px-2 py-0.5 text-micro text-text-muted">{item.modelVersion}</span>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-radius-md border border-border bg-ink/40 p-3">
                    <p className="stat-label">Intensity</p>
                    <p className="mt-1 text-body-sm text-text-primary">{item.intensity}</p>
                  </div>
                  <div className="rounded-radius-md border border-border bg-ink/40 p-3">
                    <p className="stat-label">Recovery</p>
                    <p className="mt-1 text-body-sm text-text-primary">{item.recovery}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="stat-label">Why this suggestion</p>
                  <ul className="mt-2 space-y-1.5">
                    {item.drivers.map((driver: string, index: number) => (
                      <li key={index} className="flex gap-2 text-body-sm text-text-secondary">
                        <span aria-hidden="true" className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-volt" />
                        {driver}
                      </li>
                    ))}
                  </ul>
                </div>

                {canReview && item.status === 'pending' && (
                  <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-end">
                    <Select
                      aria-label={`Workout for ${item.athleteName}`}
                      value={workoutById[item.id] || ''}
                      onChange={event => setWorkoutById(previous => ({ ...previous, [item.id]: event.target.value }))}
                      className="sm:w-[240px]"
                      options={[
                        { value: '', label: 'Choose workout to assign' },
                        ...workouts.map(workout => ({ value: workout.id, label: workout.name })),
                      ]}
                    />
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => void review(item, 'dismissed')}>Dismiss</Button>
                      <Button onClick={() => void review(item, 'accepted')} disabled={!workoutById[item.id]}>
                        Accept and assign
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
