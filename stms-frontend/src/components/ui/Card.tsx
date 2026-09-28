import React, { forwardRef } from 'react';
import { cn } from '@/utils/helpers';

// ==================== CARD ====================
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', padding = 'md', className, ...props }, ref) => {
    const variantClasses = {
      default: 'card',
      hover: 'card-hover',
      elevated: 'card-elevated',
    };

    const paddingClasses = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={cn(variantClasses[variant], paddingClasses[padding], className)}
        {...props}
      >
        {children}
      </div>
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
    <h3 ref={ref} className={cn('text-heading-md font-semibold text-surface-900 dark:text-surface-100', className)} {...props}>
      {children}
    </h3>
  )
);

CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ children, className, ...props }, ref) => (
    <p ref={ref} className={cn('text-body-sm text-surface-500 dark:text-surface-400 mt-1', className)} {...props}>
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
      className={cn('flex items-center gap-3 mt-4 pt-4 border-t border-surface-200 dark:border-surface-700', className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';

// ==================== BADGE ====================
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'gold' | 'danger' | 'success' | 'neutral' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'primary', size = 'md', dot = false, className, ...props }, ref) => {
    const variantClasses = {
      primary: 'badge-primary',
      gold: 'badge-gold',
      danger: 'badge-danger',
      success: 'badge-success',
      neutral: 'badge-neutral',
      outline: 'badge-outline',
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
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full mr-1.5',
              variant === 'primary' && 'bg-primary-500',
              variant === 'gold' && 'bg-gold-500',
              variant === 'danger' && 'bg-danger-500',
              variant === 'success' && 'bg-green-500',
              variant === 'neutral' && 'bg-surface-500',
              variant === 'outline' && 'bg-current'
            )}
          />
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
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'busy' | 'away';
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt, name, size = 'md', status, className, ...props }, ref) => {
    const sizeClasses = {
      sm: 'avatar-sm',
      md: 'avatar-md',
      lg: 'avatar-lg',
      xl: 'avatar-xl',
    };

    const statusSizeClasses = {
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
      lg: 'w-3 h-3',
      xl: 'w-4 h-4',
    };

    const statusColorClasses = {
      online: 'bg-green-500',
      offline: 'bg-surface-400',
      busy: 'bg-danger-500',
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
            <img
              src={src}
              alt={alt || name || 'Avatar'}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-medium">{initials}</span>
          )}
          {status && (
            <span
              className={cn(
                'absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-surface-900',
                statusSizeClasses[size],
                statusColorClasses[status]
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
  avatars: Array<{ src?: string; name: string; status?: 'online' | 'offline' | 'busy' | 'away' }>;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
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
          className="ring-2 ring-white dark:ring-surface-950"
        />
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            'avatar flex-items-center justify-center font-medium text-surface-600 dark:text-surface-400',
            'bg-surface-100 dark:bg-surface-800 ring-2 ring-white dark:ring-surface-950',
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
  return `hsl(${hue}, 65%, 45%)`;
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
          className={cn('h-full w-px bg-surface-200 dark:bg-surface-700', className)}
          role="separator"
          {...props}
        />
      );
    }

    return (
      <div className={cn('flex items-center gap-4', className)} role="separator" {...props}>
        <div className="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
        {label && <span className="text-body-sm text-surface-500 dark:text-surface-400 shrink-0">{label}</span>}
        <div className="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
      </div>
    );
  }
);

Divider.displayName = 'Divider';