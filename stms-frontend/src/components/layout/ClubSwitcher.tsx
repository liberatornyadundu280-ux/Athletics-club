import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/helpers';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { ChevronDown, Building2, Plus, Check } from 'lucide-react';
import { Club } from '@/types';

interface ClubSwitcherProps {
  className?: string;
}

export function ClubSwitcher({ className }: ClubSwitcherProps) {
  const { user, clubs, activeClubId, switchClub, hasPermission } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mock clubs data - in real app, this would come from API or context
  const userClubs: Club[] = [
    { id: '1', name: 'Aditya Athletics Club', slug: 'aditya-athletics', branding: { logoUrl: null, primaryColor: '#1E3A8A', secondaryColor: '#F59E0B' }, settings: { timezone: 'Asia/Kolkata', attendanceMinPercent: 75, workoutVerificationRequired: false, notificationDefaults: {} }, createdBy: '', createdAt: '', updatedAt: '' },
    { id: '2', name: 'University Track Club', slug: 'university-track', branding: { logoUrl: null, primaryColor: '#DC2626', secondaryColor: '#F59E0B' }, settings: { timezone: 'Asia/Kolkata', attendanceMinPercent: 80, workoutVerificationRequired: true, notificationDefaults: {} }, createdBy: '', createdAt: '', updatedAt: '' },
  ];

  const activeClub = userClubs.find(c => c.id === activeClubId) || userClubs[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSwitchClub = async (clubId: string) => {
    try {
      await switchClub(clubId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch club:', error);
    }
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn('gap-2 min-w-[200px] justify-between', isOpen && 'ring-2 ring-primary-500')}
        aria-label="Switch club"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Building2 className="w-4 h-4 text-surface-500" />
          <span className="truncate text-body-sm font-medium">{activeClub.name}</span>
          {activeClub.branding?.logoUrl && (
            <img src={activeClub.branding.logoUrl} alt="" className="w-5 h-5 rounded-full" />
          )}
        </div>
        <ChevronDown className={cn('w-4 h-4 text-surface-500 transition-transform', isOpen && 'rotate-180')} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-surface-900 rounded-lg shadow-elevated border border-surface-200 dark:border-surface-700 z-50 animate-fade-in">
          <div className="p-3 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
            <h3 className="text-body-sm font-semibold">Current Club</h3>
            {hasPermission('club:write') && (
              <Button variant="ghost" size="sm" className="p-1">
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto">
            {userClubs.map(club => (
              <button
                key={club.id}
                onClick={() => handleSwitchClub(club.id)}
                className={cn(
                  'w-full p-3 text-left rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors flex items-center gap-3',
                  club.id === activeClubId && 'bg-primary-50 dark:bg-primary-900/30'
                )}
              >
                {club.branding?.logoUrl ? (
                  <img src={club.branding.logoUrl} alt="" className="w-8 h-8 rounded-lg" />
                ) : (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: club.branding?.primaryColor }}>
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-body-sm font-medium truncate', club.id === activeClubId ? 'text-primary-800 dark:text-primary-200' : 'text-surface-900 dark:text-surface-100')}>
                    {club.name}
                  </p>
                  <p className="text-caption text-surface-500 truncate">{club.slug}</p>
                </div>
                {club.id === activeClubId && (
                  <Check className="w-5 h-5 text-primary-500" />
                )}
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-surface-200 dark:border-surface-700">
            <Button variant="outline" size="sm" className="w-full" onClick={() => { /* navigate to all clubs */ }}>
              View all clubs
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}