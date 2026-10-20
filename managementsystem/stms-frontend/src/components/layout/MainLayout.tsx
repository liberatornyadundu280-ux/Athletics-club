import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/utils/helpers';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Menu, X, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Zap } from 'lucide-react';

export function MainLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isAuthPage = location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/register') ||
    location.pathname.startsWith('/forgot-password');

  // Hooks must run on every render, so this sits above the early return.
  useEffect(() => {
    // Ensure app background for authenticated routes
    document.body.style.backgroundColor = '#0b0d12'; // coal
    document.body.style.color = '#eef1f6';
    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    };
  }, []);

  if (isAuthPage) {
    return <Outlet />;
  }

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-coal flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/80 lg:hidden"
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
  const navigate = useNavigate();
  const location = useLocation();

  // `key === 'default'` means this is the first entry in the history stack, so "back" would
  // leave the app entirely. Fall through to the home page in that case.
  const canGoBack = location.key !== 'default';

  return (
    <div className="min-h-screen bg-ink text-text-primary flex items-center justify-center px-space-md py-space-2xl">
      <button
        type="button"
        onClick={() => (canGoBack ? navigate(-1) : navigate('/'))}
        className="fixed left-4 top-4 z-10 inline-flex items-center gap-2 rounded-lg border border-line bg-panel/70 px-3 py-2 text-body-sm text-mist backdrop-blur transition-colors hover:border-volt/40 hover:text-white sm:left-6 sm:top-6"
        aria-label="Go back"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="w-full max-w-md">
        <div className="text-center mb-space-2xl">
          {/* The mark doubles as the way home, which is what visitors expect from a logo. */}
          <Link
            to="/"
            aria-label="STMS — go to the home page"
            title="Go to the home page"
            className="group inline-flex flex-col items-center rounded-xl focus-visible:ring-2 focus-visible:ring-volt focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-volt mx-auto mb-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-105">
              <Zap size={24} strokeWidth={2.6} className="text-ink" />
            </div>
            <h1 className="font-display text-3xl tracking-wide text-white">
              ST<span className="text-volt">M</span>S
            </h1>
          </Link>
          <p className="text-body text-mist mt-2">
            Smart Trainer Management System
          </p>
        </div>
        <div className="bg-panel border border-line rounded-2xl p-space-xl">
          <Outlet />
        </div>
        <p className="text-center text-caption text-fog mt-6">
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
