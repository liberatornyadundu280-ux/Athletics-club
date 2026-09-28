import React, { forwardRef } from 'react';
import { cn } from '@/utils/helpers';

export type ButtonVariant = 'split' | 'track' | 'gold' | 'danger' | 'ghost' 
  // Legacy aliases
  | 'primary' | 'secondary' | 'outline' | 'success';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'split',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    // Map legacy variants to new ones
    const normalizedVariant = (() => {
      switch (variant) {
        case 'primary': return 'split';
        case 'secondary': return 'track';
        case 'outline': return 'ghost';
        case 'success': return 'split';
        default: return variant;
      }
    })();

    const variantClasses: Record<ButtonVariant, string> = {
      split: 'btn-split',
      track: 'btn-track',
      gold: 'btn-gold',
      danger: 'btn-danger',
      ghost: 'btn-ghost',
      // Legacy (mapped above)
      primary: 'btn-split',
      secondary: 'btn-track',
      outline: 'btn-ghost',
      success: 'btn-split',
    };

    const sizeClasses: Record<ButtonSize, string> = {
      xs: 'btn-xs',
      sm: 'btn-sm',
      md: 'btn-md',
      lg: 'btn-lg',
      xl: 'btn-xl',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        className={cn('btn', variantClasses[normalizedVariant], sizeClasses[size], widthClass, className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ==================== ICON BUTTON ====================
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  ariaLabel: string;
  children: React.ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'ghost', size = 'md', ariaLabel, children, className, ...props }, ref) => {
    const variantClasses: Record<ButtonVariant, string> = {
      split: 'btn-split',
      track: 'btn-track',
      gold: 'btn-gold',
      danger: 'btn-danger',
      ghost: 'btn-ghost',
      primary: 'btn-split',
      secondary: 'btn-track',
      outline: 'btn-ghost',
      success: 'btn-split',
    };

    const sizeClasses = {
      sm: 'p-1.5',
      md: 'p-2',
      lg: 'p-3',
    };

    return (
      <button
        ref={ref}
        className={cn('btn', variantClasses[variant], sizeClasses[size], className)}
        aria-label={ariaLabel}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

// ==================== BUTTON GROUP ====================
export interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  vertical?: boolean;
}

export function ButtonGroup({ children, className, vertical = false }: ButtonGroupProps) {
  return (
    <div
      className={cn(
        'inline-flex',
        vertical ? 'flex-col' : 'flex-row',
        'rounded-split overflow-hidden border border-lane-700',
        className
      )}
      role="group"
    >
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;

        const isFirst = index === 0;
        const isLast = index === React.Children.count(children) - 1;

        return React.cloneElement(child, {
          className: cn(
            child.props.className,
            vertical
              ? isFirst
                ? 'rounded-b-none'
                : isLast
                ? 'rounded-t-none'
                : 'rounded-none'
              : isFirst
              ? 'rounded-r-none'
              : isLast
              ? 'rounded-l-none'
              : 'rounded-none',
            'border-0'
          ),
        });
      })}
    </div>
  );
}