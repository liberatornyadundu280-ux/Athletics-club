import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, HeartPulse, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, Input, Modal, Sparkline } from '@/components/ui';
import { injuryApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const today = () => new Date().toISOString().slice(0, 10);

const statusTone: Record<string, string> = {
  active: 'badge-primary',
  rehabilitating: 'badge-amber',
  returning: 'badge-amber',
  resolved: 'badge-success',
};

const rtpSteps: [string, string][] = [
  ['active', 'Active'],
  ['rehabilitating', 'Rehabilitating'],
  ['returning', 'Return to training'],
  ['resolved', 'Resolve injury'],
];

export function InjuryDetail() {
  const { id = '' } = useParams(); const navigate = useNavigate(); const { hasPermission } = useAuth();
  const [injury, setInjury] = useState<any>(null); const [wellness, setWellness] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [wellnessOpen, setWellnessOpen] = useState(false); const [rehabOpen, setRehabOpen] = useState(false); const [saving, setSaving] = useState(false);
  const [check, setCheck] = useState({ date: today(), pain: 0, fatigue: 5, sleepHours: '', note: '' }); const [rehab, setRehab] = useState({ name: '', instructions: '', dueDate: '' });
  const canWrite = hasPermission('injury:write'); const canRtp = hasPermission('injury:rtp'); const canSelfLog = hasPermission('injury:write:own');
  const load = async () => { setLoading(true); try { const [detail, logs] = await Promise.all([injuryApi.getOne(id), injuryApi.getWellness(id)]); setInjury(detail); setWellness(logs); } catch (error: any) { toast.error(error.message || 'Could not load injury record'); setInjury(null); } finally { setLoading(false); } };
  useEffect(() => { void load(); /* data key is stable for this route */ }, [id]);
  const saveWellness = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); try { await injuryApi.addWellness(id, { ...check, pain: Number(check.pain), fatigue: Number(check.fatigue), sleepHours: check.sleepHours ? Number(check.sleepHours) : undefined }); toast.success('Wellbeing check saved'); setWellnessOpen(false); await load(); } catch (error: any) { toast.error(error.message || 'Could not save wellbeing check'); } finally { setSaving(false); } };
  const saveRehab = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); try { await injuryApi.addRehabTask(id, { ...rehab, dueDate: rehab.dueDate || undefined }); toast.success('Recovery step added'); setRehabOpen(false); setRehab({ name: '', instructions: '', dueDate: '' }); await load(); } catch (error: any) { toast.error(error.message || 'Could not add recovery step'); } finally { setSaving(false); } };
  const setRtp = async (status: string) => { try { const updated = await injuryApi.updateRtp(id, { status, phase: status === 'rehabilitating' ? 'Rehabilitation' : status === 'returning' ? 'Return to training' : status === 'resolved' ? 'Cleared' : 'Assessment' }); setInjury(updated); toast.success('Return-to-training status updated'); } catch (error: any) { toast.error(error.message || 'Could not update recovery status'); } };
  if (loading) return <div role="status" className="py-20 text-center text-text-secondary">Loading injury record…</div>;
  if (!injury) return <div className="py-16 text-center"><h1 className="text-xl font-semibold text-text-primary">Injury record unavailable</h1><Button className="mt-5" variant="outline" onClick={() => navigate('/injuries')}>Back to injuries</Button></div>;

  const painTrend = [...wellness].sort((a, b) => String(a.date).localeCompare(String(b.date))).map(row => Number(row.pain) || 0);
  const latest = wellness[0];

  return (
    <div className="page-shell">
      <Button variant="ghost" size="sm" className="-ml-2 self-start" onClick={() => navigate('/injuries')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
        Injury records
      </Button>

      <section className="surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="stat-label">Recovery record</p>
            <h1 className="mt-1.5 font-display text-2xl uppercase leading-none tracking-[-0.01em] text-text-primary sm:text-3xl">
              {injury.type}
            </h1>
            <p className="mt-2 text-body-sm text-text-secondary">
              {injury.bodyPart} · <span className="capitalize">{String(injury.laterality).replace('_', ' ')}</span> · Onset{' '}
              <span className="num">{injury.onsetDate}</span>
            </p>
          </div>
          <span className={statusTone[injury.status] || 'badge-neutral'}>{injury.status}</span>
        </div>

        {injury.restrictions?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {injury.restrictions.map((item: string) => (
              <span key={item} className="rounded border border-amber-500/30 px-2 py-0.5 text-micro text-amber-400">
                {item}
              </span>
            ))}
          </div>
        )}
        {injury.mechanism && <p className="mt-4 max-w-3xl text-body-sm leading-relaxed text-text-secondary">{injury.mechanism}</p>}
      </section>

      <Card padding="none">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-heading-sm font-semibold text-text-primary">Recovery plan</h2>
              <p className="mt-1 text-body-sm text-text-secondary">
                {injury.phase || 'Initial assessment'}
                {injury.expectedReturnDate ? (
                  <>
                    {' '}· Expected return <span className="num">{injury.expectedReturnDate}</span>
                  </>
                ) : null}
              </p>
            </div>
            {canWrite && (
              <Button variant="outline" size="sm" onClick={() => setRehabOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
                Add step
              </Button>
            )}
          </div>

          {injury.rehabPlan?.length ? (
            <ol className="space-y-2">
              {injury.rehabPlan.map((item: any, index: number) => (
                <li key={item._id} className="flex gap-3 rounded-radius-md border border-border p-3">
                  <span className="num mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-micro text-text-muted">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium text-text-primary">{item.name}</p>
                    {item.instructions && <p className="mt-1 text-body-sm text-text-secondary">{item.instructions}</p>}
                    {item.dueDate && (
                      <p className="mt-1 text-caption text-text-muted">
                        Due <span className="num">{item.dueDate}</span>
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-radius-md border border-dashed border-border p-5 text-center text-body-sm text-text-muted">
              No recovery steps recorded yet.
            </p>
          )}

          {canRtp && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              {rtpSteps.map(([status, label]) => (
                <Button
                  key={status}
                  size="sm"
                  variant={injury.status === status ? 'primary' : 'outline'}
                  onClick={() => void setRtp(status)}
                >
                  {label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card padding="none">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-heading-sm font-semibold text-text-primary">Daily wellbeing</h2>
              <p className="mt-1 text-body-sm text-text-secondary">Pain and fatigue check-ins trace recovery over time.</p>
            </div>
            {(canWrite || canSelfLog) && (
              <Button size="sm" onClick={() => setWellnessOpen(true)} leftIcon={<HeartPulse className="h-4 w-4" />}>
                Log today
              </Button>
            )}
          </div>

          {wellness.length ? (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                <div className="rounded-radius-md border border-border bg-ink/40 p-3">
                  <p className="stat-label">Latest check-in</p>
                  <p className="num mt-1 text-body-sm text-text-primary">
                    Pain {latest.pain}/10 · Fatigue {latest.fatigue}/10
                  </p>
                  {latest.sleepHours ? <p className="num mt-0.5 text-caption text-text-muted">Sleep {latest.sleepHours}h</p> : null}
                </div>
                <div className="rounded-radius-md border border-border bg-ink/40 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="stat-label">Pain trend</p>
                    <p className="num text-caption text-text-muted">{painTrend.length} check-ins</p>
                  </div>
                  <Sparkline points={painTrend} height={36} tone="danger" label="Pain score over recent check-ins" className="mt-2" />
                </div>
              </div>

              <ol className="mt-3 divide-y divide-border/60">
                {wellness.map(row => (
                  <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="num text-body-sm text-text-primary">{row.date}</p>
                      <p className="text-caption text-text-secondary">
                        Pain <span className="num">{row.pain}</span>/10 · Fatigue <span className="num">{row.fatigue}</span>/10
                        {row.sleepHours ? (
                          <>
                            {' '}· Sleep <span className="num">{row.sleepHours}</span>h
                          </>
                        ) : null}
                      </p>
                      {row.note && <p className="mt-1 text-caption text-text-muted">{row.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="mt-5 text-body-sm text-text-muted">No wellbeing check-ins have been recorded.</p>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={wellnessOpen} onClose={() => setWellnessOpen(false)} title="Daily wellbeing check" description="Use the same scale each day: 0 is none, 10 is highest." size="sm">
        <form onSubmit={saveWellness} className="space-y-4">
          <Input label="Date" type="date" value={check.date} onChange={event => setCheck({ ...check, date: event.target.value })} />
          <label className="block">
            <span className="flex items-baseline justify-between">
              <span className="label">Pain</span>
              <span className="num text-body-sm text-text-primary">{check.pain}/10</span>
            </span>
            <input type="range" min={0} max={10} value={check.pain} onChange={event => setCheck({ ...check, pain: Number(event.target.value) })} className="mt-2 w-full accent-volt" />
          </label>
          <label className="block">
            <span className="flex items-baseline justify-between">
              <span className="label">Fatigue</span>
              <span className="num text-body-sm text-text-primary">{check.fatigue}/10</span>
            </span>
            <input type="range" min={0} max={10} value={check.fatigue} onChange={event => setCheck({ ...check, fatigue: Number(event.target.value) })} className="mt-2 w-full accent-volt" />
          </label>
          <Input label="Sleep (hours)" type="number" min={0} max={24} step="0.5" value={check.sleepHours} onChange={event => setCheck({ ...check, sleepHours: event.target.value })} />
          <Input label="Note (optional)" value={check.note} maxLength={500} onChange={event => setCheck({ ...check, note: event.target.value })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setWellnessOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving} leftIcon={<Save className="h-4 w-4" />}>Save check-in</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={rehabOpen} onClose={() => setRehabOpen(false)} title="Add recovery step" size="sm">
        <form onSubmit={saveRehab} className="space-y-4">
          <Input label="Step" required value={rehab.name} onChange={event => setRehab({ ...rehab, name: event.target.value })} />
          <label className="block">
            <span className="label">Instructions</span>
            <textarea className="input min-h-20" value={rehab.instructions} onChange={event => setRehab({ ...rehab, instructions: event.target.value })} />
          </label>
          <Input label="Target date" type="date" value={rehab.dueDate} onChange={event => setRehab({ ...rehab, dueDate: event.target.value })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRehabOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add step</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
