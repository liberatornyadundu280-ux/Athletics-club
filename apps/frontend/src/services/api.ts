// apps/frontend/src/services/api.ts
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse, PaginatedResponse } from '@stms/shared/types';

// ==================== AXIOS INSTANCE ====================
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

class ApiService {
  private client: AxiosInstance;
  private refreshTokenPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Important for refresh token cookie
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // If 401 and not already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newAccessToken = await this.refreshAccessToken();
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed - logout user
            this.clearAuth();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(this.formatError(error));
      }
    );
  }

  private async refreshAccessToken(): Promise<string> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = (async () => {
      try {
        const response = await axios.post<ApiResponse<{ accessToken: string; expiresIn: number }>>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken, expiresIn } = response.data.data!;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('tokenExpiresAt', String(Date.now() + expiresIn * 1000));

        return accessToken;
      } finally {
        this.refreshTokenPromise = null;
      }
    })();

    return this.refreshTokenPromise;
  }

  private formatError(error: AxiosError): Error & { code?: string; status?: number; errors?: any[] } {
    const apiError = new Error() as Error & { code?: string; status?: number; errors?: any[] };

    if (error.response) {
      apiError.message = (error.response.data as any)?.message || error.message;
      apiError.code = (error.response.data as any)?.code;
      apiError.status = error.response.status;
      apiError.errors = (error.response.data as any)?.errors;
    } else if (error.request) {
      apiError.message = 'Network error - please check your connection';
      apiError.code = 'NETWORK_ERROR';
    } else {
      apiError.message = error.message;
    }

    return apiError;
  }

  private clearAuth() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('tokenExpiresAt');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
  }

  // ==================== AUTH ====================
  async register(data: { email: string; password: string; role: 'athlete' | 'coach'; name: string; clubId?: string }) {
    const response = await this.client.post<ApiResponse<{ accessToken: string; expiresIn: number; tokenType: string; user: any }>>(
      '/auth/register',
      data
    );
    this.setAuth(response.data.data!);
    return response.data.data!;
  }

  async login(email: string, password: string) {
    const response = await this.client.post<ApiResponse<{ accessToken: string; expiresIn: number; tokenType: string; user: any }>>(
      '/auth/login',
      { email, password }
    );
    this.setAuth(response.data.data!);
    return response.data.data!;
  }

  async loginWithGoogle(idToken: string, clubId?: string) {
    const response = await this.client.post<ApiResponse<{ accessToken: string; expiresIn: number; tokenType: string; user: any }>>(
      '/auth/google',
      { idToken, clubId }
    );
    this.setAuth(response.data.data!);
    return response.data.data!;
  }

  async logout() {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.clearAuth();
    }
  }

  async getMe() {
    const response = await this.client.get<ApiResponse<{ user: any; permissions: string[] }>>('/auth/me');
    return response.data.data!;
  }

  async switchClub(clubId: string) {
    const response = await this.client.post<ApiResponse<{ user: any; permissions: string[] }>>(
      '/auth/switch-club',
      { clubId }
    );
    this.updateUser(response.data.data!.user);
    return response.data.data!;
  }

  // ==================== USERS ====================
  async getUsers(params?: { page?: number; limit?: number; search?: string; role?: string; status?: string }) {
    const response = await this.client.get<PaginatedResponse<any>>('/users', { params });
    return response.data;
  }

  async inviteUser(data: { email: string; role: string; clubId?: string }) {
    const response = await this.client.post<ApiResponse<any>>('/users/invite', data);
    return response.data.data!;
  }

  async getUser(id: string) {
    const response = await this.client.get<ApiResponse<any>>(`/users/${id}`);
    return response.data.data!;
  }

  async updateUserRole(id: string, role: string) {
    const response = await this.client.patch<ApiResponse<any>>(`/users/${id}/role`, { role });
    return response.data.data!;
  }

  async deleteUser(id: string) {
    await this.client.delete(`/users/${id}`);
  }

  // ==================== CLUBS ====================
  async createClub(data: { name: string; slug?: string; branding?: any; settings?: any }) {
    const response = await this.client.post<ApiResponse<any>>('/clubs', data);
    return response.data.data!;
  }

  async getClub(id: string) {
    const response = await this.client.get<ApiResponse<any>>(`/clubs/${id}`);
    return response.data.data!;
  }

  async updateClub(id: string, data: { branding?: any; settings?: any }) {
    const response = await this.client.patch<ApiResponse<any>>(`/clubs/${id}`, data);
    return response.data.data!;
  }

  async getClubMembers(clubId: string, params?: { page?: number; limit?: number; role?: string; status?: string }) {
    const response = await this.client.get<PaginatedResponse<any>>(`/clubs/${clubId}/members`, { params });
    return response.data;
  }

  // ==================== UTILITIES ====================
  private setAuth(data: { accessToken: string; expiresIn: number; user: any }) {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('tokenExpiresAt', String(Date.now() + data.expiresIn * 1000));
    localStorage.setItem('user', JSON.stringify(data.user));
  }

  private updateUser(user: any) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  getStoredUser(): any | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  getStoredPermissions(): string[] {
    const perms = localStorage.getItem('permissions');
    return perms ? JSON.parse(perms) : [];
  }

  isTokenExpired(): boolean {
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    if (!expiresAt) return true;
    return Date.now() >= parseInt(expiresAt, 10);
  }

  hasPermission(permission: string): boolean {
    const permissions = this.getStoredPermissions();
    return permissions.includes(permission) || permissions.includes('*');
  }

  hasRole(role: string | string[]): boolean {
    const user = this.getStoredUser();
    if (!user) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role);
  }
}

export const api = new ApiService();

// ==================== SPECIALIZED API METHODS ====================
export const authApi = {
  register: api.register.bind(api),
  login: api.login.bind(api),
  loginWithGoogle: api.loginWithGoogle.bind(api),
  logout: api.logout.bind(api),
  getMe: api.getMe.bind(api),
  switchClub: api.switchClub.bind(api),
};

export const userApi = {
  getUsers: api.getUsers.bind(api),
  inviteUser: api.inviteUser.bind(api),
  getUser: api.getUser.bind(api),
  updateUserRole: api.updateUserRole.bind(api),
  deleteUser: api.deleteUser.bind(api),
};

export const clubApi = {
  createClub: api.createClub.bind(api),
  getClub: api.getClub.bind(api),
  updateClub: api.updateClub.bind(api),
  getClubMembers: api.getClubMembers.bind(api),
};

export default api;