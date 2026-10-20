import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, authApi } from '@/services/api';
import { signInWithEmail, signInWithGoogle, signOut as firebaseSignOut } from '@/services/firebase';
import { User, AuthState, AuthTokens, Club } from '@/types';

export interface AuthContextType extends AuthState {
  user: User | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  clubs: Club[];
  activeClubId: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; role: 'athlete' | 'coach'; name: string }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  switchClub: (clubId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: { name: string }) => Promise<void>;
  acceptInvitation: (token: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthContextType>({
    user: null,
    permissions: [],
    isAuthenticated: false,
    isLoading: true,
    error: null,
    clubs: [],
    activeClubId: null,
    login: async () => {},
    register: async () => {},
    loginWithGoogle: async () => {},
    logout: async () => {},
    switchClub: async () => {},
    refreshUser: async () => {},
    updateProfile: async () => {},
    acceptInvitation: async () => {},
    hasPermission: () => false,
    hasRole: () => false,
    clearError: () => {},
  });

  // Restore a previous session before deciding that the visitor is anonymous.
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Discard legacy mock sessions; Sprint 1 requires a backend-issued JWT.
        if (localStorage.getItem('accessToken') === 'demo-token') {
          api.clearAuth();
        }

        // The user signed out on purpose. Do not let a still-valid HttpOnly refresh cookie
        // silently sign them back in — the logout request may not have reached the backend.
        if (api.hasExplicitlySignedOut()) {
          api.clearAuth();
          if (mounted) setState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        // The access token only lives 15 minutes, so treat "expired" as "unknown" rather
        // than "signed out": the httpOnly refresh cookie is the real session and it lasts for
        // weeks. Without this, every return visit after a short break landed on the login
        // page even though the session was still perfectly valid.
        if (!api.getStoredUser() || api.isTokenExpired()) {
          const restored = await api.tryRefreshAccessToken();

          // A second tab loading at the same moment may have already rotated the session:
          // refresh tokens are single-use, so our copy fails while that tab's succeeds. Use
          // the token it stored rather than showing this tab the sign-in prompt.
          const restoredByAnotherTab = Boolean(api.getStoredUser()) && !api.isTokenExpired();

          if (!restored && !restoredByAnotherTab) {
            api.clearAuth();
            if (mounted) setState(prev => ({ ...prev, isLoading: false }));
            return;
          }
        }

        const { user, permissions } = await authApi.getMe();
        if (mounted) {
          setState(prev => ({
            ...prev,
            user,
            permissions,
            activeClubId: user.activeClubId || null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          }));
        }
      } catch (error) {
        // The cookie was accepted but the profile could not be read. Discard the session
        // rather than leaving the UI half-signed-in.
        api.clearAuth();
        console.warn('Could not restore the previous session:', error);
        if (mounted) {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // The axios interceptor raises this when a mid-session refresh fails. Resetting the
  // context keeps the router in step instead of leaving a stale `isAuthenticated: true`.
  useEffect(() => {
    const handleExpired = () => {
      setState(prev => ({
        ...prev,
        user: null,
        permissions: [],
        activeClubId: null,
        isAuthenticated: false,
        isLoading: false,
      }));
    };

    window.addEventListener('stms:auth-expired', handleExpired);
    return () => window.removeEventListener('stms:auth-expired', handleExpired);
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, ...(error ? { isLoading: false } : {}) }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  const updateAuthState = useCallback((tokens: AuthTokens & { user: User; permissions: string[] }) => {
    setState(prev => ({
      ...prev,
      user: tokens.user,
      permissions: tokens.permissions,
      activeClubId: tokens.user.activeClubId || null,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    }));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const credential = await signInWithEmail(email, password);
      const idToken = await credential.user.getIdToken(true);
      const tokens = await authApi.loginWithFirebase(idToken);
      updateAuthState({ ...tokens, permissions: tokens.permissions || tokens.user.permissions || [] });
    } catch (error: any) {
      setError(error.message || 'Login failed');
      throw error;
    }
  }, [updateAuthState, setError]);

  const register = useCallback(async (data: { email: string; password: string; role: 'athlete' | 'coach'; name: string }) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const tokens = await authApi.register(data);
      updateAuthState({ ...tokens, permissions: tokens.permissions || tokens.user.permissions || [] });
    } catch (error: any) {
      setError(error.message || 'Registration failed');
      throw error;
    }
  }, [updateAuthState, setError]);

  const loginWithGoogle = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const credential = await signInWithGoogle();
      const idToken = await credential.user.getIdToken(true);
      const tokens = await authApi.loginWithGoogle(idToken);
      updateAuthState({ ...tokens, permissions: tokens.permissions || tokens.user.permissions || [] });
    } catch (error: any) {
      setError(error.message || 'Google sign-in failed');
      throw error;
    }
  }, [updateAuthState, setError]);

  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await authApi.logout();
    } catch (error) {
      console.warn('Backend logout failed; clearing the local session anyway:', error);
    } finally {
      try {
        await firebaseSignOut();
      } catch (error) {
        console.warn('Firebase sign-out failed:', error);
      }
      setState(prev => ({
        ...prev,
        user: null,
        permissions: [],
        activeClubId: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      }));
    }
  }, []);

  const switchClub = useCallback(async (clubId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const { user, permissions } = await authApi.switchClub(clubId);
      setState(prev => ({
        ...prev,
        user,
        permissions,
        activeClubId: user.activeClubId || clubId,
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      setError(error.message || 'Failed to switch club');
      throw error;
    }
  }, [setError]);

  const refreshUser = useCallback(async () => {
    try {
      const { user, permissions } = await authApi.getMe();
      setState(prev => ({
        ...prev,
        user,
        permissions,
      }));
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  }, []);

  const updateProfile = useCallback(async (data: { name: string }) => {
    const user = await authApi.updateMyProfile(data);
    setState(prev => ({ ...prev, user }));
  }, []);

  const acceptInvitation = useCallback(async (token: string) => {
    const result = await authApi.acceptInvitation(token);
    setState(prev => ({
      ...prev,
      user: result.user,
      permissions: result.permissions,
      activeClubId: result.user.activeClubId || null,
      isAuthenticated: true,
    }));
  }, []);

  const hasPermission = useCallback((permission: string) => {
    return state.permissions.includes(permission) || state.permissions.includes('*');
  }, [state.permissions]);

  const hasRole = useCallback((role: string | string[]) => {
    if (!state.user) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(state.user.role);
  }, [state.user]);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    loginWithGoogle,
    logout,
    switchClub,
    refreshUser,
    updateProfile,
    acceptInvitation,
    hasPermission,
    hasRole,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
