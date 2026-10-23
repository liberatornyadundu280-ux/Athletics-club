import React from 'react';
import { cn } from '@/utils/helpers';

export type LaneDayState = 'done' | 'planned' | 'rest' | 'missed';

export interface LaneDay {
  /** ISO date, used as the React key and the accessible label. */
  date: string;
  label: string;
  dayNumber: number;
  state: LaneDayState;
  /** Marks the current day independently of whether anything is scheduled. */
  isToday?: boolean;
}

export interface WeekLaneProps {
  days: LaneDay[];
  onSelect?: (date: string) => void;
  activeDate?: string;
  className?: string;
}

const stateStyles: Record<LaneDayState, { bar: string; label: string }> = {
  done: { bar: 'bg-volt', label: 'text-text-primary' },
  planned: { bar: 'bg-white/25', label: 'text-text-secondary' },
  missed: { bar: 'bg-danger-500/60', label: 'text-text-secondary' },
  rest: { bar: 'bg-white/[0.07]', label: 'text-text-muted' },
};

const stateWords: Record<LaneDayState, string> = {
  done: 'training completed',
  planned: 'session planned',
  missed: 'no attendance recorded',
  rest: 'no session',
};

/**
 * The week, drawn as seven lanes. This is the spine of the app: it answers
 * "where am I in the week" before any content loads.
 */
export function WeekLane({ days, onSelect, activeDate, className }: WeekLaneProps) {
  return (
    <div className={cn('surface flex items-stretch gap-1 p-1.5', className)} role="group" aria-label="This week">
      {days.map(day => {
        const styles = stateStyles[day.state];
        const isActive = activeDate === day.date;

        const content = (
          <>
            <span
              className={cn(
                'text-micro font-semibold uppercase tracking-[0.1em]',
                day.isToday ? 'text-volt' : 'text-text-muted'
              )}
            >
              {day.label}
            </span>
            <span className={cn('num text-body-sm font-semibold', day.isToday ? 'text-volt' : styles.label)}>
              {day.dayNumber}
            </span>
            <span
              className={cn(
                'mt-1 h-1 w-full rounded-full',
                styles.bar,
                day.isToday && 'shadow-[0_0_12px_rgba(216,255,62,0.55)]'
              )}
              aria-hidden="true"
            />
          </>
        );

        const shared = cn(
          'flex flex-1 flex-col items-center gap-1 rounded-md px-1 py-2 transition-colors duration-150',
          day.isToday && 'bg-volt/[0.06]',
          isActive && !day.isToday && 'bg-white/[0.05]',
          onSelect && 'hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/70'
        );

        const label = `${day.label} ${day.dayNumber}, ${day.isToday ? 'today, ' : ''}${stateWords[day.state]}`;

        return onSelect ? (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelect(day.date)}
            className={shared}
            aria-label={label}
            aria-current={day.isToday ? 'date' : undefined}
          >
            {content}
          </button>
        ) : (
          <div
            key={day.date}
            className={shared}
            aria-label={label}
            aria-current={day.isToday ? 'date' : undefined}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
