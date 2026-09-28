// @stms/shared - Core Type Definitions
// Single source of truth for all domain types

// ==================== BASE TYPES ====================

export type ObjectId = string & { readonly __brand: unique symbol };
export type ISODateString = string & { readonly __brand: unique symbol };

export function createObjectId(id: string): ObjectId {
  return id as ObjectId;
}

export function createISODateString(date: Date | string): ISODateString {
  return (date instanceof Date ? date.toISOString() : date) as ISODateString;
}

// ==================== ENUMS ====================

export enum UserRole {
  SYSTEM_ADMIN = 'system_admin',
  CLUB_ADMIN = 'club_admin',
  COACH = 'coach',
  ATHLETE = 'athlete',
}

export enum UserStatus {
  ACTIVE = 'active',
  INVITED = 'invited',
  DEACTIVATED = 'deactivated',
  DELETED = 'deleted',
}

export enum MembershipRole {
  MEMBER = 'member',
  CAPTAIN = 'captain',
  ALUMNI = 'alumni',
  HEAD_COACH = 'head_coach',
  ASSISTANT_COACH = 'assistant_coach',
  SPECIALIST_COACH = 'specialist_coach',
}

export enum MembershipStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  TRANSFERRED_OUT = 'transferred_out',
}

export enum SessionType {
  TRAINING = 'training',
  COMPETITION = 'competition',
  MEETING = 'meeting',
  OTHER = 'other',
}

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EXCUSED = 'excused',
  OFFICIAL_SPORTS_LEAVE = 'official_sports_leave',
}

export enum AttendanceMethod {
  MANUAL = 'manual',
  QR = 'qr',
  BULK = 'bulk',
  WORKOUT_OPEN = 'workout_open',
}

export enum InjuryStatus {
  ACTIVE = 'active',
  REHABILITATING = 'rehabilitating',
  RETURNING = 'returning',
  RESOLVED = 'resolved',
  CHRONIC = 'chronic',
}

export enum InjurySeverity {
  GRADE_1 = 1,
  GRADE_2 = 2,
  GRADE_3 = 3,
}

export enum Laterality {
  LEFT = 'left',
  RIGHT = 'right',
  BILATERAL = 'bilateral',
}

export enum LetterStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
}

export enum ApproverRole {
  COACH = 'coach',
  SPORTS_DIRECTOR = 'sports_director',
  HOD = 'hod',
  HOSTEL_WARDEN = 'hostel_warden',
  FACULTY = 'faculty',
}

export enum LetterType {
  HOD_PERMISSION = 'hod_permission',
  FACULTY_PERMISSION = 'faculty_permission',
  HOSTEL_PERMISSION = 'hostel_permission',
  COMPETITION_PARTICIPATION = 'competition_participation',
  TRAVEL_PERMISSION = 'travel_permission',
  ATTENDANCE_ADJUSTMENT = 'attendance_adjustment',
  MEDICAL_LEAVE = 'medical_leave',
  TRAINING_CAMP_PERMISSION = 'training_camp_permission',
}

export enum GoalStatus {
  ACTIVE = 'active',
  ACHIEVED = 'achieved',
  MISSED = 'missed',
  ARCHIVED = 'archived',
}

export enum FitnessTestType {
  FLY_30M = '30m_fly',
  STANDING_LONG_JUMP = 'standing_long_jump',
  MEDICINE_BALL_THROW = 'medicine_ball_throw',
  YO_YO_IR1 = 'yo_yo_ir1',
  RUN_300M = '300m_run',
  VERTICAL_JUMP = 'vertical_jump',
  BROAD_JUMP = 'broad_jump',
  CUSTOM = 'custom',
}

export enum Difficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

// ==================== CORE DOMAIN TYPES ====================

export interface User {
  id: ObjectId;
  firebaseUid: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  clubIds: ObjectId[];
  activeClubId: ObjectId | null;
  permissions: string[];
  status: UserStatus;
  lastLoginAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  deletedAt: ISODateString | null;
}

export interface Club {
  id: ObjectId;
  name: string;
  slug: string;
  branding: ClubBranding;
  settings: ClubSettings;
  createdBy: ObjectId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
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
  notificationDefaults: Record<string, unknown>;
}

export interface Membership {
  id: ObjectId;
  userId: ObjectId;
  clubId: ObjectId;
  role: MembershipRole;
  status: MembershipStatus;
  joinedAt: ISODateString;
  invitedBy: ObjectId | null;
  invitedAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Athlete {
  id: ObjectId;
  userId: ObjectId | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: ISODateString | null;
  gender: 'male' | 'female' | 'other';
  eventSpecialization: string[];
  personalBest: Record<string, string>;
  seasonBest: Record<string, string>;
  medicalNotes: string | null;
  emergencyContact: EmergencyContact | null;
  school: string | null;
  grade: string | null;
  status: 'active' | 'injured' | 'inactive' | 'transferred' | 'alumni';
  clubId: ObjectId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email: string | null;
}

// ==================== AUTH TYPES ====================

export interface JWTPayload {
  uid: string;
  email: string;
  role: UserRole;
  clubIds: string[];
  activeClubId: string | null;
  permissions: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface RegisterInput {
  email: string;
  password: string;
  role: UserRole.ATHLETE | UserRole.COACH;
  name: string;
  clubId?: ObjectId;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface GoogleAuthInput {
  idToken: string;
  clubId?: ObjectId;
}

export interface SwitchClubInput {
  clubId: ObjectId;
}

export interface InviteUserInput {
  email: string;
  role: MembershipRole;
  clubId?: ObjectId;
}

export interface UpdateUserRoleInput {
  role: UserRole.CLUB_ADMIN | UserRole.COACH | UserRole.ATHLETE;
}

// ==================== WORKOUT TYPES ====================

export interface Exercise {
  id: ObjectId;
  clubId: ObjectId | null;
  name: string;
  description: string | null;
  muscles: string[];
  equipment: string[];
  videoUrl: string | null;
  cues: string[];
  difficulty: Difficulty;
  intensityPrescription: IntensityPrescription;
  progressionRules: ProgressionRules;
  isVerified: boolean;
  createdBy: ObjectId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
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
  id: ObjectId;
  clubId: ObjectId;
  name: string;
  description: string | null;
  exercises: WorkoutExercise[];
  estimatedDuration: number;
  difficulty: Difficulty;
  tags: string[];
  isTemplate: boolean;
  createdBy: ObjectId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface WorkoutExercise {
  exerciseId: ObjectId;
  order: number;
  sets: number;
  reps: number | string;
  restSeconds: number;
  tempo: string | null;
  targetZone: string | null;
  coachNotes: string | null;
}

export interface Program {
  id: ObjectId;
  clubId: ObjectId;
  name: string;
  description: string | null;
  weeks: ProgramWeek[];
  createdBy: ObjectId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface ProgramWeek {
  weekNumber: number;
  workouts: ProgramWorkout[];
  deload: boolean;
}

export interface ProgramWorkout {
  workoutId: ObjectId;
  day: number;
  progressionPercent: number;
}

export interface WorkoutAssignment {
  id: ObjectId;
  clubId: ObjectId;
  workoutId: ObjectId | null;
  programId: ObjectId | null;
  athleteIds: ObjectId[];
  groupId: ObjectId | null;
  schedule: AssignmentSchedule;
  startDate: ISODateString;
  endDate: ISODateString | null;
  createdBy: ObjectId;
  createdAt: ISODateString;
}

export interface AssignmentSchedule {
  type: 'once' | 'recurring';
  daysOfWeek?: number[];
  recurrenceRule?: string;
}

export interface WorkoutCompletion {
  id: ObjectId;
  assignmentId: ObjectId;
  athleteId: ObjectId;
  actuals: ExerciseActual[];
  startedAt: ISODateString;
  completedAt: ISODateString | null;
  syncedAt: ISODateString | null;
  notes: string | null;
  rating: number | null;
}

export interface ExerciseActual {
  exerciseId: ObjectId;
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

// ==================== ATTENDANCE TYPES ====================

export interface Session {
  id: ObjectId;
  clubId: ObjectId;
  date: ISODateString;
  startTime: string;
  endTime: string;
  venue: string;
  type: SessionType;
  linkedWorkoutId: ObjectId | null;
  status: SessionStatus;
  createdBy: ObjectId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface AttendanceRecord {
  id: ObjectId;
  clubId: ObjectId;
  sessionId: ObjectId;
  athleteId: ObjectId;
  status: AttendanceStatus;
  method: AttendanceMethod;
  markedBy: ObjectId | null;
  markedAt: ISODateString;
  excuseNote: string | null;
  excuseAttachment: string | null;
}

// ==================== PERFORMANCE TYPES ====================

export interface Competition {
  id: ObjectId;
  clubId: ObjectId;
  name: string;
  date: ISODateString;
  venue: string;
  level: 'club' | 'district' | 'state' | 'national' | 'international';
  events: CompetitionEvent[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CompetitionEvent {
  id: ObjectId;
  name: string;
  type: 'sprint' | 'distance' | 'jump' | 'throw' | 'combined';
  gender: 'male' | 'female' | 'mixed';
  ageGroup: string;
}

export interface Result {
  id: ObjectId;
  clubId: ObjectId;
  athleteId: ObjectId;
  competitionId: ObjectId;
  event: string;
  round: string;
  result: string;
  wind: number | null;
  position: number | null;
  waPoints: number | null;
  isPB: boolean;
  isSB: boolean;
  createdAt: ISODateString;
}

export interface FitnessTest {
  id: ObjectId;
  clubId: ObjectId;
  athleteId: ObjectId;
  testType: FitnessTestType;
  value: number;
  unit: string;
  date: ISODateString;
  percentile: number | null;
  notes: string | null;
}

export interface Goal {
  id: ObjectId;
  clubId: ObjectId;
  athleteId: ObjectId;
  event: string;
  targetValue: string;
  targetDate: ISODateString;
  status: GoalStatus;
  coachNotes: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ==================== INJURY TYPES ====================

export interface Injury {
  id: ObjectId;
  clubId: ObjectId;
  athleteId: ObjectId;
  type: string;
  bodyPart: string;
  laterality: Laterality;
  onsetDate: ISODateString;
  mechanism: string;
  severity: InjurySeverity;
  diagnosisSource: 'self' | 'coach' | 'physio' | 'doctor' | 'imaging';
  imaging: string[];
  status: InjuryStatus;
  expectedReturnDate: ISODateString | null;
  actualReturnDate: ISODateString | null;
  rtpProtocolId: ObjectId | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface RehabLog {
  id: ObjectId;
  clubId: ObjectId;
  injuryId: ObjectId;
  date: ISODateString;
  painLevel: number;
  wellnessScore: number;
  exercisesCompleted: string[];
  notes: string | null;
}

export interface RTPProtocol {
  id: ObjectId;
  clubId: ObjectId;
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

// ==================== PERMISSION TYPES ====================

export interface PermissionEvent {
  id: ObjectId;
  clubId: ObjectId;
  name: string;
  date: ISODateString;
  venue: string;
  type: 'competition' | 'training_camp' | 'other';
  athleteIds: ObjectId[];
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface PermissionLetter {
  id: ObjectId;
  clubId: ObjectId;
  eventId: ObjectId;
  athleteId: ObjectId;
  templateId: ObjectId;
  content: string;
  status: LetterStatus;
  qrCode: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Approval {
  id: ObjectId;
  letterId: ObjectId;
  step: number;
  approverRole: ApproverRole;
  approverId: ObjectId | null;
  decision: 'pending' | 'approved' | 'rejected';
  comment: string | null;
  decidedAt: ISODateString | null;
}

export interface LetterTemplate {
  id: ObjectId;
  clubId: ObjectId;
  type: LetterType;
  markdown: string;
  variables: string[];
  approvalChain: ApproverRole[];
}

// ==================== ANALYTICS TYPES ====================

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

export interface ProgressionData {
  date: ISODateString;
  value: number;
  label: string;
}

export interface GoalProgress {
  goalId: ObjectId;
  event: string;
  target: string;
  current: string;
  progressPercent: number;
  daysRemaining: number;
}

export interface InjurySummary {
  injuryId: ObjectId;
  type: string;
  bodyPart: string;
  severity: number;
  status: string;
  daysMissed: number;
}

export interface HeatmapData {
  date: ISODateString;
  value: number;
  label: string;
}

export interface ComplianceData {
  athleteId: ObjectId;
  athleteName: string;
  assigned: number;
  completed: number;
  percentage: number;
}

export interface TrendData {
  date: ISODateString;
  value: number;
  load: number;
}

export interface LetterStatusCount {
  status: LetterStatus;
  count: number;
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  code?: string;
  errors?: ValidationErrorDetail[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

// ==================== PAGINATION ====================

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}