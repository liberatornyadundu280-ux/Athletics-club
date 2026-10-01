import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, QrCode, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent, Select } from '@/components/ui';
import { attendanceApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

type Attendee = { athleteId: string; name: string; email: string; status: string | null; method?: string | null; note?: string | null };

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [detail, roster] = await Promise.all([attendanceApi.getSession(id), attendanceApi.getRoster(id)]);
      setSession(detail.session); setRows(roster.map((row: Attendee) => ({ ...row, status: row.status || '' })));
    } catch (error: any) { toast.error(error.message || 'Could not load this session'); setSession(null); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const setStatus = (athleteId: string, status: string) => setRows(previous => previous.map(row => row.athleteId === athleteId ? { ...row, status } : row));
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
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/attendance')} leftIcon={<ArrowLeft className="h-4 w-4" />}>All sessions</Button>
      <section className="surface-raised relative overflow-hidden p-6 sm:p-8"><div className="absolute right-0 top-0 h-full w-1.5 bg-gradient-to-b from-sky-400 via-sky-500 to-amber-400" /><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold text-sky-400">ATTENDANCE ROSTER</p><h1 className="mt-2 text-3xl font-bold text-text-primary">{session.title}</h1><p className="mt-2 text-text-secondary">{session.date} · {session.startTime}–{session.endTime} · {session.venue}</p></div><Badge variant={session.status === 'completed' ? 'success' : session.status === 'cancelled' ? 'danger' : 'primary'}>{session.status.replace('_', ' ')}</Badge></div></section>

      {canWrite && session.status !== 'completed' && session.status !== 'cancelled' && <Card><CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-text-primary">Fast check-in</h2><p className="mt-1 text-sm text-text-secondary">Create an expiring link for signed-in athletes whose account is linked to this club roster.</p>{qrUrl && <div className="mt-3"><label htmlFor="check-in-link" className="text-xs text-text-muted">Link expires {new Date(qrExpires).toLocaleTimeString()}</label><input id="check-in-link" readOnly value={qrUrl} onFocus={event => event.currentTarget.select()} className="mt-1 w-full rounded-lg border border-border bg-cold-900 px-3 py-2 text-sm text-text-primary" /></div>}</div><div className="flex shrink-0 gap-2">{qrUrl && <Button variant="outline" onClick={() => void copyQr()} leftIcon={<Copy className="h-4 w-4" />}>Copy link</Button>}<Button variant="outline" loading={qrLoading} onClick={() => void createQr()} leftIcon={<QrCode className="h-4 w-4" />}>Create check-in link</Button></div></CardContent></Card>}

      <Card><CardContent className="p-0"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><div><h2 className="font-semibold text-text-primary">Club roster</h2><p className="mt-1 text-sm text-text-secondary">{marked} of {rows.length} marked</p></div>{canWrite && session.status !== 'completed' && <Button onClick={() => void save()} loading={saving} leftIcon={<Save className="h-4 w-4" />}>Save attendance</Button>}</div>
        {rows.length === 0 ? <div className="py-16 text-center text-text-secondary">No active athlete profiles found for this club.</div> : <div className="divide-y divide-border">{rows.map(row => <div key={row.athleteId} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="font-medium text-text-primary">{row.name}</p><p className="mt-1 text-sm text-text-secondary">{row.email}{row.method ? ` · Last recorded ${row.method.replace('_', ' ')}` : ''}</p></div>{canWrite && session.status !== 'completed' ? <Select aria-label={`Attendance for ${row.name}`} value={row.status || ''} onChange={event => setStatus(row.athleteId, event.target.value)} options={[{ value: '', label: 'Not marked' }, { value: 'present', label: 'Present' }, { value: 'late', label: 'Late' }, { value: 'absent', label: 'Absent' }, { value: 'excused', label: 'Excused' }]} /> : <Badge variant={row.status === 'present' ? 'success' : row.status === 'absent' ? 'danger' : 'neutral'}>{row.status || 'Not marked'}</Badge>}</div>)}</div>}
      </CardContent></Card>

      {canWrite && session.status !== 'completed' && session.status !== 'cancelled' && <div className="flex justify-end"><Button variant="outline" onClick={async () => { try { await attendanceApi.updateSession(id, { status: 'completed' }); toast.success('Session completed; unmarked athletes were set to absent.'); await load(); } catch (error: any) { toast.error(error.message || 'Could not complete session'); } }} leftIcon={<Check className="h-4 w-4" />}>Complete session</Button></div>}
    </div>
  );
}
