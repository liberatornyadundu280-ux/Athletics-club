import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, Clock3, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { clubApi } from '@/services/api';
import { ClubDiscoveryItem } from '@/types';

export function ClubEnrollment() {
  const navigate = useNavigate();
  const { switchClub } = useAuth();
  const [clubs, setClubs] = useState<ClubDiscoveryItem[]>([]);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadClubs = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await clubApi.getEnrollmentClubs();
      setClubs(rows);
      setSelectedClubId(current => rows.some(club => club.id === current)
        ? current
        : rows.find(club => club.request?.status === 'pending')?.id || rows[0]?.id || '');
    } catch (error: any) {
      toast.error(error.message || 'Could not load clubs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadClubs(); }, [loadClubs]);

  const selectedClub = clubs.find(club => club.id === selectedClubId);
  const pendingRequest = clubs.find(club => club.request?.status === 'pending');

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedClub) return;
    setSaving(true);
    try {
      await clubApi.requestClubEnrollment(selectedClub.id, message.trim());
      setMessage('');
      toast.success(`Enrollment request sent to ${selectedClub.name}`);
      await loadClubs();
    } catch (error: any) {
      toast.error(error.message || 'Could not send enrollment request');
    } finally {
      setSaving(false);
    }
  };

  const enterClub = async () => {
    if (!selectedClub) return;
    setSaving(true);
    try {
      await switchClub(selectedClub.id);
      toast.success(`Welcome to ${selectedClub.name}`);
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Could not open your club');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="surface-raised relative overflow-hidden p-6 sm:p-8">
        <div className="absolute right-0 top-0 h-full w-1.5 bg-gradient-to-b from-sky-400 via-sky-500 to-amber-400" />
        <p className="text-sm font-semibold text-sky-400">CLUB ENROLLMENT</p>
        <h1 className="mt-2 text-3xl font-bold text-text-primary">Find your training club</h1>
        <p className="mt-2 max-w-xl text-text-secondary">Choose a club and send its staff an enrollment request. Your access begins after they approve it.</p>
      </section>

      <Card>
        <CardContent className="space-y-5 p-5 sm:p-6">
          {loading ? <div className="py-12 text-center text-text-secondary" role="status">Loading clubs…</div> : clubs.length === 0 ? (
            <div className="py-12 text-center">
              <Building2 className="mx-auto h-9 w-9 text-text-muted" />
              <h2 className="mt-3 font-semibold text-text-primary">No clubs are available yet</h2>
              <p className="mt-1 text-sm text-text-secondary">Check back later or contact your athletics program.</p>
            </div>
          ) : (
            <form onSubmit={submitRequest} className="space-y-5">
              <Select
                label="Choose a club"
                value={selectedClubId}
                onChange={event => setSelectedClubId(event.target.value)}
                options={clubs.map(club => ({ value: club.id, label: club.name }))}
              />

              {selectedClub?.request?.status === 'pending' ? (
                <div className="flex items-start gap-3 border-l-2 border-amber-400 px-4 py-3" role="status">
                  <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                  <div><p className="font-medium text-text-primary">Request sent</p><p className="mt-1 text-sm text-text-secondary">Club staff will review your request. Sent {new Date(selectedClub.request.createdAt).toLocaleDateString()}.</p></div>
                </div>
              ) : selectedClub?.request?.status === 'approved' ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-l-2 border-emerald-400 px-4 py-3" role="status">
                  <div className="flex items-start gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /><div><p className="font-medium text-text-primary">You’re approved</p><p className="mt-1 text-sm text-text-secondary">Your membership at {selectedClub.name} is ready.</p></div></div>
                  <Button type="button" loading={saving} onClick={() => void enterClub()}>Open club</Button>
                </div>
              ) : (
                <>
                  {pendingRequest && <p className="text-sm text-amber-300" role="status">You already have a pending request with {pendingRequest.name}.</p>}
                  {selectedClub?.request?.status === 'rejected' && <p className="text-sm text-text-secondary">Your earlier request was declined. You may send a new request.</p>}
                  <div>
                    <label htmlFor="enrollment-message" className="label">Note for club staff <span className="text-text-muted">(optional)</span></label>
                    <textarea id="enrollment-message" className="input min-h-24 resize-y" maxLength={500} value={message} onChange={event => setMessage(event.target.value)} placeholder="Share a little about your events or training goals." />
                    <p className="mt-1 text-right text-xs text-text-muted">{message.length}/500</p>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={!selectedClub || Boolean(pendingRequest)} loading={saving} leftIcon={<Send className="h-4 w-4" />}>Send enrollment request</Button>
                  </div>
                </>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}