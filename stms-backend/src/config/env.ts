// src/config/env.ts
// Validates all required environment variables at startup

const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'MONGODB_URI',
  'REDIS_URL',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'JWT_PRIVATE_KEY',
  'JWT_PUBLIC_KEY',
  'ALLOWED_ORIGINS',
] as const;

const optionalEnvVars = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'SENTRY_DSN',
  'LOG_LEVEL',
] as const;

type RequiredEnv = typeof requiredEnvVars[number];
type OptionalEnv = typeof optionalEnvVars[number];

export type EnvConfig = Record<RequiredEnv, string> & Partial<Record<OptionalEnv, string>>;

function validateEnv(): EnvConfig {
  const missing: string[] = [];
  const config: Record<string, string> = {};

  for (const key of requiredEnvVars) {
    const value = process.env[key];
    if (!value) {
      missing.push(key);
    } else {
      config[key] = value;
    }
  }

  for (const key of optionalEnvVars) {
    const value = process.env[key];
    if (value) {
      config[key] = value;
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate NODE_ENV
  if (!['development', 'staging', 'production'].includes(config.NODE_ENV)) {
    throw new Error(`NODE_ENV must be one of: development, staging, production`);
  }

  // Parse ALLOWED_ORIGINS
  config.ALLOWED_ORIGINS = config.ALLOWED_ORIGINS.split(',').map(o => o.trim());

  return config as EnvConfig;
}

export const env = validateEnv();

// Helper to get allowed origins for CORS
export const getAllowedOrigins = (): string[] => env.ALLOWED_ORIGINS;

// Helper to check if production
export const isProduction = (): boolean => env.NODE_ENV === 'production';

// Helper to check if development
export const isDevelopment = (): boolean => env.NODE_ENV === 'development';