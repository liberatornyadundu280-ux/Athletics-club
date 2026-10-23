import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Split';
import { Bell, LogOut, User, Settings, Zap } from 'lucide-react';
import { ClubSwitcher } from './ClubSwitcher';

export function Header() {
  const navigate = useNavigate();
  const { user, logout, hasPermission } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const canReadAnnouncements = Boolean(user) && hasPermission('announcement:read');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-coal/85 px-space-lg backdrop-blur-xl">
      {/* Left — club context */}
      <div className="flex min-w-0 items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="group flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/70 focus-visible:ring-offset-2 focus-visible:ring-offset-coal lg:hidden"
          aria-label="STMS home"
        >
          <span className="grid h-8 w-8 place-items-center rounded-md bg-volt text-ink transition-transform duration-300 group-hover:rotate-[-8deg]">
            <Zap size={17} strokeWidth={2.8} />
          </span>
          <span className="font-display text-lg tracking-[0.02em] text-text-primary">
            ST<span className="text-volt">M</span>S
          </span>
        </button>
        {user && <ClubSwitcher />}
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/announcements')}
          disabled={!canReadAnnouncements}
          title={canReadAnnouncements ? 'Club announcements' : 'Sign in to see announcements'}
          aria-label="Club announcements"
        >
          <Bell className="h-4 w-4" />
        </Button>

        {!user ? (
          <Button size="sm" onClick={() => navigate('/login')}>
            Sign in
          </Button>
        ) : (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-label="User menu"
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/70"
            >
              <Avatar src={user?.avatarUrl} name={user?.name} size="sm" />
              <span className="hidden max-w-[140px] truncate text-body-sm font-medium text-text-primary sm:block">
                {user?.name}
              </span>
            </button>

            {userMenuOpen && (
              <div className="dropdown-menu w-60" role="menu" aria-label="Account menu">
                <div className="border-b border-border px-3.5 py-2.5">
                  <p className="truncate text-body-sm font-semibold text-text-primary">{user?.name}</p>
                  <p className="text-caption capitalize text-text-muted">{user?.role.replace('_', ' ')}</p>
                </div>
                <div className="py-1">
                  <button
                    role="menuitem"
                    onClick={() => { setUserMenuOpen(false); navigate('/profile'); }}
                    className="dropdown-item inline-flex items-center gap-2.5"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
                    className="dropdown-item inline-flex items-center gap-2.5"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  <div className="dropdown-divider" role="separator" />
                  <button
                    role="menuitem"
                    onClick={() => { setUserMenuOpen(false); void logout(); }}
                    className="dropdown-item inline-flex items-center gap-2.5 text-danger-400 hover:bg-danger-500/10 hover:text-danger-400"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
