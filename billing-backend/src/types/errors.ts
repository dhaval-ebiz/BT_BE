/**
 * Generic error types for consistent error handling across the application
 */

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  status?: string;
  errors?: unknown[];
}

export interface DatabaseError {
  code?: string;
  message: string;
  detail?: string;
  constraint?: string;
}

export interface ValidationError {
  path?: string;
  message: string;
  type?: string;
}

export interface JWTError {
  name: string;
  message: string;
  expiredAt?: Date;
}

export interface MulterError {
  code: string;
  field?: string;
  message?: string;
}

/**
 * Type guard for checking if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof Error;
}

/**
 * Type guard for checking if an error is a database error
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return typeof error === 'object' && error !== null && 'code' in error;
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Safely extract error details for logging
 */
export function getErrorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  if (typeof error === 'object' && error !== null) {
    return error as Record<string, unknown>;
  }
  return { message: String(error) };
}

/**
 * Express request handler function type
 */
export type RequestHandler = (
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction
) => void | Promise<void>;
