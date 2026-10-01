import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MainLayout, AuthLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/context/AuthContext';
import LoadingScreen from '@/components/common/LoadingScreen';

const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const SprintProgress = lazy(() => import('@/pages/sprints/SprintProgress').then(m => ({ default: m.SprintProgress })));
const AttendanceList = lazy(() => import('@/pages/attendance/AttendanceList').then(m => ({ default: m.AttendanceList })));
const AttendanceSession = lazy(() => import('@/pages/attendance/AttendanceSession').then(m => ({ default: m.AttendanceSession })));
const AttendanceCheckIn = lazy(() => import('@/pages/attendance/AttendanceCheckIn').then(m => ({ default: m.AttendanceCheckIn })));
const WorkoutsList = lazy(() => import('@/pages/workouts/WorkoutsList').then(m => ({ default: m.WorkoutsList })));
const WorkoutBuilder = lazy(() => import('@/pages/workouts/WorkoutBuilder').then(m => ({ default: m.WorkoutBuilder })));
const WorkoutPlayer = lazy(() => import('@/pages/workouts/WorkoutPlayer').then(m => ({ default: m.WorkoutPlayer })));
const PerformanceList = lazy(() => import('@/pages/performance/PerformanceList').then(m => ({ default: m.PerformanceList })));
const Recommendations = lazy(() => import('@/pages/recommendations/Recommendations').then(m => ({ default: m.Recommendations })));
const InjuriesList = lazy(() => import('@/pages/injuries/InjuriesList').then(m => ({ default: m.InjuriesList })));
const InjuryDetail = lazy(() => import('@/pages/injuries/InjuryDetail').then(m => ({ default: m.InjuryDetail })));
const PermissionsList = lazy(() => import('@/pages/permissions/PermissionsList').then(m => ({ default: m.PermissionsList })));
const PermissionVerify = lazy(() => import('@/pages/permissions/PermissionVerify').then(m => ({ default: m.PermissionVerify })));
const AthletesList = lazy(() => import('@/pages/athletes/AthletesList').then(m => ({ default: m.AthletesList })));
const AthleteDetail = lazy(() => import('@/pages/athletes/AthleteDetail').then(m => ({ default: m.AthleteDetail })));
const Profile = lazy(() => import('@/pages/profile/Profile').then(m => ({ default: m.Profile })));
const Settings = lazy(() => import('@/pages/settings/Settings').then(m => ({ default: m.Settings })));
const UserManagement = lazy(() => import('@/pages/settings/UserManagement').then(m => ({ default: m.UserManagement })));
const ClubEnrollment = lazy(() => import('@/pages/clubs/ClubEnrollment').then(m => ({ default: m.ClubEnrollment })));
const SystemUserManagement = lazy(() => import('@/pages/settings/SystemUserManagement').then(m => ({ default: m.SystemUserManagement })));
const AcceptInvitation = lazy(() => import('@/pages/auth/AcceptInvitation').then(m => ({ default: m.AcceptInvitation })));
const PlannedModule = lazy(() => import('@/pages/ModulePreview').then(m => ({ default: m.ModulePreview })));
const Analytics = lazy(() => import('@/pages/analytics/Analytics').then(m => ({ default: m.Analytics })));
const Announcements = lazy(() => import('@/pages/announcements/Announcements').then(m => ({ default: m.Announcements })));
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
          <Route path="/permissions/public/:token" element={<PermissionVerify />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        </Route>

        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/sprints/2" element={<ProtectedRoute><SprintProgress /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/settings/club" element={<ProtectedRoute roles={['club_admin', 'system_admin']}><Settings /></ProtectedRoute>} />
          <Route path="/settings/users" element={<ProtectedRoute roles={['club_admin', 'system_admin']} permissions={['user:read']}><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute roles={['system_admin']}><SystemUserManagement /></ProtectedRoute>} />
          <Route path="/clubs/enroll" element={<ProtectedRoute roles={['athlete']}><ClubEnrollment /></ProtectedRoute>} />
          <Route path="/accept-invitation" element={<ProtectedRoute><AcceptInvitation /></ProtectedRoute>} />

          <Route path="/athletes" element={<ProtectedRoute permissions={['athlete:read']}><AthletesList /></ProtectedRoute>} />
          <Route path="/athletes/new" element={<ProtectedRoute permissions={['athlete:read']}><AthleteDetail /></ProtectedRoute>} />
          <Route path="/athletes/:id" element={<ProtectedRoute permissions={['athlete:read']}><AthleteDetail /></ProtectedRoute>} />
          <Route path="/workouts" element={<ProtectedRoute permissions={['workout:read']}><WorkoutsList /></ProtectedRoute>} />
          <Route path="/workouts/builder" element={<ProtectedRoute permissions={['workout:write']}><WorkoutBuilder /></ProtectedRoute>} />
          <Route path="/workouts/builder/:id" element={<ProtectedRoute permissions={['workout:write']}><WorkoutBuilder /></ProtectedRoute>} />
          <Route path="/workouts/today" element={<Navigate to="/workouts" replace />} />
          <Route path="/workouts/:id/player" element={<ProtectedRoute permissions={['workout:complete']}><WorkoutPlayer /></ProtectedRoute>} />
          <Route path="/recommendations" element={<ProtectedRoute permissions={['workout:read']}><Recommendations /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute permissions={['attendance:read']}><AttendanceList /></ProtectedRoute>} />
          <Route path="/attendance/session/:id" element={<ProtectedRoute permissions={['attendance:read']}><AttendanceSession /></ProtectedRoute>} />
          <Route path="/attendance/check-in/:token" element={<ProtectedRoute permissions={['workout:complete']}><AttendanceCheckIn /></ProtectedRoute>} />
          <Route path="/performance" element={<ProtectedRoute permissions={['performance:read']}><PerformanceList /></ProtectedRoute>} />
          <Route path="/performance/fitness-tests" element={<ProtectedRoute permissions={['performance:read']}><PerformanceList /></ProtectedRoute>} />
          <Route path="/performance/fitness-tests/:name" element={<ProtectedRoute permissions={['performance:read']}><PerformanceList /></ProtectedRoute>} />
          <Route path="/performance/goals" element={<ProtectedRoute permissions={['performance:read']}><PerformanceList /></ProtectedRoute>} />
          <Route path="/performance/goals/:goal" element={<ProtectedRoute permissions={['performance:read']}><PerformanceList /></ProtectedRoute>} />
          <Route path="/injuries" element={<ProtectedRoute permissions={['injury:read']}><InjuriesList /></ProtectedRoute>} />
          <Route path="/injuries/:id" element={<ProtectedRoute permissions={['injury:read']}><InjuryDetail /></ProtectedRoute>} />
          <Route path="/permissions" element={<ProtectedRoute permissions={['permission:read']}><PermissionsList /></ProtectedRoute>} />
          <Route path="/permissions/event/:id" element={<ProtectedRoute permissions={['permission:read']}><PermissionsList /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute permissions={['analytics:read', 'analytics:read:own']}><Analytics /></ProtectedRoute>} />
          <Route path="/announcements" element={<ProtectedRoute permissions={['announcement:read']}><Announcements /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
