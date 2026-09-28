// apps/backend/src/middleware/validation.middleware.ts
// Zod validation middleware for request body, query, params

import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError, ZodIssue } from 'zod';
import { ValidationError } from '../utils/errors';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatZodErrors(error.errors);
        return next(new ValidationError('Validation failed', errors));
      }
      next(error);
    }
  };
};

function formatZodErrors(issues: ZodIssue[]): { field: string; message: string }[] {
  return issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

// Convenience helpers for common validations
export const validateBody = (schema: AnyZodObject) => validate(schema);
export const validateQuery = (schema: AnyZodObject) => validate(schema);
export const validateParams = (schema: AnyZodObject) => validate(schema);