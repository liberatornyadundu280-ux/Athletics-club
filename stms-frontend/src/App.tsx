import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MainLayout, AuthLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/context/AuthContext';
import LoadingScreen from '@/components/common/LoadingScreen';

const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const AthletesList = lazy(() => import('@/pages/athletes/AthletesList').then(m => ({ default: m.AthletesList })));
const AthleteDetail = lazy(() => import('@/pages/athletes/AthleteDetail').then(m => ({ default: m.AthleteDetail })));
const Profile = lazy(() => import('@/pages/profile/Profile').then(m => ({ default: m.Profile })));
const Settings = lazy(() => import('@/pages/settings/Settings').then(m => ({ default: m.Settings })));
const UserManagement = lazy(() => import('@/pages/settings/UserManagement').then(m => ({ default: m.UserManagement })));
const SystemUserManagement = lazy(() => import('@/pages/settings/SystemUserManagement').then(m => ({ default: m.SystemUserManagement })));
const AcceptInvitation = lazy(() => import('@/pages/auth/AcceptInvitation').then(m => ({ default: m.AcceptInvitation })));
const PlannedModule = lazy(() => import('@/pages/ModulePreview').then(m => ({ default: m.ModulePreview })));
const Login = lazy(() => import('@/pages/auth/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('@/pages/auth/Register').then(m => ({ default: m.Register })));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword').then(m => ({ default: m.ForgotPassword })));

interface ProtectedRouteProps {
  children: React.ReactNode;
  permissions?: string[];
  roles?: string[];
}

function ProtectedRoute({ children, permissions = [], roles = [] }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasPermission, hasRole, user } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingScreen message="Checking permissions..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: { pathname: location.pathname, search: location.search } }} />;
  if (roles.length > 0 && user && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  if (permissions.length > 0 && !permissions.some(permission => hasPermission(permission))) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function Planned({ title, sprint, description }: { title: string; sprint: number; description: string }) {
  return <ProtectedRoute><PlannedModule title={title} sprint={sprint} description={description} /></ProtectedRoute>;
}

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        </Route>

        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/settings/club" element={<ProtectedRoute roles={['club_admin', 'system_admin']}><Settings /></ProtectedRoute>} />
          <Route path="/settings/users" element={<ProtectedRoute roles={['club_admin', 'system_admin']} permissions={['user:read']}><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute roles={['system_admin']}><SystemUserManagement /></ProtectedRoute>} />
          <Route path="/accept-invitation" element={<ProtectedRoute><AcceptInvitation /></ProtectedRoute>} />

          <Route path="/athletes" element={<ProtectedRoute permissions={['athlete:read']}><AthletesList /></ProtectedRoute>} />
          <Route path="/athletes/new" element={<ProtectedRoute permissions={['athlete:read']}><AthleteDetail /></ProtectedRoute>} />
          <Route path="/athletes/:id" element={<ProtectedRoute permissions={['athlete:read']}><AthleteDetail /></ProtectedRoute>} />
          <Route path="/workouts" element={<Planned title="Workout plans" sprint={4} description="Build, assign, and review training sessions with your athletes." />} />
          <Route path="/workouts/builder" element={<Planned title="Workout builder" sprint={4} description="Workout creation and saving will be available when the workout API is implemented." />} />
          <Route path="/workouts/builder/:id" element={<Planned title="Edit workout" sprint={4} description="Workout editing will be available when the workout API is implemented." />} />
          <Route path="/workouts/today" element={<Planned title="Today's workout" sprint={4} description="Your assigned training session will appear here when workout APIs are connected." />} />
          <Route path="/workouts/:id/player" element={<Planned title="Workout player" sprint={4} description="Follow and record a workout after Sprint 4 is connected." />} />
          <Route path="/attendance" element={<Planned title="Attendance" sprint={3} description="Record training attendance, check-ins, and session history." />} />
          <Route path="/attendance/session/:id" element={<Planned title="Training session" sprint={3} description="Session rosters and check-ins will be connected in Sprint 3." />} />
          <Route path="/performance" element={<Planned title="Performance tracking" sprint={5} description="Competition results, personal bests, and training tests will appear here." />} />
          <Route path="/performance/fitness-tests" element={<Planned title="Fitness tests" sprint={5} description="Record and compare fitness test results when the performance API is available." />} />
          <Route path="/performance/fitness-tests/:name" element={<Planned title="Fitness test" sprint={5} description="Fitness test records will be available in Sprint 5." />} />
          <Route path="/performance/goals" element={<Planned title="Training goals" sprint={5} description="Set and track season goals when performance APIs are connected." />} />
          <Route path="/performance/goals/:goal" element={<Planned title="Training goal" sprint={5} description="Goal editing will be available with the performance API." />} />
          <Route path="/injuries" element={<Planned title="Injury tracking" sprint={7} description="Track athlete wellbeing and return-to-play plans when the injury module is implemented." />} />
          <Route path="/injuries/:id" element={<Planned title="Injury record" sprint={7} description="Injury records will be available in Sprint 7." />} />
          <Route path="/permissions" element={<Planned title="Permission letters" sprint={7} description="Create and review competition permission letters when this workflow is connected." />} />
          <Route path="/permissions/event/:id" element={<Planned title="Permission request" sprint={7} description="Permission request details will be available in Sprint 7." />} />
          <Route path="/analytics" element={<Planned title="Club analytics" sprint={8} description="Role-based reports and training trends will appear after the core modules are connected." />} />
          <Route path="/announcements" element={<Planned title="Club announcements" sprint={8} description="Team announcements and notifications are planned for Sprint 8." />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
