import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, Select, Textarea } from '@/components/ui';
import { ArrowLeft, AlertTriangle, Calendar, Clock, Upload, Save, Edit, Trash2, ArrowUp, ArrowDown, FileText, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function InjuryDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'rehab' | 'rtp' | 'logs'>('overview');
  
const mockInjury = {
    id: id || '1',
    athleteId: '1',
    athleteName: 'Priya Sharma',
    type: 'Hamstring Strain',
    bodyPart: 'Hamstring',
    laterality: 'left',
    onsetDate: '2024-06-15',
    mechanism: 'Sprinting during 100m race',
    severity: 2,
    diagnosisSource: 'physio',
    status: 'rehabilitating',
    expectedReturnDate: '2024-08-15',
    actualReturnDate: null,
    imaging: ['MRI_hamstring_20240616.pdf'],
    rtpProtocolId: 'rtp-1',
    createdAt: '2024-06-16',
    updatedAt: '2024-06-20',
  };

  const tabs: Array<{ id: 'overview' | 'rehab' | 'rtp' | 'logs'; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <FileText className="w-4 h-4" /> },
    { id: 'rehab', label: 'Rehab Plan', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'rtp', label: 'RTP Protocol', icon: <ArrowUp className="w-4 h-4" /> },
    { id: 'logs', label: 'Rehab Logs', icon: <Calendar className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/injuries')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div>
          <h1 className="text-heading-lg font-bold text-surface-900 dark:text-surface-100">{mockInjury.type}</h1>
          <p className="text-body text-surface-500 dark:text-surface-400">{mockInjury.athleteName} \u2022 {mockInjury.bodyPart} ({mockInjury.laterality})</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Badge variant={mockInjury.status === 'active' ? 'danger' : mockInjury.status === 'rehabilitating' ? 'primary' : mockInjury.status === 'returning' ? 'gold' : 'success'}>
            {mockInjury.status.charAt(0).toUpperCase() + mockInjury.status.slice(1)}
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
                  <CardContent className="pt-6">
                    <p className="text-body-sm text-surface-500">Severity</p>
                    <p className="text-heading-lg font-bold text-danger-800 dark:text-danger-200">Grade {mockInjury.severity}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-body-sm text-surface-500">Diagnosed By</p>
                    <p className="text-heading-lg font-bold text-primary-800 dark:text-primary-200">{mockInjury.diagnosisSource}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-body-sm text-surface-500">Onset Date</p>
                    <p className="text-heading-lg font-bold text-surface-900 dark:text-surface-100"><Calendar className="w-5 h-5 inline mr-1" /> {mockInjury.onsetDate}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-body-sm text-surface-500">Expected Return</p>
                    <p className="text-heading-lg font-bold text-green-800 dark:text-green-200"><Clock className="w-5 h-5 inline mr-1" /> {mockInjury.expectedReturnDate}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Mechanism of Injury</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-body text-surface-700 dark:text-surface-300">{mockInjury.mechanism}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Imaging</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {mockInjury.imaging.map((img, i) => (
                      <Badge key={i} variant="outline" className="flex items-center gap-1.5"><FileText className="w-3 h-3" />{img}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'rehab' && (
            <div className="space-y-6">
              <p className="text-body text-surface-500">Rehabilitation plan and exercises will be displayed here.</p>
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-surface-300 dark:text-surface-600" />
                  <p className="text-body">No rehab plan assigned yet</p>
                  <p className="text-body-sm text-surface-500 mt-1">Create a rehab plan to track progress</p>
                  <Button className="mt-4" leftIcon={<Plus className="w-4 h-4" />}>Create Rehab Plan</Button>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'rtp' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Return to Play Protocol</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-body text-surface-500 mb-4">RTP Protocol: Hamstring Strain - Standard (4 stages)</p>
                  <div className="space-y-4">
                    {[
                      { stage: 1, name: 'Acute Phase', criteria: ['Pain-free walking', 'No tenderness on palpation'], minDays: 3, status: 'completed' },
                      { stage: 2, name: 'Sub-Acute Phase', criteria: ['Pain-free jogging', 'Strength > 70% contralateral'], minDays: 7, status: 'current' },
                      { stage: 3, name: 'Functional Phase', criteria: ['Pain-free sprinting', 'Strength > 90% contralateral'], minDays: 14, status: 'pending' },
                      { stage: 4, name: 'Return to Sport', criteria: ['Full training participation', 'Psychological readiness'], minDays: 7, status: 'pending' },
                    ].map((stage) => (
                      <div key={stage.stage} className={`p-4 rounded-lg border ${stage.status === 'completed' ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : stage.status === 'current' ? 'border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20' : 'border-surface-200 dark:border-surface-700'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${stage.status === 'completed' ? 'bg-green-500 text-white' : stage.status === 'current' ? 'bg-primary-500 text-white' : 'bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-400'}`}>
                              {stage.stage}
                            </span>
                            <div>
                              <p className="font-medium">{stage.name}</p>
                              <p className="text-body-sm text-surface-500">Min {stage.minDays} days</p>
                            </div>
                          </div>
                          <Badge variant={stage.status === 'completed' ? 'success' : stage.status === 'current' ? 'primary' : 'neutral'} size="sm">
                            {stage.status.charAt(0).toUpperCase() + stage.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="mt-3 ml-11 space-y-1">
                          {stage.criteria.map((c, i) => (
                            <div key={i} className="flex items-center gap-2 text-body-sm text-surface-600 dark:text-surface-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                              {c}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-heading-sm font-semibold">Daily Rehab Logs</h3>
                <Button leftIcon={<Plus className="w-4 h-4" />}>Add Log Entry</Button>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-body text-surface-500 text-center py-12">No rehab logs recorded yet. Add your first entry to track progress.</p>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}