import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Split';
import { Bell, Moon, Sun, LogOut, User, Settings } from 'lucide-react';
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
    <header className="fixed top-0 left-lane right-0 z-30 h-16 bg-track-900/80 backdrop-blur-sm border-b border-border flex items-center justify-between px-space-lg">
      {/* Left side - Club Switcher */}
      <div className="flex items-center gap-4">
        <ClubSwitcher />
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

        {/* User Menu */}
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
            <div className="absolute right-0 mt-2 w-56 surface-raised z-50 animate-fade-in">
              <div className="p-3 border-b border-border">
                <p className="text-body-sm font-medium text-text-primary">{user?.name}</p>
                <p className="text-caption text-text-muted capitalize">{user?.role.replace('_', ' ')}</p>
              </div>
              <div className="py-1" role="menu" aria-label="Account menu">
                <button
                  role="menuitem"
                  onClick={() => { setUserMenuOpen(false); navigate('/profile'); }}
                  className="dropdown-item w-full"
                >
                  <User className="mr-3 h-4 w-4" />
                  Profile
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
                  className="dropdown-item w-full"
                >
                  <Settings className="mr-3 h-4 w-4" />
                  Settings
                </button>
                <div className="dropdown-divider" role="separator" />
                <button
                  role="menuitem"
                  onClick={() => { setUserMenuOpen(false); void logout(); }}
                  className="dropdown-item w-full text-danger-400"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
