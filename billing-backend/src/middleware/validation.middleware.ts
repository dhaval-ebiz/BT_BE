import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { AuthenticatedRequest, ZodSchema } from '../types/common';

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated as T;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }
      logger.error('Validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Validation failed',
      });
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.parseAsync(req.query);
      req.query = validated as unknown as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Query validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }
      logger.error('Query validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Query validation failed',
      });
    }
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.parseAsync(req.params);
      req.params = validated as unknown as typeof req.params;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Parameter validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }
      logger.error('Parameter validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Parameter validation failed',
      });
    }
  };
}

export function handleValidationError(error: unknown, res: Response): void {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
  }
  
  logger.error('Validation error:', error);
  return res.status(500).json({
    success: false,
    message: 'Validation failed',
  });
}