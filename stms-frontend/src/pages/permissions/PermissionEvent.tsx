import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, Table, Select, Textarea } from '@/components/ui';
import { ArrowLeft, FileText, Users, Calendar, Clock, Plus, Search, Filter, Download, Edit, Trash2, Eye, Send, Check, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function PermissionEvent() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'letters' | 'approvals'>('overview');

  const mockEvent = {
    id: id || '1',
    name: 'Inter-College Athletics Meet 2024',
    date: '2024-10-15',
    venue: 'University Stadium, Aditya Campus',
    type: 'competition',
    athleteIds: ['1', '2', '3'],
    status: 'active',
    createdAt: '2024-09-01',
    updatedAt: '2024-09-15',
  };

  const mockLetters = [
    { id: '1', athleteId: '1', athleteName: 'Priya Sharma', template: 'HOD Permission', status: 'approved', qrCode: 'QR001', submittedAt: '2024-09-10', approvedAt: '2024-09-12' },
    { id: '2', athleteId: '2', athleteName: 'Rahul Kumar', template: 'HOD Permission', status: 'pending', qrCode: 'QR002', submittedAt: '2024-09-11', approvedAt: null },
    { id: '3', athleteId: '3', athleteName: 'Anita Singh', template: 'Hostel Permission', status: 'rejected', qrCode: 'QR003', submittedAt: '2024-09-11', approvedAt: null },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FileText className="w-4 h-4" /> },
    { id: 'letters', label: 'Letters', icon: <Users className="w-4 h-4" /> },
    { id: 'approvals', label: 'Approvals', icon: <Check className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/permissions')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div>
          <h1 className="text-heading-lg font-bold text-surface-900 dark:text-surface-100">{mockEvent.name}</h1>
          <p className="text-body text-surface-500 dark:text-surface-400">
            <Calendar className="w-4 h-4 inline mr-1" /> {mockEvent.date} \u2022
            <Clock className="w-4 h-4 inline ml-2 mr-1" /> {mockEvent.venue}
          </p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Badge variant={mockEvent.status === 'active' ? 'success' : mockEvent.status === 'completed' ? 'primary' : 'neutral'}>
            {mockEvent.status.charAt(0).toUpperCase() + mockEvent.status.slice(1)}
          </Badge>
        </div>
      </div>

      <div className="flex gap-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-lg overflow-x-auto">
        {tabs.map((tab) => (
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-body-sm text-surface-500">Total Athletes</p>
                    <p className="text-heading-lg font-bold text-primary-800 dark:text-primary-200">{mockEvent.athleteIds.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-body-sm text-surface-500">Letters Generated</p>
                    <p className="text-heading-lg font-bold text-green-800 dark:text-green-200">3</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-body-sm text-surface-500">Approved</p>
                    <p className="text-heading-lg font-bold text-success-800 dark:text-success-200">1</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-body-sm text-surface-500">Pending</p>
                    <p className="text-heading-lg font-bold text-gold-800 dark:text-gold-200">1</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Event Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-body-sm text-surface-500">Event Type</p>
                      <p className="font-medium capitalize">{mockEvent.type}</p>
                    </div>
                    <div>
                      <p className="text-body-sm text-surface-500">Date</p>
                      <p className="font-medium"><Calendar className="w-4 h-4 inline mr-1" /> {mockEvent.date}</p>
                    </div>
                    <div>
                      <p className="text-body-sm text-surface-500">Venue</p>
                      <p className="font-medium"><Clock className="w-4 h-4 inline mr-1" /> {mockEvent.venue}</p>
                    </div>
                    <div>
                      <p className="text-body-sm text-surface-500">Created</p>
                      <p className="font-medium">{mockEvent.createdAt}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'letters' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-heading-sm font-semibold">Permission Letters</h3>
                <Button leftIcon={<Plus className="w-4 h-4" />}>Generate Letters</Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <tr>
                      <th>Athlete</th>
                      <th>Template</th>
                      <th>Status</th>
                      <th>QR Code</th>
                      <th>Submitted</th>
                      <th>Approved</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockLetters.map((letter) => (
                      <tr key={letter.id}>
                        <td className="font-medium">{letter.athleteName}</td>
                        <td>{letter.template}</td>
                        <td>
                          <Badge variant={
                            letter.status === 'approved' ? 'success' :
                            letter.status === 'pending' ? 'gold' :
                            letter.status === 'rejected' ? 'danger' : 'neutral'
                          } size="sm">
                            {letter.status.charAt(0).toUpperCase() + letter.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="font-mono text-sm">{letter.qrCode}</td>
                        <td>{letter.submittedAt}</td>
                        <td>{letter.approvedAt || '\u2014'}</td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" leftIcon={<Eye className="w-4 h-4" />}>View</Button>
                            <Button variant="ghost" size="sm" leftIcon={<Download className="w-4 h-4" />}>Download</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>
          )}

          {activeTab === 'approvals' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Approval Chain</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { role: 'Coach', name: 'John Coach', status: 'approved', decidedAt: '2024-09-10 14:30', comment: 'Approved for competition' },
                      { role: 'Sports Director', name: 'Dr. Sports', status: 'approved', decidedAt: '2024-09-11 09:15', comment: 'Meets eligibility criteria' },
                      { role: 'HOD', name: 'Prof. Head', status: 'approved', decidedAt: '2024-09-12 11:00', comment: 'Academic clearance granted' },
                      { role: 'Hostel Warden', name: 'Ms. Warden', status: 'pending', decidedAt: null, comment: null },
                    ].map((approval, i) => (
                      <div key={i} className={`flex items-center gap-4 p-4 rounded-lg ${approval.status === 'approved' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${approval.status === 'approved' ? 'bg-green-500' : 'bg-surface-200 dark:bg-surface-700'}`}>
                          <Check className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{approval.role}</span>
                            <Badge variant={approval.status === 'approved' ? 'success' : 'neutral'} size="sm">
                              {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-body-sm text-surface-500">{approval.name}</p>
                          {approval.comment && <p className="text-body-sm text-surface-600 dark:text-surface-400 mt-1">"{approval.comment}"</p>}
                          {approval.decidedAt && <p className="text-caption text-surface-400 mt-1">Decided: {approval.decidedAt}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}