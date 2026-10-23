import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, ClipboardCheck, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Card, CardContent, EmptyState, Input, Modal, PageHeader, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { attendanceApi } from '@/services/api';

type Session = { id: string; title: string; date: string; startTime: string; endTime: string; venue: string; type: string; status: string };
const today = () => new Date().toISOString().slice(0, 10);

const statusBadge: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'badge-neutral' },
  in_progress: { label: 'Live', className: 'badge-primary' },
  completed: { label: 'Done', className: 'badge-success' },
  cancelled: { label: 'Cancelled', className: 'badge-danger' },
};

function dateParts(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return {
    day: date.toLocaleDateString('en-GB', { day: '2-digit' }),
    month: date.toLocaleDateString('en-GB', { month: 'short' }),
    weekday: date.toLocaleDateString('en-GB', { weekday: 'short' }),
  };
}

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

  const stats = summary
    ? [
        { label: 'Sessions · 30 days', value: summary.sessionCount, unit: '', hint: 'scheduled or completed' },
        { label: 'Attendance rate', value: summary.attendanceRate, unit: '%', hint: 'present, late or excused' },
        { label: 'Present or late', value: (summary.present || 0) + (summary.late || 0), unit: '', hint: 'athlete check-ins' },
        { label: 'Excused', value: summary.excused, unit: '', hint: 'approved absences' },
      ]
    : [];

  return (
    <div className="page-shell">
      <PageHeader
        title="Attendance"
        description="Schedule training, record who attended, and keep a reliable session history."
        meta={
          <span className="inline-flex items-baseline gap-1.5">
            <span className="num text-text-secondary">{sessions.length}</span> sessions on this page
          </span>
        }
        actions={
          canWrite && (
            <Button onClick={() => setModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Create session
            </Button>
          )
        }
      />

      {stats.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Attendance summary">
          {stats.map(stat => (
            <div key={stat.label} className="surface p-4">
              <p className="stat-label">{stat.label}</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="num text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-text-primary">
                  {stat.value ?? 0}
                </span>
                {stat.unit && <span className="text-body-sm font-medium text-text-muted">{stat.unit}</span>}
              </div>
              <p className="mt-1.5 text-caption text-text-muted">{stat.hint}</p>
            </div>
          ))}
        </section>
      )}

      <Card padding="none">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-volt" aria-hidden="true" />
              <h2 className="text-heading-sm font-semibold text-text-primary">Training sessions</h2>
            </div>
            <span className="num text-caption text-text-muted">Page {page} of {totalPages}</span>
          </div>

          {loading ? (
            <div className="divide-y divide-border/60" role="status" aria-label="Loading session schedule">
              {[0, 1, 2, 3].map(row => (
                <div key={row} className="flex items-center gap-4 px-4 py-4">
                  <div className="skeleton h-10 w-12" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3.5 w-1/3" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <EmptyState
              icon={<CalendarDays className="h-5 w-5" />}
              title="The schedule could not be loaded"
              description={error}
              action={<Button variant="outline" onClick={() => void load()}>Try again</Button>}
            />
          ) : sessions.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck className="h-5 w-5" />}
              title="No sessions scheduled"
              description="Create your first session to start a club attendance record."
              action={
                canWrite && (
                  <Button onClick={() => setModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
                    Create session
                  </Button>
                )
              }
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {sessions.map(session => {
                const badge = statusBadge[session.status] || statusBadge.scheduled;
                const parts = dateParts(session.date);
                return (
                  <li key={session.id}>
                    <div className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-white/[0.02]">
                      <div className="w-12 shrink-0 text-center">
                        <p className="num text-body-sm font-semibold text-text-primary">{parts.day}</p>
                        <p className="text-micro uppercase tracking-[0.08em] text-text-muted">{parts.month}</p>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-body-sm font-semibold text-text-primary">{session.title}</h3>
                          <span className={badge.className}>{badge.label}</span>
                        </div>
                        <p className="mt-0.5 truncate text-caption text-text-secondary">
                          <span className="num">{session.startTime}–{session.endTime}</span> · {session.venue} ·{' '}
                          <span className="capitalize">{session.type}</span>
                        </p>
                      </div>

                      <Link
                        to={`/attendance/session/${session.id}`}
                        className="btn btn-ghost btn-sm shrink-0 text-volt hover:text-volt-deep"
                      >
                        <span className="hidden sm:inline">{canWrite ? 'Take attendance' : 'View'}</span>
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {!loading && !error && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <span className="num text-caption text-text-muted">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(value => value + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create a training session"
        description="Set the time and place; you can record the roster after saving."
        size="md"
      >
        <form onSubmit={createSession} className="space-y-4">
          <Input
            label="Session name"
            value={form.title}
            required
            maxLength={120}
            onChange={event => setForm({ ...form, title: event.target.value })}
            placeholder="Track practice"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Date" type="date" value={form.date} required onChange={event => setForm({ ...form, date: event.target.value })} />
            <Select
              label="Session type"
              value={form.type}
              onChange={event => setForm({ ...form, type: event.target.value })}
              options={[
                { value: 'training', label: 'Training' },
                { value: 'competition', label: 'Competition' },
                { value: 'meeting', label: 'Meeting' },
                { value: 'testing', label: 'Testing' },
              ]}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Starts" type="time" value={form.startTime} required onChange={event => setForm({ ...form, startTime: event.target.value })} />
            <Input label="Ends" type="time" value={form.endTime} required onChange={event => setForm({ ...form, endTime: event.target.value })} />
          </div>
          <Input
            label="Venue"
            value={form.venue}
            required
            maxLength={160}
            onChange={event => setForm({ ...form, venue: event.target.value })}
            placeholder="Main track"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create session</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
