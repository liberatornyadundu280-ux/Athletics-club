import React from 'react';
import { cn } from '@/utils/helpers';

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

export interface SegmentedProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
}

/**
 * Compact filter control. Replaces loose groups of pill buttons so a row of
 * filters reads as one object with one selected state.
 */
export function Segmented<T extends string = string>({
  options,
  value,
  onChange,
  className,
  ariaLabel = 'Filter',
}: SegmentedProps<T>) {
  return (
    <div
      className={cn('inline-flex items-center gap-0.5 rounded-radius-md border border-border bg-ink/50 p-0.5', className)}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map(option => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-caption font-medium transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/70',
              active ? 'bg-white/[0.08] text-text-primary' : 'text-text-muted hover:text-text-secondary'
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={cn('num text-micro', active ? 'text-volt' : 'text-text-muted')}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
