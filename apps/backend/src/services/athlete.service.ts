// apps/backend/src/services/athlete.service.ts
// Athlete business logic

import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { ERROR_CODES } from '@stms/shared/constants/errors';
import { Athlete } from '@stms/shared/types';

export class AthleteService {
  /**
   * Create new athlete profile
   */
  async create(input: Partial<Athlete> & { clubId: string }): Promise<Athlete> {
    this.validateAthleteInput(input);

    const db = await getDatabase();
    const now = new Date();

    const athleteDoc = {
      ...input,
      userId: input.userId ? new ObjectId(input.userId) : null,
      clubId: new ObjectId(input.clubId),
      personalBest: input.personalBest || {},
      seasonBest: input.seasonBest || {},
      eventSpecialization: input.eventSpecialization || [],
      medicalNotes: input.medicalNotes || null,
      emergencyContact: input.emergencyContact || null,
      school: input.school || null,
      grade: input.grade || null,
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('athletes').insertOne(athleteDoc);
    return { ...athleteDoc, _id: result.insertedId, id: result.insertedId.toString() } as any;
  }

  /**
   * Get athlete by ID
   */
  async getById(athleteId: string): Promise<Athlete> {
    const db = await getDatabase();
    const athlete = await db.collection('athletes').findOne({ _id: new ObjectId(athleteId) });

    if (!athlete) {
      throw new NotFoundError('Athlete');
    }

    return this.formatAthlete(athlete);
  }

  /**
   * List athletes with filters
   */
  async list(params: {
    clubId: string;
    page: number;
    limit: number;
    search?: string;
    event?: string;
    status?: string;
  }) {
    const db = await getDatabase();
    const { clubId, page, limit, search, event, status } = params;

    const filter: any = { clubId: new ObjectId(clubId) };
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (event) filter.eventSpecialization = event;
    if (status) filter.status = status;

    const total = await db.collection('athletes').countDocuments(filter);
    const athletes = await db.collection('athletes')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return {
      data: athletes.map(a => this.formatAthlete(a)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Update athlete
   */
  async update(athleteId: string, updates: Partial<Athlete>): Promise<Athlete> {
    const db = await getDatabase();

    const allowedFields = [
      'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender',
      'eventSpecialization', 'personalBest', 'seasonBest', 'medicalNotes',
      'emergencyContact', 'school', 'grade', 'status'
    ];

    const updateDoc: any = { updatedAt: new Date() };
    for (const field of allowedFields) {
      if (updates[field as keyof Athlete] !== undefined) {
        updateDoc[field] = updates[field as keyof Athlete];
      }
    }

    const result = await db.collection('athletes').findOneAndUpdate(
      { _id: new ObjectId(athleteId) },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new NotFoundError('Athlete');
    }

    return this.formatAthlete(result);
  }

  /**
   * Bulk import athletes from CSV
   */
  async bulkImport(clubId: string, athletes: Partial<Athlete>[]): Promise<{ created: number; errors: any[] }> {
    const db = await getDatabase();
    const now = new Date();
    let created = 0;
    const errors: any[] = [];

    for (let i = 0; i < athletes.length; i++) {
      try {
        const athlete = athletes[i];
        this.validateAthleteInput(athlete);

        const athleteDoc = {
          ...athlete,
          clubId: new ObjectId(clubId),
          personalBest: athlete.personalBest || {},
          seasonBest: athlete.seasonBest || {},
          eventSpecialization: athlete.eventSpecialization || [],
          medicalNotes: athlete.medicalNotes || null,
          emergencyContact: athlete.emergencyContact || null,
          school: athlete.school || null,
          grade: athlete.grade || null,
          status: 'active' as const,
          createdAt: now,
          updatedAt: now,
        };

        await db.collection('athletes').insertOne(athleteDoc);
        created++;
      } catch (error: any) {
        errors.push({ row: i + 1, error: error.message, data: athletes[i] });
      }
    }

    return { created, errors };
  }

  /**
   * Soft delete athlete
   */
  async delete(athleteId: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date();

    await db.collection('athletes').updateOne(
      { _id: new ObjectId(athleteId) },
      {
        $set: {
          status: 'deleted',
          deletedAt: now,
          updatedAt: now,
          email: `deleted_${athleteId}@deleted.stms`,
          firstName: 'Deleted',
          lastName: 'Athlete',
        },
      }
    );
  }

  /**
   * Validate athlete input
   */
  private validateAthleteInput(input: Partial<Athlete>): void {
    const errors: { field: string; message: string }[] = [];

    if (!input.firstName || input.firstName.trim().length < 2) {
      errors.push({ field: 'firstName', message: 'First name must be at least 2 characters' });
    }

    if (!input.lastName || input.lastName.trim().length < 2) {
      errors.push({ field: 'lastName', message: 'Last name must be at least 2 characters' });
    }

    if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      errors.push({ field: 'email', message: 'Valid email required' });
    }

    if (!input.clubId) {
      errors.push({ field: 'clubId', message: 'Club ID required' });
    }

    if (input.dateOfBirth && isNaN(Date.parse(input.dateOfBirth))) {
      errors.push({ field: 'dateOfBirth', message: 'Invalid date format' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors);
    }
  }

  /**
   * Format athlete for response
   */
  private formatAthlete(athlete: any): Athlete {
    return {
      id: athlete._id.toString(),
      userId: athlete.userId?.toString() || null,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      email: athlete.email,
      phone: athlete.phone,
      dateOfBirth: athlete.dateOfBirth?.toISOString() || null,
      gender: athlete.gender,
      eventSpecialization: athlete.eventSpecialization || [],
      personalBest: athlete.personalBest || {},
      seasonBest: athlete.seasonBest || {},
      medicalNotes: athlete.medicalNotes,
      emergencyContact: athlete.emergencyContact,
      school: athlete.school,
      grade: athlete.grade,
      status: athlete.status,
      clubId: athlete.clubId.toString(),
      createdAt: athlete.createdAt.toISOString(),
      updatedAt: athlete.updatedAt.toISOString(),
    };
  }
}

export const athleteService = new AthleteService();