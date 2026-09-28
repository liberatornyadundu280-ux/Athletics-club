import React from 'react';
import { cn } from '@/utils/helpers';

interface LoadingScreenProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export function LoadingScreen({ message = 'Loading...', size = 'md', fullScreen = true }: LoadingScreenProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-14 h-14 border-4',
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-surface-950/80 backdrop-blur-sm'
    : 'flex items-center justify-center';

  return (
    <div className={containerClasses} role="status" aria-live="polite" aria-label={message}>
      <div className="flex flex-col items-center gap-4">
        <div
          className={cn(
            'rounded-full border-surface-200 dark:border-surface-700 border-t-primary-800 animate-spin',
            sizeClasses[size]
          )}
        />
        {message && (
          <p className="text-body text-surface-600 dark:text-surface-400">{message}</p>
        )}
      </div>
    </div>
  );
}

// ==================== PAGE LOADING SKELETON ====================
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-10 w-32 rounded-lg" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton h-24 rounded-xl" />
        )}
      </div>
      <div className="skeleton h-96 rounded-xl" />
    </div>
  );
}

// ==================== CARD SKELETON ====================
export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-6 space-y-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="skeleton h-6 w-3/4 rounded" />
            <div className="skeleton h-8 w-20 rounded-lg" />
          </div>
          <div className="skeleton h-12 w-full rounded" />
          <div className="flex gap-2">
            <div className="skeleton h-8 w-24 rounded-lg" />
            <div className="skeleton h-8 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== TABLE SKELETON ====================
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="table-container">
      <table className="table" role="grid">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} scope="col" className="px-4 py-3">
                <div className="skeleton h-4 w-3/4" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <div className="skeleton-text" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==================== LIST SKELETON ====================
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-700">
          <div className="skeleton w-12 h-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-5 w-3/4 rounded" />
            <div className="skeleton h-4 w-1/2 rounded" />
          </div>
          <div className="skeleton h-8 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  );
}