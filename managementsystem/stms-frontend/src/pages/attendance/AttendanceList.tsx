import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, ClipboardCheck, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent, Input, Modal, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { attendanceApi } from '@/services/api';

type Session = { id: string; title: string; date: string; startTime: string; endTime: string; venue: string; type: string; status: string };
const today = () => new Date().toISOString().slice(0, 10);

export function AttendanceList() {
  const { hasPermission } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [form, setForm] = useState({ title: '', date: today(), startTime: '06:00', endTime: '08:00', venue: '', type: 'training' });
  const [summary, setSummary] = useState<any>(null);
  const canWrite = hasPermission('attendance:write');
  const canReport = hasPermission('attendance:report');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [result, summaryResult] = await Promise.all([
        attendanceApi.getSessions({ page, limit: 20 }),
        canReport ? attendanceApi.getSummary({ from: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10), to: today() }) : Promise.resolve(null),
      ]);
      setSessions(result.data || []); setTotalPages(result.meta?.totalPages || 1); setSummary(summaryResult);
    } catch (cause: any) { setError(cause.message || 'Could not load attendance sessions'); setSessions([]); }
    finally { setLoading(false); }
  }, [page, canReport]);

  useEffect(() => { void load(); }, [load]);

  const createSession = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      await attendanceApi.createSession(form);
      toast.success('Training session created'); setModalOpen(false);
      setForm({ title: '', date: today(), startTime: '06:00', endTime: '08:00', venue: '', type: 'training' });
      await load();
    } catch (cause: any) { toast.error(cause.message || 'Could not create this session'); }
    finally { setSaving(false); }
  };

  const statusVariant = (status: string) => status === 'completed' ? 'success' : status === 'in_progress' ? 'primary' : status === 'cancelled' ? 'danger' : 'neutral';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="surface-raised relative overflow-hidden p-6 sm:p-8">
        <div className="absolute right-0 top-0 h-full w-1.5 bg-gradient-to-b from-sky-400 via-sky-500 to-amber-400" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-sky-400">SPRINT 3 · TEAM CHECK-INS</p><h1 className="mt-2 text-3xl font-bold text-text-primary">Attendance</h1><p className="mt-2 max-w-xl text-text-secondary">Schedule training, record who attended, and keep a reliable session history.</p></div>{canWrite && <Button onClick={() => setModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>Create session</Button>}</div>
      </section>

      {summary && <div className="grid gap-3 sm:grid-cols-4">{[
        ['Sessions · 30 days', summary.sessionCount], ['Attendance rate', `${summary.attendanceRate}%`], ['Present or late', summary.present + summary.late], ['Excused', summary.excused],
      ].map(([label, value]) => <Card key={label}><CardContent className="p-4"><p className="text-sm text-text-secondary">{label}</p><p className="mt-1 text-2xl font-bold text-text-primary">{value}</p></CardContent></Card>)}</div>}

      <Card><CardContent className="p-0"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-semibold text-text-primary">Training sessions</h2><p className="mt-1 text-sm text-text-secondary">{loading ? 'Loading sessions…' : `${sessions.length} on this page`}</p></div><CalendarDays className="h-5 w-5 text-sky-400" /></div>
        {loading ? <div role="status" className="py-16 text-center text-text-secondary">Loading session schedule…</div> : error ? <div className="py-14 text-center"><p role="alert" className="text-text-primary">{error}</p><Button className="mt-4" variant="outline" onClick={() => void load()}>Try again</Button></div> : sessions.length === 0 ? <div className="px-6 py-16 text-center"><ClipboardCheck className="mx-auto h-10 w-10 text-text-muted" /><h3 className="mt-4 font-semibold text-text-primary">No sessions scheduled</h3><p className="mt-2 text-sm text-text-secondary">Create your first session to start a club attendance record.</p>{canWrite && <Button className="mt-5" onClick={() => setModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>Create session</Button>}</div> : <div className="divide-y divide-border">{sessions.map(session => <div key={session.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-text-primary">{session.title}</h3><Badge variant={statusVariant(session.status)}>{session.status.replace('_', ' ')}</Badge></div><p className="mt-1 text-sm text-text-secondary">{new Date(`${session.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} · {session.startTime}–{session.endTime} · {session.venue}</p></div><Link to={`/attendance/session/${session.id}`} className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-sky-400 hover:text-sky-300">{canWrite ? 'Take attendance' : 'View attendance'} <ArrowRight className="h-4 w-4" /></Link></div>)}</div>}
        {!loading && totalPages > 1 && <div className="flex items-center justify-between border-t border-border px-5 py-4"><span className="text-sm text-text-secondary">Page {page} of {totalPages}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(value => value + 1)}>Next</Button></div></div>}
      </CardContent></Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create a training session" description="Set the time and place; you can record the roster after saving." size="md">
        <form onSubmit={createSession} className="space-y-4"><Input label="Session name" value={form.title} required maxLength={120} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Track practice" /><div className="grid gap-4 sm:grid-cols-2"><Input label="Date" type="date" value={form.date} required onChange={event => setForm({ ...form, date: event.target.value })} /><Select label="Session type" value={form.type} onChange={event => setForm({ ...form, type: event.target.value })} options={[{ value: 'training', label: 'Training' }, { value: 'competition', label: 'Competition' }, { value: 'meeting', label: 'Meeting' }, { value: 'testing', label: 'Testing' }]} /></div><div className="grid gap-4 sm:grid-cols-2"><Input label="Starts" type="time" value={form.startTime} required onChange={event => setForm({ ...form, startTime: event.target.value })} /><Input label="Ends" type="time" value={form.endTime} required onChange={event => setForm({ ...form, endTime: event.target.value })} /></div><Input label="Venue" value={form.venue} required maxLength={160} onChange={event => setForm({ ...form, venue: event.target.value })} placeholder="Main track" /><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button><Button type="submit" loading={saving}>Create session</Button></div></form>
      </Modal>
    </div>
  );
}
