import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, Badge, Avatar, AvatarGroup } from '@/components/ui';
import { Users, Dumbbell, Calendar, Activity, AlertTriangle, FileText, BarChart3, TrendingUp, Clock, Target } from 'lucide-react';
import { LoadingScreen } from '@/components/common/LoadingScreen';

const stats = [
  { label: 'Total Athletes', value: '42', icon: Users, color: 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200', trend: '+5 this month' },
  { label: 'Active Workouts', value: '18', icon: Dumbbell, color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200', trend: '+3 this week' },
  { label: 'Today\'s Sessions', value: '3', icon: Calendar, color: 'bg-gold-100 dark:bg-gold-900/30 text-gold-800 dark:text-gold-200', trend: '2 completed' },
  { label: 'Active Injuries', value: '2', icon: AlertTriangle, color: 'bg-danger-100 dark:bg-danger-900/30 text-danger-800 dark:text-danger-200', trend: '1 recovering' },
];

const recentActivity = [
  { id: '1', type: 'workout', title: 'Sprint Intervals assigned', athlete: 'Priya Sharma', time: '10 min ago', icon: Dumbbell, color: 'text-green-600' },
  { id: '2', type: 'attendance', title: 'Morning training completed', athlete: 'Full squad', time: '1 hour ago', icon: Calendar, color: 'text-primary-600' },
  { id: '3', type: 'performance', title: 'New PB: 100m - 11.42s', athlete: 'Rahul Kumar', time: '2 hours ago', icon: TrendingUp, color: 'text-gold-600' },
  { id: '4', type: 'injury', title: 'Ankle sprain - Grade 1', athlete: 'Amit Singh', time: '3 hours ago', icon: AlertTriangle, color: 'text-danger-600' },
  { id: '5', type: 'permission', title: 'Competition letter approved', athlete: 'Team - State Meet', time: '4 hours ago', icon: FileText, color: 'text-primary-600' },
];

const upcomingSessions = [
  { id: '1', time: '06:00 AM', title: 'Sprint Training', venue: 'Track A', type: 'training', athletes: 12 },
  { id: '2', time: '07:30 AM', title: 'Strength & Conditioning', venue: 'Gym', type: 'training', athletes: 8 },
  { id: '3', time: '04:00 PM', title: 'Team Meeting', venue: 'Conference Room', type: 'meeting', athletes: 20 },
];

export function Dashboard() {
  const { user, hasPermission } = useAuth();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-heading-lg font-bold text-surface-900 dark:text-surface-100">
            Dashboard
          </h1>
          <p className="text-body text-surface-500 dark:text-surface-400 mt-1">
            Welcome back, {user?.name?.split(' ')[0]}! Here's what's happening today.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body-sm text-surface-500 dark:text-surface-400">{stat.label}</p>
                  <p className="text-heading-lg font-bold text-surface-900 dark:text-surface-100 mt-1">{stat.value}</p>
                  <p className="text-caption text-surface-500 mt-1">{stat.trend}</p>
                </div>
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', `${activity.color} bg-opacity-10`)}>
                    <activity.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium text-surface-900 dark:text-surface-100">{activity.title}</p>
                    <p className="text-body-sm text-surface-500">{activity.athlete}</p>
                  </div>
                  <span className="text-caption text-surface-400">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Upcoming Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingSessions.map((session) => (
                  <div key={session.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-primary-800 dark:text-primary-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-medium text-surface-900 dark:text-surface-100">{session.title}</p>
                      <p className="text-body-sm text-surface-500">{session.venue} • {session.athletes} athletes</p>
                    </div>
                    <div className="text-right">
                      <p className="text-heading-sm font-semibold text-surface-900 dark:text-surface-100">{session.time}</p>
                      <Badge variant="neutral" size="sm">{session.type}</Badge>
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <button className="text-body text-primary-800 hover:text-primary-700 font-medium w-full text-left">
                    View all sessions →
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <button className="card-hover p-4 text-left group">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Dumbbell className="w-5 h-5 text-primary-800 dark:text-primary-200" />
                  </div>
                  <p className="text-body font-medium text-surface-900 dark:text-surface-100">Create Workout</p>
                  <p className="text-body-sm text-surface-500">Build new training session</p>
                </button>
                <button className="card-hover p-4 text-left group">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Calendar className="w-5 h-5 text-green-800 dark:text-green-200" />
                  </div>
                  <p className="text-body font-medium text-surface-900 dark:text-surface-100">Mark Attendance</p>
                  <p className="text-body-sm text-surface-500">Record today's session</p>
                </button>
                <button className="card-hover p-4 text-left group">
                  <div className="w-10 h-10 rounded-lg bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Activity className="w-5 h-5 text-gold-800 dark:text-gold-200" />
                  </div>
                  <p className="text-body font-medium text-surface-900 dark:text-surface-100">Log Performance</p>
                  <p className="text-body-sm text-surface-500">Record competition results</p>
                </button>
                <button className="card-hover p-4 text-left group">
                  <div className="w-10 h-10 rounded-lg bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <AlertTriangle className="w-5 h-5 text-danger-800 dark:text-danger-200" />
                  </div>
                  <p className="text-body font-medium text-surface-900 dark:text-surface-100">Report Injury</p>
                  <p className="text-body-sm text-surface-500">Log new injury or update</p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Team Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Team at a Glance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-body-sm text-surface-500">Attendance Rate</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: '87%' }} />
                    </div>
                    <span className="text-body-sm font-medium text-primary-800">87%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body-sm text-surface-500">Workout Compliance</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '92%' }} />
                    </div>
                    <span className="text-body-sm font-medium text-green-800">92%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body-sm text-surface-500">Active Injuries</span>
                  <Badge variant="danger">2</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body-sm text-surface-500">Pending Permissions</span>
                  <Badge variant="gold">3</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}