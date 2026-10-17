import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input } from '@/components/ui';
import { getFirebaseAuth } from '@/services/firebase';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
      setSent(true);
      toast.success('Password reset email sent');
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        setSent(true);
        toast.success('If that account exists, a reset email was sent.');
        return;
      }
      const message = error.code === 'auth/invalid-email'
        ? 'Enter a valid email address.'
        : 'Could not send the reset email. Try again in a moment.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="mb-4" leftIcon={<ArrowLeft className="h-4 w-4" />}>Back to sign in</Button>
        {sent ? <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" /> : <Mail className="mx-auto h-10 w-10 text-sky-400" />}
        <h1 className="mt-3 text-2xl font-bold text-text-primary">{sent ? 'Check your inbox' : 'Reset your password'}</h1>
        <p className="mt-2 text-sm text-text-secondary">{sent ? `If an account exists for ${email}, Firebase sent a reset link.` : 'We’ll send a secure password reset link to your email.'}</p>
      </div>

      {!sent ? <form onSubmit={submit} className="space-y-5">
        <Input label="Email address" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" leftIcon={<Mail className="h-4 w-4" />} />
        <Button type="submit" size="lg" className="w-full" loading={loading}>Send reset link</Button>
      </form> : <Button size="lg" className="w-full" onClick={() => navigate('/login')}>Return to sign in</Button>}

      <p className="text-center text-sm text-text-secondary">Remember your password? <Link to="/login" className="font-medium text-sky-400 hover:text-sky-300">Sign in</Link></p>
    </div>
  );
}
