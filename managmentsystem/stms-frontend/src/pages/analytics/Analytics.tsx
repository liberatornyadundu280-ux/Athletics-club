import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent } from '@/components/ui';
import { analyticsApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const dateValue = (date: Date) => date.toISOString().slice(0, 10);
const csv = (rows: Record<string, unknown>[]) => {
  const headers = Object.keys(rows[0] || {});
  return [headers.join(','), ...rows.map(row => headers.map(key => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(','))].join('\r\n');
};

export function Analytics() {
  const { user, hasPermission } = useAuth();
  const athleteMode = user?.role === 'athlete';
  const [to, setTo] = useState(dateValue(new Date()));
  const [from, setFrom] = useState(dateValue(new Date(Date.now() - 29 * 86400000)));
  const [summary, setSummary] = useState<any>(null);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const canReport = hasPermission('analytics:report');
  const dailySeries = useMemo(() => {
    if (!summary?.attendance.series?.length) return [];
    const byDate = new Map(summary.attendance.series.map((item: any) => [item.date, item.rate]));
    const start = new Date(`${summary.from}T00:00:00`); const end = new Date(`${summary.to}T00:00:00`); const days: { date: string; rate: number }[] = [];
    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const key = dateValue(cursor); days.push({ date: key, rate: Number(byDate.get(key) || 0) });
    }
    return days;
  }, [summary]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [result, rows] = await Promise.all([analyticsApi.getSummary({ from, to }), canReport ? analyticsApi.getAthletes({ from, to }) : Promise.resolve([])]);
      setSummary(result); setAthletes(rows);
    } catch (error: any) { toast.error(error.message || 'Could not load analytics'); }
    finally { setLoading(false); }
  }, [from, to, canReport]);
  useEffect(() => { void load(); }, [load]);

  const exportCsv = () => {
    if (!summary) return;
    const rows = athletes.length ? athletes : [{ ...summary.attendance, activeAthletes: summary.activeAthletes, sessions: summary.sessions, workoutCompliance: summary.workouts.compliance, activeInjuries: summary.activeInjuries, activeGoals: summary.activeGoals }];
    const blob = new Blob([csv(rows)], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `stms-analytics-${from}-${to}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };

  const metrics = summary ? [
    ['Attendance rate', `${summary.attendance.rate}%`, `${summary.attendance.present + summary.attendance.late} attended`],
    ['Workout compliance', `${summary.workouts.compliance}%`, `${summary.workouts.completed}/${summary.workouts.assigned} completed`],
    [athleteMode ? 'Your profile' : 'Active athletes', String(summary.activeAthletes), `${summary.sessions} sessions in range`],
    ['Active injuries', String(summary.activeInjuries), `${summary.activeGoals} active goals`],
  ] : [];

  return <div className="mx-auto max-w-6xl space-y-6">
    <section className="surface-raised flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-sky-400">SPRINT 8 · CLUB REPORTS</p><h1 className="mt-2 text-3xl font-bold text-text-primary">Analytics</h1><p className="mt-2 text-text-secondary">Live summaries from attendance, workouts, performance, injuries, and goals.</p></div><div className="flex flex-wrap items-end gap-2"><label className="text-xs text-text-muted">From<input className="mt-1 block rounded-lg border border-border bg-cold-900 px-3 py-2 text-sm text-text-primary" type="date" value={from} max={to} onChange={event => setFrom(event.target.value)} /></label><label className="text-xs text-text-muted">To<input className="mt-1 block rounded-lg border border-border bg-cold-900 px-3 py-2 text-sm text-text-primary" type="date" value={to} min={from} max={dateValue(new Date())} onChange={event => setTo(event.target.value)} /></label><Button variant="outline" onClick={exportCsv} disabled={!summary} leftIcon={<Download className="h-4 w-4" />}>Export CSV</Button></div></section>
    {loading ? <div role="status" className="py-16 text-center text-text-secondary">Loading club reports…</div> : !summary ? <Card><CardContent className="py-16 text-center"><BarChart3 className="mx-auto h-10 w-10 text-text-muted"/><p className="mt-3 text-text-secondary">No report data is available yet.</p><Button className="mt-4" variant="outline" onClick={() => void load()} leftIcon={<RefreshCw className="h-4 w-4"/>}>Retry</Button></CardContent></Card> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, detail]) => <Card key={label}><CardContent className="p-5"><p className="text-sm text-text-muted">{label}</p><p className="mt-2 text-3xl font-bold text-text-primary">{value}</p><p className="mt-1 text-xs text-text-secondary">{detail}</p></CardContent></Card>)}</div>
      <div className="grid gap-6 lg:grid-cols-2"><Card><CardContent className="p-5"><h2 className="font-semibold text-text-primary">Attendance by day</h2><div className="mt-6 flex h-52 items-end gap-1 border-b border-border">{dailySeries.map(item => <div key={item.date} className="group relative flex h-full flex-1 items-end" title={`${item.date}: ${item.rate}%`}><div className="w-full rounded-t bg-sky-500/80" style={{ height: `${Math.max(item.rate, item.rate ? 4 : 0)}%` }} /></div>)}</div><div className="mt-2 flex justify-between text-xs text-text-muted"><span>{summary.from}</span><span>{summary.to}</span></div><div className="mt-4 flex flex-wrap gap-2">{Object.entries(summary.attendance).filter(([key]) => ['present', 'late', 'absent', 'excused'].includes(key)).map(([key, value]) => <Badge key={key} variant="neutral">{key}: {value as number}</Badge>)}</div></CardContent></Card>
      <Card><CardContent className="p-5"><h2 className="font-semibold text-text-primary">Performance & training</h2><div className="mt-5 grid grid-cols-2 gap-3">{[['Results recorded', summary.performance.total], ['Personal bests', summary.performance.personalBests], ['Season bests', summary.performance.seasonBests], ['Workouts assigned', summary.workouts.assigned]].map(([label, value]) => <div className="rounded-xl bg-cold-800 p-4" key={label}><p className="text-xs text-text-muted">{label}</p><p className="mt-1 text-2xl font-semibold text-text-primary">{value}</p></div>)}</div><p className="mt-4 text-xs text-text-muted">Date range: {summary.from} – {summary.to}</p></CardContent></Card></div>
      {canReport && <Card><CardContent className="p-5"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-sky-400"/><h2 className="font-semibold text-text-primary">Athlete overview</h2></div>{athletes.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="text-xs uppercase text-text-muted"><tr><th className="py-3">Athlete</th><th>Attendance</th><th>Records</th><th>Workout completion</th><th>Assignments</th></tr></thead><tbody>{athletes.map(row => <tr key={row.athleteId} className="border-t border-border"><td className="py-3 font-medium text-text-primary">{row.name}</td><td>{row.attendanceRate}%</td><td>{row.attendanceRecords}</td><td>{row.workoutCompliance}%</td><td>{row.workoutsAssigned}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-text-muted">No active athletes have report data in this date range.</p>}</CardContent></Card>}
    </>}
  </div>;
}
