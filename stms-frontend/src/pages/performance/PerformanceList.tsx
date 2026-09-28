import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Select, SelectOption, Input } from '@/components/ui';
import { Plus, Search, Filter, Download, Trophy, Target, BarChart3, Clock } from 'lucide-react';
import { Table, Column, Pagination } from '@/components/ui/Table';
import { useAuth } from '@/context/AuthContext';
import { Competition, Result, FitnessTest, Goal } from '@/types';

const mockCompetitions = [
  { id: '1', name: 'State Athletics Championship', date: '2024-06-15', venue: 'State Stadium', level: 'state', events: [] },
  { id: '2', name: 'District Meet', date: '2024-05-20', venue: 'District Sports Complex', level: 'district', events: [] },
];

const mockResults = [
  { id: '1', athleteId: '1', athleteName: 'Priya Sharma', competitionId: '1', event: '100m', round: 'Final', result: '11.82s', wind: 1.2, position: 1, waPoints: 1120, isPB: true, isSB: true, createdAt: '2024-06-15' },
  { id: '2', athleteId: '2', athleteName: 'Rahul Kumar', competitionId: '1', event: '100m', round: 'Final', result: '10.95s', wind: 1.2, position: 2, waPoints: 1150, isPB: false, isSB: true, createdAt: '2024-06-15' },
  { id: '3', athleteId: '1', athleteName: 'Priya Sharma', competitionId: '1', event: '200m', round: 'Final', result: '24.15s', wind: 0.8, position: 1, waPoints: 1105, isPB: true, isSB: true, createdAt: '2024-06-15' },
];

const mockFitnessTests: FitnessTest[] = [
  { id: '1', clubId: '1', athleteId: '1', athleteName: 'Priya Sharma', testType: '30m_fly', value: 3.45, unit: 's', date: '2024-06-01', percentile: 92, notes: 'Excellent acceleration' },
  { id: '2', clubId: '1', athleteId: '2', athleteName: 'Rahul Kumar', testType: '30m_fly', value: 3.20, unit: 's', date: '2024-06-01', percentile: 98, notes: 'Elite level' },
];

const mockGoals: Goal[] = [
  { id: '1', clubId: '1', athleteId: '1', athleteName: 'Priya Sharma', event: '100m', targetValue: '11.70s', targetDate: '2024-12-31', status: 'active', coachNotes: 'Focus on start and acceleration', createdAt: '2024-01-15', updatedAt: '2024-06-01' },
  { id: '2', clubId: '1', athleteId: '2', athleteName: 'Rahul Kumar', event: '400m', targetValue: '46.50s', targetDate: '2024-10-15', status: 'active', coachNotes: 'Work on speed endurance', createdAt: '2024-02-01', updatedAt: '2024-06-01' },
];

export function PerformanceList() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = React.useState<'competitions' | 'results' | 'fitness' | 'goals'>('results');
  const [page, setPage] = React.useState(1);

  const tabs = [
    { id: 'competitions', label: 'Competitions', icon: <Trophy className="w-4 h-4" /> },
    { id: 'results', label: 'Results', icon: <Target className="w-4 h-4" /> },
    { id: 'fitness', label: 'Fitness Tests', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'goals', label: 'Goals', icon: <Target className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-heading-lg font-bold text-surface-900 dark:text-surface-100">Performance</h1>
          <p className="text-body text-surface-500 dark:text-surface-400 mt-1">Track competition results, fitness tests, and goals</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />}>Add Result</Button>
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

      {/* Tab Content */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>
            {tabs.find(t => t.id === activeTab)?.label}
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Input placeholder="Search..." leftIcon={<Search className="w-4 h-4" />} className="w-full sm:w-64" />
            <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>Export</Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'competitions' && (
            <Table
              columns={[
                { key: 'name', header: 'Competition', accessor: 'name' },
                { key: 'date', header: 'Date', accessor: 'date' },
                { key: 'venue', header: 'Venue', accessor: 'venue' },
                { key: 'level', header: 'Level', accessor: 'level', render: (_, l) => <Badge variant="neutral">{l}</Badge> },
                { key: 'actions', header: 'Actions', render: () => <Button variant="ghost" size="sm"><BarChart3 className="w-4 h-4" /></Button> },
              ]}
              data={mockCompetitions}
              keyExtractor={(c) => c.id}
              emptyMessage="No competitions yet"
            />
          )}

          {activeTab === 'results' && (
            <Table
              columns={[
                { key: 'athlete', header: 'Athlete', accessor: (r) => r.athleteName },
                { key: 'competition', header: 'Competition', accessor: 'competitionId', render: () => 'State Championship' },
                { key: 'event', header: 'Event', accessor: 'event' },
                { key: 'round', header: 'Round', accessor: 'round' },
                { key: 'result', header: 'Result', accessor: 'result' },
                { key: 'wind', header: 'Wind', accessor: 'wind', render: (_, w) => w ? `${w > 0 ? '+' : ''}${w}m/s` : '—' },
                { key: 'position', header: 'Pos', accessor: 'position', render: (_, p) => p ? `#${p}` : '—' },
                { key: 'pb', header: '', accessor: 'isPB', render: (_, pb) => pb ? <Badge variant="success" size="sm">PB</Badge> : null },
                { key: 'sb', header: '', accessor: 'isSB', render: (_, sb) => sb ? <Badge variant="gold" size="sm">SB</Badge> : null },
              ]}
              data={mockResults}
              keyExtractor={(r) => r.id}
              sortable
              defaultSortKey="createdAt"
              defaultSortDirection="desc"
              emptyMessage="No results recorded yet"
            />
          )}

          {activeTab === 'fitness' && (
            <Table
              columns={[
                { key: 'athlete', header: 'Athlete', accessor: (f) => f.athleteName },
                { key: 'test', header: 'Test', accessor: 'testType', render: (_, t) => t.replace('_', ' ').toUpperCase() },
                { key: 'value', header: 'Value', accessor: (f) => `${f.value} ${f.unit}` },
                { key: 'date', header: 'Date', accessor: 'date' },
                { key: 'percentile', header: 'Percentile', accessor: 'percentile', render: (_, p) => p ? `${p}th` : '—' },
                { key: 'notes', header: 'Notes', accessor: 'notes' },
              ]}
              data={mockFitnessTests}
              keyExtractor={(f) => f.id}
              emptyMessage="No fitness tests recorded"
            />
          )}

          {activeTab === 'goals' && (
            <Table
              columns={[
                { key: 'athlete', header: 'Athlete', accessor: (g) => g.athleteName },
                { key: 'event', header: 'Event', accessor: 'event' },
                { key: 'target', header: 'Target', accessor: 'targetValue' },
                { key: 'deadline', header: 'Deadline', accessor: 'targetDate' },
                { key: 'status', header: 'Status', accessor: 'status', render: (_, s) => <Badge variant={s === 'active' ? 'primary' : s === 'achieved' ? 'success' : 'neutral'}>{s}</Badge> },
              ]}
              data={mockGoals}
              keyExtractor={(g) => g.id}
              emptyMessage="No goals set yet"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}