import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, Select, SelectOption } from '@/components/ui';
import { Plus, Search, Filter, Download, Calendar, QrCode, Users, Clock } from 'lucide-react';
import { Table, Column, Pagination } from '@/components/ui/Table';
import { useAuth } from '@/context/AuthContext';
import { Session } from '@/types';

const mockSessions: Session[] = [
  { id: '1', clubId: '1', date: '2024-06-20', startTime: '06:00', endTime: '08:00', venue: 'Track A', type: 'training', linkedWorkoutId: '1', status: 'completed', createdBy: 'u1', createdAt: '2024-06-19', updatedAt: '2024-06-19' },
  { id: '2', clubId: '1', date: '2024-06-21', startTime: '06:00', endTime: '08:00', venue: 'Track A', type: 'training', linkedWorkoutId: '2', status: 'scheduled', createdBy: 'u1', createdAt: '2024-06-19', updatedAt: '2024-06-19' },
  { id: '3', clubId: '1', date: '2024-06-22', startTime: '07:00', endTime: '09:00', venue: 'Gym', type: 'training', linkedWorkoutId: '3', status: 'scheduled', createdBy: 'u1', createdAt: '2024-06-19', updatedAt: '2024-06-19' },
];

const columns: Column<Session>[] = [
  { key: 'date', header: 'Date', accessor: 'date', render: (_, d) => <span className="font-medium">{new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</span> },
  { key: 'time', header: 'Time', accessor: (s) => `${s.startTime} - ${s.endTime}` },
  { key: 'venue', header: 'Venue', accessor: 'venue' },
  { key: 'type', header: 'Type', accessor: 'type', render: (_, t) => <Badge variant={t === 'training' ? 'primary' : t === 'competition' ? 'gold' : 'neutral'}>{t}</Badge> },
  { key: 'workout', header: 'Workout', accessor: 'linkedWorkoutId', render: (_, w) => w ? <Badge variant="neutral" size="sm">Workout #{w}</Badge> : <span className="text-surface-400">—</span> },
  { key: 'status', header: 'Status', accessor: 'status', render: (_, s) => <Badge variant={s === 'completed' ? 'success' : s === 'in_progress' ? 'primary' : s === 'cancelled' ? 'danger' : 'neutral'}>{s}</Badge> },
  { key: 'actions', header: 'Actions', render: (s) => <div className="flex gap-1"><Button variant="ghost" size="sm" leftIcon={<QrCode className="w-4 h-4" />} aria-label="Show QR">QR</Button><Button variant="ghost" size="sm" leftIcon={<Users className="w-4 h-4" />} aria-label="View attendance">View</Button></div> },
];

const typeOptions: SelectOption[] = [
  { value: '', label: 'All Types' },
  { value: 'training', label: 'Training' },
  { value: 'competition', label: 'Competition' },
  { value: 'meeting', label: 'Meeting' },
];

const statusOptions: SelectOption[] = [
  { value: '', label: 'All Status' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function AttendanceList() {
  const { hasPermission } = useAuth();
  const [page, setPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [selectedDate, setSelectedDate] = React.useState('');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-heading-lg font-bold text-surface-900 dark:text-surface-100">Attendance</h1>
          <p className="text-body text-surface-500 dark:text-surface-400 mt-1">Manage training sessions and attendance records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<Calendar className="w-4 h-4" />}>Calendar View</Button>
          {hasPermission('attendance:write') && (
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => {}}>
              Create Session
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>Training Sessions</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Input placeholder="Search sessions..." leftIcon={<Search className="w-4 h-4" />} className="w-full sm:w-64" />
            <Select options={typeOptions} placeholder="Type" className="w-full sm:w-36" />
            <Select options={statusOptions} placeholder="Status" className="w-full sm:w-36" />
            <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>Export</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table
            columns={columns}
            data={mockSessions}
            keyExtractor={(s) => s.id}
            sortable
            defaultSortKey="date"
            defaultSortDirection="desc"
            selectable
            emptyMessage="No sessions found. Create your first training session!"
          />
          <Pagination currentPage={page} totalPages={1} totalItems={mockSessions.length} itemsPerPage={itemsPerPage} onPageChange={setPage} onItemsPerPageChange={setItemsPerPage} />
        </CardContent>
      </Card>
    </div>
  );
}