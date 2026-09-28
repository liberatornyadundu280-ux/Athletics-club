import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/helpers';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Avatar, Dropdown } from '@/components/ui/Split';
import type { DropdownItem } from '@/components/ui/Split';
import { Bell, Moon, Sun, LogOut, User, Settings } from 'lucide-react';
import { ClubSwitcher } from './ClubSwitcher';

export function Header() {
  const { user, logout } = useAuth();
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Mock notifications - in real app, this would come from API
  const notifications = [
    { id: '1', title: 'New workout assigned', message: 'Coach assigned "Sprint Intervals" for tomorrow', time: '5 min ago', read: false },
    { id: '2', title: 'Attendance reminder', message: 'Training session starts in 30 minutes', time: '1 hour ago', read: false },
    { id: '3', title: 'Permission approved', message: 'Your competition permission letter has been approved', time: '2 hours ago', read: true },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-lane right-0 z-30 h-16 bg-track-900/80 backdrop-blur-sm border-b border-lane-700 flex items-center justify-between px-split">
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
        <div className="relative" ref={notificationsRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            aria-expanded={notificationsOpen}
          >
            <span className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-split-500 text-track-900 text-[10px] font-medium flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
          </Button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 split-band-elevated z-50 animate-split-reveal">
              <div className="p-3 border-b border-lane-700 flex items-center justify-between">
                <h3 className="text-split-sm font-semibold text-chalk-100">Notifications</h3>
                {unreadCount > 0 && (
                  <button className="text-body-sm text-split-400 hover:text-split-300">Mark all read</button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.map(notification => (
                  <button
                    key={notification.id}
                    className={cn(
                      'w-full p-3 text-left hover:bg-track-700 transition-colors',
                      !notification.read && 'bg-split-500/10'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-2 h-2 mt-2 rounded-full flex-shrink-0',
                        !notification.read && 'bg-split-500'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-body-sm font-medium text-chalk-100', !notification.read && 'font-semibold')}>
                          {notification.title}
                        </p>
                        <p className="text-body-sm text-chalk-400 mt-0.5 truncate">
                          {notification.message}
                        </p>
                        <p className="text-caption text-chalk-400 mt-1">{notification.time}</p>
                      </div>
                    </div>
                  </button>
                ))}
                {notifications.length === 0 && (
                  <div className="p-6 text-center text-chalk-400">
                    No notifications
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-lane-700 text-center">
                <Button variant="ghost" size="sm" className="w-full">View all notifications</Button>
              </div>
            </div>
          )}
        </div>

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
            <span className="hidden sm:block text-body-sm font-medium text-chalk-100">
              {user?.name}
            </span>
          </Button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 split-band-elevated z-50 animate-split-reveal">
              <div className="p-3 border-b border-lane-700">
                <p className="text-body-sm font-medium text-chalk-100">{user?.name}</p>
                <p className="text-caption text-chalk-400 capitalize">{user?.role.replace('_', ' ')}</p>
              </div>
              <Dropdown
                trigger={<div />}
                items={[
                  { label: 'Profile', icon: <User className="w-4 h-4" />, onClick: () => { /* navigate to profile */ } },
                  { label: 'Settings', icon: <Settings className="w-4 h-4" />, onClick: () => { /* navigate to settings */ } },
                  { divider: true },
                  { label: 'Sign out', icon: <LogOut className="w-4 h-4" />, onClick: () => logout(), danger: true },
                ]}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}