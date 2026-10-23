import React from 'react';
import { cn } from '@/utils/helpers';

export type FeedTone = 'neutral' | 'volt' | 'success' | 'danger' | 'amber' | 'info';

export interface FeedItemData {
  id: string;
  title: React.ReactNode;
  detail?: React.ReactNode;
  /** Pre-formatted: "14:32", "2h ago", "Mon". Rendered in mono so columns line up. */
  time?: string;
  tone?: FeedTone;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
}

const markerTone: Record<FeedTone, string> = {
  neutral: 'bg-cold-500',
  volt: 'bg-volt',
  success: 'bg-success-500',
  danger: 'bg-danger-500',
  amber: 'bg-amber-500',
  info: 'bg-info-500',
};

export interface ActivityFeedProps {
  items: FeedItemData[];
  className?: string;
  emptyLabel?: string;
}

/**
 * A list of things that actually happened, newest first. Replaces card grids
 * wherever the content is a sequence of events rather than a set of objects.
 */
export function ActivityFeed({ items, className, emptyLabel = 'Nothing has happened yet.' }: ActivityFeedProps) {
  if (!items.length) {
    return <p className={cn('px-4 py-6 text-body-sm text-text-muted', className)}>{emptyLabel}</p>;
  }

  return (
    <ul className={cn('divide-y divide-border/60', className)}>
      {items.map(item => {
        const body = (
          <>
            <span className="relative mt-1.5 flex h-2 w-2 shrink-0 items-center justify-center">
              <span className={cn('h-1.5 w-1.5 rounded-full', markerTone[item.tone ?? 'neutral'])} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate text-body-sm font-medium text-text-primary">{item.title}</span>
                {item.time && <span className="num shrink-0 text-micro text-text-muted">{item.time}</span>}
              </span>
              {item.detail && <span className="mt-0.5 block truncate text-caption text-text-secondary">{item.detail}</span>}
            </span>
            {item.icon && <span className="mt-0.5 shrink-0 text-text-muted">{item.icon}</span>}
          </>
        );

        const shared = 'flex w-full items-start gap-3 px-4 py-3 text-left';

        return (
          <li key={item.id}>
            {item.href ? (
              <a href={item.href} className={cn(shared, 'transition-colors hover:bg-white/[0.03]')}>
                {body}
              </a>
            ) : item.onClick ? (
              <button type="button" onClick={item.onClick} className={cn(shared, 'transition-colors hover:bg-white/[0.03]')}>
                {body}
              </button>
            ) : (
              <div className={shared}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
