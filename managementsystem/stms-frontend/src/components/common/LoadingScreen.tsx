import React from 'react';
import { cn } from '@/utils/helpers';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

/**
 * The app's loading mark: a volt lane that fills, not a generic spinner on
 * a blank page.
 */
export function LoadingScreen({
  message = 'Loading…',
  size = 'md',
  fullScreen = false,
}: LoadingScreenProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-4', fullScreen ? 'min-h-screen' : 'py-10')}>
      <span className="relative grid place-items-center">
        <Loader2 className={cn('animate-spin text-volt', sizeClasses[size])} aria-hidden="true" />
        <span className="absolute h-1.5 w-1.5 rounded-full bg-volt" aria-hidden="true" />
      </span>
      <p className="text-body-sm text-text-muted" role="status">
        {message}
      </p>
    </div>
  );

  if (fullScreen) {
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink">{content}</div>;
  }

  return content;
}

export function LoadingSpinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  return <Loader2 className={cn('animate-spin text-volt', sizeClasses[size], className)} aria-hidden="true" />;
}

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('skeleton', className)} style={style} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          style={{
            height: '0.85rem',
            width: i === lines - 1 ? '60%' : '100%',
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('surface space-y-3 p-4', className)} aria-hidden="true">
      <Skeleton style={{ height: '1.25rem', width: '40%' }} />
      <SkeletonText lines={3} />
      <Skeleton style={{ height: '2.25rem', width: '100%' }} />
    </div>
  );
}

export default LoadingScreen;
