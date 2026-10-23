import React from 'react';
import { cn } from '@/utils/helpers';

export interface PageHeaderProps {
  /** The page's job, in the user's words. Set in the display face, sentence-shouted once. */
  title: string;
  description?: React.ReactNode;
  /** Primary and secondary actions for this screen. */
  actions?: React.ReactNode;
  /** A quiet row under the title — date ranges, filters, counts. */
  meta?: React.ReactNode;
  className?: string;
}

/**
 * One header for every module. Replaces the per-page hero blocks that all
 * carried an internal "SPRINT n ·" label above an identical heading.
 */
export function PageHeader({ title, description, actions, meta, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="font-display text-2xl uppercase leading-[1.05] tracking-[0.01em] text-text-primary sm:text-[2rem]">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-body-sm leading-relaxed text-text-secondary">{description}</p>}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-caption text-text-muted">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** A labelled group inside a header meta row. */
export function HeaderMeta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-text-muted">{label}</span>
      <span className="num text-text-secondary">{value}</span>
    </span>
  );
}
