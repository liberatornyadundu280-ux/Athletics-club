import React, { useEffect, useState } from 'react';
import { Building2, Moon, Palette, Save, Sun, UserRound } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Card, CardContent, Input } from '@/components/ui';
import { useAuth, useTheme } from '@/context';
import { clubApi } from '@/services/api';
import { Club } from '@/types';

type Tab = 'profile' | 'appearance' | 'club';

export function Settings() {
  const location = useLocation();
  const { user, updateProfile, hasPermission } = useAuth();
  const { theme, setTheme } = useTheme();
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
    { id: 'appearance', label: 'Appearance', icon: <Palette className="h-4 w-4" /> },
    ...(canEditClub ? [{ id: 'club' as const, label: 'Club settings', icon: <Building2 className="h-4 w-4" /> }] : []),
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div><p className="text-sm font-semibold text-sky-400">YOUR TRAINING SPACE</p><h1 className="mt-2 text-3xl font-bold text-text-primary">Settings</h1><p className="mt-1 text-text-secondary">Account details and preferences for your work with the team.</p></div>
      <div className="flex gap-2 overflow-x-auto border-b border-border" role="tablist" aria-label="Settings sections">
        {tabs.map(tab => <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'border-sky-400 text-sky-300' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>{tab.icon}{tab.label}</button>)}
      </div>

      {activeTab === 'profile' && <Card><CardContent className="max-w-2xl space-y-5 p-6"><div><h2 className="text-xl font-semibold text-text-primary">Account profile</h2><p className="mt-1 text-sm text-text-secondary">This name appears on your roster and training records.</p></div><form onSubmit={saveName} className="space-y-4"><Input label="Full name" value={name} minLength={2} maxLength={100} required onChange={event => setName(event.target.value)} autoComplete="name" /><Input label="Email address" type="email" value={user?.email || ''} disabled hint="Email is managed by Firebase Authentication." /><div className="flex justify-end"><Button type="submit" loading={saving} disabled={name.trim().length < 2 || name.trim() === user?.name} leftIcon={<Save className="h-4 w-4" />}>Save changes</Button></div></form></CardContent></Card>}

      {activeTab === 'appearance' && <Card><CardContent className="p-6"><div><h2 className="text-xl font-semibold text-text-primary">Appearance</h2><p className="mt-1 text-sm text-text-secondary">Choose how STMS looks on this device.</p></div><div className="mt-6 grid gap-3 sm:grid-cols-3">{([{ id: 'light', title: 'Daylight', text: 'Bright, clear screens', icon: Sun }, { id: 'dark', title: 'Trackside', text: 'Low light training spaces', icon: Moon }, { id: 'system', title: 'Follow device', text: 'Match your device setting', icon: Palette }] as const).map(option => <button key={option.id} onClick={() => setTheme(option.id)} aria-pressed={theme === option.id} className={`rounded-xl border p-5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${theme === option.id ? 'border-sky-400 bg-sky-500/10' : 'border-border hover:border-sky-400/50'}`}><option.icon className="h-5 w-5 text-amber-400" /><p className="mt-4 font-semibold text-text-primary">{option.title}</p><p className="mt-1 text-sm text-text-secondary">{option.text}</p></button>)}</div></CardContent></Card>}

      {activeTab === 'club' && <Card><CardContent className="p-6">{!user?.activeClubId ? <p className="py-8 text-center text-text-secondary">Select a club before changing its settings.</p> : loading ? <p className="py-8 text-center text-text-secondary" role="status">Loading club settings…</p> : !club ? <p className="py-8 text-center text-text-secondary">Club settings could not be loaded.</p> : <form onSubmit={saveClub} className="max-w-3xl space-y-5"><div><h2 className="text-xl font-semibold text-text-primary">{club.name}</h2><p className="mt-1 text-sm text-text-secondary">Club branding and training defaults.</p></div><div className="grid gap-4 sm:grid-cols-2"><Input label="Primary color" type="color" value={clubForm.primaryColor} onChange={event => setClubForm(prev => ({ ...prev, primaryColor: event.target.value }))} /><Input label="Secondary color" type="color" value={clubForm.secondaryColor} onChange={event => setClubForm(prev => ({ ...prev, secondaryColor: event.target.value }))} /></div><Input label="Logo URL" type="url" value={clubForm.logoUrl} onChange={event => setClubForm(prev => ({ ...prev, logoUrl: event.target.value }))} placeholder="https://…" /><div className="grid gap-4 sm:grid-cols-2"><Input label="Timezone" value={clubForm.timezone} onChange={event => setClubForm(prev => ({ ...prev, timezone: event.target.value }))} /><Input label="Minimum attendance (%)" type="number" min={0} max={100} value={clubForm.attendanceMinPercent} onChange={event => setClubForm(prev => ({ ...prev, attendanceMinPercent: Number(event.target.value) }))} /></div><label className="flex items-center gap-3 text-sm text-text-secondary"><input type="checkbox" checked={clubForm.workoutVerificationRequired} onChange={event => setClubForm(prev => ({ ...prev, workoutVerificationRequired: event.target.checked }))} className="h-4 w-4 accent-sky-500" />Require workout verification</label><div className="flex justify-end"><Button type="submit" loading={saving} leftIcon={<Save className="h-4 w-4" />}>Save club settings</Button></div></form>}</CardContent></Card>}
    </div>
  );
}
