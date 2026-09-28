// @stms/shared - Validation Utilities
// Shared validation helpers using Zod

import { z } from 'zod';

// ==================== COMMON SCHEMAS ====================

/**
 * MongoDB ObjectId validation (24 hex characters)
 */
export const ObjectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

export type ObjectId = z.infer<typeof ObjectIdSchema>;

/**
 * ISO 8601 date string validation
 */
export const ISODateStringSchema = z.string().datetime({ offset: true });

export type ISODateString = z.infer<typeof ISODateStringSchema>;

/**
 * Email validation with normalization
 */
export const EmailSchema = z.string().email().toLowerCase().max(255);

export type Email = z.infer<typeof EmailSchema>;

/**
 * Password validation (NIST 2025 guidelines - 12+ chars, no composition rules)
 */
export const PasswordSchema = z.string().min(12).max(128);

export type Password = z.infer<typeof PasswordSchema>;

/**
 * Name validation
 */
export const NameSchema = z.string().min(1).max(100).trim();

export type Name = z.infer<typeof NameSchema>;

/**
 * Phone number validation (E.164 format)
 */
export const PhoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');

export type Phone = z.infer<typeof PhoneSchema>;

/**
 * URL validation
 */
export const UrlSchema = z.string().url();

export type Url = z.infer<typeof UrlSchema>;

/**
 * Hex color validation
 */
export const HexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format');

export type HexColor = z.infer<typeof HexColorSchema>;

/**
 * Slug validation (lowercase alphanumeric + hyphens)
 */
export const SlugSchema = z.string().regex(/^[a-z0-9-]+$/).max(50);

export type Slug = z.infer<typeof SlugSchema>;

// ==================== COMPOSITE SCHEMAS ====================

/**
 * Pagination parameters
 */
export const PaginationParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

/**
 * Standard API response wrapper
 */
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    status: z.enum(['success', 'error']),
    data: dataSchema.optional(),
    message: z.string().optional(),
    code: z.string().optional(),
    errors: z
      .array(
        z.object({
          field: z.string(),
          message: z.string(),
        })
      )
      .optional(),
  });

/**
 * Paginated response wrapper
 */
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  ApiResponseSchema(z.array(dataSchema)).extend({
    meta: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  });

// ==================== VALIDATION HELPERS ====================

/**
 * Create a Zod schema that validates an object with body, query, and params
 */
export function createApiSchema<T extends z.ZodRawShape>(shape: {
  body?: z.ZodObject<T>;
  query?: z.ZodObject<T>;
  params?: z.ZodObject<T>;
}) {
  return z.object({
    body: shape.body?.optional(),
    query: shape.query?.optional(),
    params: shape.params?.optional(),
  });
}

/**
 * Format Zod errors into standardized format
 */
export function formatZodErrors(error: z.ZodError): Array<{ field: string; message: string }> {
  return error.errors.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

/**
 * Validate data against a schema and throw formatted error on failure
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw {
      name: 'ValidationError',
      message: 'Validation failed',
      errors: formatZodErrors(result.error),
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    };
  }
  return result.data;
}

/**
 * Async version of validateOrThrow
 */
export async function validateOrThrowAsync<T>(schema: z.ZodSchema<T>, data: unknown): Promise<T> {
  const result = await schema.safeParseAsync(data);
  if (!result.success) {
    throw {
      name: 'ValidationError',
      message: 'Validation failed',
      errors: formatZodErrors(result.error),
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    };
  }
  return result.data;
}

/**
 * Create a partial schema (all fields optional) from an existing schema
 */
export function partialSchema<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.partial();
}

/**
 * Create a required schema (all fields required) from an existing schema
 */
export function requiredSchema<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  const shape = schema.shape;
  const requiredShape: Record<string, z.ZodTypeAny> = {};
  for (const [key, value] of Object.entries(shape)) {
    if (value instanceof z.ZodOptional) {
      requiredShape[key] = value.unwrap();
    } else if (value instanceof z.ZodNullable) {
      requiredShape[key] = value.unwrap();
    } else if (value instanceof z.ZodDefault) {
      requiredShape[key] = value.unwrap();
    } else {
      requiredShape[key] = value;
    }
  }
  return z.object(requiredShape);
}

/**
 * Strip unknown keys from object
 */
export function stripUnknown<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.strict();
}

/**
 * Transform string to ObjectId (for query params)
 */
export const stringToObjectId = z.string().transform((val) => val);

/**
 * Transform string to Date (for query params)
 */
export const stringToDate = z.string().transform((val) => new Date(val));

/**
 * Transform comma-separated string to array
 */
export const csvToArray = z.string().transform((val) => val.split(',').map((s) => s.trim()).filter(Boolean));

// ==================== FILE VALIDATION ====================

export const FileUploadSchema = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string(),
  size: z.number().max(10 * 1024 * 1024), // 10MB max
  buffer: z.instanceof(Buffer).optional(),
  path: z.string().optional(),
});

export type FileUpload = z.infer<typeof FileUploadSchema>;

// Allowed MIME types for different upload categories
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const;

export function isAllowedImageType(mimetype: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimetype as any);
}

export function isAllowedDocumentType(mimetype: string): boolean {
  return ALLOWED_DOCUMENT_TYPES.includes(mimetype as any);
}

export function isAllowedVideoType(mimetype: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(mimetype as any);
}