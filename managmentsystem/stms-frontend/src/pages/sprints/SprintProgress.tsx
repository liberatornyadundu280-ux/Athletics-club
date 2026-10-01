import React from 'react';
import { ArrowLeft, ArrowRight, Building2, Check, ClipboardList, Mail, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, CardContent } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

const milestones = [
  { title: 'Athlete profiles', detail: 'Create, search, edit, and archive records in the active club roster.', icon: Users, path: '/athletes', permission: 'athlete:read' },
  { title: 'Roster import', detail: 'Preview a CSV, import up to 250 rows, and review row-by-row results.', icon: ClipboardList, path: '/athletes', permission: 'athlete:import' },
  { title: 'Members and invitations', detail: 'Manage club members and create invitation links for new teammates.', icon: Mail, path: '/settings/users', permission: 'user:read' },
  { title: 'Club settings', detail: 'Update club branding and training defaults for the selected workspace.', icon: Building2, path: '/settings/club', permission: 'club:settings' },
];

export function SprintProgress() {
  const navigate = useNavigate();
  const { hasPermission, hasRole } = useAuth();
  const available = milestones.filter(item => {
    if (!hasPermission(item.permission)) return false;
    if (item.path === '/athletes') return hasPermission('athlete:read');
    if (item.path === '/settings/users' || item.path === '/settings/club') return hasRole(['club_admin', 'system_admin']);
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} leftIcon={<ArrowLeft className="h-4 w-4" />}>Dashboard</Button>

      <section className="surface-raised relative overflow-hidden p-6 sm:p-9">
        <div className="absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r from-sky-400 via-sky-500 to-amber-400" />
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-sky-400">SPRINT 2 · IMPLEMENTATION READY</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">Athlete profiles & club management</h1>
            <p className="mt-3 leading-relaxed text-text-secondary">The roster, import, invitation, and club settings flows are connected. Review them with your club before Sprint 2 is signed off.</p>
          </div>
          <div className="shrink-0 rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3">
            <p className="text-xs text-text-muted">Current step</p>
            <p className="mt-1 font-semibold text-amber-300">Owner review</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="milestones-heading">
        <div className="mb-4"><h2 id="milestones-heading" className="text-xl font-semibold text-text-primary">What’s ready to review</h2><p className="mt-1 text-sm text-text-secondary">Open each area you can access. Club data stays scoped to your selected workspace.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {available.map(item => <Link key={item.title} to={item.path} className="group rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
            <Card className="h-full transition-colors group-hover:border-sky-400/50"><CardContent className="flex h-full items-start gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300"><item.icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="flex items-center gap-2 font-semibold text-text-primary">{item.title}<Check className="h-4 w-4 text-emerald-400" /></span><span className="mt-1 block text-sm leading-relaxed text-text-secondary">{item.detail}</span><span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-sky-400">Open {item.title.toLowerCase()} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></span>
            </CardContent></Card>
          </Link>)}
        </div>
      </section>

      <Card><CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-text-primary">After your review</h2><p className="mt-1 text-sm text-text-secondary">Check create/edit/archive, CSV row results, invitations, club switching, and access isolation with your configured services.</p></div><Button variant="outline" onClick={() => navigate('/athletes')}>Open athlete roster <ArrowRight className="ml-2 h-4 w-4" /></Button></CardContent></Card>
    </div>
  );
}
