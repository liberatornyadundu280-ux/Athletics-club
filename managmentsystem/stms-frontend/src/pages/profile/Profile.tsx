import React, { useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, CalendarDays, Dumbbell, Save, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, Badge, Button, Card, CardContent, Input } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export function Profile() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setName(user?.name || ''); }, [user?.name]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ name: name.trim() });
      toast.success('Profile saved');
    } catch (error: any) {
      toast.error(error.message || 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} leftIcon={<ArrowLeft className="h-4 w-4" />}>Dashboard</Button>
      <section className="surface-raised relative overflow-hidden p-6 sm:p-8">
        <div className="absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r from-sky-400 via-sky-500 to-amber-400" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar size="xl" name={user?.name} src={user?.avatarUrl || undefined} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-sky-400">ATHLETE & COACH PROFILE</p>
            <h1 className="mt-1 truncate text-3xl font-bold text-text-primary">{user?.name || 'Your profile'}</h1>
            <p className="mt-1 text-text-secondary">{user?.email}</p>
          </div>
          <Badge variant="success" dot>{user?.role.replace('_', ' ')}</Badge>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,.7fr)]">
        <Card>
          <CardContent className="p-6">
            <div className="mb-5 flex items-center gap-3"><UserRound className="h-5 w-5 text-sky-400" /><div><h2 className="font-semibold text-text-primary">Account details</h2><p className="text-sm text-text-secondary">Keep the name your team sees up to date.</p></div></div>
            <form onSubmit={saveProfile} className="space-y-4">
              <Input label="Full name" required minLength={2} maxLength={100} value={name} onChange={event => setName(event.target.value)} autoComplete="name" />
              <Input label="Email address" value={user?.email || ''} disabled hint="Email is managed by Firebase Authentication." />
              <div className="flex justify-end"><Button type="submit" loading={saving} disabled={name.trim().length < 2 || name.trim() === user?.name} leftIcon={<Save className="h-4 w-4" />}>Save profile</Button></div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-text-primary">Your training space</h2>
            <p className="mt-1 text-sm text-text-secondary">Performance and training records will appear here as those sprints are connected.</p>
            <div className="mt-5 space-y-3">
              {[{ icon: Dumbbell, title: 'Workout history', text: 'Available in Sprint 4' }, { icon: CalendarDays, title: 'Attendance record', text: 'Available in Sprint 3' }, { icon: BadgeCheck, title: 'Performance profile', text: 'Available in Sprint 5' }].map(item => <div key={item.title} className="flex items-start gap-3 rounded-lg border border-border p-3"><item.icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /><div><p className="text-sm font-medium text-text-primary">{item.title}</p><p className="text-xs text-text-muted">{item.text}</p></div></div>)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
