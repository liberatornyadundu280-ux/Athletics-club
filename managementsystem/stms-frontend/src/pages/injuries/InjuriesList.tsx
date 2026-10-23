import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, EmptyState, Input, Modal, PageHeader, Select } from '@/components/ui';
import { athleteApi, injuryApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const today = () => new Date().toISOString().slice(0, 10);

const statusTone: Record<string, string> = {
  active: 'badge-primary',
  returning: 'badge-amber',
  resolved: 'badge-success',
};

export function InjuriesList() {
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState<any[]>([]); const [athletes, setAthletes] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ athleteId: '', type: '', bodyPart: '', laterality: 'not_applicable', onsetDate: today(), severity: 1, mechanism: '', diagnosisSource: 'self', diagnosis: '', expectedReturnDate: '' });
  const canWrite = hasPermission('injury:write'); const canWriteOwn = hasPermission('injury:write:own'); const coach = canWrite;
  const load = useCallback(async () => { setLoading(true); setError(''); try { const [injuries, roster] = await Promise.all([injuryApi.get(), coach ? athleteApi.getAthletes({ limit: 100 }) : Promise.resolve(null)]); setRows(injuries); setAthletes(roster?.data || []); } catch (cause: any) { setError(cause.message || 'Could not load injury records'); } finally { setLoading(false); } }, [coach]);
  useEffect(() => { void load(); }, [load]);
  const save = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); try { await injuryApi.create({ ...form, athleteId: coach ? form.athleteId : undefined, severity: Number(form.severity), expectedReturnDate: form.expectedReturnDate || null }); toast.success('Injury record saved'); setOpen(false); await load(); } catch (cause: any) { toast.error(cause.message || 'Could not save injury'); } finally { setSaving(false); } };

  return (
    <div className="page-shell">
      <PageHeader
        title="Injury & return to training"
        description="Injury status, recovery steps and daily wellbeing notes in one place — visible only to the athlete and their club staff."
        meta={
          <span className="inline-flex items-baseline gap-1.5">
            <span className="num text-text-secondary">{loading ? '—' : rows.length}</span> records ·{' '}
            <span className="num text-text-secondary">{rows.filter(row => row.status !== 'resolved').length}</span> open
          </span>
        }
        actions={
          (canWrite || canWriteOwn) && (
            <Button onClick={() => setOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Report an injury
            </Button>
          )
        }
      />

      <Card padding="none">
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Activity className="h-4 w-4 text-volt" aria-hidden="true" />
            <h2 className="text-heading-sm font-semibold text-text-primary">Injury records</h2>
          </div>

          {loading ? (
            <div className="divide-y divide-border/60" role="status" aria-label="Loading injury records">
              {[0, 1, 2].map(row => (
                <div key={row} className="space-y-2 px-4 py-4">
                  <div className="skeleton h-3.5 w-1/3" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <EmptyState
              icon={<Activity className="h-5 w-5" />}
              title="Injury records could not be loaded"
              description={error}
              action={<Button variant="outline" onClick={() => void load()}>Try again</Button>}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Activity className="h-5 w-5" />}
              title="No injury records"
              description="An athlete or coach can record a new injury when support is needed."
              action={
                (canWrite || canWriteOwn) && (
                  <Button onClick={() => setOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
                    Report an injury
                  </Button>
                )
              }
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {rows.map(row => {
                const severity = Math.min(Math.max(Number(row.severity) || 1, 1), 3);
                return (
                  <li key={row.id}>
                    <Link
                      to={`/injuries/${row.id}`}
                      className="group flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-body-sm font-semibold text-text-primary">
                            {row.type} · {row.bodyPart}
                            {row.laterality !== 'not_applicable' ? (
                              <span className="ml-1 font-normal text-text-muted">({row.laterality})</span>
                            ) : null}
                          </h3>
                          <span className={statusTone[row.status] || 'badge-neutral'}>{row.status}</span>
                        </div>

                        <p className="num mt-1 text-caption text-text-secondary">
                          Onset {row.onsetDate}
                          {row.expectedReturnDate ? ` · expected return ${row.expectedReturnDate}` : ''}
                        </p>
                        <p className="mt-1 text-caption text-text-muted">
                          {row.restrictions?.length ? `Restrictions: ${row.restrictions.join(', ')}` : 'No restrictions recorded'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 sm:shrink-0">
                        <span
                          className="flex items-end gap-0.5"
                          title={`Severity ${severity} of 3`}
                          aria-label={`Severity ${severity} of 3`}
                        >
                          {[1, 2, 3].map(step => (
                            <span
                              key={step}
                              className={`w-1 rounded-sm ${step <= severity ? 'bg-amber-400' : 'bg-white/10'}`}
                              style={{ height: `${0.35 + step * 0.2}rem` }}
                            />
                          ))}
                        </span>
                        <ArrowRight
                          className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-volt"
                          aria-hidden="true"
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Report an injury"
        description="Record the issue and the date it started. Coaches can add recovery details."
        size="md"
      >
        <form onSubmit={save} className="space-y-4">
          {coach && (
            <Select
              label="Athlete"
              required
              value={form.athleteId}
              onChange={event => setForm({ ...form, athleteId: event.target.value })}
              options={[
                { value: '', label: 'Choose an athlete' },
                ...athletes.map(athlete => ({ value: athlete.id, label: `${athlete.firstName} ${athlete.lastName}` })),
              ]}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Injury / issue"
              required
              maxLength={100}
              value={form.type}
              onChange={event => setForm({ ...form, type: event.target.value })}
              placeholder="Hamstring strain"
            />
            <Input
              label="Body part"
              required
              maxLength={60}
              value={form.bodyPart}
              onChange={event => setForm({ ...form, bodyPart: event.target.value })}
              placeholder="Thigh"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label="Side"
              value={form.laterality}
              onChange={event => setForm({ ...form, laterality: event.target.value })}
              options={[
                { value: 'not_applicable', label: 'Not applicable' },
                { value: 'left', label: 'Left' },
                { value: 'right', label: 'Right' },
                { value: 'bilateral', label: 'Both sides' },
              ]}
            />
            <Select
              label="Severity"
              value={String(form.severity)}
              onChange={event => setForm({ ...form, severity: Number(event.target.value) })}
              options={[
                { value: '1', label: 'Grade 1 · mild' },
                { value: '2', label: 'Grade 2 · moderate' },
                { value: '3', label: 'Grade 3 · severe' },
              ]}
            />
            <Input
              label="Onset date"
              type="date"
              required
              value={form.onsetDate}
              onChange={event => setForm({ ...form, onsetDate: event.target.value })}
            />
          </div>

          {coach && (
            <>
              <Select
                label="Diagnosis source"
                value={form.diagnosisSource}
                onChange={event => setForm({ ...form, diagnosisSource: event.target.value })}
                options={['coach', 'physio', 'doctor', 'self', 'other'].map(value => ({ value, label: value }))}
              />
              <label className="block">
                <span className="label">Mechanism / diagnosis notes</span>
                <textarea
                  className="input min-h-20"
                  maxLength={1200}
                  value={form.mechanism}
                  onChange={event => setForm({ ...form, mechanism: event.target.value })}
                />
              </label>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving} disabled={coach && !form.athleteId}>Save record</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
