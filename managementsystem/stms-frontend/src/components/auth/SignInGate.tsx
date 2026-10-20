import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Lock } from 'lucide-react';

/**
 * Copy for the in-place sign-in prompt. Visitors are allowed to walk the whole app — the
 * navigation, the module names, what each one does — and only meet this panel when they open
 * a module whose data needs an account. Keeping the copy here means the gate can stay a
 * single component instead of a prop threaded through every route.
 */
const sectionCopy: Record<string, { title: string; description: string }> = {
  dashboard: {
    title: 'Your training command centre',
    description: 'Attendance, readiness and the day’s sessions at a glance. Sign in to see your club’s numbers.',
  },
  athletes: {
    title: 'Athlete profiles and rosters',
    description: 'Profiles, contact details, medical notes and season history — private to your club.',
  },
  workouts: {
    title: 'Workouts and the training player',
    description: 'Build sessions from the exercise library, assign them, and run them step by step with athletes.',
  },
  recommendations: {
    title: 'Smart Plan recommendations',
    description: 'The AI model reads recent load, readiness and injury history to suggest the next session.',
  },
  attendance: {
    title: 'Attendance',
    description: 'Create sessions, mark the roster, share check-in links and review attendance trends.',
  },
  performance: {
    title: 'Performance tracking',
    description: 'Results, personal bests, fitness tests and season goals for every athlete.',
  },
  injuries: {
    title: 'Injury and return-to-play',
    description: 'Wellness check-ins, rehab tasks and a safe, staged return to training.',
  },
  permissions: {
    title: 'Permission letters',
    description: 'Generate, review and verify travel and competition permission letters.',
  },
  analytics: {
    title: 'Club analytics',
    description: 'Squad-level reports, attendance and performance trends, and exports for review meetings.',
  },
  announcements: {
    title: 'Announcements',
    description: 'Club-wide notices with read tracking, so nobody misses a schedule change.',
  },
  profile: {
    title: 'Your profile',
    description: 'Your name, photo and club membership. Sign in to update them.',
  },
  settings: {
    title: 'Settings',
    description: 'Club branding and configuration, plus user and role management.',
  },
  admin: {
    title: 'Platform administration',
    description: 'Platform-wide accounts and club directory. Restricted to system administrators.',
  },
  clubs: {
    title: 'Club enrollment',
    description: 'Find a club and request to join its roster.',
  },
  sprints: {
    title: 'Sprint progress',
    description: 'A look at what has shipped and what is in progress.',
  },
};

function copyFor(pathname: string) {
  const section = pathname.split('/').filter(Boolean)[0] ?? 'dashboard';
  return sectionCopy[section] ?? {
    title: 'Members only',
    description: 'This module needs a club account. Sign in to continue.',
  };
}

export function SignInGate() {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const { title, description } = copyFor(location.pathname);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      // On success the auth context flips to authenticated and this gate is replaced by the
      // real module — there is nowhere to navigate to, because the visitor is already here.
      await loginWithGoogle();
      toast.success('Welcome!');
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== 'auth/popup-closed-by-user') {
        toast.error(error instanceof Error ? error.message : 'Google sign-in failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl border border-line bg-panel p-space-xl text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-volt/10">
          <Lock className="h-6 w-6 text-volt" strokeWidth={2.2} />
        </div>

        <h2 className="font-display text-2xl tracking-wide text-white">{title}</h2>
        <p className="mx-auto mt-3 max-w-md text-body text-mist">{description}</p>

        <div className="mt-7 space-y-3">
          <Button
            className="w-full gap-3"
            size="lg"
            onClick={handleGoogle}
            loading={googleLoading}
            leftIcon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            }
          >
            Continue with Google
          </Button>

          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => navigate('/login', { state: { from: { pathname: location.pathname, search: location.search } } })}
          >
            Sign in with email
          </Button>
        </div>

        <p className="mt-6 text-caption text-fog">
          You can browse the app freely. An account is only needed to open a module.
        </p>

        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-2 text-caption text-fog transition-colors hover:text-mist"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to the home page
        </Link>
      </div>
    </div>
  );
}
