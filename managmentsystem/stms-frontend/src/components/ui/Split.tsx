import React, { forwardRef, useState, useEffect, useRef } from 'react';
import { cn } from '@/utils/helpers';

// ==================== SURFACE (replaces Card/Split) ====================
export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'raised' | 'overlay' | 'glass' | 'hover' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  delay?: number;
}

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  ({ children, variant = 'default', padding = 'md', delay = 0, className, ...props }, ref) => {
    const variantClasses = {
      default: 'surface card-pad-md',
      raised: 'surface-raised card-pad-md',
      overlay: 'surface-overlay card-pad-md',
      glass: 'surface-glass card-pad-md',
      hover: 'surface-hover card-pad-md',
      interactive: 'surface-interactive card-pad-md',
    };

    const paddingClasses = {
      none: 'card-pad-none',
      sm: 'card-pad-sm',
      md: 'card-pad-md',
      lg: 'card-pad-lg',
      xl: 'card-pad-xl',
    };

    const delayStyle = delay > 0 ? { animationDelay: `${delay}ms` } : undefined;
    const delayClass = delay > 0 ? 'animate-in' : '';

    return (
      <div
        ref={ref}
        className={cn(
          variantClasses[variant],
          paddingClasses[padding],
          delayClass,
          className
        )}
        style={delayStyle}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Surface.displayName = 'Surface';

// ==================== SURFACE HEADER ====================
export interface SurfaceHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value?: string | number;
  action?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export const SurfaceHeader = forwardRef<HTMLDivElement, SurfaceHeaderProps>(
  ({ label, value, action, trend, trendValue, className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center justify-between mb-4 pb-3 border-b border-border', className)} {...props}>
      <span className="stat-label">{label}</span>
      <div className="flex items-center gap-3">
        {value !== undefined && <span className="stat-value tnum">{value}</span>}
        {trend && trendValue && (
          <span className={cn(
            'stat-trend',
            trend === 'up' && 'stat-trend-up',
            trend === 'down' && 'stat-trend-down',
            trend === 'neutral' && 'stat-trend-neutral'
          )}>
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—'} {trendValue}
          </span>
        )}
        {action}
      </div>
    </div>
  )
);

SurfaceHeader.displayName = 'SurfaceHeader';

// ==================== SURFACE CONTENT ====================
export const SurfaceContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props}>
      {children}
    </div>
  )
);

SurfaceContent.displayName = 'SurfaceContent';

// ==================== STAT CARD (Dashboard metric) ====================
export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accent?: 'sky' | 'success' | 'danger' | 'amber' | 'info';
  delay?: number;
  icon?: React.ReactNode;
  onClick?: () => void;
  clickable?: boolean;
}

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ label, value, sub, trend, trendValue, accent = 'sky', delay = 0, icon, className, onClick, clickable = false, ...props }, ref) => {
    const delayStyle = delay > 0 ? { animationDelay: `${delay}ms` } : undefined;
    const delayClass = delay > 0 ? 'animate-in' : '';

    const accentClasses = {
      sky: 'stat-card',
      success: 'stat-card stat-card-success',
      danger: 'stat-card stat-card-danger',
      amber: 'stat-card stat-card-amber',
      info: 'stat-card stat-card-info',
    };

    const baseClasses = cn(
      'surface p-space-lg relative overflow-hidden',
      accentClasses[accent],
      delayClass,
      clickable && 'cursor-pointer hover:shadow-shadow-glow-sm transition-all',
      className
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick();
      }
    };

    return (
      <div
        ref={ref}
        className={baseClasses}
        style={delayStyle}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        tabIndex={clickable ? 0 : undefined}
        role={clickable ? 'button' : undefined}
        aria-pressed={clickable ? undefined : undefined}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="stat-label">{label}</span>
            <div className="flex items-baseline gap-3 flex-wrap mt-1">
              <span className="stat-value tnum">{value}</span>
              {trend && trendValue && (
                <span className={cn(
                  'stat-trend',
                  trend === 'up' && 'stat-trend-up',
                  trend === 'down' && 'stat-trend-down',
                  trend === 'neutral' && 'stat-trend-neutral'
                )}>
                  {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—'} {trendValue}
                </span>
              )}
            </div>
            {sub && <p className="stat-sub">{sub}</p>}
          </div>
          {icon && <div className="text-cold-500">{icon}</div>}
        </div>
      </div>
    );
  }
);

StatCard.displayName = 'StatCard';

// ==================== BADGE ====================
export type BadgeVariant = 'primary' | 'success' | 'danger' | 'amber' | 'info' | 'neutral' | 'outline' | 'gold' | 'split' | 'lane';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'neutral', size = 'md', dot = false, className, ...props }, ref) => {
    const variantClasses: Record<BadgeVariant, string> = {
      primary: 'badge-primary',
      success: 'badge-success',
      danger: 'badge-danger',
      amber: 'badge-amber',
      info: 'badge-info',
      neutral: 'badge-neutral',
      outline: 'badge-outline',
      gold: 'badge-amber',
      split: 'badge-primary',
      lane: 'badge-neutral',
    };

    const sizeClasses = {
      sm: 'px-2 py-0.5 text-[0.625rem]',
      md: 'px-2.5 py-0.5 text-caption',
      lg: 'px-3 py-1 text-body-sm',
    };

    return (
      <span
        ref={ref}
        className={cn('badge', variantClasses[variant], sizeClasses[size], className)}
        {...props}
      >
        {dot && (
          <span className={cn(
            'w-1.5 h-1.5 rounded-full mr-1.5',
            variant === 'primary' && 'bg-sky-500',
            variant === 'success' && 'bg-success-500',
            variant === 'danger' && 'bg-danger-500',
            variant === 'amber' && 'bg-amber-500',
            variant === 'info' && 'bg-info-500',
            variant === 'neutral' && 'bg-cold-500',
            variant === 'outline' && 'bg-current'
          )} />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// ==================== AVATAR ====================
export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'active' | 'busy' | 'away' | 'offline';
  statusDot?: boolean;
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt, name, size = 'md', status, statusDot = true, className, ...props }, ref) => {
    const sizeClasses = {
      xs: 'avatar-xs',
      sm: 'avatar-sm',
      md: 'avatar-md',
      lg: 'avatar-lg',
      xl: 'avatar-xl',
    };

    const statusClasses = {
      active: 'status-dot-success',
      busy: 'status-dot-danger',
      away: 'status-dot-amber',
      offline: 'status-dot-neutral',
    };

    const initials = name ? getInitials(name) : '?';
    const bgColor = name ? stringToColor(name) : undefined;

    return (
      <div className="relative inline-flex" {...props}>
        <div
          ref={ref}
          className={cn('avatar relative', sizeClasses[size], className)}
          style={bgColor ? { backgroundColor: bgColor } : undefined}
        >
          {src ? (
            <img src={src} alt={alt || name || 'Avatar'} className="w-full h-full object-cover" />
          ) : (
            <span className="font-medium">{initials}</span>
          )}
          {statusDot && status && (
            <span className={cn(
              'absolute bottom-0 right-0 status-dot-live border-2 border-track-900',
              size === 'xs' && 'w-1.5 h-1.5',
              size === 'sm' && 'w-2 h-2',
              size === 'md' && 'w-2.5 h-2.5',
              size === 'lg' && 'w-3 h-3',
              size === 'xl' && 'w-4 h-4',
              statusClasses[status]
            )} />
          )}
        </div>
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export function AvatarGroup({ avatars, max = 5, size = 'md', className }: {
  avatars: Array<{ src?: string; name: string; status?: 'active' | 'busy' | 'away' | 'offline' }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  return (
    <div className={cn('avatar-group', className)}>
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={index}
          {...avatar}
          size={size}
          className="avatar-group-item"
        />
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            'avatar flex-items-center justify-center font-medium text-text-secondary',
            'bg-cold-700 ring-2 ring-track-900',
            size === 'xs' && 'avatar-xs',
            size === 'sm' && 'avatar-sm',
            size === 'md' && 'avatar-md',
            size === 'lg' && 'avatar-lg',
            size === 'xl' && 'avatar-xl'
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

// ==================== VERTICAL TABS (Navigation) ====================
export interface VTabProps extends React.HTMLAttributes<HTMLButtonElement> {
  label: string;
  count?: number;
  icon?: React.ReactNode;
  active?: boolean;
  variant?: 'default' | 'danger' | 'amber';
  onClick?: () => void;
}

export const VTab = forwardRef<HTMLButtonElement, VTabProps>(
  ({ label, count, icon, active = false, variant = 'default', onClick, className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'v-tab',
        active && 'v-tab-active',
        variant === 'danger' && 'v-tab-danger',
        variant === 'amber' && 'v-tab-amber',
        className
      )}
      onClick={onClick}
      {...props}
    >
      <div className="flex items-center gap-3">
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span className="flex-1 truncate">{label}</span>
        {count !== undefined && (
          <span className={cn('tnum font-medium', active ? 'text-sky-400' : 'text-text-muted')}>
            {count}
          </span>
        )}
      </div>
    </button>
  )
);

VTab.displayName = 'VTab';

export interface VTabsProps {
  tabs: Array<{ id: string; label: string; count?: number; icon?: React.ReactNode; variant?: 'default' | 'danger' | 'amber' }>;
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function VTabs({ tabs, activeId, onChange, className }: VTabsProps) {
  return (
    <nav className={cn('v-tabs', className)} role="tablist" aria-label="Navigation">
      {tabs.map((tab) => (
        <VTab
          key={tab.id}
          id={`tab-${tab.id}`}
          role="tab"
          aria-selected={tab.id === activeId}
          aria-controls={`panel-${tab.id}`}
          label={tab.label}
          count={tab.count}
          icon={tab.icon}
          active={tab.id === activeId}
          variant={tab.variant}
          onClick={() => onChange(tab.id)}
        />
      ))}
    </nav>
  );
}

// ==================== DIVIDER ====================
export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  label?: string;
  vertical?: boolean;
}

export const Divider = forwardRef<HTMLHRElement, DividerProps>(
  ({ label, vertical = false, className, ...props }, ref) => {
    if (vertical) {
      return (
        <div
          ref={ref}
          className={cn('divider-vertical', className)}
          role="separator"
          {...props}
        />
      );
    }

    return (
      <div className={cn('flex items-center gap-4', className)} role="separator" {...props}>
        <div className="flex-1 divider" />
        {label && <span className="text-caption text-text-muted uppercase tracking-wider shrink-0">{label}</span>}
        <div className="flex-1 divider" />
      </div>
    );
  }
);

Divider.displayName = 'Divider';

// ==================== PROGRESS BAR ====================
export interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'success' | 'danger' | 'amber' | 'info' | 'sky' | 'neutral';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  striped?: boolean;
  animated?: boolean;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, max = 100, variant = 'sky', size = 'md', striped = false, animated = false, showLabel = false, label, className }: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'progress-bar-sm',
    md: 'progress-bar',
    lg: 'progress-bar-lg',
    xl: 'progress-bar-xl',
  };

  const variantClasses = {
    success: 'progress-fill-gradient-success',
    danger: 'progress-fill-gradient-danger',
    amber: 'progress-fill-gradient-amber',
    info: 'progress-fill-gradient-info',
    sky: 'progress-fill-gradient-sky',
    neutral: 'progress-fill-neutral',
  };

  return (
    <div className={cn('w-full', className)}>
      {(label || showLabel) && (
        <div className="flex items-center justify-between mb-space-2xs">
          {label && <span className="text-body-sm font-medium text-text-secondary">{label}</span>}
          {showLabel && <span className="text-body-sm font-medium tnum text-text-primary">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={cn('progress-bar', sizeClasses[size])} role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={cn('progress-fill', variantClasses[variant], striped && 'progress-striped', animated && 'animate-pulse-soft')}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ==================== CIRCULAR PROGRESS ====================
export interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'success' | 'danger' | 'amber' | 'info' | 'sky' | 'neutral';
  showValue?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function CircularProgress({ value, max = 100, size = 64, strokeWidth = 6, variant = 'sky', showValue = true, children, className }: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const variantColors = {
    success: 'stroke-success-500',
    danger: 'stroke-danger-500',
    amber: 'stroke-amber-500',
    info: 'stroke-info-500',
    sky: 'stroke-sky-500',
    neutral: 'stroke-cold-500',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          className="stroke-cold-700 fill-none"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={cn('fill-none transition-all duration-500 ease-out', variantColors[variant])}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {(showValue || children) && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children || (
            <span className="text-heading-sm font-bold tnum text-text-primary">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== HELPER FUNCTIONS ====================
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

// ==================== LEGACY COMPATIBILITY EXPORTS ====================
// Card -> Surface mapping
export type CardVariant = 'default' | 'hover' | 'elevated' | 'interactive';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  delay?: number;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', padding = 'md', delay = 0, className, ...props }, ref) => {
    const variantMap: Record<CardVariant, SurfaceProps['variant']> = {
      default: 'default',
      hover: 'hover',
      elevated: 'raised',
      interactive: 'interactive',
    };
    const paddingMap: Record<CardPadding, SurfaceProps['padding']> = {
      none: 'none',
      sm: 'sm',
      md: 'md',
      lg: 'lg',
      xl: 'xl',
    };
    return (
      <Surface
        ref={ref}
        variant={variantMap[variant]}
        padding={paddingMap[padding]}
        delay={delay}
        className={className}
        {...props}
      >
        {children}
      </Surface>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ children, className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-heading-md font-semibold text-text-primary', className)} {...props}>
      {children}
    </h3>
  )
);

CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ children, className, ...props }, ref) => (
    <p ref={ref} className={cn('text-body-sm text-text-secondary mt-1', className)} {...props}>
      {children}
    </p>
  )
);

CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props}>
      {children}
    </div>
  )
);

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center gap-3 mt-4 pt-4 border-t border-border', className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';

// Legacy Badge variants
export type LegacyBadgeVariant = BadgeVariant | 'gold' | 'split' | 'lane' | 'injury' | 'primary-legacy' | 'success-legacy' | 'neutral-legacy' | 'outline-legacy';

export interface LegacyBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: LegacyBadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const LegacyBadge = forwardRef<HTMLSpanElement, LegacyBadgeProps>(
  ({ children, variant = 'neutral', size = 'md', dot = false, className, ...props }, ref) => {
    const variantMap: Record<LegacyBadgeVariant, BadgeVariant> = {
      primary: 'primary',
      'primary-legacy': 'primary',
      success: 'success',
      'success-legacy': 'success',
      danger: 'danger',
      amber: 'amber',
      gold: 'amber',
      info: 'info',
      neutral: 'neutral',
      'neutral-legacy': 'neutral',
      outline: 'outline',
      'outline-legacy': 'outline',
      split: 'primary',
      lane: 'neutral',
      injury: 'danger',
    };
    return <Badge ref={ref} variant={variantMap[variant]} size={size} dot={dot} className={className} {...props}>{children}</Badge>
  }
);

LegacyBadge.displayName = 'LegacyBadge';

// Re-export Badge as default for new code, LegacyBadge for old
export { Badge as NewBadge };

// Export Dropdown and DropdownItem from Modal (legacy compatibility)
export type { DropdownItem, DropdownProps } from './Modal';
export { Dropdown } from './Modal';

// Export VTabs as LaneTabs for legacy compatibility
export type { VTabProps as LaneTabProps, VTabsProps as LaneTabsProps };
export { VTab as LaneTab, VTabs as LaneTabs };