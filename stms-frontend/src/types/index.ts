// Shared TypeScript types for the frontend

// ==================== AUTH ====================
export interface User {
  id: string;
  firebaseUid: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  clubIds: string[];
  activeClubId: string | null;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'system_admin' | 'club_admin' | 'coach' | 'athlete';

export type UserStatus = 'active' | 'invited' | 'deactivated' | 'deleted';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface RegisterInput {
  email: string;
  password: string;
  role: 'athlete' | 'coach';
  name: string;
  clubId?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface GoogleAuthInput {
  idToken: string;
  clubId?: string;
}

export interface SwitchClubInput {
  clubId: string;
}

export interface AuthState {
  user: User | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ==================== CLUB ====================
export interface Club {
  id: string;
  name: string;
  slug: string;
  branding: ClubBranding;
  settings: ClubSettings;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClubBranding {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

export interface ClubSettings {
  timezone: string;
  attendanceMinPercent: number;
  workoutVerificationRequired: boolean;
  notificationDefaults: Record<string, any>;
}

export interface ClubMember {
  user: User;
  membership: Membership;
}

export interface Membership {
  role: MembershipRole;
  status: MembershipStatus;
  joinedAt: string;
  invitedBy: string | null;
}

export type MembershipRole =
  | 'member'
  | 'captain'
  | 'alumni'
  | 'head_coach'
  | 'assistant_coach'
  | 'specialist_coach';

export type MembershipStatus = 'active' | 'pending' | 'transferred_out';

// ==================== ATHLETE ====================
export interface Athlete {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: 'male' | 'female' | 'other';
  eventSpecialization: string[];
  personalBest: Record<string, string>;
  seasonBest: Record<string, string>;
  medicalNotes: string | null;
  emergencyContact: EmergencyContact | null;
  school: string | null;
  grade: string | null;
  status: AthleteStatus;
  clubId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email: string | null;
}

export type AthleteStatus = 'active' | 'injured' | 'inactive' | 'transferred' | 'alumni';

// ==================== WORKOUT ====================
export interface Exercise {
  id: string;
  clubId: string | null;
  name: string;
  description: string | null;
  muscles: string[];
  equipment: string[];
  videoUrl: string | null;
  cues: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  intensityPrescription: IntensityPrescription;
  progressionRules: ProgressionRules;
  isVerified: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntensityPrescription {
  type: 'percentage' | 'rpe' | 'velocity' | 'heart_rate';
  value: number;
  unit: string;
}

export interface ProgressionRules {
  weeklyIncreasePercent: number;
  deloadEveryNWeeks: number;
  deloadPercent: number;
}

export interface Workout {
  id: string;
  clubId: string;
  name: string;
  description: string | null;
  exercises: WorkoutExercise[];
  estimatedDuration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  isTemplate: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutExercise {
  exerciseId: string;
  order: number;
  sets: number;
  reps: number | string;
  restSeconds: number;
  tempo: string | null;
  targetZone: string | null;
  coachNotes: string | null;
}

export interface Program {
  id: string;
  clubId: string;
  name: string;
  description: string | null;
  weeks: ProgramWeek[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramWeek {
  weekNumber: number;
  workouts: ProgramWorkout[];
  deload: boolean;
}

export interface ProgramWorkout {
  workoutId: string;
  day: number;
  progressionPercent: number;
}

export interface WorkoutAssignment {
  id: string;
  clubId: string;
  workoutId: string | null;
  programId: string | null;
  athleteIds: string[];
  groupId: string | null;
  schedule: AssignmentSchedule;
  startDate: string;
  endDate: string | null;
  createdBy: string;
  createdAt: string;
}

export interface AssignmentSchedule {
  type: 'once' | 'recurring';
  daysOfWeek?: number[];
  recurrenceRule?: string;
}

export interface WorkoutCompletion {
  id: string;
  assignmentId: string;
  athleteId: string;
  actuals: ExerciseActual[];
  startedAt: string;
  completedAt: string | null;
  syncedAt: string | null;
  notes: string | null;
  rating: number | null;
}

export interface ExerciseActual {
  exerciseId: string;
  sets: ExerciseSet[];
  completed: boolean;
  notes: string | null;
}

export interface ExerciseSet {
  setNumber: number;
  reps: number;
  weight: number | null;
  rpe: number | null;
  duration: number | null;
  distance: number | null;
  completed: boolean;
}

// ==================== ATTENDANCE ====================
export interface Session {
  id: string;
  clubId: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  type: 'training' | 'competition' | 'meeting' | 'other';
  linkedWorkoutId: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  clubId: string;
  sessionId: string;
  athleteId: string;
  status: AttendanceStatus;
  method: AttendanceMethod;
  markedBy: string | null;
  markedAt: string;
  excuseNote: string | null;
  excuseAttachment: string | null;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'official_sports_leave';

export type AttendanceMethod = 'manual' | 'qr' | 'bulk' | 'workout_open';

export interface AttendanceReport {
  athleteId: string;
  athleteName: string;
  totalSessions: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
  streak: number;
}

// ==================== PERFORMANCE ====================
export interface Competition {
  id: string;
  clubId: string;
  name: string;
  date: string;
  venue: string;
  level: 'club' | 'district' | 'state' | 'national' | 'international';
  events: CompetitionEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface CompetitionEvent {
  id: string;
  name: string;
  type: 'sprint' | 'distance' | 'jump' | 'throw' | 'combined';
  gender: 'male' | 'female' | 'mixed';
  ageGroup: string;
}

export interface Result {
  id: string;
  clubId: string;
  athleteId: string;
  competitionId: string;
  event: string;
  round: string;
  result: string;
  wind: number | null;
  position: number | null;
  waPoints: number | null;
  isPB: boolean;
  isSB: boolean;
  createdAt: string;
}

export interface FitnessTest {
  id: string;
  clubId: string;
  athleteId: string;
  athleteName?: string;
  testType: FitnessTestType;
  value: number;
  unit: string;
  date: string;
  percentile: number | null;
  notes: string | null;
}

export type FitnessTestType =
  | '30m_fly'
  | 'standing_long_jump'
  | 'medicine_ball_throw'
  | 'yo_yo_ir1'
  | '300m_run'
  | 'vertical_jump'
  | 'broad_jump'
  | 'custom';

export interface Goal {
  id: string;
  clubId: string;
  athleteId: string;
  athleteName?: string;
  event: string;
  targetValue: string;
  targetDate: string;
  status: 'active' | 'achieved' | 'missed' | 'archived';
  coachNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==================== INJURY ====================
export interface Injury {
  id: string;
  clubId: string;
  athleteId: string;
  athleteName?: string;
  type: string;
  bodyPart: string;
  laterality: 'left' | 'right' | 'bilateral';
  onsetDate: string;
  mechanism: string;
  severity: 1 | 2 | 3;
  diagnosisSource: 'self' | 'coach' | 'physio' | 'doctor' | 'imaging';
  imaging: string[];
  status: 'active' | 'rehabilitating' | 'returning' | 'resolved' | 'chronic';
  expectedReturnDate: string | null;
  actualReturnDate: string | null;
  rtpProtocolId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RehabLog {
  id: string;
  clubId: string;
  injuryId: string;
  date: string;
  painLevel: number;
  wellnessScore: number;
  exercisesCompleted: string[];
  notes: string | null;
}

export interface RTPProtocol {
  id: string;
  clubId: string;
  injuryType: string;
  stages: RTPStage[];
}

export interface RTPStage {
  stageNumber: number;
  name: string;
  criteria: string[];
  minDays: number;
  allowedExercises: string[];
  restrictedExercises: string[];
}

// ==================== PERMISSIONS ====================
export interface PermissionEvent {
  id: string;
  clubId: string;
  name: string;
  date: string;
  venue: string;
  type: 'competition' | 'training_camp' | 'other';
  athleteIds: string[];
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface PermissionLetter {
  id: string;
  clubId: string;
  eventId: string;
  athleteId: string;
  templateId: string;
  content: string;
  status: LetterStatus;
  qrCode: string;
  createdAt: string;
  updatedAt: string;
}

export type LetterStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'completed';

export interface Approval {
  id: string;
  letterId: string;
  step: number;
  approverRole: ApproverRole;
  approverId: string | null;
  decision: 'pending' | 'approved' | 'rejected';
  comment: string | null;
  decidedAt: string | null;
}

export type ApproverRole = 'coach' | 'sports_director' | 'hod' | 'hostel_warden' | 'faculty';

export interface LetterTemplate {
  id: string;
  clubId: string;
  type: LetterType;
  markdown: string;
  variables: string[];
  approvalChain: ApproverRole[];
}

export type LetterType =
  | 'hod_permission'
  | 'faculty_permission'
  | 'hostel_permission'
  | 'competition_participation'
  | 'travel_permission'
  | 'attendance_adjustment'
  | 'medical_leave'
  | 'training_camp_permission';

// ==================== ANALYTICS ====================
export interface AnalyticsData {
  athlete?: AthleteAnalytics;
  coach?: CoachAnalytics;
  clubAdmin?: ClubAdminAnalytics;
  systemAdmin?: SystemAdminAnalytics;
}

export interface AthleteAnalytics {
  attendancePercentage: number;
  workoutCompliance: number;
  pbProgression: ProgressionData[];
  goalProgress: GoalProgress[];
  injuryHistory: InjurySummary[];
  acwr: number;
  recommendedFocus: string;
}

export interface CoachAnalytics {
  squadAttendanceHeatmap: HeatmapData[];
  complianceByAthlete: ComplianceData[];
  injuryBoard: InjurySummary[];
  performanceTrends: TrendData[];
  upcomingCompetitions: Competition[];
  permissionLetterStatus: LetterStatusCount[];
}

export interface ClubAdminAnalytics {
  membershipGrowth: GrowthData[];
  participationRates: ParticipationData[];
  coachWorkload: WorkloadData[];
  facilityUsage: UsageData[];
  competitionSummary: CompetitionSummary;
}

export interface SystemAdminAnalytics {
  activeClubs: number;
  totalUsers: number;
  apiLatency: number;
  errorRate: number;
  modelPerformance: ModelMetrics;
  storageCosts: number;
}

// ==================== COMMON ====================
export interface PaginatedResponse<T> {
  status: 'success';
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  code?: string;
  errors?: { field: string; message: string }[];
}

export interface ProgressionData {
  date: string;
  value: number;
  label: string;
}

export interface GoalProgress {
  goalId: string;
  event: string;
  target: string;
  current: string;
  progressPercent: number;
  daysRemaining: number;
}

export interface InjurySummary {
  injuryId: string;
  type: string;
  bodyPart: string;
  severity: number;
  status: string;
  daysMissed: number;
}

export interface HeatmapData {
  date: string;
  value: number;
  label: string;
}

export interface ComplianceData {
  athleteId: string;
  athleteName: string;
  assigned: number;
  completed: number;
  percentage: number;
}

export interface TrendData {
  date: string;
  value: number;
  load: number;
}

export interface GrowthData {
  month: string;
  count: number;
}

export interface ParticipationData {
  event: string;
  rate: number;
}

export interface WorkloadData {
  coachId: string;
  coachName: string;
  athletes: number;
  sessions: number;
}

export interface UsageData {
  facility: string;
  hours: number;
}

export interface CompetitionSummary {
  total: number;
  upcoming: number;
  completed: number;
}

export interface LetterStatusCount {
  status: LetterStatus;
  count: number;
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  driftScore: number;
}

// ==================== UI ====================
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface ToastOptions {
  type?: 'success' | 'error' | 'info' | 'warning' | 'loading';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ==================== PERMISSIONS ====================
export const PERMISSIONS = {
  CLUB: {
    READ: 'club:read',
    WRITE: 'club:write',
    SETTINGS: 'club:settings',
  },
  USER: {
    READ: 'user:read',
    WRITE: 'user:write',
    ROLE: 'user:role',
    INVITE: 'user:invite',
    DELETE: 'user:delete',
  },
  ATHLETE: {
    READ: 'athlete:read',
    WRITE: 'athlete:write',
    IMPORT: 'athlete:import',
  },
  ATTENDANCE: {
    READ: 'attendance:read',
    WRITE: 'attendance:write',
    REPORT: 'attendance:report',
  },
  WORKOUT: {
    READ: 'workout:read',
    WRITE: 'workout:write',
    ASSIGN: 'workout:assign',
    TEMPLATE: 'workout:template',
  },
  PERFORMANCE: {
    READ: 'performance:read',
    WRITE: 'performance:write',
    REPORT: 'performance:report',
  },
  INJURY: {
    READ: 'injury:read',
    WRITE: 'injury:write',
    RTP: 'injury:rtp',
  },
  PERMISSION: {
    READ: 'permission:read',
    WRITE: 'permission:write',
    APPROVE: 'permission:approve',
  },
  ANNOUNCEMENT: {
    READ: 'announcement:read',
    WRITE: 'announcement:write',
    SEND: 'announcement:send',
  },
  ANALYTICS: {
    READ: 'analytics:read',
    REPORT: 'analytics:report',
  },
  PROFILE: {
    READ: 'profile:read',
    WRITE: 'profile:write',
  },
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS][keyof typeof PERMISSIONS[keyof typeof PERMISSIONS]];