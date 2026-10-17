import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export function AcceptInvitation() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, acceptInvitation } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const token = params.get('token') || '';

  const accept = async () => {
    setLoading(true);
    setError('');
    try {
      await acceptInvitation(token);
      toast.success('You joined the club');
      navigate('/dashboard', { replace: true });
    } catch (reason: any) {
      const message = reason.message || 'This invitation could not be accepted.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <section className="surface-raised relative overflow-hidden p-7 sm:p-9">
        <div className="absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r from-sky-400 via-sky-500 to-amber-400" />
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-300"><MailCheck className="h-7 w-7" /></div>
          <p className="mt-5 text-sm font-semibold text-sky-400">CLUB INVITATION</p>
          <h1 className="mt-2 text-3xl font-bold text-text-primary">Join your training team</h1>
          <p className="mt-3 text-text-secondary">Accepting this invitation adds your account to the club and switches your workspace to it.</p>
          <div className="mt-5 rounded-lg border border-border bg-cold-900/50 p-3 text-left"><p className="text-xs text-text-muted">SIGNED IN AS</p><p className="mt-1 font-medium text-text-primary">{user?.email}</p></div>
          {!token && <p className="mt-4 text-sm text-danger-400">This invitation link is missing its token. Ask your club admin for a new link.</p>}
          {error && <p className="mt-4 rounded-lg border border-danger-500/30 bg-danger-500/10 p-3 text-left text-sm text-danger-300" role="alert">{error}</p>}
          <Button className="mt-6 w-full" size="lg" disabled={!token} loading={loading} onClick={() => void accept()} leftIcon={<Check className="h-4 w-4" />}>Accept invitation</Button>
        </div>
      </section>
    </div>
  );
}
