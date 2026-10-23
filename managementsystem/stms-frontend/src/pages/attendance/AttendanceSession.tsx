import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, QrCode, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, Button, Card, CardContent, Input } from '@/components/ui';
import { attendanceApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

type Attendee = { athleteId: string; name: string; email: string; status: string | null; method?: string | null; note?: string | null };

const STATUSES = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
  { value: 'excused', label: 'Excused' },
];

const activeTone: Record<string, string> = {
  present: 'border-success-500/40 bg-success-500/15 text-success-400',
  late: 'border-amber-500/40 bg-amber-500/15 text-amber-400',
  absent: 'border-danger-500/40 bg-danger-500/15 text-danger-400',
  excused: 'border-border bg-white/[0.08] text-text-primary',
};

const rowTone: Record<string, string> = {
  present: 'badge-success',
  late: 'badge-amber',
  absent: 'badge-danger',
  excused: 'badge-neutral',
};

export function AttendanceSession() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [rows, setRows] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [qrExpires, setQrExpires] = useState('');
  const canWrite = hasPermission('attendance:write');
  const open = canWrite && session && session.status !== 'completed' && session.status !== 'cancelled';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [detail, roster] = await Promise.all([attendanceApi.getSession(id), attendanceApi.getRoster(id)]);
      setSession(detail.session); setRows(roster.map((row: Attendee) => ({ ...row, status: row.status || '' })));
    } catch (error: any) { toast.error(error.message || 'Could not load this session'); setSession(null); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const setStatus = (athleteId: string, status: string) => setRows(previous => previous.map(row => row.athleteId === athleteId ? { ...row, status: row.status === status ? '' : status } : row));
  const save = async () => {
    const records = rows.filter(row => row.status).map(row => ({ athleteId: row.athleteId, status: row.status!, note: row.note || undefined }));
    if (!records.length) { toast.error('Choose a status for at least one athlete.'); return; }
    setSaving(true);
    try { await attendanceApi.mark(id, records); toast.success(`${records.length} attendance records saved`); await load(); }
    catch (error: any) { toast.error(error.message || 'Could not save attendance'); }
    finally { setSaving(false); }
  };

  const createQr = async () => {
    setQrLoading(true);
    try { const result = await attendanceApi.createQr(id); setQrUrl(result.checkInUrl); setQrExpires(result.expiresAt); toast.success('Check-in link created'); }
    catch (error: any) { toast.error(error.message || 'Could not create a check-in link'); }
    finally { setQrLoading(false); }
  };

  const copyQr = async () => { try { await navigator.clipboard.writeText(qrUrl); toast.success('Check-in link copied'); } catch { toast.error('Clipboard access is unavailable. Select and copy the link.'); } };

  if (loading) return <div className="py-20 text-center text-text-secondary" role="status">Loading session roster…</div>;
  if (!session) return <div className="mx-auto max-w-3xl py-16 text-center"><h1 className="text-xl font-semibold text-text-primary">Session unavailable</h1><p className="mt-2 text-text-secondary">This session may have been removed or belongs to another club.</p><Button className="mt-5" variant="outline" onClick={() => navigate('/attendance')}>Return to attendance</Button></div>;

  const marked = rows.filter(row => row.status).length;
  const percent = rows.length ? Math.round((marked / rows.length) * 100) : 0;
  const counts = STATUSES.reduce<Record<string, number>>((accumulator, status) => {
    accumulator[status.value] = rows.filter(row => row.status === status.value).length;
    return accumulator;
  }, {});
  const statusBadge = session.status === 'completed' ? 'badge-success' : session.status === 'cancelled' ? 'badge-danger' : 'badge-primary';

  return (
    <div className="page-shell">
      <Button variant="ghost" size="sm" className="-ml-2 self-start" onClick={() => navigate('/attendance')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
        All sessions
      </Button>

      <section className="surface p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="stat-label">Session roster</p>
              <span className={statusBadge}>{session.status.replace('_', ' ')}</span>
            </div>
            <h1 className="mt-1.5 font-display text-2xl uppercase leading-none tracking-[-0.01em] text-text-primary sm:text-3xl">
              {session.title}
            </h1>
            <p className="num mt-2 text-caption text-text-secondary">
              {session.date} · {session.startTime}–{session.endTime} · {session.venue}
            </p>
          </div>

          <div className="w-full sm:w-56 sm:shrink-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="stat-label">Marked</span>
              <span className="num text-body-sm text-text-primary">
                {marked}<span className="text-text-muted">/{rows.length}</span>
              </span>
            </div>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Athletes marked"
            >
              <div className="h-full rounded-full bg-volt transition-[width] duration-300" style={{ width: `${percent}%` }} />
            </div>
            <div className="num mt-2 flex flex-wrap gap-x-3 gap-y-1 text-micro text-text-muted">
              {STATUSES.map(status => (
                <span key={status.value}>{status.label} <span className="text-text-secondary">{counts[status.value]}</span></span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {open && (
        <Card padding="none">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-heading-sm font-semibold text-text-primary">Fast check-in</h2>
                <p className="mt-1 max-w-xl text-body-sm text-text-secondary">
                  Create an expiring link for signed-in athletes whose account is linked to this club roster.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {qrUrl && (
                  <Button variant="outline" onClick={() => void copyQr()} leftIcon={<Copy className="h-4 w-4" />}>
                    Copy link
                  </Button>
                )}
                <Button variant="outline" loading={qrLoading} onClick={() => void createQr()} leftIcon={<QrCode className="h-4 w-4" />}>
                  Create link
                </Button>
              </div>
            </div>

            {qrUrl && (
              <div className="mt-3">
                <label htmlFor="check-in-link" className="stat-label">
                  Expires <span className="num normal-case tracking-normal">{new Date(qrExpires).toLocaleTimeString()}</span>
                </label>
                <Input
                  id="check-in-link"
                  readOnly
                  value={qrUrl}
                  onFocus={event => event.currentTarget.select()}
                  className="num mt-1"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card padding="none">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="text-heading-sm font-semibold text-text-primary">Club roster</h2>
            {open && (
              <Button onClick={() => void save()} loading={saving} leftIcon={<Save className="h-4 w-4" />}>
                Save attendance
              </Button>
            )}
          </div>

          {rows.length === 0 ? (
            <p className="px-4 py-14 text-center text-body-sm text-text-muted">No active athlete profiles found for this club.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {rows.map(row => (
                <li key={row.athleteId} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={row.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-semibold text-text-primary">{row.name}</p>
                      <p className="truncate text-caption text-text-secondary">
                        {row.email}
                        {row.method ? ` · last recorded ${row.method.replace('_', ' ')}` : ''}
                      </p>
                    </div>
                  </div>

                  {open ? (
                    <div className="flex flex-wrap gap-1 sm:shrink-0" role="group" aria-label={`Attendance for ${row.name}`}>
                      {STATUSES.map(status => {
                        const selected = row.status === status.value;
                        return (
                          <button
                            key={status.value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setStatus(row.athleteId, status.value)}
                            className={`rounded-radius-sm border px-2.5 py-1 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/70 ${
                              selected ? activeTone[status.value] : 'border-border text-text-muted hover:border-white/20 hover:text-text-secondary'
                            }`}
                          >
                            {status.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <span className={rowTone[row.status || ''] || 'badge-neutral'}>{row.status || 'Not marked'}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {open && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await attendanceApi.updateSession(id, { status: 'completed' });
                toast.success('Session completed; unmarked athletes were set to absent.');
                await load();
              } catch (error: any) { toast.error(error.message || 'Could not complete session'); }
            }}
            leftIcon={<Check className="h-4 w-4" />}
          >
            Complete session
          </Button>
        </div>
      )}
    </div>
  );
}
