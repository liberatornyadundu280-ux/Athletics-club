import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Select, SelectOption } from '@/components/ui';
import { TrendingUp, Users, Dumbbell, Calendar, Target, BarChart3, Download, Filter, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/helpers';

const metricCards = [
  { label: 'Attendance Rate', value: '87%', trend: '+2%', trendUp: true, icon: Calendar, color: 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200' },
  { label: 'Workout Compliance', value: '92%', trend: '+1%', trendUp: true, icon: Dumbbell, color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' },
  { label: 'Active Athletes', value: '42', trend: '+5', trendUp: true, icon: Users, color: 'bg-gold-100 dark:bg-gold-900/30 text-gold-800 dark:text-gold-200' },
  { label: 'Avg. Session Duration', value: '85 min', trend: '-3 min', trendUp: false, icon: Clock, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200' },
];

export function Analytics() {
  const { user, hasRole } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-heading-lg font-bold text-surface-900 dark:text-surface-100">Analytics</h1>
          <p className="text-body text-surface-500 dark:text-surface-400 mt-1">Track team performance and engagement metrics</p>
        </div>
        <div className="flex gap-2">
          <Select options={[
            { value: 'week', label: 'This Week' },
            { value: 'month', label: 'This Month' },
            { value: 'season', label: 'This Season' },
            { value: 'custom', label: 'Custom Range' },
          ]} placeholder="Time Range" className="w-40" />
          <button className="btn btn-outline"><Download className="w-4 h-4" /> Export</button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric, index) => (
          <Card key={index} className="hover:shadow-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body-sm text-surface-500 dark:text-surface-400">{metric.label}</p>
                  <p className="text-heading-lg font-bold text-surface-900 dark:text-surface-100 mt-1">{metric.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {metric.trendUp ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingUp className="w-4 h-4 text-danger-600 rotate-180" />}
                    <span className={cn('text-caption font-medium', metric.trendUp ? 'text-green-600' : 'text-danger-600')}>{metric.trend}</span>
                    <span className="text-caption text-surface-500">vs last period</span>
                  </div>
                </div>
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', metric.color)}>
                  <metric.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attendance Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-around gap-2 px-4">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-primary-500 rounded-t" style={{ height: `${[75, 82, 88, 90, 85, 70, 45][i]}%` }} />
                  <span className="text-caption text-surface-500">{day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Workout Compliance */}
        <Card>
          <CardHeader>
            <CardTitle>Workout Compliance by Athlete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Priya Sharma', compliance: 98 },
                { name: 'Rahul Kumar', compliance: 95 },
                { name: 'Amit Singh', compliance: 72 },
                { name: 'Sneha Patel', compliance: 88 },
                { name: 'Vikram Singh', compliance: 65 },
              ].map((athlete, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-32 text-right text-body-sm text-surface-600 dark:text-surface-400">{athlete.name}</div>
                  <div className="flex-1 h-4 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${athlete.compliance}%` }} />
                  </div>
                  <span className="w-12 text-right font-medium text-surface-900 dark:text-surface-100">{athlete.compliance}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Trends */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Performance Progression</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-around gap-2 px-4">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, i) => (
                <div key={month} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-primary-500/20 rounded-t" style={{ height: `${[30, 45, 55, 65, 75, 85][i]}%` }}>
                    <div className="h-full bg-primary-500 rounded-t" style={{ height: `${[25, 40, 50, 60, 70, 80][i]}%` }} />
                  </div>
                  <span className="text-caption text-surface-500">{month}</span>
                </div>
              ))}
            </div>
            <p className="text-caption text-surface-500 text-center mt-4">100m Sprint PB Progression (seconds)</p>
          </CardContent>
        </Card>

        {/* Injury Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Injury Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="text-center p-4 rounded-lg bg-danger-50 dark:bg-danger-900/20">
                <p className="text-heading-lg font-bold text-danger-800 dark:text-danger-200">2</p>
                <p className="text-body-sm text-surface-500">Active Injuries</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-gold-50 dark:bg-gold-900/20">
                <p className="text-heading-lg font-bold text-gold-800 dark:text-gold-200">5</p>
                <p className="text-body-sm text-surface-500">This Season</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                <p className="text-heading-lg font-bold text-green-800 dark:text-green-200">12</p>
                <p className="text-body-sm text-surface-500">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goals Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Goals Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { event: '100m', athlete: 'Priya Sharma', target: '11.70s', current: '11.82s', progress: 70 },
                { event: '400m', athlete: 'Rahul Kumar', target: '46.50s', current: '47.82s', progress: 45 },
                { event: 'Long Jump', athlete: 'Amit Singh', target: '7.60m', current: '7.45m', progress: 85 },
              ].map((goal, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{goal.event} - {goal.athlete}</p>
                      <p className="text-body-sm text-surface-500">Target: {goal.target} • Current: {goal.current}</p>
                    </div>
                    <Badge variant={goal.progress >= 80 ? 'success' : goal.progress >= 50 ? 'gold' : 'primary'}>{goal.progress}%</Badge>
                  </div>
                  <div className="h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${goal.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}