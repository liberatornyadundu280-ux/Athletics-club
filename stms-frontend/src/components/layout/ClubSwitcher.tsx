import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Building2, Check, ChevronDown, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { clubApi } from '@/services/api';
import { Club } from '@/types';
import { cn } from '@/utils/helpers';

export function ClubSwitcher({ className }: { className?: string }) {
  const { user, activeClubId, switchClub, hasPermission } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.clubIds?.length) {
      setClubs([]);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all(user.clubIds.map(id => clubApi.getClub(id).catch(() => null)))
      .then(results => { if (active) setClubs(results.filter((club): club is Club => Boolean(club))); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.clubIds]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, [isOpen]);

  const activeClub = clubs.find(club => club.id === activeClubId);
  const handleSwitchClub = async (clubId: string) => {
    if (clubId === activeClubId) { setIsOpen(false); return; }
    setSwitching(true);
    try { await switchClub(clubId); setIsOpen(false); toast.success('Club switched'); }
    catch (error: any) { toast.error(error.message || 'Could not switch clubs'); }
    finally { setSwitching(false); }
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <Button variant="outline" size="sm" disabled={loading || clubs.length === 0} onClick={() => setIsOpen(open => !open)} className="min-w-[180px] justify-between gap-2" aria-label="Switch club" aria-expanded={isOpen} aria-haspopup="listbox">
        <span className="flex min-w-0 items-center gap-2"><Building2 className="h-4 w-4 shrink-0 text-sky-400" /><span className="truncate">{loading ? 'Loading clubs…' : activeClub?.name || 'No club selected'}</span></span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', isOpen && 'rotate-180')} />
      </Button>

      {isOpen && <div className="surface-raised absolute left-0 z-50 mt-2 w-72 overflow-hidden shadow-xl">
        <div className="border-b border-border px-4 py-3"><p className="text-xs font-semibold text-text-muted">YOUR CLUBS</p><p className="mt-1 text-sm text-text-secondary">Switch the workspace you’re training with.</p></div>
        <div className="max-h-64 overflow-y-auto p-2" role="listbox" aria-label="Club workspaces">
          {clubs.map(club => <button key={club.id} role="option" aria-selected={club.id === activeClubId} disabled={switching} onClick={() => void handleSwitchClub(club.id)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-cold-800 disabled:opacity-60"><span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${club.branding.primaryColor}40` }}><Building2 className="h-4 w-4" style={{ color: club.branding.primaryColor }} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-text-primary">{club.name}</span><span className="block truncate text-xs text-text-muted">{club.slug}</span></span>{club.id === activeClubId && <Check className="h-4 w-4 text-sky-400" />}</button>)}
        </div>
        {hasPermission('club:settings') && <div className="border-t border-border p-2"><button onClick={() => { setIsOpen(false); navigate('/settings/club'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-cold-800 hover:text-text-primary"><Settings2 className="h-4 w-4" />Club settings</button></div>}
      </div>}
    </div>
  );
}
