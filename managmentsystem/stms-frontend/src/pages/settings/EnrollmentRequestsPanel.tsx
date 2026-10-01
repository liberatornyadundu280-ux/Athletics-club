import React, { useCallback, useEffect, useState } from 'react';
import { Check, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, Button, Card, CardContent } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { clubApi } from '@/services/api';
import { ClubEnrollmentRequest, EnrollmentRequestStatus } from '@/types';

export function EnrollmentRequestsPanel() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ClubEnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState('');

  const loadRequests = useCallback(async () => {
    if (!user?.activeClubId) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRequests(await clubApi.getEnrollmentRequests(user.activeClubId));
    } catch (error: any) {
      toast.error(error.message || 'Could not load enrollment requests');
    } finally {
      setLoading(false);
    }
  }, [user?.activeClubId]);

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  const review = async (request: ClubEnrollmentRequest, status: Extract<EnrollmentRequestStatus, 'approved' | 'rejected'>) => {
    if (!user?.activeClubId) return;
    setReviewingId(request.id);
    try {
      await clubApi.reviewEnrollmentRequest(user.activeClubId, request.id, status);
      toast.success(status === 'approved' ? 'Athlete enrolled' : 'Request declined');
      await loadRequests();
    } catch (error: any) {
      toast.error(error.message || 'Could not review enrollment request');
    } finally {
      setReviewingId('');
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-xl font-semibold text-text-primary">Enrollment requests</h2><p className="mt-1 text-sm text-text-secondary">Athletes asking to join this club.</p></div>
          {!loading && <span className="rounded-full border border-border px-2.5 py-1 text-xs text-text-muted">{requests.length}</span>}
        </div>
        {loading ? <div className="py-6 text-center text-sm text-text-secondary" role="status">Loading requests…</div> : requests.length === 0 ? (
          <p className="border-t border-border pt-4 text-sm text-text-muted">No pending enrollment requests.</p>
        ) : (
          <ul className="divide-y divide-border">
            {requests.map(request => <li key={request.id} className="flex flex-col gap-4 py-4 first:pt-1 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <Avatar name={request.athlete?.name || 'Athlete'} src={request.athlete?.avatarUrl || undefined} size="sm" />
                <div className="min-w-0">
                  <p className="font-medium text-text-primary">{request.athlete?.name || 'Account unavailable'}</p>
                  {request.athlete && <p className="text-sm text-text-secondary">{request.athlete.email}</p>}
                  <p className="mt-1 text-xs text-text-muted">Requested {new Date(request.createdAt).toLocaleDateString()}</p>
                  {request.message && <p className="mt-2 max-w-xl whitespace-pre-wrap text-sm text-text-secondary">{request.message}</p>}
                </div>
              </div>
              <div className="flex shrink-0 gap-2 sm:pl-4">
                <Button size="sm" variant="success" disabled={Boolean(reviewingId)} loading={reviewingId === request.id} onClick={() => void review(request, 'approved')} leftIcon={<Check className="h-4 w-4" />}>Approve</Button>
                <Button size="sm" variant="outline" disabled={Boolean(reviewingId)} onClick={() => void review(request, 'rejected')} leftIcon={<X className="h-4 w-4" />}>Decline</Button>
              </div>
            </li>)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}