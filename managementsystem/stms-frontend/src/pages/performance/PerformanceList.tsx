import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Plus, Trophy } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Card, CardContent, EmptyState, Input, Modal, PageHeader, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { athleteApi, performanceApi } from '@/services/api';

type Tab = 'results' | 'competitions' | 'tests' | 'goals';
const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = () => ({ athleteId: '', name: '', event: '', round: '', resultValue: '', value: '', unit: 's', date: today(), venue: '', level: 'club', wind: '', position: '', testType: '', targetValue: '', targetDate: '', coachNotes: '' });
const titles: Record<Tab, string> = { results: 'Competition results', competitions: 'Competitions', tests: 'Fitness tests', goals: 'Athlete goals' };

function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  const keys = rows.length ? Object.keys(rows[0]) : [];
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const body = [keys.map(escape).join(','), ...rows.map(row => keys.map(key => escape(row[key])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}

export function PerformanceList() {
  const location = useLocation(); const navigate = useNavigate(); const { hasPermission } = useAuth();
  const [tab, setTab] = useState<Tab>(location.pathname.includes('fitness-tests') ? 'tests' : location.pathname.includes('goals') ? 'goals' : 'results');
  const [rows, setRows] = useState<any[]>([]); const [athletes, setAthletes] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false); const [form, setForm] = useState(emptyForm());
  const canWrite = hasPermission('performance:write');
  useEffect(() => { setTab(location.pathname.includes('fitness-tests') ? 'tests' : location.pathname.includes('goals') ? 'goals' : 'results'); }, [location.pathname]);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = tab === 'competitions' ? await performanceApi.getCompetitions() : tab === 'results' ? await performanceApi.getResults() : tab === 'tests' ? await performanceApi.getTests() : await performanceApi.getGoals();
      setRows(data);
      if (canWrite) { const roster = await athleteApi.getAthletes({ limit: 100 }); setAthletes(roster.data || []); }
    } catch (cause: any) { setError(cause.message || 'Could not load performance records'); setRows([]); }
    finally { setLoading(false); }
  }, [tab, canWrite]);
  useEffect(() => { void load(); }, [load]);

  const tabs: { id: Tab; label: string; path: string }[] = [{ id: 'results', label: 'Results', path: '/performance' }, { id: 'competitions', label: 'Competitions', path: '/performance' }, { id: 'tests', label: 'Fitness tests', path: '/performance/fitness-tests' }, { id: 'goals', label: 'Goals', path: '/performance/goals' }];
  const changeTab = (next: Tab) => { setTab(next); navigate(next === 'tests' ? '/performance/fitness-tests' : next === 'goals' ? '/performance/goals' : '/performance'); };
  const shown = useMemo(() => rows, [rows]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      if (tab === 'competitions') await performanceApi.createCompetition({ name: form.name, date: form.date, venue: form.venue, level: form.level });
      if (tab === 'results') await performanceApi.createResult({ athleteId: form.athleteId, event: form.event, round: form.round, resultValue: Number(form.resultValue), unit: form.unit, date: form.date, meetLevel: form.level, wind: form.wind ? Number(form.wind) : undefined, position: form.position ? Number(form.position) : undefined });
      if (tab === 'tests') await performanceApi.createTest({ athleteId: form.athleteId, testType: form.testType, value: Number(form.value), unit: form.unit, date: form.date });
      if (tab === 'goals') await performanceApi.createGoal({ athleteId: form.athleteId, event: form.event, targetValue: Number(form.targetValue), unit: form.unit, targetDate: form.targetDate, coachNotes: form.coachNotes });
      toast.success(`${titles[tab].replace(/s$/, '')} saved`); setOpen(false); setForm(emptyForm()); await load();
    } catch (cause: any) { toast.error(cause.message || 'Could not save this record'); }
    finally { setSaving(false); }
  };

  const markGoal = async (row: any) => { try { await performanceApi.updateGoal(row.id, { status: row.status === 'completed' ? 'active' : 'completed' }); toast.success(row.status === 'completed' ? 'Goal reopened' : 'Goal completed'); await load(); } catch (cause: any) { toast.error(cause.message || 'Could not update goal'); } };

  const exportRows = () => downloadCsv(`stms-${tab}.csv`, shown.map(row => { const { _id, clubId, ...rest } = row; return Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, value instanceof Object ? JSON.stringify(value) : value])); }));

  const addLabel = tab === 'tests' ? 'Add test' : tab === 'goals' ? 'Add goal' : tab === 'competitions' ? 'Add competition' : 'Add result';

  return (
    <div className="page-shell">
      <PageHeader
        title="Performance"
        description="Meet results and testing, personal bests, and the goals the season is built around."
        meta={
          <span className="inline-flex items-baseline gap-1.5">
            <span className="num text-text-secondary">{loading ? '—' : rows.length}</span> records in {titles[tab].toLowerCase()}
          </span>
        }
        actions={
          canWrite && (
            <Button onClick={() => setOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
              {addLabel}
            </Button>
          )
        }
      />

      <div className="-mt-1 flex gap-1 overflow-x-auto border-b border-border" role="tablist" aria-label="Performance sections">
        {tabs.map(item => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => changeTab(item.id)}
            className={`tab whitespace-nowrap ${tab === item.id ? 'tab-active' : ''}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Card padding="none">
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="text-heading-sm font-semibold text-text-primary">{titles[tab]}</h2>
            <Button variant="outline" size="sm" onClick={exportRows} disabled={!rows.length} leftIcon={<Download className="h-4 w-4" />}>
              Export CSV
            </Button>
          </div>

          {loading ? (
            <div className="divide-y divide-border/60" role="status" aria-label="Loading performance records">
              {[0, 1, 2, 3].map(row => (
                <div key={row} className="flex items-center justify-between gap-4 px-4 py-4">
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3.5 w-1/3" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                  <div className="skeleton h-5 w-16" />
                </div>
              ))}
            </div>
          ) : error ? (
            <EmptyState
              icon={<Trophy className="h-5 w-5" />}
              title="Records could not be loaded"
              description={error}
              action={<Button variant="outline" onClick={() => void load()}>Try again</Button>}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Trophy className="h-5 w-5" />}
              title={`No ${titles[tab].toLowerCase()} yet`}
              description="Saved records appear here for your active club."
              action={
                canWrite && (
                  <Button onClick={() => setOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
                    Add the first record
                  </Button>
                )
              }
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {rows.map(row => (
                <li key={row.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  {tab === 'results' && (
                    <>
                      <div className="min-w-0">
                        <p className="truncate text-body-sm font-semibold text-text-primary">
                          {row.athleteName} <span className="font-normal text-text-muted">·</span> {row.event}
                        </p>
                        <p className="num mt-0.5 text-caption text-text-secondary">
                          {row.date}
                          {row.wind !== undefined && row.wind !== null ? ` · wind ${row.wind} m/s` : ''}
                          {row.position ? ` · ${row.position}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 sm:shrink-0">
                        {row.isPB && <span className="badge-success">PB</span>}
                        {row.isSB && <span className="badge-primary">SB</span>}
                        <span className="num text-heading-sm font-semibold text-text-primary">
                          {row.resultValue}
                          <span className="ml-1 text-caption font-medium text-text-muted">{row.unit}</span>
                        </span>
                      </div>
                    </>
                  )}

                  {tab === 'competitions' && (
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-semibold text-text-primary">{row.name}</p>
                      <p className="num mt-0.5 text-caption text-text-secondary">
                        {row.date} · {row.venue || 'Venue not set'} · <span className="capitalize">{row.level}</span>
                      </p>
                    </div>
                  )}

                  {tab === 'tests' && (
                    <>
                      <div className="min-w-0">
                        <p className="truncate text-body-sm font-semibold text-text-primary">{row.testType}</p>
                        <p className="num mt-0.5 text-caption text-text-secondary">{row.date} · athlete {String(row.athleteId).slice(-6)}</p>
                      </div>
                      <span className="num text-heading-sm font-semibold text-text-primary">
                        {row.value}
                        <span className="ml-1 text-caption font-medium text-text-muted">{row.unit}</span>
                      </span>
                    </>
                  )}

                  {tab === 'goals' && (
                    <>
                      <div className="min-w-0">
                        <p className="truncate text-body-sm font-semibold text-text-primary">
                          {row.event} <span className="font-normal text-text-muted">·</span>{' '}
                          <span className="num">target {row.targetValue} {row.unit}</span>
                        </p>
                        <p className="num mt-0.5 text-caption text-text-secondary">Due {row.targetDate}</p>
                        {row.coachNotes && <p className="mt-1 line-clamp-2 text-caption text-text-muted">{row.coachNotes}</p>}
                      </div>
                      <div className="flex items-center gap-2 sm:shrink-0">
                        <span className={row.status === 'completed' ? 'badge-success' : 'badge-neutral'}>{row.status}</span>
                        {canWrite && (
                          <Button size="sm" variant="outline" onClick={() => void markGoal(row)}>
                            {row.status === 'completed' ? 'Reopen' : 'Complete'}
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={addLabel.replace('Add ', 'Add a ')}
        description="This record will be saved in the active club."
        size="md"
      >
        <form onSubmit={submit} className="space-y-4">
          {tab === 'competitions' && (
            <>
              <Input label="Competition name" required maxLength={160} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Date" type="date" required value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} />
                <Select label="Meet level" value={form.level} onChange={event => setForm({ ...form, level: event.target.value })} options={['club', 'district', 'state', 'national', 'international'].map(value => ({ value, label: value }))} />
              </div>
              <Input label="Venue" maxLength={160} value={form.venue} onChange={event => setForm({ ...form, venue: event.target.value })} />
            </>
          )}
          {(tab === 'results' || tab === 'tests' || tab === 'goals') && (
            <Select
              label="Athlete"
              required
              value={form.athleteId}
              onChange={event => setForm({ ...form, athleteId: event.target.value })}
              options={[{ value: '', label: 'Choose an athlete' }, ...athletes.map(athlete => ({ value: athlete.id, label: `${athlete.firstName} ${athlete.lastName}` }))]}
            />
          )}
          {tab === 'results' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Event" required maxLength={80} value={form.event} onChange={event => setForm({ ...form, event: event.target.value })} placeholder="100m" />
                <Input label="Round" maxLength={60} value={form.round} onChange={event => setForm({ ...form, round: event.target.value })} placeholder="Final" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Input label="Result" type="number" step="any" min="0.001" required value={form.resultValue} onChange={event => setForm({ ...form, resultValue: event.target.value })} />
                <Select label="Unit" value={form.unit} onChange={event => setForm({ ...form, unit: event.target.value })} options={['s', 'm', 'cm', 'points', 'reps', 'kg'].map(value => ({ value, label: value }))} />
                <Input label="Date" type="date" required value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Input label="Wind (m/s)" type="number" step="0.1" value={form.wind} onChange={event => setForm({ ...form, wind: event.target.value })} />
                <Input label="Position" type="number" min="1" value={form.position} onChange={event => setForm({ ...form, position: event.target.value })} />
                <Select label="Meet level" value={form.level} onChange={event => setForm({ ...form, level: event.target.value })} options={['club', 'district', 'state', 'national', 'international'].map(value => ({ value, label: value }))} />
              </div>
            </>
          )}
          {tab === 'tests' && (
            <>
              <Input label="Test name" required maxLength={80} value={form.testType} onChange={event => setForm({ ...form, testType: event.target.value })} placeholder="30m flying sprint" />
              <div className="grid gap-4 sm:grid-cols-3">
                <Input label="Value" type="number" step="any" min="0.001" required value={form.value} onChange={event => setForm({ ...form, value: event.target.value })} />
                <Input label="Unit" required value={form.unit} onChange={event => setForm({ ...form, unit: event.target.value })} />
                <Input label="Date" type="date" required value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} />
              </div>
            </>
          )}
          {tab === 'goals' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Event / focus" required value={form.event} onChange={event => setForm({ ...form, event: event.target.value })} />
                <Input label="Target date" type="date" required value={form.targetDate} onChange={event => setForm({ ...form, targetDate: event.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Target" type="number" step="any" min="0.001" required value={form.targetValue} onChange={event => setForm({ ...form, targetValue: event.target.value })} />
                <Select label="Unit" value={form.unit} onChange={event => setForm({ ...form, unit: event.target.value })} options={['s', 'm', 'cm', 'points', 'reps', 'kg'].map(value => ({ value, label: value }))} />
              </div>
              <label className="block">
                <span className="label">Coach notes</span>
                <textarea
                  className="input min-h-16"
                  value={form.coachNotes}
                  onChange={event => setForm({ ...form, coachNotes: event.target.value })}
                />
              </label>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
