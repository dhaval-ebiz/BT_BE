import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { 
  AppError, 
  DatabaseError, 
  ValidationError as ValidationErrorType, 
  JWTError, 
  MulterError,
  RequestHandler 
} from '../types/errors';

export interface CustomError extends Error {
  statusCode?: number;
  status?: string;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('Error handler caught:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Default error
  let statusCode = 500;
  let message = 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Resource not found';
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation failed';
  }

  // Database errors
  if (err.message?.includes('duplicate key')) {
    statusCode = 409;
    message = 'Resource already exists';
  }

  if (err.message?.includes('not found')) {
    statusCode = 404;
    message = err.message;
  }

  // Send error response
  const response: Record<string, unknown> = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  if (err.name === 'ZodError' && 'errors' in err) {
    response.errors = (err as z.ZodError).errors;
  }

  res.status(statusCode).json(response);
};

// Async error handler wrapper
export const asyncHandler = (fn: RequestHandler) => (req: Request, res: Response, next: NextFunction): void => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Database error handler
export const handleDatabaseError = (error: DatabaseError): { statusCode: number; message: string } => {
  if (error.code === 'P2002') {
    return {
      statusCode: 409,
      message: 'Unique constraint violation',
    };
  }

  if (error.code === 'P2025') {
    return {
      statusCode: 404,
      message: 'Record not found',
    };
  }

  if (error.code === 'P2003') {
    return {
      statusCode: 400,
      message: 'Foreign key constraint failed',
    };
  }

  return {
    statusCode: 500,
    message: 'Database error',
  };
};

// Validation error handler
export const handleValidationError = (error: { errors: Record<string, ValidationErrorType> }): { statusCode: number; message: string; errors: { field: string; message: string }[] } => {
  const errors = Object.values(error.errors).map((err) => ({
    field: err.path || 'unknown',
    message: err.message,
  }));

  return {
    statusCode: 400,
    message: 'Validation failed'
    ,errors,
  };
};

// JWT error handler
export const handleJWTError = (error: JWTError): { statusCode: number; message: string } => {
  if (error.name === 'TokenExpiredError') {
    return {
      statusCode: 401,
      message: 'Token has expired',
    };
  }

  if (error.name === 'JsonWebTokenError') {
    return {
      statusCode: 401,
      message: 'Invalid token',
    };
  }

  return {
    statusCode: 401,
    message: 'Authentication error',
  };
};

// Rate limit error handler
export const handleRateLimitError = (): { statusCode: number; message: string } => {
  return {
    statusCode: 429,
    message: 'Too many requests, please try again later',
  };
};

// Multer error handler
export const handleMulterError = (error: MulterError): { statusCode: number; message: string } => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return {
      statusCode: 400,
      message: 'File too large',
    };
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return {
      statusCode: 400,
      message: 'Too many files',
    };
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return {
      statusCode: 400,
      message: 'Unexpected file field',
    };
  }

  return {
    statusCode: 400,
    message: 'File upload error',
  };
};