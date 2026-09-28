import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, Table } from '@/components/ui';
import { Plus, Search, Filter, Target, Flag, TrendingUp, Edit, Trash2, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Goals() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-heading-lg font-bold text-surface-900 dark:text-surface-100">Goals</h1>
          <p className="text-body text-surface-500 dark:text-surface-400 mt-1">Track athlete goals and targets</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />}>Add Goal</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <Input placeholder="Search goals..." className="pl-10" />
            </div>
            <div className="flex gap-2">
              <Select
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'overdue', label: 'Overdue' },
                ]}
                placeholder="Filter by status"
              />
              <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />}>Filters</Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <th>Goal</th>
                  <th>Athlete</th>
                  <th>Type</th>
                  <th>Target</th>
                  <th>Deadline</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { goal: 'Sub-11s 100m', athlete: 'Priya Sharma', type: 'Performance', target: '10.99s', deadline: '2024-12-31', progress: 75, status: 'active' },
                  { goal: 'National Qualifier', athlete: 'Rahul Kumar', type: 'Competition', target: 'Qualify', deadline: '2024-10-15', progress: 90, status: 'active' },
                  { goal: 'Injury-Free Season', athlete: 'Anita Singh', type: 'Health', target: '0 injuries', deadline: '2025-03-31', progress: 100, status: 'completed' },
                  { goal: 'Improve Vertical', athlete: 'Vikram Patel', type: 'Physical', target: '50cm', deadline: '2024-11-30', progress: 60, status: 'active' },
                ].map((goal, i) => (
                  <tr key={i}>
                    <td className="font-medium">{goal.goal}</td>
                    <td>{goal.athlete}</td>
                    <td><Badge variant="primary" size="sm">{goal.type}</Badge></td>
                    <td>{goal.target}</td>
                    <td><Calendar className="w-4 h-4 inline mr-1" /> {goal.deadline}</td>
                    <td>
                      <div className="w-32 h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${goal.progress}%` }} />
                      </div>
                    </td>
                    <td><Badge variant={goal.status === 'active' ? 'primary' : goal.status === 'completed' ? 'success' : 'danger'} size="sm">{goal.status}</Badge></td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" leftIcon={<Edit className="w-4 h-4" />} onClick={() => navigate(`/performance/goals/${i}`)}>Edit</Button>
                        <Button variant="ghost" size="sm" variant="danger" leftIcon={<Trash2 className="w-4 h-4" />}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}