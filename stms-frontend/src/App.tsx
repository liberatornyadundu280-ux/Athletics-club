import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout, AuthLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/context/AuthContext';
import LoadingScreen from '@/components/common/LoadingScreen';

// ==================== LAZY LOADED PAGES ====================
const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const AthletesList = lazy(() => import('@/pages/athletes/AthletesList').then(m => ({ default: m.AthletesList })));
const AthleteDetail = lazy(() => import('@/pages/athletes/AthleteDetail').then(m => ({ default: m.AthleteDetail })));
const WorkoutsList = lazy(() => import('@/pages/workouts/WorkoutsList').then(m => ({ default: m.WorkoutsList })));
const WorkoutBuilder = lazy(() => import('@/pages/workouts/WorkoutBuilder').then(m => ({ default: m.WorkoutBuilder })));
const WorkoutPlayer = lazy(() => import('@/pages/workouts/WorkoutPlayer').then(m => ({ default: m.WorkoutPlayer })));
const AttendanceList = lazy(() => import('@/pages/attendance/AttendanceList').then(m => ({ default: m.AttendanceList })));
const AttendanceSession = lazy(() => import('@/pages/attendance/AttendanceSession').then(m => ({ default: m.AttendanceSession })));
const PerformanceList = lazy(() => import('@/pages/performance/PerformanceList').then(m => ({ default: m.PerformanceList })));
const FitnessTests = lazy(() => import('@/pages/performance/FitnessTests').then(m => ({ default: m.FitnessTests })));
const Goals = lazy(() => import('@/pages/performance/Goals').then(m => ({ default: m.Goals })));
const InjuriesList = lazy(() => import('@/pages/injuries/InjuriesList').then(m => ({ default: m.InjuriesList })));
const InjuryDetail = lazy(() => import('@/pages/injuries/InjuryDetail').then(m => ({ default: m.InjuryDetail })));
const PermissionsList = lazy(() => import('@/pages/permissions/PermissionsList').then(m => ({ default: m.PermissionsList })));
const PermissionEvent = lazy(() => import('@/pages/permissions/PermissionEvent').then(m => ({ default: m.PermissionEvent })));
const Analytics = lazy(() => import('@/pages/analytics/Analytics').then(m => ({ default: m.Analytics })));
const Settings = lazy(() => import('@/pages/settings/Settings').then(m => ({ default: m.Settings })));
const Profile = lazy(() => import('@/pages/profile/Profile').then(m => ({ default: m.Profile })));

// Auth pages (not lazy loaded for faster initial load)
const Login = lazy(() => import('@/pages/auth/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('@/pages/auth/Register').then(m => ({ default: m.Register })));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword').then(m => ({ default: m.ForgotPassword })));

// ==================== PROTECTED ROUTE ====================
interface ProtectedRouteProps {
  children: React.ReactNode;
  permissions?: string[];
  roles?: string[];
}

function ProtectedRoute({ children, permissions = [], roles = [] }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasPermission, hasRole, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Checking permissions..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
  }

  // Check roles
  if (roles.length > 0 && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check permissions
  if (permissions.length > 0 && !permissions.some(p => hasPermission(p))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// ==================== PUBLIC ROUTE (redirects authenticated users) ====================
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// ==================== APP ====================
function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
          {/* Public routes */}
          <Route element={<AuthLayout />}>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              }
            />
          </Route>

          {/* Protected routes */}
          <Route element={<MainLayout />}>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Athletes */}
            <Route
              path="/athletes"
              element={
                <ProtectedRoute permissions={['athlete:read']}>
                  <AthletesList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/athletes/:id"
              element={
                <ProtectedRoute permissions={['athlete:read']}>
                  <AthleteDetail />
                </ProtectedRoute>
              }
            />

            {/* Workouts */}
            <Route
              path="/workouts"
              element={
                <ProtectedRoute permissions={['workout:read']}>
                  <WorkoutsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workouts/builder"
              element={
                <ProtectedRoute permissions={['workout:write']}>
                  <WorkoutBuilder />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workouts/builder/:id"
              element={
                <ProtectedRoute permissions={['workout:write']}>
                  <WorkoutBuilder />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workouts/today"
              element={
                <ProtectedRoute>
                  <WorkoutPlayer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workouts/:id/player"
              element={
                <ProtectedRoute>
                  <WorkoutPlayer />
                </ProtectedRoute>
              }
            />

            {/* Attendance */}
            <Route
              path="/attendance"
              element={
                <ProtectedRoute permissions={['attendance:read']}>
                  <AttendanceList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance/session/:id"
              element={
                <ProtectedRoute permissions={['attendance:write']}>
                  <AttendanceSession />
                </ProtectedRoute>
              }
            />

            {/* Performance */}
            <Route
              path="/performance"
              element={
                <ProtectedRoute permissions={['performance:read']}>
                  <PerformanceList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/performance/fitness-tests"
              element={
                <ProtectedRoute permissions={['performance:write']}>
                  <FitnessTests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/performance/goals"
              element={
                <ProtectedRoute>
                  <Goals />
                </ProtectedRoute>
              }
            />

            {/* Injuries */}
            <Route
              path="/injuries"
              element={
                <ProtectedRoute permissions={['injury:read']}>
                  <InjuriesList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/injuries/:id"
              element={
                <ProtectedRoute permissions={['injury:read']}>
                  <InjuryDetail />
                </ProtectedRoute>
              }
            />

            {/* Permissions */}
            <Route
              path="/permissions"
              element={
                <ProtectedRoute permissions={['permission:read']}>
                  <PermissionsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/permissions/event/:id"
              element={
                <ProtectedRoute permissions={['permission:write']}>
                  <PermissionEvent />
                </ProtectedRoute>
              }
            />

            {/* Analytics */}
            <Route
              path="/analytics"
              element={
                <ProtectedRoute permissions={['analytics:read']}>
                  <Analytics />
                </ProtectedRoute>
              }
            />

            {/* Settings */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute roles={['club_admin', 'system_admin']}>
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* Profile */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Suspense>
  );
}

export default App;