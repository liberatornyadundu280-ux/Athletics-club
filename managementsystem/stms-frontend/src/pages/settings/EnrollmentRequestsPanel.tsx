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
    <Card padding="none">
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-heading-sm font-semibold text-text-primary">Enrollment requests</h2>
            <p className="mt-0.5 text-caption text-text-secondary">Athletes asking to join this club.</p>
          </div>
          {!loading && (
            <span className="num shrink-0 rounded-full border border-border px-2.5 py-1 text-micro text-text-muted">
              {requests.length}
            </span>
          )}
        </div>

        {loading ? (
          <p className="px-4 py-8 text-center text-body-sm text-text-secondary" role="status">Loading requests…</p>
        ) : requests.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-8 text-text-muted">
            <UserRound className="h-4 w-4" aria-hidden="true" />
            <p className="text-body-sm">No pending enrollment requests.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {requests.map(request => (
              <li key={request.id} className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <Avatar name={request.athlete?.name || 'Athlete'} src={request.athlete?.avatarUrl || undefined} size="sm" />
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium text-text-primary">{request.athlete?.name || 'Account unavailable'}</p>
                    {request.athlete && <p className="truncate text-caption text-text-secondary">{request.athlete.email}</p>}
                    <p className="mt-1 text-caption text-text-muted">
                      Requested <span className="num">{new Date(request.createdAt).toLocaleDateString()}</span>
                    </p>
                    {request.message && <p className="mt-2 max-w-xl whitespace-pre-wrap text-body-sm text-text-secondary">{request.message}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 sm:pl-4">
                  <Button size="sm" variant="success" disabled={Boolean(reviewingId)} loading={reviewingId === request.id} onClick={() => void review(request, 'approved')} leftIcon={<Check className="h-4 w-4" />}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" disabled={Boolean(reviewingId)} onClick={() => void review(request, 'rejected')} leftIcon={<X className="h-4 w-4" />}>
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
