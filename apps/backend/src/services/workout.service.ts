// apps/backend/src/services/workout.service.ts
// Workout business logic

import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import { ERROR_CODES } from '@stms/shared/constants/errors';
import { Exercise, Workout, Program, WorkoutAssignment, WorkoutCompletion } from '@stms/shared/types';

export class WorkoutService {
  /**
   * Create exercise
   */
  async createExercise(input: Partial<Exercise> & { clubId: string }): Promise<Exercise> {
    this.validateExerciseInput(input);

    const db = await getDatabase();
    const now = new Date();

    const exerciseDoc = {
      ...input,
      clubId: input.clubId ? new ObjectId(input.clubId) : null,
      muscles: input.muscles || [],
      equipment: input.equipment || [],
      videoUrl: input.videoUrl || null,
      cues: input.cues || [],
      difficulty: input.difficulty || 'beginner',
      intensityPrescription: input.intensityPrescription || { type: 'percentage', value: 0, unit: '' },
      progressionRules: input.progressionRules || { weeklyIncreasePercent: 0, deloadEveryNWeeks: 0, deloadPercent: 0 },
      isVerified: input.isVerified || false,
      createdBy: new ObjectId(input.createdBy || 'system'),
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('exercises').insertOne(exerciseDoc);
    return { ...exerciseDoc, _id: result.insertedId, id: result.insertedId.toString() } as any;
  }

  /**
   * List exercises
   */
  async listExercises(clubId: string | null, filters: { search?: string; muscle?: string; equipment?: string; difficulty?: string } = {}) {
    const db = await getDatabase();

    const filter: any = {};
    if (clubId) filter.clubId = new ObjectId(clubId);
    if (filters.search) {
      filter.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }
    if (filters.muscle) filter.muscles = filters.muscle;
    if (filters.equipment) filter.equipment = filters.equipment;
    if (filters.difficulty) filter.difficulty = filters.difficulty;

    const exercises = await db.collection('exercises')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return exercises.map(e => this.formatExercise(e));
  }

  /**
   * Create workout
   */
  async createWorkout(input: Partial<Workout> & { clubId: string }): Promise<Workout> {
    this.validateWorkoutInput(input);

    const db = await getDatabase();
    const now = new Date();

    const workoutDoc = {
      ...input,
      clubId: new ObjectId(input.clubId),
      exercises: input.exercises || [],
      estimatedDuration: input.estimatedDuration || 0,
      difficulty: input.difficulty || 'beginner',
      tags: input.tags || [],
      isTemplate: input.isTemplate || false,
      createdBy: new ObjectId(input.createdBy || 'system'),
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('workouts').insertOne(workoutDoc);
    return { ...workoutDoc, _id: result.insertedId, id: result.insertedId.toString() } as any;
  }

  /**
   * List workouts
   */
  async listWorkouts(clubId: string, filters: { search?: string; difficulty?: string; isTemplate?: boolean } = {}) {
    const db = await getDatabase();

    const filter: any = { clubId: new ObjectId(clubId) };
    if (filters.search) {
      filter.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }
    if (filters.difficulty) filter.difficulty = filters.difficulty;
    if (filters.isTemplate !== undefined) filter.isTemplate = filters.isTemplate;

    const workouts = await db.collection('workouts')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return workouts.map(w => this.formatWorkout(w));
  }

  /**
   * Get workout by ID
   */
  async getWorkoutById(workoutId: string): Promise<Workout> {
    const db = await getDatabase();
    const workout = await db.collection('workouts').findOne({ _id: new ObjectId(workoutId) });

    if (!workout) {
      throw new NotFoundError('Workout');
    }

    return this.formatWorkout(workout);
  }

  /**
   * Update workout
   */
  async updateWorkout(workoutId: string, updates: Partial<Workout>): Promise<Workout> {
    const db = await getDatabase();

    const allowedFields = ['name', 'description', 'exercises', 'estimatedDuration', 'difficulty', 'tags', 'isTemplate'];
    const updateDoc: any = { updatedAt: new Date() };

    for (const field of allowedFields) {
      if (updates[field as keyof Workout] !== undefined) {
        updateDoc[field] = updates[field as keyof Workout];
      }
    }

    const result = await db.collection('workouts').findOneAndUpdate(
      { _id: new ObjectId(workoutId) },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new NotFoundError('Workout');
    }

    return this.formatWorkout(result);
  }

  /**
   * Delete workout
   */
  async deleteWorkout(workoutId: string): Promise<void> {
    const db = await getDatabase();
    await db.collection('workouts').deleteOne({ _id: new ObjectId(workoutId) });
  }

  /**
   * Assign workout to athletes
   */
  async assignWorkout(input: Partial<WorkoutAssignment> & { clubId: string }): Promise<WorkoutAssignment> {
    this.validateAssignmentInput(input);

    const db = await getDatabase();
    const now = new Date();

    const assignmentDoc = {
      ...input,
      clubId: new ObjectId(input.clubId),
      workoutId: input.workoutId ? new ObjectId(input.workoutId) : null,
      programId: input.programId ? new ObjectId(input.programId) : null,
      athleteIds: input.athleteIds?.map(id => new ObjectId(id)) || [],
      groupId: input.groupId ? new ObjectId(input.groupId) : null,
      schedule: input.schedule || { type: 'once' },
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      createdBy: new ObjectId(input.createdBy || 'system'),
      createdAt: now,
    };

    const result = await db.collection('workout_assignments').insertOne(assignmentDoc);
    return { ...assignmentDoc, _id: result.insertedId, id: result.insertedId.toString() } as any;
  }

  /**
   * Get athlete's today workouts
   */
  async getTodayWorkouts(athleteId: string, clubId: string) {
    const db = await getDatabase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const assignments = await db.collection('workout_assignments')
      .find({
        clubId: new ObjectId(clubId),
        athleteIds: new ObjectId(athleteId),
        startDate: { $lt: tomorrow },
        $or: [{ endDate: { $exists: false } }, { endDate: { $gte: today } }],
      })
      .toArray();

    // Populate workout details
    const workoutIds = assignments
      .filter(a => a.workoutId)
      .map(a => a.workoutId!);

    const workouts = await db.collection('workouts')
      .find({ _id: { $in: workoutIds } })
      .toArray();

    const workoutMap = new Map(workouts.map(w => [w._id.toString(), w]));

    return assignments.map(a => ({
      ...a,
      workout: a.workoutId ? workoutMap.get(a.workoutId.toString()) : null,
    }));
  }

  /**
   * Complete workout
   */
  async completeWorkout(input: Partial<WorkoutCompletion> & { assignmentId: string; athleteId: string }): Promise<WorkoutCompletion> {
    const db = await getDatabase();
    const now = new Date();

    const completionDoc = {
      ...input,
      assignmentId: new ObjectId(input.assignmentId),
      athleteId: new ObjectId(input.athleteId),
      actuals: input.actuals || [],
      startedAt: new Date(input.startedAt),
      completedAt: input.completedAt ? new Date(input.completedAt) : now,
      syncedAt: now,
      notes: input.notes || null,
      rating: input.rating || null,
    };

    const result = await db.collection('workout_completions').insertOne(completionDoc);
    return { ...completionDoc, _id: result.insertedId, id: result.insertedId.toString() } as any;
  }

  /**
   * Validate exercise input
   */
  private validateExerciseInput(input: Partial<Exercise>): void {
    const errors: { field: string; message: string }[] = [];

    if (!input.name || input.name.trim().length < 2) {
      errors.push({ field: 'name', message: 'Exercise name must be at least 2 characters' });
    }

    if (!input.clubId) {
      errors.push({ field: 'clubId', message: 'Club ID required' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors);
    }
  }

  /**
   * Validate workout input
   */
  private validateWorkoutInput(input: Partial<Workout>): void {
    const errors: { field: string; message: string }[] = [];

    if (!input.name || input.name.trim().length < 2) {
      errors.push({ field: 'name', message: 'Workout name must be at least 2 characters' });
    }

    if (!input.clubId) {
      errors.push({ field: 'clubId', message: 'Club ID required' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors);
    }
  }

  /**
   * Validate assignment input
   */
  private validateAssignmentInput(input: Partial<WorkoutAssignment>): void {
    const errors: { field: string; message: string }[] = [];

    if (!input.clubId) {
      errors.push({ field: 'clubId', message: 'Club ID required' });
    }

    if (!input.workoutId && !input.programId) {
      errors.push({ field: 'workoutId', message: 'Either workoutId or programId required' });
    }

    if (!input.athleteIds || input.athleteIds.length === 0) {
      errors.push({ field: 'athleteIds', message: 'At least one athlete required' });
    }

    if (!input.startDate) {
      errors.push({ field: 'startDate', message: 'Start date required' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors);
    }
  }

  /**
   * Format exercise for response
   */
  private formatExercise(exercise: any): Exercise {
    return {
      id: exercise._id.toString(),
      clubId: exercise.clubId?.toString() || null,
      name: exercise.name,
      description: exercise.description,
      muscles: exercise.muscles || [],
      equipment: exercise.equipment || [],
      videoUrl: exercise.videoUrl,
      cues: exercise.cues || [],
      difficulty: exercise.difficulty,
      intensityPrescription: exercise.intensityPrescription || { type: 'percentage', value: 0, unit: '' },
      progressionRules: exercise.progressionRules || { weeklyIncreasePercent: 0, deloadEveryNWeeks: 0, deloadPercent: 0 },
      isVerified: exercise.isVerified,
      createdBy: exercise.createdBy.toString(),
      createdAt: exercise.createdAt.toISOString(),
      updatedAt: exercise.updatedAt.toISOString(),
    };
  }

  /**
   * Format workout for response
   */
  private formatWorkout(workout: any): Workout {
    return {
      id: workout._id.toString(),
      clubId: workout.clubId.toString(),
      name: workout.name,
      description: workout.description,
      exercises: workout.exercises || [],
      estimatedDuration: workout.estimatedDuration,
      difficulty: workout.difficulty,
      tags: workout.tags || [],
      isTemplate: workout.isTemplate,
      createdBy: workout.createdBy.toString(),
      createdAt: workout.createdAt.toISOString(),
      updatedAt: workout.updatedAt.toISOString(),
    };
  }
}

export const workoutService = new WorkoutService();