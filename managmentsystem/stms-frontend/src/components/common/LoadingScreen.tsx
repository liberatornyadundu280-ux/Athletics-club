import React from 'react';
import { cn } from '@/utils/helpers';
import { Loader2, Dumbbell } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export function LoadingScreen({ 
  message = 'Loading...', 
  size = 'md',
  fullScreen = false 
}: LoadingScreenProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-3', fullScreen ? 'min-h-screen' : 'py-8')}>
      <div className="relative">
        <Loader2 
          className={cn('text-primary-500 animate-spin', sizeClasses[size])} 
          aria-hidden="true"
        />
        <Dumbbell 
          className={cn('absolute inset-0 text-primary-200 dark:text-primary-800 animate-pulse', sizeClasses[size])} 
          aria-hidden="true"
        />
      </div>
      <p className="text-body text-surface-500 dark:text-surface-400 text-center">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-surface-950/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}

export function LoadingSpinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <Loader2 
      className={cn('text-primary-500 animate-spin', sizeClasses[size], className)} 
      aria-hidden="true"
    />
  );
}

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div 
      className={cn('animate-pulse bg-surface-200 dark:bg-surface-700 rounded', className)}
      style={style}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          style={{ 
            height: '1rem', 
            width: i === lines - 1 ? '60%' : '100%' 
          }} 
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4 p-4', className)}>
      <Skeleton style={{ height: '1.5rem', width: '40%' }} />
      <SkeletonText lines={3} />
      <Skeleton style={{ height: '2.5rem', width: '100%' }} />
    </div>
  );
}

export default LoadingScreen;