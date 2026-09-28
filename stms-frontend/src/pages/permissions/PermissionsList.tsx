import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Select, SelectOption, Input } from '@/components/ui';
import { Plus, Search, Filter, Download, FileText, Clock, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import { Table, Column, Pagination } from '@/components/ui/Table';
import { useAuth } from '@/context/AuthContext';
import { PermissionEvent, PermissionLetter } from '@/types';

const mockEvents: PermissionEvent[] = [
  { id: '1', clubId: '1', name: 'State Athletics Championship', date: '2024-06-15', venue: 'State Stadium', type: 'competition', athleteIds: ['1', '2', '3'], status: 'completed', createdAt: '2024-05-01', updatedAt: '2024-06-15' },
  { id: '2', clubId: '1', name: 'Inter-University Meet', date: '2024-07-20', venue: 'University Stadium', type: 'competition', athleteIds: ['1', '4'], status: 'active', createdAt: '2024-06-01', updatedAt: '2024-06-10' },
  { id: '3', clubId: '1', name: 'Summer Training Camp', date: '2024-07-01', venue: 'Hill Station Resort', type: 'training_camp', athleteIds: ['1', '2', '3', '4', '5'], status: 'active', createdAt: '2024-06-05', updatedAt: '2024-06-10' },
];

const mockLetters: PermissionLetter[] = [
  { id: '1', clubId: '1', eventId: '2', athleteId: '1', templateId: 'hod', content: '...', status: 'approved', qrCode: 'qr1', createdAt: '2024-06-01', updatedAt: '2024-06-05' },
  { id: '2', clubId: '1', eventId: '2', athleteId: '1', templateId: 'faculty', content: '...', status: 'approved', qrCode: 'qr2', createdAt: '2024-06-01', updatedAt: '2024-06-06' },
  { id: '3', clubId: '1', eventId: '2', athleteId: '1', templateId: 'hostel', content: '...', status: 'submitted', qrCode: 'qr3', createdAt: '2024-06-01', updatedAt: '2024-06-02' },
  { id: '4', clubId: '1', eventId: '2', athleteId: '4', templateId: 'hod', content: '...', status: 'draft', qrCode: 'qr4', createdAt: '2024-06-05', updatedAt: '2024-06-05' },
];

const statusConfig = {
  draft: { label: 'Draft', color: 'neutral' as const, icon: <Clock className="w-4 h-4" /> },
  submitted: { label: 'Submitted', color: 'primary' as const, icon: <AlertCircle className="w-4 h-4" /> },
  approved: { label: 'Approved', color: 'success' as const, icon: <CheckCircle className="w-4 h-4" /> },
  rejected: { label: 'Rejected', color: 'danger' as const, icon: <XCircle className="w-4 h-4" /> },
  completed: { label: 'Completed', color: 'gold' as const, icon: <CheckCircle className="w-4 h-4" /> },
};

export function PermissionsList() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = React.useState<'events' | 'letters'>('events');
  const [page, setPage] = React.useState(1);

  const tabs = [
    { id: 'events', label: 'Permission Events', icon: <FileText className="w-4 h-4" /> },
    { id: 'letters', label: 'Letters', icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-heading-lg font-bold text-surface-900 dark:text-surface-100">Permissions</h1>
          <p className="text-body text-surface-500 dark:text-surface-400 mt-1">Manage competition permissions and leave letters</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => {}}>
          Create Event
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-lg">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-body-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white dark:bg-surface-900 text-primary-800 dark:text-primary-200 shadow-sm'
                : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>{activeTab === 'events' ? 'Permission Events' : 'Generated Letters'}</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Input placeholder="Search..." leftIcon={<Search className="w-4 h-4" />} className="w-full sm:w-64" />
            <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>Export</Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'events' && (
            <Table
              columns={[
                { key: 'name', header: 'Event', accessor: 'name' },
                { key: 'date', header: 'Date', accessor: 'date' },
                { key: 'venue', header: 'Venue', accessor: 'venue' },
                { key: 'type', header: 'Type', accessor: 'type', render: (_, t) => <Badge variant="neutral">{t.replace('_', ' ')}</Badge> },
                { key: 'athletes', header: 'Athletes', accessor: 'athleteIds', render: (_, a) => `${a.length} athletes` },
                { key: 'status', header: 'Status', accessor: 'status', render: (_, s) => <Badge variant={s === 'completed' ? 'success' : s === 'active' ? 'primary' : 'neutral'}>{s}</Badge> },
                { key: 'actions', header: 'Actions', render: () => <Button variant="ghost" size="sm" leftIcon={<Eye className="w-4 h-4" />}>Manage</Button> },
              ]}
              data={mockEvents}
              keyExtractor={(e) => e.id}
              sortable
              defaultSortKey="date"
              defaultSortDirection="desc"
              emptyMessage="No permission events created yet"
            />
          )}

          {activeTab === 'letters' && (
            <Table
              columns={[
                { key: 'athlete', header: 'Athlete', accessor: (letter) => { const a = mockEvents.flatMap(e => e.athleteIds); return a.includes(letter.athleteId) ? 'Athlete' : 'Unknown'; } },
                { key: 'event', header: 'Event', accessor: 'eventId', render: (letter) => { const ev = mockEvents.find(e => e.id === letter.eventId); return ev?.name || letter.eventId; } },
                { key: 'template', header: 'Type', accessor: 'templateId', render: (_, t) => <Badge variant="neutral">{t.replace('_', ' ')}</Badge> },
                { key: 'status', header: 'Status', accessor: 'status', render: (_, s) => { const c = statusConfig[s as keyof typeof statusConfig]; return <div className="flex items-center gap-2">{c.icon} <Badge variant={c.color}>{c.label}</Badge></div>; } },
                { key: 'created', header: 'Created', accessor: 'createdAt' },
                { key: 'actions', header: 'Actions', render: () => <Button variant="ghost" size="sm" leftIcon={<Eye className="w-4 h-4" />}>View</Button> },
              ]}
              data={mockLetters}
              keyExtractor={(l) => l.id}
              sortable
              defaultSortKey="createdAt"
              defaultSortDirection="desc"
              emptyMessage="No letters generated yet"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}