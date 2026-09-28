import React, { forwardRef, useState, useEffect, useRef } from 'react';
import { cn } from '@/utils/helpers';

// ==================== SPLIT (replaces Card) ====================
export interface SplitProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'elevated' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  delay?: number; // for stagger animation
}

export const Split = forwardRef<HTMLDivElement, SplitProps>(
  ({ children, variant = 'default', padding = 'md', delay = 0, className, ...props }, ref) => {
    const variantClasses = {
      default: 'split',
      hover: 'split-hover',
      elevated: 'split-elevated',
      interactive: 'split-interactive',
    };

    const paddingClasses = {
      none: '',
      sm: 'p-4',
      md: 'p-split',
      lg: 'p-split-lg',
    };

    const delayClass = delay > 0 ? `split-reveal-${Math.min(Math.ceil(delay / 60), 6)}` : '';

    return (
      <div
        ref={ref}
        className={cn(
          variantClasses[variant],
          paddingClasses[padding],
          delayClass,
          className
        )}
        style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Split.displayName = 'Split';

// ==================== SPLIT HEADER ====================
export interface SplitHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value?: string | number;
  action?: React.ReactNode;
}

export const SplitHeader = forwardRef<HTMLDivElement, SplitHeaderProps>(
  ({ label, value, action, className, ...props }, ref) => (
    <div ref={ref} className={cn('split-header', className)} {...props}>
      <span className="split-label">{label}</span>
      <div className="flex items-center gap-3">
        {value !== undefined && <span className="split-value tnum">{value}</span>}
        {action}
      </div>
    </div>
  )
);

SplitHeader.displayName = 'SplitHeader';

// ==================== SPLIT CONTENT ====================
export const SplitContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props}>
      {children}
    </div>
  )
);

SplitContent.displayName = 'SplitContent';

// ==================== HERO SPLIT (Dashboard metric) ====================
export interface HeroSplitProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accent?: 'split' | 'gold' | 'danger';
  delay?: number;
}

export const HeroSplit = forwardRef<HTMLDivElement, HeroSplitProps>(
  ({ label, value, sub, trend, trendValue, accent = 'split', delay = 0, className, ...props }, ref) => {
    const delayClass = delay > 0 ? `split-reveal-${Math.min(Math.ceil(delay / 60), 6)}` : '';

    return (
      <div
        ref={ref}
        className={cn('hero-split', `hero-split.${accent}`, delayClass, className)}
        style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
        {...props}
      >
        <span className="hero-split-label">{label}</span>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="hero-split-value tnum">{value}</span>
          {trend && trendValue && (
            <span className={cn(
              'text-body-sm font-medium tnum',
              trend === 'up' && 'text-split-400',
              trend === 'down' && 'text-danger-400',
              trend === 'neutral' && 'text-chalk-400'
            )}>
              {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—'} {trendValue}
            </span>
          )}
        </div>
        {sub && <p className="hero-split-sub">{sub}</p>}
      </div>
    );
  }
);

HeroSplit.displayName = 'HeroSplit';

// ==================== BADGE ====================
export type BadgeVariant = 'split' | 'gold' | 'danger' | 'lane' | 'injury'
  // Legacy aliases
  | 'primary' | 'success' | 'neutral' | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'lane', size = 'md', className, ...props }, ref) => {
    // Map legacy variants to new ones
    const normalizedVariant = (() => {
      switch (variant) {
        case 'primary': return 'split';
        case 'success': return 'split';
        case 'neutral': return 'lane';
        case 'outline': return 'lane';
        default: return variant;
      }
    })();

    const variantClasses: Record<string, string> = {
      split: 'badge-split',
      gold: 'badge-gold',
      danger: 'badge-danger',
      lane: 'badge-lane',
      injury: 'badge-injury',
    };

    const sizeClasses = {
      sm: 'px-2 py-0.5 text-[0.625rem]',
      md: 'px-2.5 py-0.5 text-caption',
      lg: 'px-3 py-1 text-body-sm',
    };

    return (
      <span
        ref={ref}
        className={cn('badge', variantClasses[normalizedVariant], sizeClasses[size], className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// ==================== AVATAR (Lane Marker) ====================
export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'active' | 'injured' | 'away';
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt, name, size = 'md', status, className, ...props }, ref) => {
    const sizeClasses = {
      xs: 'avatar-xs',
      sm: 'avatar-sm',
      md: 'avatar-md',
      lg: 'avatar-lg',
      xl: 'avatar-xl',
    };

    const statusClasses = {
      active: 'bg-split-500',
      injured: 'bg-danger-500',
      away: 'bg-gold-500',
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
          {status && (
            <span
              className={cn(
                'absolute bottom-0 right-0 rounded-full border-2 border-track-900',
                size === 'xs' && 'w-1.5 h-1.5',
                size === 'sm' && 'w-2 h-2',
                size === 'md' && 'w-2.5 h-2.5',
                size === 'lg' && 'w-3 h-3',
                size === 'xl' && 'w-4 h-4',
                statusClasses[status]
              )}
            />
          )}
        </div>
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export function AvatarGroup({ avatars, max = 5, size = 'md', className }: {
  avatars: Array<{ src?: string; name: string; status?: 'active' | 'injured' | 'away' }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={index}
          {...avatar}
          size={size}
          className="ring-2 ring-track-900"
        />
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            'avatar flex-items-center justify-center font-medium text-chalk-300',
            'bg-lane-700 ring-2 ring-track-900',
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

// ==================== LANE TABS (Navigation) ====================
export interface LaneTabProps extends React.HTMLAttributes<HTMLButtonElement> {
  label: string;
  count?: number;
  icon?: React.ReactNode;
  active?: boolean;
  injury?: boolean;
  onClick?: () => void;
}

export const LaneTab = forwardRef<HTMLButtonElement, LaneTabProps>(
  ({ label, count, icon, active = false, injury = false, onClick, className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'lane-tab',
        active && 'lane-tab-active',
        injury && 'lane-tab-injury',
        className
      )}
      onClick={onClick}
      {...props}
    >
      <div className="flex items-center gap-3">
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span className="flex-1 truncate">{label}</span>
        {count !== undefined && (
          <span className={cn('tnum font-medium', active ? 'text-split-400' : 'text-chalk-400')}>
            {count}
          </span>
        )}
      </div>
    </button>
  )
);

LaneTab.displayName = 'LaneTab';

export interface LaneTabsProps {
  tabs: Array<{ id: string; label: string; count?: number; icon?: React.ReactNode; injury?: boolean }>;
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function LaneTabs({ tabs, activeId, onChange, className }: LaneTabsProps) {
  return (
    <nav className={cn('lane-tabs', className)} role="tablist" aria-label="Main navigation">
      {tabs.map((tab) => (
        <LaneTab
          key={tab.id}
          id={`tab-${tab.id}`}
          role="tab"
          aria-selected={tab.id === activeId}
          aria-controls={`panel-${tab.id}`}
          label={tab.label}
          count={tab.count}
          icon={tab.icon}
          active={tab.id === activeId}
          injury={tab.injury}
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
          className={cn('h-full w-px bg-lane-700', className)}
          role="separator"
          {...props}
        />
      );
    }

    return (
      <div className={cn('flex items-center gap-4', className)} role="separator" {...props}>
        <div className="flex-1 h-px bg-lane-700" />
        {label && <span className="text-caption text-chalk-400 uppercase tracking-wider shrink-0">{label}</span>}
        <div className="flex-1 h-px bg-lane-700" />
      </div>
    );
  }
);

Divider.displayName = 'Divider';

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
  return `hsl(${hue}, 55%, 35%)`; // darker for track background
}

// ==================== LEGACY CARD COMPATIBILITY ====================
// These map to Split for backward compatibility

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', padding = 'md', className, ...props }, ref) => {
    const variantMap: Record<string, string> = {
      default: 'default',
      hover: 'hover',
      elevated: 'elevated',
    };
    const paddingMap: Record<string, string> = {
      none: 'none',
      sm: 'sm',
      md: 'md',
      lg: 'lg',
    };
    return (
      <Split
        ref={ref}
        variant={variantMap[variant] as any}
        padding={paddingMap[padding] as any}
        className={className}
        {...props}
      >
        {children}
      </Split>
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
    <h3 ref={ref} className={cn('text-split-md font-semibold text-chalk-100', className)} {...props}>
      {children}
    </h3>
  )
);

CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ children, className, ...props }, ref) => (
    <p ref={ref} className={cn('text-body-sm text-chalk-400 mt-1', className)} {...props}>
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
      className={cn('flex items-center gap-3 mt-4 pt-4 border-t border-lane-700', className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';

// ==================== DROPDOWN ====================

export interface DropdownItem {
  label?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}

export function Dropdown({ trigger, items, align = 'right', className }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className={cn('dropdown relative inline-block', className)}>
      <div ref={triggerRef} onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'dropdown-menu',
            align === 'right' ? 'right-0' : 'left-0'
          )}
          role="menu"
        >
          {items.map((item, index) => (
            <React.Fragment key={index}>
              {item.divider && <div className="dropdown-divider" role="separator" />}
              {!item.divider && (
                <button
                  role="menuitem"
                  onClick={() => {
                    item.onClick?.();
                    setIsOpen(false);
                  }}
                  disabled={item.disabled}
                  className={cn(
                    'dropdown-item w-full',
                    item.danger && 'text-danger-400',
                    item.disabled && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  {item.icon && <span className="mr-3 flex-shrink-0">{item.icon}</span>}
                  {item.label}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}