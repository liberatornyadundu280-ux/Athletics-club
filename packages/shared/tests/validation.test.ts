// @stms/shared - Validation Tests

import { describe, it, expect } from 'vitest';
import {
  ObjectIdSchema,
  EmailSchema,
  PasswordSchema,
  NameSchema,
  PaginationParamsSchema,
  formatZodErrors,
  validateOrThrow,
  csvToArray,
  stripUnknown,
} from '../src/utils/validation';

describe('Validation Utilities', () => {
  describe('ObjectIdSchema', () => {
    it('accepts valid 24-char hex ObjectId', () => {
      const validId = '507f1f77bcf86cd799439011';
      expect(ObjectIdSchema.parse(validId)).toBe(validId);
    });

    it('rejects invalid ObjectId formats', () => {
      expect(() => ObjectIdSchema.parse('invalid')).toThrow();
      expect(() => ObjectIdSchema.parse('507f1f77bcf86cd79943901')).toThrow(); // 23 chars
      expect(() => ObjectIdSchema.parse('507f1f77bcf86cd7994390112')).toThrow(); // 25 chars
      expect(() => ObjectIdSchema.parse('507f1f77bcf86cd79943901g')).toThrow(); // non-hex
    });
  });

  describe('EmailSchema', () => {
    it('accepts valid emails', () => {
      expect(EmailSchema.parse('user@example.com')).toBe('user@example.com');
      expect(EmailSchema.parse('USER@EXAMPLE.COM')).toBe('user@example.com'); // lowercased
      expect(EmailSchema.parse('user.name+tag@example.co.uk')).toBe('user.name+tag@example.co.uk');
    });

    it('rejects invalid emails', () => {
      expect(() => EmailSchema.parse('invalid')).toThrow();
      expect(() => EmailSchema.parse('user@')).toThrow();
      expect(() => EmailSchema.parse('@example.com')).toThrow();
      expect(() => EmailSchema.parse('user@.com')).toThrow();
    });
  });

  describe('PasswordSchema', () => {
    it('accepts passwords >= 12 chars', () => {
      expect(PasswordSchema.parse('correct-horse-battery-staple')).toBe('correct-horse-battery-staple');
      expect(PasswordSchema.parse('a'.repeat(12))).toBe('a'.repeat(12));
      expect(PasswordSchema.parse('a'.repeat(128))).toBe('a'.repeat(128));
    });

    it('rejects short passwords', () => {
      expect(() => PasswordSchema.parse('short')).toThrow();
      expect(() => PasswordSchema.parse('a'.repeat(11))).toThrow();
    });

    it('rejects overly long passwords', () => {
      expect(() => PasswordSchema.parse('a'.repeat(129))).toThrow();
    });
  });

  describe('NameSchema', () => {
    it('accepts valid names', () => {
      expect(NameSchema.parse('John Doe')).toBe('John Doe');
      expect(NameSchema.parse('  John  ')).toBe('John'); // trimmed
      expect(NameSchema.parse('Mary-Jane O\'Connor')).toBe("Mary-Jane O'Connor");
    });

    it('rejects empty names', () => {
      expect(() => NameSchema.parse('')).toThrow();
      expect(() => NameSchema.parse('   ')).toThrow();
    });

    it('rejects overly long names', () => {
      expect(() => NameSchema.parse('a'.repeat(101))).toThrow();
    });
  });

  describe('PaginationParamsSchema', () => {
    it('provides defaults', () => {
      const result = PaginationParamsSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('accepts valid pagination params', () => {
      const result = PaginationParamsSchema.parse({ page: '3', limit: '50', search: 'test' });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(50);
      expect(result.search).toBe('test');
    });

    it('coerces string numbers', () => {
      const result = PaginationParamsSchema.parse({ page: '2', limit: '10' });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('enforces limits', () => {
      expect(() => PaginationParamsSchema.parse({ page: 0 })).toThrow();
      expect(() => PaginationParamsSchema.parse({ limit: 0 })).toThrow();
      expect(() => PaginationParamsSchema.parse({ limit: 101 })).toThrow();
    });
  });

  describe('csvToArray', () => {
    it('splits comma-separated values', () => {
      expect(csvToArray.parse('a,b,c')).toEqual(['a', 'b', 'c']);
    });

    it('trims whitespace', () => {
      expect(csvToArray.parse(' a , b , c ')).toEqual(['a', 'b', 'c']);
    });

    it('filters empty values', () => {
      expect(csvToArray.parse('a,,b, ,c')).toEqual(['a', 'b', 'c']);
    });

    it('handles empty string', () => {
      expect(csvToArray.parse('')).toEqual([]);
    });
  });

  describe('formatZodErrors', () => {
    it('formats errors correctly', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      try {
        schema.parse({ email: 'invalid', age: 15 });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const formatted = formatZodErrors(error);
          expect(formatted).toEqual([
            { field: 'email', message: 'Invalid email' },
            { field: 'age', message: 'Number must be greater than or equal to 18' },
          ]);
        }
      }
    });
  });

  describe('validateOrThrow', () => {
    it('returns parsed data on success', () => {
      const schema = z.object({ name: z.string().min(1) });
      const result = validateOrThrow(schema, { name: 'John' });
      expect(result).toEqual({ name: 'John' });
    });

    it('throws formatted error on failure', () => {
      const schema = z.object({ email: z.string().email() });
      expect(() => validateOrThrow(schema, { email: 'invalid' })).toThrow();
    });
  });

  describe('csvToArray transform', () => {
    it('transforms comma-separated string to array', () => {
      const schema = z.object({ tags: csvToArray });
      const result = schema.parse({ tags: 'tag1, tag2,tag3' });
      expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });
  });

  describe('stripUnknown', () => {
    it('strips unknown keys when strict', () => {
      const baseSchema = z.object({ name: z.string() });
      const strictSchema = stripUnknown(baseSchema);

      // Should not throw for exact match
      expect(() => strictSchema.parse({ name: 'John' })).not.toThrow();

      // Should throw for extra keys
      expect(() => strictSchema.parse({ name: 'John', extra: 'value' })).toThrow();
    });
  });
});