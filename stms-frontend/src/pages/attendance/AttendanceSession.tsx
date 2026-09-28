import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Avatar, AvatarGroup, Select, SelectOption } from '@/components/ui';
import { ArrowLeft, Check, X, Minus, Plus, QrCode, Download, Search, UserPlus, UserMinus, Camera, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const mockAthletes = [
  { id: '1', name: 'Priya Sharma', email: 'priya.sharma@aditya.edu', avatarUrl: null, status: 'present', method: 'qr' },
  { id: '2', name: 'Rahul Kumar', email: 'rahul.kumar@aditya.edu', avatarUrl: null, status: 'present', method: 'manual' },
  { id: '3', name: 'Amit Singh', email: 'amit.singh@aditya.edu', avatarUrl: null, status: 'absent', method: null },
  { id: '4', name: 'Sneha Patel', email: 'sneha.patel@aditya.edu', avatarUrl: null, status: 'late', method: 'qr' },
  { id: '5', name: 'Vikram Singh', email: 'vikram.singh@aditya.edu', avatarUrl: null, status: 'excused', method: 'manual' },
];

const statusOptions = [
  { value: 'present', label: 'Present', color: 'success' },
  { value: 'absent', label: 'Absent', color: 'danger' },
  { value: 'late', label: 'Late', color: 'gold' },
  { value: 'excused', label: 'Excused', color: 'primary' },
  { value: 'official_sports_leave', label: 'Sports Leave', color: 'gold' },
];

export function AttendanceSession() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { id } = React.useParams<{ id: string }>();
  const [search, setSearch] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');

  const mockSession = {
    id: '1',
    date: '2024-06-21',
    startTime: '06:00',
    endTime: '08:00',
    venue: 'Track A',
    type: 'training',
    linkedWorkoutId: '2',
  };

  const filteredAthletes = mockAthletes.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !filterStatus || a.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const presentCount = mockAthletes.filter(a => a.status === 'present').length;
  const absentCount = mockAthletes.filter(a => a.status === 'absent').length;
  const lateCount = mockAthletes.filter(a => a.status === 'late').length;
  const excusedCount = mockAthletes.filter(a => a.status === 'excused' || a.status === 'official_sports_leave').length;
  const totalCount = mockAthletes.length;
  const attendanceRate = Math.round((presentCount / totalCount) * 100);

  const updateStatus = (athleteId: string, status: string) => {
    console.log('Update status:', athleteId, status);
    // Call API
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/attendance')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-heading-lg font-bold text-surface-900 dark:text-surface-100">
            Session Attendance
          </h1>
          <p className="text-body text-surface-500 dark:text-surface-400">
            {new Date(mockSession.date).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} • {mockSession.startTime} - {mockSession.endTime} • {mockSession.venue}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<QrCode className="w-4 h-4" />}>Show QR Code</Button>
          <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>Export</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-sm text-surface-500 dark:text-surface-400">Present</p>
                <p className="text-heading-lg font-bold text-green-800 dark:text-green-200">{presentCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-sm text-surface-500 dark:text-surface-400">Absent</p>
                <p className="text-heading-lg font-bold text-danger-800 dark:text-danger-200">{absentCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
                <X className="w-6 h-6 text-danger-600 dark:text-danger-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-sm text-surface-500 dark:text-surface-400">Late</p>
                <p className="text-heading-lg font-bold text-gold-800 dark:text-gold-200">{lateCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-gold-600 dark:text-gold-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-sm text-surface-500 dark:text-surface-400">Excused</p>
                <p className="text-heading-lg font-bold text-primary-800 dark:text-primary-200">{excusedCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <UserMinus className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-sm text-surface-500 dark:text-surface-400">Rate</p>
                <p className="text-heading-lg font-bold text-surface-900 dark:text-surface-100">{attendanceRate}%</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                <Badge variant="primary">{attendanceRate}%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance List */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>Athletes ({filteredAthletes.length})</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Input placeholder="Search athletes..." leftIcon={<Search className="w-4 h-4" />} value={search} onChange={e => setSearch(e.target.value)} className="w-full sm:w-64" />
            <Select
              options={[{ value: '', label: 'All Status' }, ...statusOptions.map(s => ({ value: s.value, label: s.label }))]}
              placeholder="Filter by status"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full sm:w-48"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredAthletes.map(athlete => (
              <div key={athlete.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50">
                <Avatar size="md" name={athlete.name} src={athlete.avatarUrl} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-surface-900 dark:text-surface-100">{athlete.name}</p>
                  <p className="text-body-sm text-surface-500">{athlete.email}</p>
                </div>
                <Badge variant={statusOptions.find(s => s.value === athlete.status)?.color || 'neutral'} className="capitalize">
                  {athlete.status.replace('_', ' ')}
                </Badge>
                {hasPermission('attendance:write') && (
                  <select
                    value={athlete.status}
                    onChange={e => updateStatus(athlete.id, e.target.value)}
                    className="px-3 py-1.5 border border-surface-300 dark:border-surface-600 rounded-lg text-body-sm bg-white dark:bg-surface-800 focus:ring-2 focus:ring-primary-500"
                  >
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}