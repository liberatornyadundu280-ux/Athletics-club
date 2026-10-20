import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Split';
import { Bell, Moon, Sun, LogOut, User, Settings, Zap } from 'lucide-react';
import { ClubSwitcher } from './ClubSwitcher';

export function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
    <header className="fixed top-0 left-lane right-0 z-30 h-16 bg-panel/80 backdrop-blur-xl border-b border-line flex items-center justify-between px-space-lg">
      {/* Left side - Club Switcher with STMS branding */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="group flex items-center gap-3 px-2"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-volt text-ink transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-105">
            <Zap size={18} strokeWidth={2.6} />
          </span>
          <span className="font-display text-xl tracking-wide text-white">
            ST<span className="text-volt">M</span>S
          </span>
        </button>
        {user && <ClubSwitcher />}
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="sm" disabled title="Team notifications are planned for Sprint 8" aria-label="Team notifications are not available yet">
          <Bell className="h-5 w-5" />
        </Button>

        {/* User Menu — visitors get a plain sign-in action instead */}
        {!user ? (
          <Button size="sm" onClick={() => navigate('/login')}>
            Sign in
          </Button>
        ) : (
        <div className="relative" ref={userMenuRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-label="User menu"
            aria-expanded={userMenuOpen}
            className="gap-2"
          >
            <Avatar
              src={user?.avatarUrl}
              name={user?.name}
              size="sm"
            />
            <span className="hidden sm:block text-body-sm font-medium text-text-primary">
              {user?.name}
            </span>
          </Button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-panel border border-line rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] z-50 animate-fade-in overflow-hidden">
              <div className="p-3 border-b border-line">
                <p className="text-body-sm font-medium text-white">{user?.name}</p>
                <p className="text-caption text-fog capitalize">{user?.role.replace('_', ' ')}</p>
              </div>
              <div className="py-1" role="menu" aria-label="Account menu">
                <button
                  role="menuitem"
                  onClick={() => { setUserMenuOpen(false); navigate('/profile'); }}
                  className="dropdown-item w-full text-text-secondary hover:text-white hover:bg-white/[0.03]"
                >
                  <User className="mr-3 h-4 w-4" />
                  Profile
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
                  className="dropdown-item w-full text-text-secondary hover:text-white hover:bg-white/[0.03]"
                >
                  <Settings className="mr-3 h-4 w-4" />
                  Settings
                </button>
                <div className="dropdown-divider" role="separator" />
                <button
                  role="menuitem"
                  onClick={() => { setUserMenuOpen(false); void logout(); }}
                  className="dropdown-item w-full text-danger-400 hover:bg-danger-500/10"
                >
                  <LogOut className="mr-3 h-4 w-4" />
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
