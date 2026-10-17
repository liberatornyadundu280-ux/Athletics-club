import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse, Athlete, ClubDiscoveryItem, ClubEnrollmentRequest, EnrollmentRequestStatus, PaginatedResponse } from '@/types';

// ==================== AXIOS INSTANCE ====================
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

class ApiService {
  private client: AxiosInstance;
  private refreshTokenPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
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

  async refreshAccessToken(): Promise<string> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = (async () => {
      try {
        const response = await axios.post<ApiResponse<{ accessToken: string; expiresIn: number }>>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true, timeout: 15000 }
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

  clearAuth() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('tokenExpiresAt');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
  }

  async refreshToken(): Promise<string> {
    return this.refreshAccessToken();
  }

  // ==================== AUTH ====================
  async register(data: { email: string; password: string; role: 'athlete' | 'coach'; name: string }) {
    const response = await this.client.post<ApiResponse<{ accessToken: string; expiresIn: number; tokenType: string; user: any; permissions?: string[] }>>(
      '/auth/register',
      data
    );
    this.setAuth(response.data.data!);
    return response.data.data!;
  }

  async loginWithGoogle(idToken: string) {
    const response = await this.client.post<ApiResponse<{ accessToken: string; expiresIn: number; tokenType: string; user: any; permissions?: string[] }>>(
      '/auth/google',
      { idToken }
    );
    this.setAuth(response.data.data!);
    return response.data.data!;
  }

  async loginWithFirebase(idToken: string) {
    const response = await this.client.post<ApiResponse<{ accessToken: string; expiresIn: number; tokenType: string; user: any; permissions?: string[] }>>(
      '/auth/firebase',
      { idToken }
    );
    this.setAuth(response.data.data!);
    localStorage.setItem('permissions', JSON.stringify(response.data.data!.permissions || []));
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

  async updateMyProfile(data: { name: string }) {
    const response = await this.client.patch<ApiResponse<{ user: any }>>('/auth/me', data);
    this.updateUser(response.data.data!.user);
    return response.data.data!.user;
  }

  async switchClub(clubId: string) {
    const response = await this.client.post<ApiResponse<{ user: any; permissions: string[]; accessToken: string; expiresIn: number }>>(
      '/auth/switch-club',
      { clubId }
    );
    this.updateUser(response.data.data!.user);
    if (response.data.data!.accessToken) {
      localStorage.setItem('accessToken', response.data.data!.accessToken);
      localStorage.setItem('tokenExpiresAt', String(Date.now() + response.data.data!.expiresIn * 1000));
    }
    this.updatePermissions(response.data.data!.permissions);
    return response.data.data!;
  }

  async acceptInvitation(token: string) {
    const response = await this.client.post<ApiResponse<{ accessToken: string; expiresIn: number; user: any; permissions: string[] }>>(
      '/auth/accept-invitation',
      { token }
    );
    this.setAuth(response.data.data!);
    return response.data.data!;
  }

  // ==================== USERS ====================
  async getUsers(params?: { page?: number; limit?: number; search?: string; role?: string; status?: string }) {
    const response = await this.client.get<PaginatedResponse<any>>('/users', { params });
    return response.data;
  }

  async getPlatformUsers(params?: { page?: number; limit?: number; search?: string; role?: string; status?: string }) {
    const response = await this.client.get<PaginatedResponse<any>>('/users/platform', { params });
    return response.data;
  }

  async permanentlyDeletePlatformUser(id: string) {
    await this.client.delete(`/users/platform/${id}`);
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

  async getPlatformClubs() {
    const response = await this.client.get<ApiResponse<any[]>>('/clubs/platform');
    return response.data.data || [];
  }

  async addMyPlatformClubAccess(id: string) {
    const response = await this.client.post<ApiResponse<any>>(`/clubs/platform/${id}/access`);
    return response.data.data!;
  }

  async getClub(id: string) {
    const response = await this.client.get<ApiResponse<any>>(`/clubs/${id}`);
    return response.data.data!;
  }

  async getMyClubs() {
    const response = await this.client.get<ApiResponse<any[]>>('/clubs/mine');
    return response.data.data || [];
  }

  async getEnrollmentClubs() {
    const response = await this.client.get<ApiResponse<ClubDiscoveryItem[]>>('/clubs/discover');
    return response.data.data || [];
  }

  async requestClubEnrollment(clubId: string, message: string) {
    const response = await this.client.post<ApiResponse<{ id: string; clubId: string; status: 'pending'; createdAt: string }>>(
      `/clubs/${clubId}/enrollment-requests`,
      { message }
    );
    return response.data.data!;
  }

  async getEnrollmentRequests(clubId: string) {
    const response = await this.client.get<ApiResponse<ClubEnrollmentRequest[]>>(`/clubs/${clubId}/enrollment-requests`);
    return response.data.data || [];
  }

  async reviewEnrollmentRequest(clubId: string, requestId: string, status: Extract<EnrollmentRequestStatus, 'approved' | 'rejected'>) {
    const response = await this.client.patch<ApiResponse<{ id: string; status: 'approved' | 'rejected'; reviewedAt: string }>>(
      `/clubs/${clubId}/enrollment-requests/${requestId}/review`,
      { status }
    );
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

  // ==================== ATHLETES ====================
  async getAthletes(params?: { page?: number; limit?: number; search?: string; status?: string; event?: string }) {
    const response = await this.client.get<PaginatedResponse<Athlete>>('/athletes', { params });
    return response.data;
  }

  async getAthlete(id: string) {
    const response = await this.client.get<ApiResponse<Athlete>>(`/athletes/${id}`);
    return response.data.data!;
  }

  async createAthlete(data: Partial<Athlete>) {
    const response = await this.client.post<ApiResponse<Athlete>>('/athletes', data);
    return response.data.data!;
  }

  async updateAthlete(id: string, data: Partial<Athlete>) {
    const response = await this.client.patch<ApiResponse<Athlete>>(`/athletes/${id}`, data);
    return response.data.data!;
  }

  async archiveAthlete(id: string) {
    await this.client.delete(`/athletes/${id}`);
  }

  async importAthletes(rows: Record<string, unknown>[]) {
    const response = await this.client.post<ApiResponse<{ created: number; failed: number; results: { row: number; email?: string; status: 'created' | 'error'; message?: string }[] }>>('/athletes/import', { rows });
    return response.data.data!;
  }

  async getAttendanceSessions(params?: { from?: string; to?: string; status?: string; page?: number; limit?: number }) {
    const response = await this.client.get<PaginatedResponse<any>>('/attendance/sessions', { params });
    return response.data;
  }

  async createAttendanceSession(data: Record<string, unknown>) {
    const response = await this.client.post<ApiResponse<any>>('/attendance/sessions', data);
    return response.data.data!;
  }

  async updateAttendanceSession(id: string, data: Record<string, unknown>) {
    const response = await this.client.patch<ApiResponse<any>>(`/attendance/sessions/${id}`, data);
    return response.data.data!;
  }

  async getAttendanceSession(id: string) {
    const response = await this.client.get<ApiResponse<any>>(`/attendance/sessions/${id}`);
    return response.data.data!;
  }

  async getAttendanceRoster(id: string) {
    const response = await this.client.get<ApiResponse<any[]>>(`/attendance/sessions/${id}/records`);
    return response.data.data || [];
  }

  async markAttendance(id: string, records: { athleteId: string; status: string; note?: string }[]) {
    const response = await this.client.post<ApiResponse<{ saved: number }>>(`/attendance/sessions/${id}/mark`, { records });
    return response.data.data!;
  }

  async createAttendanceQr(id: string, expiresInMinutes = 15) {
    const response = await this.client.post<ApiResponse<{ checkInUrl: string; expiresAt: string }>>(`/attendance/sessions/${id}/qr`, { expiresInMinutes });
    return response.data.data!;
  }

  async checkInWithQr(token: string) {
    const response = await this.client.post<ApiResponse<{ checkedIn: boolean; session: string }>>(`/attendance/qr/${encodeURIComponent(token)}/check-in`);
    return response.data.data!;
  }

  async getAttendanceSummary(params?: { from?: string; to?: string }) {
    const response = await this.client.get<ApiResponse<any>>('/attendance/reports/summary', { params });
    return response.data.data!;
  }

  async getCompetitions() { const response = await this.client.get<ApiResponse<any[]>>('/performance/competitions'); return response.data.data || []; }
  async createCompetition(data: Record<string, unknown>) { const response = await this.client.post<ApiResponse<any>>('/performance/competitions', data); return response.data.data!; }
  async getPerformanceResults(params?: Record<string, string | number>) { const response = await this.client.get<ApiResponse<any[]>>('/performance/results', { params }); return response.data.data || []; }
  async createPerformanceResult(data: Record<string, unknown>) { const response = await this.client.post<ApiResponse<any>>('/performance/results', data); return response.data.data!; }
  async getFitnessTests() { const response = await this.client.get<ApiResponse<any[]>>('/performance/tests'); return response.data.data || []; }
  async createFitnessTest(data: Record<string, unknown>) { const response = await this.client.post<ApiResponse<any>>('/performance/tests', data); return response.data.data!; }
  async getGoals() { const response = await this.client.get<ApiResponse<any[]>>('/performance/goals'); return response.data.data || []; }
  async createGoal(data: Record<string, unknown>) { const response = await this.client.post<ApiResponse<any>>('/performance/goals', data); return response.data.data!; }
  async updateGoal(id: string, data: Record<string, unknown>) { const response = await this.client.patch<ApiResponse<any>>(`/performance/goals/${id}`, data); return response.data.data!; }

  async getInjuries(params?: { status?: string }) { const response = await this.client.get<ApiResponse<any[]>>('/injuries', { params }); return response.data.data || []; }
  async getInjury(id: string) { const response = await this.client.get<ApiResponse<any>>(`/injuries/${id}`); return response.data.data!; }
  async createInjury(data: Record<string, unknown>) { const response = await this.client.post<ApiResponse<any>>('/injuries', data); return response.data.data!; }
  async getInjuryWellness(id: string) { const response = await this.client.get<ApiResponse<any[]>>(`/injuries/${id}/wellness`); return response.data.data || []; }
  async addInjuryWellness(id: string, data: Record<string, unknown>) { const response = await this.client.post<ApiResponse<any>>(`/injuries/${id}/wellness`, data); return response.data.data!; }
  async addRehabTask(id: string, data: Record<string, unknown>) { const response = await this.client.post<ApiResponse<any>>(`/injuries/${id}/rehab`, data); return response.data.data!; }
  async updateRtp(id: string, data: Record<string, unknown>) { const response = await this.client.patch<ApiResponse<any>>(`/injuries/${id}/rtp`, data); return response.data.data!; }

  async getPermissionEvents() { const response = await this.client.get<ApiResponse<any[]>>('/permissions/events'); return response.data.data || []; }
  async createPermissionEvent(data: Record<string, unknown>) { const response = await this.client.post<ApiResponse<any>>('/permissions/events', data); return response.data.data!; }
  async generatePermissionLetters(id: string, data: { athleteIds: string[]; types: string[] }) { const response = await this.client.post<ApiResponse<any>>(`/permissions/events/${id}/letters`, data); return response.data.data!; }
  async getPermissionLetters() { const response = await this.client.get<ApiResponse<any[]>>('/permissions/letters'); return response.data.data || []; }
  async submitPermissionLetter(id: string) { const response = await this.client.post<ApiResponse<any>>(`/permissions/letters/${id}/submit`); return response.data.data!; }
  async decidePermissionLetter(id: string, decision: 'approved' | 'rejected', note?: string) { const response = await this.client.post<ApiResponse<any>>(`/permissions/letters/${id}/approve`, { decision, note }); return response.data.data!; }
  async verifyPermissionLetter(token: string) { const response = await axios.get<ApiResponse<any>>(`${API_BASE_URL}/permissions/public/${encodeURIComponent(token)}`, { timeout: 15000 }); return response.data.data!; }

  async getAnalyticsSummary(params?: { from?: string; to?: string }) { const response = await this.client.get<ApiResponse<any>>('/analytics/summary', { params }); return response.data.data!; }
  async getAthleteAnalytics(params?: { from?: string; to?: string }) { const response = await this.client.get<ApiResponse<any[]>>('/analytics/athletes', { params }); return response.data.data || []; }
  async getAnnouncements() { const response = await this.client.get<ApiResponse<any[]>>('/announcements'); return response.data.data || []; }
  async createAnnouncement(data: { title: string; message: string; audience: string[]; pinned?: boolean }) { const response = await this.client.post<ApiResponse<any>>('/announcements', data); return response.data.data!; }
  async markAnnouncementRead(id: string) { await this.client.post(`/announcements/${id}/read`); }
  async updateNotificationPreferences(announcements: boolean) { const response = await this.client.patch<ApiResponse<any>>('/announcements/preferences', { announcements }); return response.data.data!; }

  async getRecommendations(params?: { athleteId?: string }) { const response = await this.client.get<ApiResponse<any[]>>('/recommendations', { params }); return response.data.data || []; }
  async generateRecommendation(data: { athleteId?: string; trigger?: string }) { const response = await this.client.post<ApiResponse<any>>('/recommendations/generate', data); return response.data.data!; }
  async reviewRecommendation(id: string, data: { status: 'accepted' | 'modified' | 'dismissed'; workoutId?: string; coachNote?: string }) { const response = await this.client.patch<ApiResponse<any>>(`/recommendations/${id}/review`, data); return response.data.data!; }

  async getWorkouts() { const response = await this.client.get<ApiResponse<any[]>>('/workouts'); return response.data.data || []; }
  async getWorkout(id: string) { const response = await this.client.get<ApiResponse<any>>(`/workouts/${id}`); return response.data.data!; }
  async getExercises() { const response = await this.client.get<ApiResponse<any[]>>('/workouts/exercises'); return response.data.data || []; }
  async createExercise(data: Record<string, unknown>) { const response = await this.client.post<ApiResponse<any>>('/workouts/exercises', data); return response.data.data!; }
  async createWorkout(data: Record<string, unknown>) { const response = await this.client.post<ApiResponse<any>>('/workouts', data); return response.data.data!; }
  async updateWorkout(id: string, data: Record<string, unknown>) { const response = await this.client.patch<ApiResponse<any>>(`/workouts/${id}`, data); return response.data.data!; }
  async archiveWorkout(id: string) { await this.client.delete(`/workouts/${id}`); }
  async assignWorkout(id: string, data: { athleteIds: string[]; startDate: string; dueDate?: string; notes?: string }) { const response = await this.client.post<ApiResponse<{ assigned: number }>>(`/workouts/${id}/assign`, data); return response.data.data!; }
  async getMyWorkoutAssignments() { const response = await this.client.get<ApiResponse<any[]>>('/workouts/assignments/mine'); return response.data.data || []; }
  async getWorkoutAssignments() { const response = await this.client.get<ApiResponse<any[]>>('/workouts/assignments'); return response.data.data || []; }
  async getWorkoutAssignment(id: string) { const response = await this.client.get<ApiResponse<any>>(`/workouts/assignments/${id}`); return response.data.data!; }
  async completeWorkoutAssignment(id: string, data: Record<string, unknown>) { const response = await this.client.post<ApiResponse<any>>(`/workouts/assignments/${id}/complete`, data); return response.data.data!; }

  // ==================== UTILITIES ====================
  private setAuth(data: { accessToken: string; expiresIn: number; user: any; permissions?: string[] }) {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('tokenExpiresAt', String(Date.now() + data.expiresIn * 1000));
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('permissions', JSON.stringify(data.permissions || data.user.permissions || []));
  }

  private updateUser(user: any) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  private updatePermissions(permissions: string[]) {
    localStorage.setItem('permissions', JSON.stringify(permissions || []));
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
// These would be expanded for each module

export const authApi = {
  register: api.register.bind(api),
  loginWithGoogle: api.loginWithGoogle.bind(api),
  loginWithFirebase: api.loginWithFirebase.bind(api),
  logout: api.logout.bind(api),
  getMe: api.getMe.bind(api),
  updateMyProfile: api.updateMyProfile.bind(api),
  acceptInvitation: api.acceptInvitation.bind(api),
  switchClub: api.switchClub.bind(api),
};

export const userApi = {
  getUsers: api.getUsers.bind(api),
  getPlatformUsers: api.getPlatformUsers.bind(api),
  permanentlyDeletePlatformUser: api.permanentlyDeletePlatformUser.bind(api),
  inviteUser: api.inviteUser.bind(api),
  getUser: api.getUser.bind(api),
  updateUserRole: api.updateUserRole.bind(api),
  deleteUser: api.deleteUser.bind(api),
};

export const clubApi = {
  createClub: api.createClub.bind(api),
  getPlatformClubs: api.getPlatformClubs.bind(api),
  addMyPlatformClubAccess: api.addMyPlatformClubAccess.bind(api),
  getClub: api.getClub.bind(api),
  getMine: api.getMyClubs.bind(api),
  getEnrollmentClubs: api.getEnrollmentClubs.bind(api),
  requestClubEnrollment: api.requestClubEnrollment.bind(api),
  getEnrollmentRequests: api.getEnrollmentRequests.bind(api),
  reviewEnrollmentRequest: api.reviewEnrollmentRequest.bind(api),
  updateClub: api.updateClub.bind(api),
  getClubMembers: api.getClubMembers.bind(api),
};

export const athleteApi = {
  getAthletes: api.getAthletes.bind(api),
  getAthlete: api.getAthlete.bind(api),
  createAthlete: api.createAthlete.bind(api),
  updateAthlete: api.updateAthlete.bind(api),
  archiveAthlete: api.archiveAthlete.bind(api),
  importAthletes: api.importAthletes.bind(api),
};

export const attendanceApi = {
  getSessions: api.getAttendanceSessions.bind(api),
  createSession: api.createAttendanceSession.bind(api),
  updateSession: api.updateAttendanceSession.bind(api),
  getSession: api.getAttendanceSession.bind(api),
  getRoster: api.getAttendanceRoster.bind(api),
  mark: api.markAttendance.bind(api),
  createQr: api.createAttendanceQr.bind(api),
  checkInWithQr: api.checkInWithQr.bind(api),
  getSummary: api.getAttendanceSummary.bind(api),
};

export const workoutApi = {
  getWorkouts: api.getWorkouts.bind(api),
  getWorkout: api.getWorkout.bind(api),
  getExercises: api.getExercises.bind(api),
  createExercise: api.createExercise.bind(api),
  createWorkout: api.createWorkout.bind(api),
  updateWorkout: api.updateWorkout.bind(api),
  archiveWorkout: api.archiveWorkout.bind(api),
  assign: api.assignWorkout.bind(api),
  getMyAssignments: api.getMyWorkoutAssignments.bind(api),
  getAssignments: api.getWorkoutAssignments.bind(api),
  getAssignment: api.getWorkoutAssignment.bind(api),
  complete: api.completeWorkoutAssignment.bind(api),
};

export const performanceApi = {
  getCompetitions: api.getCompetitions.bind(api),
  createCompetition: api.createCompetition.bind(api),
  getResults: api.getPerformanceResults.bind(api),
  createResult: api.createPerformanceResult.bind(api),
  getTests: api.getFitnessTests.bind(api),
  createTest: api.createFitnessTest.bind(api),
  getGoals: api.getGoals.bind(api),
  createGoal: api.createGoal.bind(api),
  updateGoal: api.updateGoal.bind(api),
};

export const recommendationApi = {
  get: api.getRecommendations.bind(api),
  generate: api.generateRecommendation.bind(api),
  review: api.reviewRecommendation.bind(api),
};

export const injuryApi = {
  get: api.getInjuries.bind(api),
  getOne: api.getInjury.bind(api),
  create: api.createInjury.bind(api),
  getWellness: api.getInjuryWellness.bind(api),
  addWellness: api.addInjuryWellness.bind(api),
  addRehabTask: api.addRehabTask.bind(api),
  updateRtp: api.updateRtp.bind(api),
};

export const permissionApi = {
  getEvents: api.getPermissionEvents.bind(api),
  createEvent: api.createPermissionEvent.bind(api),
  generateLetters: api.generatePermissionLetters.bind(api),
  getLetters: api.getPermissionLetters.bind(api),
  submitLetter: api.submitPermissionLetter.bind(api),
  decideLetter: api.decidePermissionLetter.bind(api),
  verifyLetter: api.verifyPermissionLetter.bind(api),
};

export const analyticsApi = {
  getSummary: api.getAnalyticsSummary.bind(api),
  getAthletes: api.getAthleteAnalytics.bind(api),
};

export const announcementApi = {
  get: api.getAnnouncements.bind(api),
  create: api.createAnnouncement.bind(api),
  markRead: api.markAnnouncementRead.bind(api),
  updatePreferences: api.updateNotificationPreferences.bind(api),
};

export default api;
