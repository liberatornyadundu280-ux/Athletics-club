import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, authApi } from '@/services/api';
import { signInWithGoogle, getIdToken, onAuthStateChanged, signOut as firebaseSignOut } from '@/services/firebase';
import { User, AuthState, AuthTokens } from '@stms/shared/types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; role: 'athlete' | 'coach'; name: string; clubId?: string }) => Promise<void>;
  loginWithGoogle: (clubId?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchClub: (clubId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    permissions: [],
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Initialize auth state from localStorage and Firebase
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Check for stored user
        const storedUser = api.getStoredUser();
        const storedPermissions = api.getStoredPermissions();

        if (storedUser && !api.isTokenExpired()) {
          // Validate token with backend
          try {
            const { user, permissions } = await authApi.getMe();
            if (mounted) {
              setState({
                user,
                permissions,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
            }
          } catch {
            // Token invalid, try to refresh
            try {
              await api.refreshAccessToken();
              const { user, permissions } = await authApi.getMe();
              if (mounted) {
                setState({
                  user,
                  permissions,
                  isAuthenticated: true,
                  isLoading: false,
                  error: null,
                });
              }
            } catch {
              // Refresh failed, clear auth
              api.clearAuth();
              if (mounted) {
                setState(prev => ({ ...prev, isLoading: false }));
              }
            }
          }
        } else {
          // No stored user or expired token
          if (mounted) {
            setState(prev => ({ ...prev, isLoading: false }));
          }
        }
      } catch (error) {
        console.error('Auth init error:', error);
        if (mounted) {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      }
    };

    initAuth();

    // Listen for Firebase auth changes
    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser && mounted) {
        // Firebase user signed in but we might not have backend session yet
        // This happens after Google OAuth redirect
        try {
          const idToken = await getIdToken(true);
          if (idToken && mounted) {
            await authApi.loginWithGoogle(idToken);
            const { user, permissions } = await authApi.getMe();
            setState({
              user,
              permissions,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          }
        } catch (error) {
          console.error('Firebase auth sync error:', error);
        }
      } else if (!firebaseUser && mounted && state.isAuthenticated) {
        // Firebase user signed out - clear our state
        setState({
          user: null,
          permissions: [],
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  const updateAuthState = useCallback((tokens: AuthTokens & { user: User; permissions: string[] }) => {
    setState({
      user: tokens.user,
      permissions: tokens.permissions,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const tokens = await authApi.login(email, password);
      updateAuthState({ ...tokens, permissions: tokens.user.permissions || [] });
    } catch (error: any) {
      if (error.message?.includes('Firebase Client SDK')) {
        setError('Please use Google sign-in or contact support for email/password login');
      } else {
        setError(error.message || 'Login failed. Please check your credentials.');
      }
      throw error;
    }
  }, [updateAuthState, setError]);

  const register = useCallback(async (data: { email: string; password: string; role: 'athlete' | 'coach'; name: string; clubId?: string }) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const tokens = await authApi.register(data);
      updateAuthState({ ...tokens, permissions: tokens.user.permissions || [] });
    } catch (error: any) {
      if (error.message?.includes('Firebase Client SDK')) {
        setError('Please use Google sign-in or contact support for email/password registration');
      } else {
        setError(error.message || 'Registration failed. Please try again.');
      }
      throw error;
    }
  }, [updateAuthState, setError]);

  const loginWithGoogle = useCallback(async (clubId?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // This triggers Firebase popup, which will trigger onAuthStateChanged
      await signInWithGoogle();
      // The actual login happens in the onAuthStateChanged handler
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        setError(error.message || 'Google sign-in failed');
      }
      throw error;
    }
  }, [setError]);

  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await authApi.logout();
      await firebaseSignOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setState({
        user: null,
        permissions: [],
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
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
        isLoading: false,
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