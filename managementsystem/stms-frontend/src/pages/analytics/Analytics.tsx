import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, EmptyState, Input, PageHeader } from '@/components/ui';
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
    { label: 'Attendance rate', value: summary.attendance.rate, unit: '%', hint: `${summary.attendance.present + summary.attendance.late} attended` },
    { label: 'Workout compliance', value: summary.workouts.compliance, unit: '%', hint: `${summary.workouts.completed}/${summary.workouts.assigned} completed` },
    { label: athleteMode ? 'Your profile' : 'Active athletes', value: summary.activeAthletes, unit: '', hint: `${summary.sessions} sessions in range` },
    { label: 'Active injuries', value: summary.activeInjuries, unit: '', hint: `${summary.activeGoals} active goals` },
  ] : [];

  const maxRate = Math.max(...dailySeries.map(item => item.rate), 1);

  return (
    <div className="page-shell">
      <PageHeader
        title="Analytics"
        description="Live summaries from attendance, workouts, performance, injuries and goals."
        meta={
          summary && (
            <span className="num">
              {summary.from} → {summary.to}
            </span>
          )
        }
        actions={
          <>
            <Input
              label="From"
              type="date"
              value={from}
              max={to}
              onChange={event => setFrom(event.target.value)}
              className="w-[150px]"
            />
            <Input
              label="To"
              type="date"
              value={to}
              min={from}
              max={dateValue(new Date())}
              onChange={event => setTo(event.target.value)}
              className="w-[150px]"
            />
            <Button variant="outline" onClick={exportCsv} disabled={!summary} leftIcon={<Download className="h-4 w-4" />}>
              Export CSV
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map(item => (
              <div key={item} className="surface space-y-3 p-4">
                <div className="skeleton h-3 w-1/2" />
                <div className="skeleton h-7 w-1/3" />
                <div className="skeleton h-3 w-2/3" />
              </div>
            ))}
          </div>
          <div className="surface h-64 animate-pulse" />
        </div>
      ) : !summary ? (
        <Card padding="none">
          <EmptyState
            icon={<BarChart3 className="h-5 w-5" />}
            title="No report data yet"
            description="Once sessions and results are recorded, this range will fill in."
            action={
              <Button variant="outline" onClick={() => void load()} leftIcon={<RefreshCw className="h-4 w-4" />}>
                Retry
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Club summary">
            {metrics.map(metric => (
              <div key={metric.label} className="surface p-4">
                <p className="stat-label">{metric.label}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="num text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-text-primary">
                    {metric.value}
                  </span>
                  {metric.unit && <span className="text-body-sm font-medium text-text-muted">{metric.unit}</span>}
                </div>
                <p className="mt-1.5 text-caption text-text-muted">{metric.hint}</p>
              </div>
            ))}
          </section>

          <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr]">
            <Card padding="none">
              <CardContent className="p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-heading-sm font-semibold text-text-primary">Attendance by day</h2>
                  <span className="num text-caption text-text-muted">{dailySeries.length} days</span>
                </div>

                <div className="mt-5 flex h-52 items-end gap-[3px] border-b border-border pb-px" role="img" aria-label="Daily attendance rate">
                  {dailySeries.map(item => (
                    <div
                      key={item.date}
                      className="group relative flex h-full flex-1 items-end"
                      title={`${item.date}: ${item.rate}%`}
                    >
                      <div
                        className={`w-full rounded-t-sm transition-colors ${
                          item.rate ? 'bg-volt/70 group-hover:bg-volt' : 'bg-white/[0.06]'
                        }`}
                        style={{ height: `${item.rate ? Math.max((item.rate / maxRate) * 100, 4) : 2}%` }}
                      />
                    </div>
                  ))}
                </div>

                <div className="num mt-2 flex justify-between text-micro text-text-muted">
                  <span>{dailySeries[0]?.date || summary.from}</span>
                  <span>{dailySeries[dailySeries.length - 1]?.date || summary.to}</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {Object.entries(summary.attendance)
                    .filter(([key]) => ['present', 'late', 'absent', 'excused'].includes(key))
                    .map(([key, value]) => (
                      <span key={key} className="rounded border border-border px-2 py-0.5 text-micro capitalize text-text-secondary">
                        {key} <span className="num text-text-primary">{value as number}</span>
                      </span>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card padding="none">
              <CardContent className="p-4">
                <h2 className="text-heading-sm font-semibold text-text-primary">Performance &amp; training</h2>
                <dl className="mt-4 grid grid-cols-2 gap-2">
                  {[
                    ['Results recorded', summary.performance.total],
                    ['Personal bests', summary.performance.personalBests],
                    ['Season bests', summary.performance.seasonBests],
                    ['Workouts assigned', summary.workouts.assigned],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-radius-md border border-border bg-ink/40 p-3">
                      <dt className="text-micro uppercase tracking-[0.1em] text-text-muted">{label}</dt>
                      <dd className="num mt-1 text-xl font-semibold text-text-primary">{value as number}</dd>
                    </div>
                  ))}
                </dl>
                <p className="num mt-4 text-caption text-text-muted">
                  {summary.from} – {summary.to}
                </p>
              </CardContent>
            </Card>
          </div>

          {canReport && (
            <Card padding="none">
              <CardContent className="p-0">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <Users className="h-4 w-4 text-volt" aria-hidden="true" />
                  <h2 className="text-heading-sm font-semibold text-text-primary">Athlete overview</h2>
                </div>
                {athletes.length ? (
                  <div className="overflow-x-auto">
                    <table className="data-table min-w-[560px]">
                      <thead>
                        <tr>
                          <th>Athlete</th>
                          <th className="text-right">Attendance</th>
                          <th className="text-right">Records</th>
                          <th className="text-right">Workout completion</th>
                          <th className="text-right">Assignments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {athletes.map(row => (
                          <tr key={row.athleteId}>
                            <td className="font-medium text-text-primary">{row.name}</td>
                            <td className="num text-right">
                              <span className={row.attendanceRate >= 75 ? 'text-success-400' : 'text-amber-400'}>
                                {row.attendanceRate}%
                              </span>
                            </td>
                            <td className="num text-right text-text-secondary">{row.attendanceRecords}</td>
                            <td className="num text-right text-text-secondary">{row.workoutCompliance}%</td>
                            <td className="num text-right text-text-secondary">{row.workoutsAssigned}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="px-4 py-8 text-center text-body-sm text-text-muted">
                    No active athletes have report data in this date range.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
