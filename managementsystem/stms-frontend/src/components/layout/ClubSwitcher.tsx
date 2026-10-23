import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Building2, Check, ChevronDown, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { clubApi } from '@/services/api';
import { cn } from '@/utils/helpers';

export function ClubSwitcher({ className }: { className?: string }) {
  const { user, activeClubId, switchClub, hasPermission } = useAuth();
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const userId = user?.id;
  const userRole = user?.role;

  const loadClubs = useCallback(async () => {
    if (!userId) { setClubs([]); return; }
    setLoading(true);
    try {
      const rows = userRole === 'system_admin'
        ? await clubApi.getPlatformClubs()
        : await clubApi.getMine();
      setClubs(rows);
    } catch (error: any) {
      setClubs([]);
      toast.error(error.message || 'Could not load your clubs');
    } finally { setLoading(false); }
  }, [userId, userRole]);

  useEffect(() => {
    void loadClubs();
  }, [loadClubs, activeClubId]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, [isOpen]);

  const activeClub = clubs.find(club => club.id === activeClubId) || clubs.find((club: any) => club.active);
  const handleSwitchClub = async (clubId: string) => {
    if (clubId === activeClubId) { setIsOpen(false); return; }
    setSwitching(true);
    try { await switchClub(clubId); setIsOpen(false); toast.success('Club switched'); }
    catch (error: any) { toast.error(error.message || 'Could not switch clubs'); }
    finally { setSwitching(false); }
  };

  return (
    <div className={cn('relative min-w-0', className)} ref={dropdownRef}>
      <button
        type="button"
        disabled={loading || clubs.length === 0}
        onClick={() => setIsOpen(open => !open)}
        aria-label="Switch club"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          'group flex h-9 min-w-0 items-center gap-2 rounded-md border border-transparent px-2 text-body-sm',
          'transition-colors hover:border-border hover:bg-white/[0.04] disabled:opacity-60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/70',
          isOpen && 'border-border bg-white/[0.04]'
        )}
      >
        <Building2 className="h-4 w-4 shrink-0 text-volt" aria-hidden="true" />
        <span className="max-w-[220px] truncate font-medium text-text-primary">
          {loading ? 'Loading clubs…' : activeClub?.name || 'No club selected'}
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-text-muted transition-transform duration-200', isOpen && 'rotate-180')} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 w-72 overflow-hidden rounded-radius-lg border border-border bg-surface shadow-shadow-xl animate-fade-in">
          <div className="border-b border-border px-4 py-3">
            <p className="text-body-sm font-semibold text-text-primary">Your clubs</p>
            <p className="mt-0.5 text-caption text-text-secondary">Choose the workspace you're training with.</p>
          </div>
          <div className="max-h-64 overflow-y-auto p-1.5" role="listbox" aria-label="Club workspaces">
            {clubs.map(club => {
              const colour = club.branding?.primaryColor || '#D8FF3E';
              return (
                <button
                  key={club.id}
                  role="option"
                  aria-selected={club.id === activeClubId}
                  disabled={switching}
                  onClick={() => void handleSwitchClub(club.id)}
                  className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-white/[0.05] disabled:opacity-60"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md" style={{ backgroundColor: `${colour}24` }}>
                    <Building2 className="h-4 w-4" style={{ color: colour }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-sm font-medium text-text-primary">{club.name}</span>
                    <span className="block truncate text-caption text-text-muted">{club.slug}</span>
                  </span>
                  {club.id === activeClubId && <Check className="h-4 w-4 shrink-0 text-volt" />}
                </button>
              );
            })}
          </div>
          {!loading && clubs.length === 0 && (
            <p className="px-4 pb-4 text-body-sm text-text-muted">No active club memberships found for this account.</p>
          )}
          {hasPermission('club:settings') && (
            <div className="border-t border-border p-1.5">
              <button
                onClick={() => { setIsOpen(false); navigate('/settings/club'); }}
                className="dropdown-item inline-flex items-center gap-2.5"
              >
                <Settings2 className="h-4 w-4" />
                Club settings
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
