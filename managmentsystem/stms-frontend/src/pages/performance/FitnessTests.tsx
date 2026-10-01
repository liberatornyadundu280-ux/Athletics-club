import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, Table, Column, Select } from '@/components/ui';
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
            <Table
              columns={[
                { key: 'name', header: 'Test Name', accessor: 'name', render: (item) => <span className="font-medium">{item.name}</span> },
                { key: 'type', header: 'Type', accessor: 'type', render: (item) => <Badge variant="split" size="sm">{item.type}</Badge> },
                { key: 'unit', header: 'Unit', accessor: 'unit' },
                { key: 'protocol', header: 'Protocol', accessor: 'protocol', render: (item) => <span className="text-body-sm text-chalk-400 max-w-xs truncate">{item.protocol}</span> },
                { key: 'status', header: 'Status', accessor: 'status', render: (item) => <Badge variant={item.status === 'active' ? 'split' : 'lane'} size="sm">{item.status}</Badge> },
                { key: 'actions', header: 'Actions', render: (item, _value) => (
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" leftIcon={<Edit className="w-4 h-4" />} onClick={() => navigate(`/performance/fitness-tests/${item.name}`)}>Edit</Button>
                    <Button variant="danger" size="sm" leftIcon={<Trash2 className="w-4 h-4" />}>Delete</Button>
                  </div>
                )},
              ]}
              data={[
                { name: '30m Sprint', type: 'Speed', unit: 'seconds', protocol: 'Flying start, 3 attempts', status: 'active' },
                { name: 'Yo-Yo IR1', type: 'Endurance', unit: 'level', protocol: 'Progressive shuttle run', status: 'active' },
                { name: 'CMJ', type: 'Power', unit: 'cm', protocol: 'Countermovement jump, 3 attempts', status: 'active' },
                { name: '5-0-5 Agility', type: 'Agility', unit: 'seconds', protocol: '5m out, 180 turn, 5m back', status: 'active' },
                { name: 'Sit & Reach', type: 'Flexibility', unit: 'cm', protocol: 'Standard sit and reach', status: 'active' },
              ]}
              keyExtractor={(item) => item.name}
              emptyMessage="No fitness tests configured"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}