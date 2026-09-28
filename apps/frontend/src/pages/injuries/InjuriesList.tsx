import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Select, SelectOption, Input } from '@/components/ui';
import { Plus, Search, Filter, AlertTriangle, Clock, Download, ArrowUp, ArrowDown, Activity } from 'lucide-react';
import { Table, Column, Pagination } from '@/components/ui/Table';
import { useAuth } from '@/context/AuthContext';
import { Injury } from '@stms/shared/types';

const mockInjuries: Injury[] = [
  { id: '1', clubId: '1', athleteId: '1', athleteName: 'Amit Singh', type: 'Ankle Sprain', bodyPart: 'ankle', laterality: 'left', onsetDate: '2024-06-10', mechanism: 'Landed awkwardly after long jump', severity: 2, diagnosisSource: 'physio', imaging: [], status: 'rehabilitating', expectedReturnDate: '2024-07-15', actualReturnDate: null, rtpProtocolId: '1', createdAt: '2024-06-10', updatedAt: '2024-06-15' },
  { id: '2', clubId: '1', athleteId: '2', athleteName: 'Priya Sharma', type: 'Hamstring Strain', bodyPart: 'thigh', laterality: 'right', onsetDate: '2024-05-20', mechanism: 'Sprinting at max velocity', severity: 1, diagnosisSource: 'doctor', imaging: ['mri_report.pdf'], status: 'returning', expectedReturnDate: '2024-06-25', actualReturnDate: null, rtpProtocolId: '2', createdAt: '2024-05-20', updatedAt: '2024-06-10' },
  { id: '3', clubId: '1', athleteId: '3', athleteName: 'Rahul Kumar', type: 'Shin Splints', bodyPart: 'shin', laterality: 'bilateral', onsetDate: '2024-06-01', mechanism: 'Increased training volume', severity: 1, diagnosisSource: 'self', imaging: [], status: 'active', expectedReturnDate: '2024-07-01', actualReturnDate: null, rtpProtocolId: null, createdAt: '2024-06-01', updatedAt: '2024-06-01' },
];

const severityLabels = { 1: 'Grade 1 (Mild)', 2: 'Grade 2 (Moderate)', 3: 'Grade 3 (Severe)' };
const statusOptions = [
  { value: 'active', label: 'Active', color: 'danger' },
  { value: 'rehabilitating', label: 'Rehabilitating', color: 'primary' },
  { value: 'returning', label: 'Returning to Play', color: 'gold' },
  { value: 'resolved', label: 'Resolved', color: 'success' },
  { value: 'chronic', label: 'Chronic', color: 'neutral' },
];

export function InjuriesList() {
  const { hasPermission } = useAuth();
  const [page, setPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [filterStatus, setFilterStatus] = React.useState('');

  const columns: Column<Injury>[] = [
    { key: 'athlete', header: 'Athlete', accessor: (i) => i.athleteName, render: (i) => <div><p className="font-medium">{i.athleteName}</p><p className="text-body-sm text-surface-500">{i.type} • {severityLabels[i.severity as keyof typeof severityLabels]}</p></div> },
    { key: 'bodyPart', header: 'Body Part', accessor: (i) => `${i.bodyPart} (${i.laterality})` },
    { key: 'onset', header: 'Onset', accessor: 'onsetDate' },
    { key: 'status', header: 'Status', accessor: 'status', render: (_, s) => { const opt = statusOptions.find(o => o.value === s); return <Badge variant={opt?.color || 'neutral'}>{opt?.label || s}</Badge>; } },
    { key: 'expectedReturn', header: 'Expected Return', accessor: 'expectedReturnDate', render: (_, d) => d || <span className="text-surface-400">—</span> },
    { key: 'daysMissed', header: 'Days Missed', accessor: (i) => { const onset = new Date(i.onsetDate); const today = new Date(); return Math.ceil((today.getTime() - onset.getTime()) / (1000 * 60 * 60 * 24)); } },
    { key: 'actions', header: 'Actions', render: (i) => <Button variant="ghost" size="sm" leftIcon={<Activity className="w-4 h-4" />}>View</Button> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-heading-lg font-bold text-surface-900 dark:text-surface-100">Injuries</h1>
          <p className="text-body text-surface-500 dark:text-surface-400 mt-1">Track and manage athlete injuries</p>
        </div>
        {hasPermission('injury:write') && (
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => {}}>
            Report Injury
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>Active Injuries</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Input placeholder="Search injuries..." leftIcon={<Search className="w-4 h-4" />} className="w-full sm:w-64" />
            <Select
              options={[{ value: '', label: 'All Status' }, ...statusOptions.map(s => ({ value: s.value, label: s.label }))]}
              placeholder="Filter by status"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full sm:w-48"
            />
            <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>Export</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table
            columns={[
              { key: 'athlete', header: 'Athlete', accessor: (i) => i.athleteName, render: (i) => <div><p className="font-medium">{i.athleteName}</p><p className="text-body-sm text-surface-500">{i.type} • {severityLabels[i.severity as keyof typeof severityLabels]}</p></div> },
              { key: 'bodyPart', header: 'Body Part', accessor: (i) => `${i.bodyPart} (${i.laterality})` },
              { key: 'onset', header: 'Onset', accessor: 'onsetDate' },
              { key: 'status', header: 'Status', accessor: 'status', render: (_, s) => { const opt = statusOptions.find(o => o.value === s); return <Badge variant={opt?.color || 'neutral'}>{opt?.label || s}</Badge>; } },
              { key: 'expectedReturn', header: 'Expected Return', accessor: 'expectedReturnDate', render: (_, d) => d || <span className="text-surface-400">—</span> },
              { key: 'daysMissed', header: 'Days Missed', accessor: (i) => { const onset = new Date(i.onsetDate); const today = new Date(); return Math.ceil((today.getTime() - onset.getTime()) / (1000 * 60 * 60 * 24)); } },
              { key: 'actions', header: 'Actions', render: (i) => <Button variant="ghost" size="sm" leftIcon={<Activity className="w-4 h-4" />}>View</Button> },
            ]}
            data={mockInjuries}
            keyExtractor={(i) => i.id}
            sortable
            defaultSortKey="onsetDate"
            defaultSortDirection="desc"
            emptyMessage="No injuries recorded"
          />
          <Pagination currentPage={page} totalPages={1} totalItems={mockInjuries.length} itemsPerPage={itemsPerPage} onPageChange={setPage} onItemsPerPageChange={setItemsPerPage} />
        </CardContent>
      </Card>
    </div>
  );
}