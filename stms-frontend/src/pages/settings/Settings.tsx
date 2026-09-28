import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Textarea, Select, SelectOption, Badge, Avatar, Switch } from '@/components/ui';
import { User, Shield, Bell, Palette, Globe, Save, Key, Moon, Sun, Monitor, LogOut, Eye, EyeOff, Upload } from 'lucide-react';
import { useAuth, useTheme } from '@/context';
import { User as UserType } from '@/types';
import { toast } from 'sonner';

const settingsTabs = [
  { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  { id: 'club', label: 'Club Settings', icon: <Shield className="w-4 h-4" /> },
];

const mockUser: UserType = {
  id: '1',
  firebaseUid: 'u1',
  email: 'coach.john@aditya.edu',
  name: 'John Coach',
  avatarUrl: null,
  role: 'club_admin',
  clubIds: ['1'],
  activeClubId: '1',
  status: 'active',
  lastLoginAt: new Date().toISOString(),
  createdAt: '2024-01-15',
  updatedAt: new Date().toISOString(),
};

export function Settings() {
  const { user, hasRole, hasPermission } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    name: mockUser.name,
    email: mockUser.email,
    phone: '+91 98765 43210',
    bio: 'Head Coach - Sprint & Jumps',
  });
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false,
  });
  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    push: true,
    workoutReminders: true,
    attendanceAlerts: true,
    performanceUpdates: true,
    permissionUpdates: true,
    marketingEmails: false,
  });

  // Check if user has club admin permissions
  const isClubAdmin = hasRole(['club_admin', 'system_admin']);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-heading-lg font-bold text-surface-900 dark:text-surface-100">Settings</h1>
          <p className="text-body text-surface-500 dark:text-surface-400 mt-1">Manage your account and preferences</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-lg overflow-x-auto">
        {settingsTabs
          .filter(tab => tab.id !== 'club' || isClubAdmin)
          .map(tab => (
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
          {activeTab === 'profile' && (
            <div className="max-w-2xl space-y-6">
              <div className="flex items-center gap-6">
                <Avatar size="xl" name={profileData.name} src={mockUser.avatarUrl} />
                <div>
                  <Button variant="outline" leftIcon={<Upload className="w-4 h-4" />}>Change Avatar</Button>
                  <p className="text-caption text-surface-500 mt-1">JPG, PNG up to 5MB</p>
                </div>
              </div>
              <Input label="Full Name" value={profileData.name} onChange={e => setProfileData(prev => ({ ...prev, name: e.target.value }))} />
              <Input label="Email" type="email" value={profileData.email} onChange={e => setProfileData(prev => ({ ...prev, email: e.target.value }))} disabled />
              <Input label="Phone" type="tel" value={profileData.phone} onChange={e => setProfileData(prev => ({ ...prev, phone: e.target.value }))} placeholder="+91 98765 43210" />
              <Textarea label="Bio" placeholder="Tell us about yourself..." rows={3} value={profileData.bio} onChange={e => setProfileData(prev => ({ ...prev, bio: e.target.value }))} />
              <Button onClick={() => toast.success('Profile updated!')} leftIcon={<Save className="w-4 h-4" />}>Save Changes</Button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="max-w-2xl space-y-8">
              <div>
                <h3 className="text-heading-sm font-semibold mb-4">Change Password</h3>
                <div className="space-y-4">
                  <Input label="Current Password" type="password" placeholder="Enter current password" value={securityData.currentPassword} onChange={e => setSecurityData(prev => ({ ...prev, currentPassword: e.target.value }))} leftIcon={<Key className="w-5 h-5" />} />
                  <Input label="New Password" type="password" placeholder="Min 12 characters" value={securityData.newPassword} onChange={e => setSecurityData(prev => ({ ...prev, newPassword: e.target.value }))} leftIcon={<Key className="w-5 h-5" />} />
                  <Input label="Confirm New Password" type="password" placeholder="Confirm new password" value={securityData.confirmPassword} onChange={e => setSecurityData(prev => ({ ...prev, confirmPassword: e.target.value }))} leftIcon={<Key className="w-5 h-5" />} />
                </div>
                <Button onClick={() => toast.success('Password updated!')} leftIcon={<Save className="w-4 h-4" />}>Update Password</Button>
              </div>
              <div className="border-t border-surface-200 dark:border-surface-700 pt-8">
                <h3 className="text-heading-sm font-semibold mb-4">Two-Factor Authentication</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Authenticator App</p>
                    <p className="text-body-sm text-surface-500">Use Google Authenticator or similar for 2FA</p>
                  </div>
                  <Button variant={securityData.twoFactorEnabled ? 'secondary' : 'primary'} onClick={() => setSecurityData(prev => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }))}>
                    {securityData.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                  </Button>
                </div>
              </div>
              <div className="border-t border-surface-200 dark:border-surface-700 pt-8">
                <h3 className="text-heading-sm font-semibold mb-4">Active Sessions</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                    <div className="flex items-center gap-3">
                      <Monitor className="w-5 h-5 text-surface-500" />
                      <div>
                        <p className="font-medium">Current Session</p>
                        <p className="text-body-sm text-surface-500">Chrome on Windows • Active now</p>
                      </div>
                    </div>
                    <Badge variant="success">Current</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                    <div className="flex items-center gap-3">
                      <Monitor className="w-5 h-5 text-surface-500" />
                      <div>
                        <p className="font-medium">Mobile App</p>
                        <p className="text-body-sm text-surface-500">iOS • Last active 2 hours ago</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" leftIcon={<LogOut className="w-4 h-4" />}>Revoke</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-2xl space-y-6">
              <h3 className="text-heading-sm font-semibold mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                {Object.entries(notificationPrefs).map(([key, value]) => {
                  const labels: Record<string, string> = {
                    email: 'Email Notifications',
                    push: 'Push Notifications',
                    workoutReminders: 'Workout Reminders',
                    attendanceAlerts: 'Attendance Alerts',
                    performanceUpdates: 'Performance Updates',
                    permissionUpdates: 'Permission Updates',
                    marketingEmails: 'Marketing Emails',
                  };
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{labels[key]}</p>
                        <p className="text-body-sm text-surface-500">Receive {labels[key].toLowerCase()} via {key === 'email' ? 'email' : key === 'push' ? 'push' : 'app'}</p>
                      </div>
                      <Switch checked={value} onChange={checked => setNotificationPrefs(prev => ({ ...prev, [key]: checked }))} />
                    </div>
                  );
                })}
              </div>
              <Button onClick={() => toast.success('Preferences saved!')} leftIcon={<Save className="w-4 h-4" />}>Save Preferences</Button>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h3 className="text-heading-sm font-semibold mb-4">Theme</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  {(['light', 'dark', 'system'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${
                        theme === t
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
                      }`}
                    >
                      {t === 'light' && <Sun className="w-8 h-8 mx-auto mb-2 text-gold-500" />}
                      {t === 'dark' && <Moon className="w-8 h-8 mx-auto mb-2 text-primary-500" />}
                      {t === 'system' && <Monitor className="w-8 h-8 mx-auto mb-2 text-primary-500" />}
                      <p className="font-medium capitalize">{t}</p>
                      <p className="text-caption text-surface-500 mt-1">
                        {t === 'light' ? 'Always light' : t === 'dark' ? 'Always dark' : 'Match system'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-surface-200 dark:border-surface-700 pt-6">
                <h3 className="text-heading-sm font-semibold mb-4">Density</h3>
                <Select
                  options={[
                    { value: 'comfortable', label: 'Comfortable' },
                    { value: 'compact', label: 'Compact' },
                    { value: 'spacious', label: 'Spacious' },
                  ]}
                  placeholder="Display density"
                />
              </div>
            </div>
          )}

          {activeTab === 'club' && (
            <div className="max-w-2xl space-y-6">
              <h3 className="text-heading-sm font-semibold mb-4">Club Settings</h3>
              <p className="text-body text-surface-500">Manage club branding, defaults, and member permissions</p>
              <div className="space-y-4">
                <Input label="Club Name" placeholder="Aditya Athletics Club" />
                <Input label="Club Slug" placeholder="aditya-athletics" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Primary Color" type="color" defaultValue="#1E3A8A" />
                  <Input label="Secondary Color" type="color" defaultValue="#F59E0B" />
                </div>
                <Input label="Logo URL" placeholder="https://example.com/logo.png" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select label="Timezone" options={[
                    { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
                    { value: 'UTC', label: 'UTC' },
                  ]} />
                  <Input label="Min Attendance %" type="number" min="0" max="100" defaultValue="75" />
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4 rounded border-surface-300 text-primary-800" defaultChecked />
                  <span>Require workout verification</span>
                </label>
                <Button leftIcon={<Save className="w-4 h-4" />}>Save Club Settings</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}