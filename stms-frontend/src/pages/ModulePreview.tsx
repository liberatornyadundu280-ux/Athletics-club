import React from 'react';
import { ArrowLeft, CalendarDays, CircleDashed, LockKeyhole } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent } from '@/components/ui';

export interface ModulePreviewProps {
  title: string;
  sprint: number;
  description: string;
}

export function ModulePreview({ title, sprint, description }: ModulePreviewProps) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} leftIcon={<ArrowLeft className="h-4 w-4" />}>Dashboard</Button>
      <section className="surface-raised relative overflow-hidden p-6 sm:p-9">
        <div className="absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r from-sky-400 via-sky-500 to-amber-400" />
        <div className="flex items-start gap-5">
          <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-300"><CircleDashed className="h-8 w-8" /></div>
          <div>
            <p className="text-sm font-semibold text-sky-400">SPRINT {sprint} · IN DEVELOPMENT</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">{title}</h1>
            <p className="mt-3 max-w-2xl leading-relaxed text-text-secondary">{description}</p>
          </div>
        </div>
      </section>
      <Card><CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" /><div><h2 className="font-semibold text-text-primary">This workspace is not connected yet</h2><p className="mt-1 text-sm text-text-secondary">The current backend does not expose {title.toLowerCase()} endpoints. We’ll show real records here when that sprint is implemented.</p></div></div><div className="flex shrink-0 items-center gap-2 text-sm text-text-muted"><CalendarDays className="h-4 w-4" /> Sprint {sprint}</div></CardContent></Card>
    </div>
  );
}
