import React from 'react';
import { cn } from '@/utils/helpers';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  /** Always offer the next step. An empty screen is an invitation, never an apology. */
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, className, compact = false }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-4 py-14', className)}>
      {icon && (
        <div className="mb-3 grid h-11 w-11 place-items-center rounded-full border border-border bg-white/[0.03] text-text-muted">
          {icon}
        </div>
      )}
      <p className="text-heading-sm font-semibold text-text-primary">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-body-sm leading-relaxed text-text-secondary">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}
