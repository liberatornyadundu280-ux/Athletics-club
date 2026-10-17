import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Plus, Trophy } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent, Input, Modal, Select } from '@/components/ui';
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="surface-raised relative overflow-hidden p-6 sm:p-8"><div className="absolute right-0 top-0 h-full w-1.5 bg-gradient-to-b from-sky-400 via-sky-500 to-amber-400" /><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-sky-400">SPRINT 5 · ATHLETE DEVELOPMENT</p><h1 className="mt-2 text-3xl font-bold text-text-primary">Performance</h1><p className="mt-2 max-w-xl text-text-secondary">Record meet results and testing, recognize personal bests, and keep season goals visible.</p></div>{canWrite && <Button onClick={() => setOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>Add {tab === 'tests' ? 'test' : tab === 'goals' ? 'goal' : tab === 'competitions' ? 'competition' : 'result'}</Button>}</div></section>
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">{tabs.map(item => <button key={item.id} onClick={() => changeTab(item.id)} aria-current={tab === item.id ? 'page' : undefined} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === item.id ? 'bg-sky-400/10 text-sky-300' : 'text-text-secondary hover:bg-cold-800 hover:text-text-primary'}`}>{item.label}</button>)}</div>
      <Card><CardContent className="p-0"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-semibold text-text-primary">{titles[tab]}</h2><p className="mt-1 text-sm text-text-secondary">{loading ? 'Loading records…' : `${rows.length} records`}</p></div><Button variant="outline" size="sm" onClick={exportRows} disabled={!rows.length} leftIcon={<Download className="h-4 w-4" />}>Export CSV</Button></div>
        {loading ? <div role="status" className="py-16 text-center text-text-secondary">Loading club records…</div> : error ? <div className="py-14 text-center"><p role="alert" className="text-text-primary">{error}</p><Button className="mt-4" variant="outline" onClick={() => void load()}>Try again</Button></div> : rows.length === 0 ? <div className="py-16 text-center"><Trophy className="mx-auto h-10 w-10 text-text-muted" /><h3 className="mt-4 font-semibold text-text-primary">No {titles[tab].toLowerCase()} yet</h3><p className="mt-2 text-sm text-text-secondary">Saved records will appear here for your active club.</p>{canWrite && <Button className="mt-5" onClick={() => setOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>Add the first record</Button>}</div> : <div className="divide-y divide-border">{rows.map(row => <div key={row.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          {tab === 'results' && <><div><p className="font-semibold text-text-primary">{row.athleteName} · {row.event}</p><p className="mt-1 text-sm text-text-secondary">{row.date} · {row.resultValue} {row.unit}{row.wind !== undefined ? ` · wind ${row.wind}m/s` : ''}</p></div><div className="flex gap-2">{row.isPB && <Badge variant="success">Personal best</Badge>}{row.isSB && <Badge variant="primary">Season best</Badge>}</div></>}
          {tab === 'competitions' && <div><p className="font-semibold text-text-primary">{row.name}</p><p className="mt-1 text-sm text-text-secondary">{row.date} · {row.venue || 'Venue not set'} · {row.level}</p></div>}
          {tab === 'tests' && <div><p className="font-semibold text-text-primary">{row.testType} · {row.value} {row.unit}</p><p className="mt-1 text-sm text-text-secondary">{row.date} · Athlete {row.athleteId}</p></div>}
          {tab === 'goals' && <><div><p className="font-semibold text-text-primary">{row.event} · target {row.targetValue} {row.unit}</p><p className="mt-1 text-sm text-text-secondary">Due {row.targetDate} · Athlete {row.athleteId}</p>{row.coachNotes && <p className="mt-1 text-sm text-text-muted">{row.coachNotes}</p>}</div><div className="flex items-center gap-2"><Badge variant={row.status === 'completed' ? 'success' : 'neutral'}>{row.status}</Badge>{canWrite && <Button size="sm" variant="outline" onClick={() => void markGoal(row)}>{row.status === 'completed' ? 'Reopen' : 'Complete'}</Button>}</div></>}
        </div>)}</div>}
      </CardContent></Card>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={`Add ${titles[tab].replace(/s$/, '').toLowerCase()}`} description="This record will be saved in the active club." size="md"><form onSubmit={submit} className="space-y-4">
        {tab === 'competitions' && <><Input label="Competition name" required maxLength={160} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /><div className="grid gap-4 sm:grid-cols-2"><Input label="Date" type="date" required value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /><Select label="Meet level" value={form.level} onChange={event => setForm({ ...form, level: event.target.value })} options={['club', 'district', 'state', 'national', 'international'].map(value => ({ value, label: value }))} /></div><Input label="Venue" maxLength={160} value={form.venue} onChange={event => setForm({ ...form, venue: event.target.value })} /></>}
        {(tab === 'results' || tab === 'tests' || tab === 'goals') && <Select label="Athlete" required value={form.athleteId} onChange={event => setForm({ ...form, athleteId: event.target.value })} options={[{ value: '', label: 'Choose an athlete' }, ...athletes.map(athlete => ({ value: athlete.id, label: `${athlete.firstName} ${athlete.lastName}` }))]} />}
        {tab === 'results' && <><div className="grid gap-4 sm:grid-cols-2"><Input label="Event" required maxLength={80} value={form.event} onChange={event => setForm({ ...form, event: event.target.value })} placeholder="100m" /><Input label="Round" maxLength={60} value={form.round} onChange={event => setForm({ ...form, round: event.target.value })} placeholder="Final" /></div><div className="grid gap-4 sm:grid-cols-3"><Input label="Result" type="number" step="any" min="0.001" required value={form.resultValue} onChange={event => setForm({ ...form, resultValue: event.target.value })} /><Select label="Unit" value={form.unit} onChange={event => setForm({ ...form, unit: event.target.value })} options={['s', 'm', 'cm', 'points', 'reps', 'kg'].map(value => ({ value, label: value }))} /><Input label="Date" type="date" required value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></div><div className="grid gap-4 sm:grid-cols-3"><Input label="Wind (m/s)" type="number" step="0.1" value={form.wind} onChange={event => setForm({ ...form, wind: event.target.value })} /><Input label="Position" type="number" min="1" value={form.position} onChange={event => setForm({ ...form, position: event.target.value })} /><Select label="Meet level" value={form.level} onChange={event => setForm({ ...form, level: event.target.value })} options={['club', 'district', 'state', 'national', 'international'].map(value => ({ value, label: value }))} /></div></>}
        {tab === 'tests' && <><Input label="Test name" required maxLength={80} value={form.testType} onChange={event => setForm({ ...form, testType: event.target.value })} placeholder="30m flying sprint" /><div className="grid gap-4 sm:grid-cols-3"><Input label="Value" type="number" step="any" min="0.001" required value={form.value} onChange={event => setForm({ ...form, value: event.target.value })} /><Input label="Unit" required value={form.unit} onChange={event => setForm({ ...form, unit: event.target.value })} /><Input label="Date" type="date" required value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></div></>}
        {tab === 'goals' && <><div className="grid gap-4 sm:grid-cols-2"><Input label="Event / focus" required value={form.event} onChange={event => setForm({ ...form, event: event.target.value })} /><Input label="Target date" type="date" required value={form.targetDate} onChange={event => setForm({ ...form, targetDate: event.target.value })} /></div><div className="grid gap-4 sm:grid-cols-2"><Input label="Target" type="number" step="any" min="0.001" required value={form.targetValue} onChange={event => setForm({ ...form, targetValue: event.target.value })} /><Select label="Unit" value={form.unit} onChange={event => setForm({ ...form, unit: event.target.value })} options={['s', 'm', 'cm', 'points', 'reps', 'kg'].map(value => ({ value, label: value }))} /></div><label className="block text-sm text-text-secondary">Coach notes<textarea className="mt-1 min-h-16 w-full rounded-lg border border-border bg-cold-900 px-3 py-2 text-text-primary" value={form.coachNotes} onChange={event => setForm({ ...form, coachNotes: event.target.value })} /></label></>}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={saving}>Save</Button></div>
      </form></Modal>
    </div>
  );
}
