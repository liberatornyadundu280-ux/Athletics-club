// @stms/shared - Main entry point
// Single source of truth for all shared types, schemas, and constants

// Types
export * from './types';

// API Schemas - auth.ts is the canonical source, users.ts re-exports from auth
export * from './api/auth';
export * from './api/clubs';

// Constants
export * from './constants/roles';
export * from './constants/permissions';
export * from './constants/errors';

// Utilities (exclude PaginationParams to avoid conflict with types)
export {
  ObjectIdSchema,
  ISODateStringSchema,
  EmailSchema,
  PasswordSchema,
  NameSchema,
  PhoneSchema,
  UrlSchema,
  HexColorSchema,
  SlugSchema,
  PaginationParamsSchema,
  ApiResponseSchema,
  PaginatedResponseSchema,
  createApiSchema,
  formatZodErrors,
  validateOrThrow,
  validateOrThrowAsync,
  partialSchema,
  requiredSchema,
  stripUnknown,
  stringToObjectId,
  stringToDate,
  csvToArray,
  FileUploadSchema,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_VIDEO_TYPES,
  isAllowedImageType,
  isAllowedDocumentType,
  isAllowedVideoType,
  type ObjectId,
  type ISODateString,
  type Email,
  type Password,
  type Name,
  type Phone,
  type Url,
  type HexColor,
  type Slug,
  type PaginationParams,
} from './utils/validation';