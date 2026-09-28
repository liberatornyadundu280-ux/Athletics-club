import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, Select, SelectOption } from '@/components/ui';
import { Plus, Search, Filter, Download, MoreHorizontal } from 'lucide-react';
import { Table, Column, Pagination } from '@/components/ui/Table';
import { useAuth } from '@/context/AuthContext';
import { Workout } from '@/types';

const mockWorkouts: Workout[] = [
  { id: '1', clubId: '1', name: 'Sprint Intervals', description: 'High-intensity sprint training for speed development', exercises: [], estimatedDuration: 90, difficulty: 'advanced', tags: ['speed', 'sprint', 'intervals'], isTemplate: true, createdBy: 'u1', createdAt: '2024-06-01', updatedAt: '2024-06-01' },
  { id: '2', clubId: '1', name: 'Strength & Power', description: 'Full body strength session focusing on power output', exercises: [], estimatedDuration: 75, difficulty: 'intermediate', tags: ['strength', 'power', 'gym'], isTemplate: true, createdBy: 'u1', createdAt: '2024-06-05', updatedAt: '2024-06-05' },
  { id: '3', clubId: '1', name: 'Recovery Run', description: 'Easy aerobic run for active recovery', exercises: [], estimatedDuration: 45, difficulty: 'beginner', tags: ['recovery', 'aerobic', 'easy'], isTemplate: false, createdBy: 'u1', createdAt: '2024-06-10', updatedAt: '2024-06-10' },
];

const columns: Column<Workout>[] = [
  { key: 'name', header: 'Workout', accessor: 'name', render: (w) => <div><p className="font-medium">{w.name}</p><p className="text-body-sm text-surface-500 line-clamp-1">{w.description}</p></div> },
  { key: 'difficulty', header: 'Difficulty', accessor: 'difficulty', render: (_, d) => <Badge variant={d === 'beginner' ? 'success' : d === 'intermediate' ? 'gold' : 'danger'}>{d}</Badge> },
  { key: 'duration', header: 'Duration', accessor: 'estimatedDuration', render: (_, d) => `${d} min` },
  { key: 'tags', header: 'Tags', accessor: 'tags', render: (_, tags) => <div className="flex flex-wrap gap-1">{tags?.map((t: string) => <Badge key={t} variant="neutral" size="sm">{t}</Badge>)}</div> },
  { key: 'type', header: 'Type', accessor: 'isTemplate', render: (_, isTemplate) => <Badge variant={isTemplate ? 'primary' : 'neutral'}>{isTemplate ? 'Template' : 'Custom'}</Badge> },
  { key: 'actions', header: 'Actions', render: (w) => <div className="flex gap-1"><Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button></div> },
];

const difficultyOptions: SelectOption[] = [
  { value: '', label: 'All Difficulties' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export function WorkoutsList() {
  const { hasPermission } = useAuth();
  const [page, setPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-heading-lg font-bold text-surface-900 dark:text-surface-100">Workouts</h1>
          <p className="text-body text-surface-500 dark:text-surface-400 mt-1">Manage workout library and assignments</p>
        </div>
        {hasPermission('workout:write') && (
          <Button leftIcon={<Plus className="w-4 h-4" />}>Create Workout</Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>Workout Library</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Input placeholder="Search workouts..." leftIcon={<Search className="w-4 h-4" />} className="w-full sm:w-64" />
            <Select options={difficultyOptions} placeholder="Difficulty" className="w-full sm:w-40" />
            <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />}>Filters</Button>
            <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>Export</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table
            columns={columns}
            data={mockWorkouts}
            keyExtractor={(w) => w.id}
            sortable
            defaultSortKey="name"
            selectable
            emptyMessage="No workouts found. Create your first workout!"
          />
          <Pagination currentPage={page} totalPages={1} totalItems={mockWorkouts.length} itemsPerPage={itemsPerPage} onPageChange={setPage} onItemsPerPageChange={setItemsPerPage} />
        </CardContent>
      </Card>
    </div>
  );
}