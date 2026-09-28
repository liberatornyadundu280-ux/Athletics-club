import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from '@/components/ui';
import { Plus, Search, Filter, Download, Upload, MoreHorizontal } from 'lucide-react';
import { Table, Column, Pagination } from '@/components/ui/Table';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { useAuth } from '@/context/AuthContext';
import { Athlete } from '@stms/shared/types';

// Mock data
const mockAthletes: Athlete[] = [
  { id: '1', userId: 'u1', firstName: 'Priya', lastName: 'Sharma', email: 'priya.sharma@aditya.edu', phone: '+91 98765 43210', dateOfBirth: '2003-03-15', gender: 'female', eventSpecialization: ['100m', '200m'], personalBest: { '100m': '11.82s', '200m': '24.15s' }, seasonBest: { '100m': '11.95s', '200m': '24.45s' }, medicalNotes: null, emergencyContact: { name: 'Rajesh Sharma', relationship: 'Father', phone: '+91 98765 43211', email: 'rajesh.sharma@email.com' }, school: 'Aditya University', grade: '3rd Year', status: 'active', clubId: '1', createdAt: '2024-01-15', updatedAt: '2024-06-20' },
  { id: '2', userId: 'u2', firstName: 'Rahul', lastName: 'Kumar', email: 'rahul.kumar@aditya.edu', phone: '+91 98765 43212', dateOfBirth: '2002-07-22', gender: 'male', eventSpecialization: ['100m', '400m'], personalBest: { '100m': '10.95s', '400m': '47.82s' }, seasonBest: { '100m': '11.12s', '400m': '48.25s' }, medicalNotes: 'Previous hamstring strain (2023)', emergencyContact: { name: 'Sunita Kumar', relationship: 'Mother', phone: '+91 98765 43213', email: 'sunita.kumar@email.com' }, school: 'Aditya University', grade: '4th Year', status: 'active', clubId: '1', createdAt: '2024-01-10', updatedAt: '2024-06-18' },
  { id: '3', userId: 'u3', firstName: 'Amit', lastName: 'Singh', email: 'amit.singh@aditya.edu', phone: '+91 98765 43214', dateOfBirth: '2004-01-10', gender: 'male', eventSpecialization: ['Long Jump', 'Triple Jump'], personalBest: { 'Long Jump': '7.45m', 'Triple Jump': '15.20m' }, seasonBest: { 'Long Jump': '7.30m', 'Triple Jump': '15.05m' }, medicalNotes: null, emergencyContact: { name: 'Priya Singh', relationship: 'Mother', phone: '+91 98765 43215', email: 'priya.singh@email.com' }, school: 'Aditya University', grade: '2nd Year', status: 'injured', clubId: '1', createdAt: '2024-02-01', updatedAt: '2024-06-15' },
];

const columns: Column<Athlete>[] = [
  { key: 'name', header: 'Athlete', accessor: (a) => `${a.firstName} ${a.lastName}`, render: (a) => <div><p className="font-medium">{a.firstName} {a.lastName}</p><p className="text-body-sm text-surface-500">{a.email}</p></div> },
  { key: 'events', header: 'Events', accessor: 'eventSpecialization', render: (_, events) => <div className="flex flex-wrap gap-1">{events?.map((e: string) => <Badge key={e} variant="neutral" size="sm">{e}</Badge>)}</div> },
  { key: 'status', header: 'Status', accessor: 'status', render: (_, status) => <Badge variant={status === 'active' ? 'success' : status === 'injured' ? 'danger' : 'neutral'}>{status}</Badge> },
  { key: 'school', header: 'School/Grade', accessor: (a) => `${a.school} - ${a.grade}` },
  { key: 'actions', header: 'Actions', render: (a) => <div className="flex gap-1"><Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button></div> },
];

export function AthletesList() {
  const { hasPermission } = useAuth();
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-heading-lg font-bold text-surface-900 dark:text-surface-100">Athletes</h1>
          <p className="text-body text-surface-500 dark:text-surface-400 mt-1">Manage athlete profiles and records</p>
        </div>
        {hasPermission('athlete:write') && (
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => {}}>
            Add Athlete
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>All Athletes</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Input placeholder="Search athletes..." leftIcon={<Search className="w-4 h-4" />} value={search} onChange={e => setSearch(e.target.value)} className="w-full sm:w-64" />
            <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />}>Filters</Button>
            <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>Export</Button>
            <Button variant="outline" leftIcon={<Upload className="w-4 h-4" />}>Import</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table
            columns={columns}
            data={mockAthletes}
            keyExtractor={(a) => a.id}
            sortable
            defaultSortKey="name"
            selectable
            onSelectionChange={(keys) => console.log('Selected:', keys)}
            emptyMessage="No athletes found"
          />
          <Pagination
            currentPage={page}
            totalPages={1}
            totalItems={mockAthletes.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}