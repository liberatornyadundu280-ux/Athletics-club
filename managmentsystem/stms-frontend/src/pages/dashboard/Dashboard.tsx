import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Building2, Dumbbell, Shield, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, CardContent } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { clubApi } from '@/services/api';
import { Club } from '@/types';

const upcoming = [
  { title: 'Athlete profiles', sprint: 'Sprint 2', path: '/athletes', icon: Users, detail: 'Build a complete club roster and athlete profiles.' },
  { title: 'Attendance', sprint: 'Sprint 3', path: '/attendance', icon: Shield, detail: 'Track training attendance and session check-ins.' },
  { title: 'Workout plans', sprint: 'Sprint 4', path: '/workouts', icon: Dumbbell, detail: 'Create and assign structured training sessions.' },
];

export function Dashboard() {
  const navigate = useNavigate();
  const { user, hasRole, hasPermission } = useAuth();
  const [club, setClub] = useState<Club | null>(null);

  useEffect(() => {
    if (!user?.activeClubId) return;
    let active = true;
    clubApi.getClub(user.activeClubId).then((result: Club) => { if (active) setClub(result); }).catch(() => { if (active) setClub(null); });
    return () => { active = false; };
  }, [user?.activeClubId]);

  const admin = hasRole(['club_admin', 'system_admin']);
  const canReadAthletes = hasPermission('athlete:read');
  const needsClub = user?.role === 'athlete' && !user.activeClubId && user.clubIds.length === 0;

  return (
    <div className="space-y-7">
      <section className="surface-raised relative overflow-hidden p-6 sm:p-9">
        <div className="absolute right-0 top-0 h-full w-1.5 bg-gradient-to-b from-sky-400 via-sky-500 to-amber-400" />
        <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-sky-400">SMART TRAINER MANAGEMENT SYSTEM</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">Good training starts with a clear picture.</h1>
            <p className="mt-3 leading-relaxed text-text-secondary">Welcome, {user?.name?.split(' ')[0] || 'team member'}. Your coaching workspace is ready for the next step.</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-cold-900/50 px-4 py-3">
            <Building2 className="h-5 w-5 text-amber-400" />
            <div><p className="text-xs text-text-muted">Active club</p><p className="max-w-[220px] truncate font-medium text-text-primary">{club?.name || (user?.activeClubId ? 'Loading club…' : 'No club selected')}</p></div>
          </div>
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button onClick={() => navigate('/profile')}>View my profile <ArrowUpRight className="ml-2 h-4 w-4" /></Button>
          {admin && <Button variant="outline" onClick={() => navigate('/settings/users')} leftIcon={<Users className="h-4 w-4" />}>Manage members</Button>}
        </div>
      </section>

      {needsClub && <section className="surface-raised flex flex-col gap-4 border-l-2 border-amber-400 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-semibold text-text-primary">Choose your training club</h2><p className="mt-1 text-sm text-text-secondary">Browse clubs and send a request to join one.</p></div>
        <Button onClick={() => navigate('/clubs/enroll')} leftIcon={<Building2 className="h-4 w-4" />}>Find a club</Button>
      </section>}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="text-xl font-semibold text-text-primary">Training tools</h2><p className="mt-1 text-sm text-text-secondary">Athlete records are ready for your active club. More training tools will arrive in later sprints.</p></div>
          <Link to="/sprints/2" className="inline-flex items-center gap-1 rounded text-sm font-medium text-sky-400 hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">View sprint progress <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {upcoming.filter(item => item.sprint !== 'Sprint 2' || canReadAthletes).map((item, index) => <Link key={item.title} to={item.path} className="group rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
            <Card className="h-full transition-colors group-hover:border-sky-400/50"><CardContent className="p-5"><div className="flex items-start justify-between"><div className={`rounded-xl p-3 ${index === 1 ? 'bg-amber-400/10 text-amber-300' : 'bg-sky-400/10 text-sky-300'}`}><item.icon className="h-5 w-5" /></div><span className="rounded-full border border-border px-2.5 py-1 text-xs text-text-muted">{item.sprint}</span></div><h3 className="mt-5 font-semibold text-text-primary">{item.title}</h3><p className="mt-1 text-sm leading-relaxed text-text-secondary">{item.detail}</p><p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-sky-400">Open {item.title.toLowerCase()} <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></p></CardContent></Card>
          </Link>)}
        </div>
      </section>

      <Card><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-text-primary">Sprint 2: Athlete profiles & club management</p><p className="mt-1 text-sm text-text-secondary">Roster tools are built. Open sprint progress to see what’s ready for your review.</p></div><div className="flex gap-2"><Button variant="ghost" onClick={() => navigate('/settings')}>Account settings</Button>{admin && <Button variant="outline" onClick={() => navigate('/settings/club')}>Club settings</Button>}</div></CardContent></Card>
    </div>
  );
}
