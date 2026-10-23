import React, { useEffect, useState } from 'react';
import { Building2, Save, UserRound } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Card, CardContent, Input, PageHeader } from '@/components/ui';
import { useAuth } from '@/context';
import { clubApi } from '@/services/api';
import { Club } from '@/types';

type Tab = 'profile' | 'club';

export function Settings() {
  const location = useLocation();
  const { user, updateProfile, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>(location.pathname.endsWith('/club') ? 'club' : 'profile');
  const [name, setName] = useState(user?.name || '');
  const [club, setClub] = useState<Club | null>(null);
  const [clubForm, setClubForm] = useState({ primaryColor: '#1E3A8A', secondaryColor: '#F59E0B', logoUrl: '', timezone: 'Asia/Kolkata', attendanceMinPercent: 75, workoutVerificationRequired: false });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const canEditClub = hasPermission('club:settings');

  useEffect(() => { setActiveTab(location.pathname.endsWith('/club') ? 'club' : 'profile'); }, [location.pathname]);
  useEffect(() => { setName(user?.name || ''); }, [user?.name]);

  useEffect(() => {
    if (activeTab !== 'club' || !user?.activeClubId || !canEditClub) return;
    let active = true;
    setLoading(true);
    clubApi.getClub(user.activeClubId).then((data: Club) => {
      if (!active) return;
      setClub(data);
      setClubForm({
        primaryColor: data.branding.primaryColor,
        secondaryColor: data.branding.secondaryColor,
        logoUrl: data.branding.logoUrl || '',
        timezone: data.settings.timezone,
        attendanceMinPercent: data.settings.attendanceMinPercent,
        workoutVerificationRequired: data.settings.workoutVerificationRequired,
      });
    }).catch((error: any) => toast.error(error.message || 'Could not load club settings')).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeTab, user?.activeClubId, canEditClub]);

  const saveName = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try { await updateProfile({ name: name.trim() }); toast.success('Profile saved'); }
    catch (error: any) { toast.error(error.message || 'Could not save profile'); }
    finally { setSaving(false); }
  };

  const saveClub = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!club) return;
    setSaving(true);
    try {
      const updated = await clubApi.updateClub(club.id, {
        branding: { primaryColor: clubForm.primaryColor, secondaryColor: clubForm.secondaryColor, logoUrl: clubForm.logoUrl || null },
        settings: { timezone: clubForm.timezone, attendanceMinPercent: Number(clubForm.attendanceMinPercent), workoutVerificationRequired: clubForm.workoutVerificationRequired },
      });
      setClub(updated);
      toast.success('Club settings saved');
    } catch (error: any) { toast.error(error.message || 'Could not save club settings'); }
    finally { setSaving(false); }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <UserRound className="h-4 w-4" /> },
    ...(canEditClub ? [{ id: 'club' as const, label: 'Club settings', icon: <Building2 className="h-4 w-4" /> }] : []),
  ];

  return (
    <div className="page-shell">
      <PageHeader
        title="Settings"
        description="Your account details and the defaults your club trains by."
      />

      <div className="flex gap-1 border-b border-border" role="tablist" aria-label="Settings sections">
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab inline-flex items-center gap-2 ${activeTab === tab.id ? 'tab-active' : ''}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <Card>
          <CardContent className="max-w-2xl space-y-5 p-6">
            <div>
              <h2 className="text-heading-sm font-semibold text-text-primary">Account profile</h2>
              <p className="mt-1 text-body-sm text-text-secondary">This name appears on your roster and training records.</p>
            </div>
            <form onSubmit={saveName} className="space-y-4">
              <Input label="Full name" value={name} minLength={2} maxLength={100} required onChange={event => setName(event.target.value)} autoComplete="name" />
              <Input label="Email address" type="email" value={user?.email || ''} disabled hint="Email is managed by Firebase Authentication." />
              <div className="flex justify-end">
                <Button type="submit" loading={saving} disabled={name.trim().length < 2 || name.trim() === user?.name} leftIcon={<Save className="h-4 w-4" />}>
                  Save changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'club' && (
        <Card>
          <CardContent className="p-6">
            {!user?.activeClubId ? (
              <p className="py-8 text-center text-body-sm text-text-secondary">Select a club before changing its settings.</p>
            ) : loading ? (
              <p className="py-8 text-center text-body-sm text-text-secondary" role="status">Loading club settings…</p>
            ) : !club ? (
              <p className="py-8 text-center text-body-sm text-text-secondary">Club settings could not be loaded.</p>
            ) : (
              <form onSubmit={saveClub} className="max-w-3xl space-y-5">
                <div>
                  <h2 className="text-heading-sm font-semibold text-text-primary">{club.name}</h2>
                  <p className="mt-1 text-body-sm text-text-secondary">Club branding and training defaults.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Primary color" type="color" value={clubForm.primaryColor} onChange={event => setClubForm(prev => ({ ...prev, primaryColor: event.target.value }))} />
                  <Input label="Secondary color" type="color" value={clubForm.secondaryColor} onChange={event => setClubForm(prev => ({ ...prev, secondaryColor: event.target.value }))} />
                </div>
                <Input label="Logo URL" type="url" value={clubForm.logoUrl} onChange={event => setClubForm(prev => ({ ...prev, logoUrl: event.target.value }))} placeholder="https://…" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Timezone" value={clubForm.timezone} onChange={event => setClubForm(prev => ({ ...prev, timezone: event.target.value }))} />
                  <Input label="Minimum attendance (%)" type="number" min={0} max={100} value={clubForm.attendanceMinPercent} onChange={event => setClubForm(prev => ({ ...prev, attendanceMinPercent: Number(event.target.value) }))} />
                </div>
                <label className="flex items-center gap-3 text-body-sm text-text-secondary">
                  <input type="checkbox" checked={clubForm.workoutVerificationRequired} onChange={event => setClubForm(prev => ({ ...prev, workoutVerificationRequired: event.target.checked }))} className="h-4 w-4 accent-volt" />
                  Require workout verification
                </label>
                <div className="flex justify-end">
                  <Button type="submit" loading={saving} leftIcon={<Save className="h-4 w-4" />}>Save club settings</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
