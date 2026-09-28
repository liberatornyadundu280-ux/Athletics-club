import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, Table, Column } from '@/components/ui';
import { Plus, Search, Filter, Clock, Trophy, TrendingUp, Download, Upload, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/helpers';

export function FitnessTests() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-heading-lg font-bold text-surface-900 dark:text-surface-100">Fitness Tests</h1>
          <p className="text-body text-surface-500 dark:text-surface-400 mt-1">Manage and track athlete fitness assessments</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />}>Add Test</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <Input placeholder="Search tests..." className="pl-10" />
            </div>
            <div className="flex gap-2">
              <Select
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'speed', label: 'Speed' },
                  { value: 'endurance', label: 'Endurance' },
                  { value: 'strength', label: 'Strength' },
                  { value: 'power', label: 'Power' },
                  { value: 'agility', label: 'Agility' },
                  { value: 'flexibility', label: 'Flexibility' },
                ]}
                placeholder="Filter by type"
              />
              <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />}>Filters</Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <th>Test Name</th>
                  <th>Type</th>
                  <th>Unit</th>
                  <th>Protocol</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: '30m Sprint', type: 'Speed', unit: 'seconds', protocol: 'Flying start, 3 attempts', status: 'active' },
                  { name: 'Yo-Yo IR1', type: 'Endurance', unit: 'level', protocol: 'Progressive shuttle run', status: 'active' },
                  { name: 'CMJ', type: 'Power', unit: 'cm', protocol: 'Countermovement jump, 3 attempts', status: 'active' },
                  { name: '5-0-5 Agility', type: 'Agility', unit: 'seconds', protocol: '5m out, 180 turn, 5m back', status: 'active' },
                  { name: 'Sit & Reach', type: 'Flexibility', unit: 'cm', protocol: 'Standard sit and reach', status: 'active' },
                ].map((test, i) => (
                  <tr key={i}>
                    <td className="font-medium">{test.name}</td>
                    <td><Badge variant="primary" size="sm">{test.type}</Badge></td>
                    <td>{test.unit}</td>
                    <td className="text-body-sm text-surface-500 max-w-xs truncate">{test.protocol}</td>
                    <td><Badge variant={test.status === 'active' ? 'success' : 'neutral'} size="sm">{test.status}</Badge></td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" leftIcon={<Edit className="w-4 h-4" />} onClick={() => navigate(`/performance/fitness-tests/${i}`)}>Edit</Button>
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