import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BadgeCheck, Dumbbell, Save, Sparkles, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, Button, Card, CardContent, Input } from '@/components/ui';
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

  const spaces = [
    { icon: Dumbbell, title: 'Workouts', text: 'Sessions and assignments', to: '/workouts' },
    { icon: Sparkles, title: 'Training suggestions', text: 'The plan behind your next session', to: '/recommendations' },
    { icon: BadgeCheck, title: 'Performance', text: 'Results, personal bests and goals', to: '/performance' },
  ];

  return (
    <div className="page-shell">
      <Button variant="ghost" size="sm" className="-ml-2 self-start" onClick={() => navigate('/dashboard')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
        Today
      </Button>

      <section className="surface p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar size="xl" name={user?.name} src={user?.avatarUrl || undefined} />
          <div className="min-w-0 flex-1">
            <p className="stat-label">Your profile</p>
            <h1 className="mt-1 truncate font-display text-2xl uppercase leading-none tracking-[-0.01em] text-text-primary sm:text-3xl">
              {user?.name || 'Your profile'}
            </h1>
            <p className="mt-2 truncate text-body-sm text-text-secondary">{user?.email}</p>
          </div>
          <span className="badge-primary capitalize sm:shrink-0">{user?.role.replace('_', ' ')}</span>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,.7fr)]">
        <Card padding="none">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <UserRound className="h-4 w-4 text-volt" aria-hidden="true" />
              <div>
                <h2 className="text-heading-sm font-semibold text-text-primary">Account details</h2>
                <p className="mt-0.5 text-caption text-text-secondary">Keep the name your team sees up to date.</p>
              </div>
            </div>
            <form onSubmit={saveProfile} className="space-y-4">
              <Input
                label="Full name"
                required
                minLength={2}
                maxLength={100}
                value={name}
                onChange={event => setName(event.target.value)}
                autoComplete="name"
              />
              <Input label="Email address" value={user?.email || ''} disabled hint="Email is managed by Firebase Authentication." />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  loading={saving}
                  disabled={name.trim().length < 2 || name.trim() === user?.name}
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  Save profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card padding="none">
          <CardContent className="p-5">
            <h2 className="text-heading-sm font-semibold text-text-primary">Your training space</h2>
            <p className="mt-1 text-caption text-text-secondary">Jump straight to the records that follow you through the season.</p>

            <div className="mt-4 space-y-1.5">
              {spaces.map(item => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => navigate(item.to)}
                  className="group flex w-full items-center gap-3 rounded-radius-md border border-border px-3 py-2.5 text-left transition-colors hover:border-volt/40 hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/70"
                >
                  <item.icon className="h-4 w-4 shrink-0 text-volt" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-body-sm font-medium text-text-primary">{item.title}</span>
                    <span className="block truncate text-caption text-text-muted">{item.text}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-volt" aria-hidden="true" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
