import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/middleware/error-handler', () => ({
  asyncHandler: (handler: unknown) => handler,
}));
vi.mock('../../src/config/database', () => ({ getDatabase: vi.fn() }));
vi.mock('../../src/services/athlete.service', () => ({
  athleteService: { create: vi.fn(), bulkImport: vi.fn(), getById: vi.fn(), update: vi.fn(), delete: vi.fn(), list: vi.fn() },
}));

import { createAthleteSchema } from '../../src/routes/athlete.routes';

describe('createAthleteSchema', () => {
  it('accepts the athlete form payload without a client-supplied club ID', () => {
    const result = createAthleteSchema.shape.body.safeParse({
      firstName: 'Asha',
      lastName: 'Rao',
      email: 'asha@example.com',
      phone: null,
      dateOfBirth: '2008-04-12',
      gender: 'female',
      eventSpecialization: ['100m sprint', 'long jump'],
      medicalNotes: null,
      emergencyContact: null,
      school: null,
      grade: null,
      status: 'active',
    });

    expect(result.success).toBe(true);
  });

  it('rejects impossible date-only birth dates', () => {
    const result = createAthleteSchema.shape.body.safeParse({
      firstName: 'Asha',
      lastName: 'Rao',
      email: 'asha@example.com',
      dateOfBirth: '2008-02-30',
    });

    expect(result.success).toBe(false);
  });
});