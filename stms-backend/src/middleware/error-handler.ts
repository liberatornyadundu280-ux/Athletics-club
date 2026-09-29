// src/middleware/error-handler.ts
// Global error handler with structured responses

import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalError,
  ERROR_CODES,
} from '../utils/errors';
import { logger } from './logger.middleware';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle known operational errors
  if (err instanceof AppError) {
    const statusCode = err.statusCode;

    // Log 4xx errors as warnings, 5xx as errors
    if (statusCode >= 500) {
      logger.error({
        error: err.message,
        code: err.code,
        stack: err.stack,
        url: req.url,
        method: req.method,
        userId: req.user?.uid,
        clubId: req.clubId,
        ip: req.ip,
      });
    } else {
      logger.warn({
        error: err.message,
        code: err.code,
        url: req.url,
        method: req.method,
        userId: req.user?.uid,
        clubId: req.clubId,
        ip: req.ip,
      });
    }

    const response: Record<string, any> = {
      status: 'error',
      message: err.message,
      code: err.code,
    };

    if (err instanceof ValidationError && err.errors.length > 0) {
      response.errors = err.errors;
    }

    res.status(statusCode).json(response);
    return;
  }

  // Handle Zod errors (should be caught by validate middleware, but safety net)
  if (err.name === 'ZodError') {
    logger.warn({
      error: err.message,
      url: req.url,
      method: req.method,
    });
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      code: ERROR_CODES.VALIDATION_ERROR,
    });
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    logger.warn({
      error: err.message,
      url: req.url,
      method: req.method,
      ip: req.ip,
    });
    res.status(401).json({
      status: 'error',
      message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
      code: err.name === 'TokenExpiredError' ? ERROR_CODES.TOKEN_EXPIRED : ERROR_CODES.TOKEN_INVALID,
    });
    return;
  }

  // Handle MongoDB duplicate key errors
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue || {})[0];
    logger.warn({
      error: 'Duplicate key error',
      field,
      url: req.url,
      method: req.method,
    });
    res.status(409).json({
      status: 'error',
      message: `${field} already exists`,
      code: ERROR_CODES.CONFLICT,
    });
    return;
  }

  // Log unexpected errors
  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.uid,
    clubId: req.clubId,
    ip: req.ip,
  });

  // Don't leak error details in production
  const message = env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(500).json({
    status: 'error',
    message,
    code: ERROR_CODES.INTERNAL_ERROR,
  });
};

/**
 * Async error wrapper - catches async errors and passes to error handler
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
