import React from 'react';
import { cn } from '@/utils/helpers';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

/* ============================================================
   Data display: numbers first, decoration never.
   ============================================================ */

export type StatTone = 'neutral' | 'volt' | 'success' | 'danger' | 'amber' | 'info';

export interface StatProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  /** A short qualifier under the number: "of 26 athletes", "last 14 days". */
  hint?: string;
  trend?: { direction: 'up' | 'down' | 'flat'; label: string; good?: boolean };
  tone?: StatTone;
  icon?: React.ReactNode;
  className?: string;
}

const toneRing: Record<StatTone, string> = {
  neutral: 'text-text-secondary',
  volt: 'text-volt',
  success: 'text-success-400',
  danger: 'text-danger-400',
  amber: 'text-amber-400',
  info: 'text-info-400',
};

export function Stat({ label, value, unit, hint, trend, tone = 'neutral', icon, className }: StatProps) {
  const TrendIcon = trend?.direction === 'up' ? ArrowUpRight : trend?.direction === 'down' ? ArrowDownRight : Minus;
  const good = trend?.good ?? trend?.direction === 'up';

  return (
    <div className={cn('surface flex flex-col justify-between gap-3 p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <span className="stat-label">{label}</span>
        {icon && <span className={cn('shrink-0', toneRing[tone])}>{icon}</span>}
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className="num text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-text-primary">
            {value}
          </span>
          {unit && <span className="text-body-sm font-medium text-text-muted">{unit}</span>}
        </div>
        <div className="mt-2 flex items-center gap-2">
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-caption font-medium',
                good ? 'text-success-400' : 'text-danger-400'
              )}
            >
              <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="num">{trend.label}</span>
            </span>
          )}
          {hint && <span className="truncate text-caption text-text-muted">{hint}</span>}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Sparkline — 14 days of attendance, no chart library
   ============================================================ */

export interface SparklineProps {
  points: number[];
  height?: number;
  /** Accessible description; the sparkline itself is decorative to a screen reader. */
  label?: string;
  className?: string;
  tone?: 'volt' | 'success' | 'danger';
}

export function Sparkline({ points, height = 44, label, className, tone = 'volt' }: SparklineProps) {
  const stroke = tone === 'success' ? '#22C55E' : tone === 'danger' ? '#EF4444' : '#D8FF3E';
  const gradientId = React.useId().replace(/:/g, '');

  if (!points.length) {
    return <div className={cn('w-full rounded bg-white/[0.04]', className)} style={{ height }} aria-hidden="true" />;
  }

  const width = 100;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const step = points.length > 1 ? width / (points.length - 1) : width;

  const coords = points.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / span) * (height - 6) - 3;
    return [x, y] as const;
  });

  const line = coords.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  const last = coords[coords.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('w-full overflow-visible', className)}
      style={{ height }}
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={`spark-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${gradientId})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {last && <circle cx={last[0]} cy={last[1]} r="2" fill={stroke} vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

/* ============================================================
   Progress ring — completion, readiness, load
   ============================================================ */

export interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  tone?: 'volt' | 'success' | 'danger' | 'amber';
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  value,
  max = 100,
  size = 76,
  strokeWidth = 6,
  tone = 'volt',
  label,
  className,
  children,
}: ProgressRingProps) {
  const pct = Math.min(Math.max(value / max, 0), 1);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const colors = { volt: '#D8FF3E', success: '#22C55E', danger: '#EF4444', amber: '#FFB020' };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={label}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors[tone]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children ?? <span className="num text-body-sm font-semibold text-text-primary">{Math.round(pct * 100)}%</span>}
      </div>
    </div>
  );
}
