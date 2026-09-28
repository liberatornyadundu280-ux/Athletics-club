import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, Avatar, Select, SelectOption } from '@/components/ui';
import { ArrowLeft, Dumbbell, Calendar, Trophy, Target, AlertTriangle, Upload, Save, Edit2, Clock, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Athlete } from '@stms/types';

const mockAthlete: Athlete = {
  id: '1',
  userId: 'u1',
  firstName: 'Priya',
  lastName: 'Sharma',
  email: 'priya.sharma@aditya.edu',
  phone: '+91 98765 43210',
  dateOfBirth: '2003-03-15',
  gender: 'female',
  eventSpecialization: ['100m', '200m'],
  personalBest: { '100m': '11.82s', '200m': '24.15s' },
  seasonBest: { '100m': '11.95s', '200m': '24.45s' },
  medicalNotes: 'None',
  emergencyContact: { name: 'Rajesh Sharma', relationship: 'Father', phone: '+91 98765 43211', email: 'rajesh.sharma@email.com' },
  school: 'Aditya University',
  grade: '3rd Year',
  status: 'active',
  clubId: '1',
  createdAt: '2024-01-15',
  updatedAt: '2024-06-20',
};

export function Profile() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'workouts' | 'performance' | 'attendance' | 'settings'>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <User className="w-4 h-4" /> },
    { id: 'workouts', label: 'Workouts', icon: <Dumbbell className="w-4 h-4" /> },
    { id: 'performance', label: 'Performance', icon: <Trophy className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance', icon: <Calendar className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Avatar size="xl" name={`${mockAthlete.firstName} ${mockAthlete.lastName}`} />
            <div>
              <h1 className="text-heading-lg font-bold text-surface-900 dark:text-surface-100">
                {mockAthlete.firstName} {mockAthlete.lastName}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={mockAthlete.status === 'active' ? 'success' : 'danger'>{mockAthlete.status}</Badge>
                <Badge variant="neutral">{mockAthlete.school} • {mockAthlete.grade}</Badge>
              </div>
            </div>
          </div>
        </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-lg overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-body-sm font-medium transition-colors whitespace-nowrap ${
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
        <CardContent className="pt-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Stats */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-body-sm text-surface-500">Attendance Rate</p>
                        <p className="text-heading-lg font-bold text-green-800 dark:text-green-200">87%</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Check className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-body-sm text-surface-500">Workout Compliance</p>
                        <p className="text-heading-lg font-bold text-primary-800 dark:text-primary-200">94%</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <Dumbbell className="w-6 h-6 text-primary-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-body-sm text-surface-500">Active Injuries</p>
                        <p className="text-heading-lg font-bold text-danger-800 dark:text-danger-200">0</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-danger-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-body-sm text-surface-500">Competitions</p>
                        <p className="text-heading-lg font-bold text-gold-800 dark:text-gold-200">3</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-gold-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Personal Bests */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal Bests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {Object.entries(mockAthlete.personalBest).map(([event, value]) => (
                      <div key={event} className="p-4 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                        <p className="text-body-sm text-surface-500">{event}</p>
                        <p className="text-heading-md font-bold text-primary-800 dark:text-primary-200">{value}</p>
                        <p className="text-caption text-surface-500">Personal Best</p>
                      </div>
                    ))}
                    {Object.entries(mockAthlete.seasonBest).map(([event, value]) => (
                      <div key={event + 'sb'} className="p-4 rounded-lg bg-gold-50 dark:bg-gold-900/20">
                        <p className="text-body-sm text-surface-500">{event}</p>
                        <p className="text-heading-md font-bold text-gold-800 dark:text-gold-200">{value}</p>
                        <p className="text-caption text-surface-500">Season Best</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Events */}
              <Card>
                <CardHeader>
                  <CardTitle>Event Specializations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {mockAthlete.eventSpecialization.map(event => (
                      <Badge key={event} variant="primary">{event}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card>
                <CardHeader>
                  <CardTitle>Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">{mockAthlete.emergencyContact.name}</p>
                    <p className="text-body-sm text-surface-500">{mockAthlete.emergencyContact.relationship}</p>
                    <p className="text-body-sm text-surface-500">{mockAthlete.emergencyContact.phone}</p>
                    {mockAthlete.emergencyContact.email && <p className="text-body-sm text-surface-500">{mockAthlete.emergencyContact.email}</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'workouts' && (
            <div className="space-y-4">
              <p className="text-body text-surface-500">Your upcoming and completed workouts will appear here.</p>
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Dumbbell className="w-12 h-12 mx-auto mb-4 text-surface-300 dark:text-surface-600" />
                  <p className="text-body">No upcoming workouts</p>
                  <p className="text-body-sm text-surface-500 mt-1">Your coach will assign workouts here</p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Competition Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-body text-surface-500">Your competition results will be displayed here.</p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-heading-lg font-bold text-green-800 dark:text-green-200">87%</p>
                    <p className="text-body-sm text-surface-500">Attendance Rate</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-heading-lg font-bold text-primary-800 dark:text-primary-200">94%</p>
                    <p className="text-body-sm text-surface-500">Workout Compliance</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-heading-lg font-bold text-gold-800 dark:text-gold-200">12</p>
                    <p className="text-body-sm text-surface-500">Sessions This Month</p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-body text-surface-500 text-center">Attendance calendar will be displayed here.</p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-6">
              <h3 className="text-heading-sm font-semibold mb-4">Profile Settings</h3>
              <div className="space-y-4">
                <Input label="Full Name" defaultValue={`${mockAthlete.firstName} ${mockAthlete.lastName}`} />
                <Input label="Email" type="email" defaultValue={mockAthlete.email} disabled />
                <Input label="Phone" type="tel" defaultValue={mockAthlete.phone} />
                <Select label="Gender" options={[{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }, { value: 'other', label: 'Other' }]} defaultValue={mockAthlete.gender} />
                <Input label="Date of Birth" type="date" defaultValue={mockAthlete.dateOfBirth} />
                <Input label="School" defaultValue={mockAthlete.school} />
                <Input label="Grade" defaultValue={mockAthlete.grade} />
                <Input label="Events" placeholder="Comma separated" defaultValue={mockAthlete.eventSpecialization.join(', ')} />
                <Input label="Medical Notes" as="textarea" rows={3} defaultValue={mockAthlete.medicalNotes} />
                <Button leftIcon={<Save className="w-4 h-4" />}>Save Profile</Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}