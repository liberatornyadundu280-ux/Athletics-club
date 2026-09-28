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

  const isAuthPage = location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/register') ||
    location.pathname.startsWith('/forgot-password');

  if (isAuthPage) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-track-900">
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
        onNavigate={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="lg:pl-lane transition-all duration-300 ease-in-out">
        {/* Header */}
        <Header />

        {/* Main content area */}
        <main className="pt-16 pb-split-lg px-split lg:px-split-lg" id="main-content">
          <div className="max-w-full">
            {/* Mobile sidebar toggle */}
            <div className="lg:hidden mb-split">
              <Button
                variant="track"
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
    <div className="min-h-screen bg-track-900 flex items-center justify-center px-split py-split-lg">
      <div className="w-full max-w-md">
        <div className="text-center mb-split-lg">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-split-lg bg-split-500 mx-auto mb-4">
            <svg className="w-10 h-10 text-track-900" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-split-lg font-bold text-chalk-100 tracking-tight">STMS</h1>
          <p className="text-body text-chalk-400 mt-2">
            Smart Trainer Management System
          </p>
        </div>
        <div className="split-band-elevated p-split-lg">
          <Outlet />
        </div>
        <p className="text-center text-caption text-chalk-400 mt-6">
          Need help? <a href="#" className="text-split-400 hover:text-split-300">Contact support</a>
        </p>
      </div>
    </div>
  );
}

// ==================== EMPTY LAYOUT (for full-screen pages) ====================
export function EmptyLayout() {
  return <Outlet />;
}