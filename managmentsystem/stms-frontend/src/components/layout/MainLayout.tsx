import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/utils/helpers';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
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

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-track-900 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-track-950/80 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar
        className={cn(
          'transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      {/* Main content */}
      <div className={cn(
        'flex-1 min-w-0 transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'lg:pl-lane-sm' : 'lg:pl-lane'
      )}>
        {/* Header */}
        <Header />

        {/* Main content area */}
        <main className="pt-16 pb-space-2xl px-space-md lg:px-space-xl min-h-screen" id="main-content">
          <div className="w-full max-w-full">
            {/* Mobile sidebar toggle */}
            <div className="lg:hidden mb-space-md flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="justify-start"
                aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                <span className="ml-2">{sidebarOpen ? 'Close Menu' : 'Open Menu'}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebarCollapse}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
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
    <div className="min-h-screen bg-track-900 flex items-center justify-center px-space-md py-space-2xl">
      <div className="w-full max-w-md">
        <div className="text-center mb-space-2xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-radius-lg bg-sky-500 mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-display-md font-bold text-text-primary tracking-tight">STMS</h1>
          <p className="text-body text-text-secondary mt-2">
            Smart Trainer Management System
          </p>
        </div>
        <div className="surface-raised p-space-xl">
          <Outlet />
        </div>
        <p className="text-center text-caption text-text-muted mt-6">
          Need help? Ask your club administrator.
        </p>
      </div>
    </div>
  );
}

// ==================== EMPTY LAYOUT (for full-screen pages) ====================
export function EmptyLayout() {
  return <Outlet />;
}
