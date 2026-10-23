import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/utils/helpers';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Menu, X, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Zap } from 'lucide-react';

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
        <main className="min-h-[calc(100vh-3.5rem)] px-space-md pb-space-2xl lg:px-space-xl" id="main-content">
          <div className="w-full max-w-full pt-space-lg">
            {/* Mobile sidebar toggle */}
            <div className="mb-space-md flex items-center justify-between lg:hidden">
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
    <div className="relative min-h-screen overflow-hidden bg-ink text-text-primary">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] bg-[radial-gradient(60%_60%_at_18%_0%,rgba(216,255,62,0.10),transparent_70%)]"
      />

      <button
        type="button"
        onClick={() => (canGoBack ? navigate(-1) : navigate('/'))}
        className="fixed left-4 top-4 z-10 inline-flex items-center gap-2 rounded-radius-md border border-border bg-panel/80 px-3 py-2 text-body-sm text-text-secondary backdrop-blur transition-colors hover:border-volt/40 hover:text-text-primary sm:left-6 sm:top-6"
        aria-label="Go back"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-5 py-20 lg:grid-cols-[1.05fr_minmax(0,420px)] lg:gap-16 lg:px-8">
        {/* Brand statement — the reason to sign in, not decoration. */}
        <section className="hidden lg:block">
          <Link
            to="/"
            aria-label="STMS — go to the home page"
            className="inline-flex items-center gap-3 rounded-radius-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-radius-md bg-volt text-ink">
              <Zap size={22} strokeWidth={2.6} aria-hidden="true" />
            </span>
            <span className="font-display text-2xl uppercase tracking-[0.14em] text-text-primary">
              ST<span className="text-volt">M</span>S
            </span>
          </Link>

          <h2 className="mt-10 font-display text-[clamp(2.5rem,4.4vw,3.75rem)] uppercase leading-[0.95] tracking-[-0.01em] text-text-primary">
            Every session.
            <br />
            Every athlete.
            <br />
            <span className="text-volt">Accounted for.</span>
          </h2>

          <p className="mt-5 max-w-md text-body leading-relaxed text-text-secondary">
            Attendance, workouts, performance and recovery in one place — so your athletes always
            know what is next and your records stay straight.
          </p>

          <ul className="mt-9 space-y-3">
            {[
              'Attendance that takes seconds, not spreadsheets',
              'Workouts athletes can open and complete themselves',
              'Performance, injuries and goals in one record',
            ].map(item => (
              <li key={item} className="flex items-start gap-2.5 text-body-sm text-text-secondary">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-volt" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>

          <p className="mt-12 text-caption text-text-muted">Smart Trainer Management System</p>
        </section>

        <div className="w-full">
          <Link
            to="/"
            aria-label="STMS — go to the home page"
            className="mb-8 inline-flex items-center gap-2.5 rounded-radius-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt lg:hidden"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-radius-md bg-volt text-ink">
              <Zap size={20} strokeWidth={2.6} aria-hidden="true" />
            </span>
            <span className="font-display text-xl uppercase tracking-[0.14em] text-text-primary">
              ST<span className="text-volt">M</span>S
            </span>
          </Link>

          <div className="rounded-radius-lg border border-border bg-panel/80 p-6 shadow-lg backdrop-blur sm:p-7">
            <Outlet />
          </div>

          <p className="mt-5 text-center text-caption text-text-muted">
            Need help? Ask your club administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

// ==================== EMPTY LAYOUT (for full-screen pages) ====================
export function EmptyLayout() {
  return <Outlet />;
}
