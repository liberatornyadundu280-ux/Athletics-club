import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Avatar } from '@/components/ui';
import { ArrowLeft, Dumbbell, Calendar, Trophy, Target, AlertTriangle, Download, Upload } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { Workout, WorkoutCompletion, Exercise } from '@stms/shared/types';

export function AthleteDetail() {
  const { user, hasPermission } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Mock athlete data
  const athlete = {
    id: '1',
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
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/athletes')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div>
          <h1 className="text-heading-lg font-bold text-surface-900 dark:text-surface-100">
            {athlete.firstName} {athlete.lastName}
          </h1>
          <p className="text-body text-surface-500 dark:text-surface-400">{athlete.email}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Avatar size="xl" name={`${athlete.firstName} ${athlete.lastName}`} />
              <div>
                <h3 className="text-heading-md font-bold text-surface-900 dark:text-surface-100">
                  {athlete.firstName} {athlete.lastName}
                </h3>
                <p className="text-body-sm text-surface-500">{athlete.school} • {athlete.grade}</p>
                <Badge variant={athlete.status === 'active' ? 'success' : 'danger'} className="mt-2">
                  {athlete.status}
                </Badge>
              </div>
              <div className="space-y-2 text-sm text-surface-600 dark:text-surface-400">
                <p><strong>Events:</strong> {athlete.eventSpecialization.join(', ')}</p>
                <p><strong>DOB:</strong> {athlete.dateOfBirth}</p>
                <p><strong>Gender:</strong> {athlete.gender}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Bests */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Bests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(athlete.personalBest).map(([event, value]) => (
                  <div key={event} className="p-4 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                    <p className="text-body-sm text-surface-500">{event}</p>
                    <p className="text-heading-md font-bold text-primary-800 dark:text-primary-200">{value}</p>
                    <p className="text-caption text-surface-500">PB</p>
                  </div>
                ))}
                {Object.entries(athlete.seasonBest).map(([event, value]) => (
                  <div key={event + 'sb'} className="p-4 rounded-lg bg-gold-50 dark:bg-gold-900/20">
                    <p className="text-body-sm text-surface-500">{event}</p>
                    <p className="text-heading-md font-bold text-gold-800 dark:text-gold-200">{value}</p>
                    <p className="text-caption text-surface-500">SB</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Workouts */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Workouts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                  <div>
                    <p className="font-medium">Sprint Intervals</p>
                    <p className="text-body-sm text-surface-500">Today • 6:00 AM • Track A</p>
                  </div>
                  <Button variant="primary" size="sm">Start</Button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                  <div>
                    <p className="font-medium">Strength & Power</p>
                    <p className="text-body-sm text-surface-500">Tomorrow • 7:00 AM • Gym</p>
                  </div>
                  <Badge variant="neutral">Pending</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}