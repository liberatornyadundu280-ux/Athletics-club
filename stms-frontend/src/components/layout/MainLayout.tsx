import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/utils/helpers';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function MainLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isAuthPage = location.pathname.startsWith('/login') || 
                     location.pathname.startsWith('/register') || 
                     location.pathname.startsWith('/forgot-password');

  if (isAuthPage) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar className={cn(
        'transition-transform duration-300 ease-in-out',
        sidebarCollapsed ? 'w-20' : 'w-64',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )} />

      {/* Main content */}
      <div className={cn(
        'transition-all duration-300 ease-in-out',
        'lg:pl-64',
        sidebarCollapsed ? 'lg:pl-20' : ''
      )}>
        {/* Header */}
        <Header />

        {/* Main content area */}
        <main className="pt-16 pb-8 px-4 sm:px-6 lg:px-8" id="main-content">
          <div className="max-w-full">
            {/* Mobile sidebar toggle */}
            <div className="lg:hidden mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="w-full justify-start"
                aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                <span className="ml-2">{sidebarOpen ? 'Close Menu' : 'Open Menu'}</span>
              </Button>
            </div>

            {/* Page content */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

// ==================== AUTH LAYOUT ====================
export function AuthLayout() {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-800 mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-heading-lg font-bold text-surface-900 dark:text-surface-100">STMS</h1>
          <p className="text-body text-surface-500 dark:text-surface-400 mt-2">
            Smart Trainer Management System
          </p>
        </div>
        <div className="card-elevated p-8">
          <Outlet />
        </div>
        <p className="text-center text-caption text-surface-500 dark:text-surface-400 mt-6">
          Need help? <a href="#" className="text-primary-800 hover:text-primary-700">Contact support</a>
        </p>
      </div>
    </div>
  );
}

// ==================== EMPTY LAYOUT (for full-screen pages) ====================
export function EmptyLayout() {
  return <Outlet />;
}