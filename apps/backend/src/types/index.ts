// apps/backend/src/types/index.ts
// Backend-specific type extensions

import { ObjectId } from 'mongodb';
import { Document } from 'mongodb';
import {
  User,
  Club,
  Membership,
  Athlete,
  Exercise,
  Workout,
  Program,
  WorkoutAssignment,
  WorkoutCompletion,
  Session,
  AttendanceRecord,
  Competition,
  Result,
  FitnessTest,
  Goal,
  Injury,
  RehabLog,
  RTPProtocol,
  PermissionEvent,
  PermissionLetter,
  Approval,
  LetterTemplate,
} from '@stms/shared/types';

// ==================== DATABASE DOCUMENT TYPES ====================

export interface UserDocument extends Document, Omit<User, 'id' | 'clubIds' | 'activeClubId'> {
  _id: ObjectId;
  clubIds: ObjectId[];
  activeClubId?: ObjectId | null;
}

export interface ClubDocument extends Document, Omit<Club, 'id' | 'createdBy'> {
  _id: ObjectId;
  createdBy: ObjectId;
}

export interface MembershipDocument extends Document, Omit<Membership, 'id' | 'userId' | 'clubId' | 'invitedBy'> {
  _id: ObjectId;
  userId: ObjectId;
  clubId: ObjectId;
  invitedBy?: ObjectId | null;
}

export interface AthleteDocument extends Document, Omit<Athlete, 'id' | 'userId' | 'clubId'> {
  _id: ObjectId;
  userId?: ObjectId | null;
  clubId: ObjectId;
}

export interface ExerciseDocument extends Document, Omit<Exercise, 'id' | 'clubId' | 'createdBy'> {
  _id: ObjectId;
  clubId?: ObjectId | null;
  createdBy: ObjectId;
}

export interface WorkoutDocument extends Document, Omit<Workout, 'id' | 'clubId' | 'createdBy'> {
  _id: ObjectId;
  clubId: ObjectId;
  createdBy: ObjectId;
}

export interface ProgramDocument extends Document, Omit<Program, 'id' | 'clubId' | 'createdBy'> {
  _id: ObjectId;
  clubId: ObjectId;
  createdBy: ObjectId;
}

export interface WorkoutAssignmentDocument extends Document, Omit<WorkoutAssignment, 'id' | 'clubId' | 'workoutId' | 'programId' | 'athleteIds' | 'groupId' | 'createdBy'> {
  _id: ObjectId;
  clubId: ObjectId;
  workoutId?: ObjectId | null;
  programId?: ObjectId | null;
  athleteIds: ObjectId[];
  groupId?: ObjectId | null;
  createdBy: ObjectId;
}

export interface WorkoutCompletionDocument extends Document, Omit<WorkoutCompletion, 'id' | 'assignmentId' | 'athleteId'> {
  _id: ObjectId;
  assignmentId: ObjectId;
  athleteId: ObjectId;
}

export interface SessionDocument extends Document, Omit<Session, 'id' | 'clubId' | 'linkedWorkoutId' | 'createdBy'> {
  _id: ObjectId;
  clubId: ObjectId;
  linkedWorkoutId?: ObjectId | null;
  createdBy: ObjectId;
}

export interface AttendanceRecordDocument extends Document, Omit<AttendanceRecord, 'id' | 'clubId' | 'sessionId' | 'athleteId' | 'markedBy'> {
  _id: ObjectId;
  clubId: ObjectId;
  sessionId: ObjectId;
  athleteId: ObjectId;
  markedBy?: ObjectId | null;
}

export interface CompetitionDocument extends Document, Omit<Competition, 'id' | 'clubId'> {
  _id: ObjectId;
  clubId: ObjectId;
}

export interface ResultDocument extends Document, Omit<Result, 'id' | 'clubId' | 'athleteId' | 'competitionId'> {
  _id: ObjectId;
  clubId: ObjectId;
  athleteId: ObjectId;
  competitionId: ObjectId;
}

export interface FitnessTestDocument extends Document, Omit<FitnessTest, 'id' | 'clubId' | 'athleteId'> {
  _id: ObjectId;
  clubId: ObjectId;
  athleteId: ObjectId;
}

export interface GoalDocument extends Document, Omit<Goal, 'id' | 'clubId' | 'athleteId'> {
  _id: ObjectId;
  clubId: ObjectId;
  athleteId: ObjectId;
}

export interface InjuryDocument extends Document, Omit<Injury, 'id' | 'clubId' | 'athleteId' | 'rtpProtocolId'> {
  _id: ObjectId;
  clubId: ObjectId;
  athleteId: ObjectId;
  rtpProtocolId?: ObjectId | null;
}

export interface RehabLogDocument extends Document, Omit<RehabLog, 'id' | 'clubId' | 'injuryId'> {
  _id: ObjectId;
  clubId: ObjectId;
  injuryId: ObjectId;
}

export interface RTPProtocolDocument extends Document, Omit<RTPProtocol, 'id' | 'clubId'> {
  _id: ObjectId;
  clubId: ObjectId;
}

export interface PermissionEventDocument extends Document, Omit<PermissionEvent, 'id' | 'clubId' | 'athleteIds'> {
  _id: ObjectId;
  clubId: ObjectId;
  athleteIds: ObjectId[];
}

export interface PermissionLetterDocument extends Document, Omit<PermissionLetter, 'id' | 'clubId' | 'eventId' | 'athleteId' | 'templateId'> {
  _id: ObjectId;
  clubId: ObjectId;
  eventId: ObjectId;
  athleteId: ObjectId;
  templateId: ObjectId;
}

export interface ApprovalDocument extends Document, Omit<Approval, 'id' | 'letterId' | 'approverId'> {
  _id: ObjectId;
  letterId: ObjectId;
  approverId?: ObjectId | null;
}

export interface LetterTemplateDocument extends Document, Omit<LetterTemplate, 'id' | 'clubId'> {
  _id: ObjectId;
  clubId: ObjectId;
}

// ==================== AUDIT LOG ====================

export interface AuditLogDocument extends Document {
  _id: ObjectId;
  userId: ObjectId;
  action: string;
  resource: string;
  resourceId?: ObjectId | null;
  clubId: ObjectId;
  metadata?: Record<string, any>;
  timestamp: Date;
  ip: string;
  userAgent: string;
}

// ==================== REQUEST EXTENSIONS ====================

// Extended in middleware/auth.middleware.ts and middleware/club.middleware.ts
// declare global {
//   namespace Express {
//     interface Request {
//       user?: JWTPayload;
//       clubId: string;
//     }
//   }
// }

// ==================== HELPER FUNCTIONS ====================

export function toUserResponse(user: UserDocument): any {
  return {
    id: user._id.toString(),
    firebaseUid: user.firebaseUid,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    clubIds: user.clubIds.map((id: ObjectId) => id.toString()),
    activeClubId: user.activeClubId?.toString() || null,
    status: user.status,
    lastLoginAt: user.lastLoginAt || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function toClubResponse(club: ClubDocument): any {
  return {
    id: club._id.toString(),
    name: club.name,
    slug: club.slug,
    branding: club.branding,
    settings: club.settings,
    createdBy: club.createdBy.toString(),
    createdAt: club.createdAt,
    updatedAt: club.updatedAt,
  };
}

export function toMembershipResponse(membership: MembershipDocument, user: UserDocument): any {
  return {
    user: toUserResponse(user),
    membership: {
      role: membership.role,
      status: membership.status,
      joinedAt: membership.joinedAt,
      invitedBy: membership.invitedBy?.toString() || null,
    },
  };
}