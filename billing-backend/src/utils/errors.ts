/**
 * Error handling utilities for strict TypeScript typing
 * Replaces all `catch (error: any)` patterns with proper error handling
 */

/**
 * Type guard to check if a value is an Error instance
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Safely extracts the error message from an unknown error
 * @param error - The caught error (unknown type)
 * @param fallback - Fallback message if error message cannot be extracted
 * @returns The error message string
 */
export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error !== null && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
}

/**
 * Safely extracts the error stack from an unknown error
 * @param error - The caught error (unknown type)
 * @returns The error stack string or undefined
 */
export function getErrorStack(error: unknown): string | undefined {
  if (isError(error)) {
    return error.stack;
  }
  return undefined;
}

/**
 * Creates a standardized error response object
 * @param error - The caught error (unknown type)
 * @param context - Additional context for the error
 * @returns A standardized error object
 */
export function createErrorResponse(
  error: unknown,
  context?: string
): { message: string; context?: string; stack?: string } {
  return {
    message: getErrorMessage(error),
    context,
    stack: process.env.NODE_ENV === 'development' ? getErrorStack(error) : undefined,
  };
}

/**
 * Type for API error responses
 */
export interface ApiErrorType {
  success: false;
  message: string;
  error?: string;
  stack?: string;
}

/**
 * Creates a standardized API error response
 * @param error - The caught error (unknown type)
 * @param fallbackMessage - Fallback message for unknown errors
 * @returns API error response object
 */
export function createApiError(
  error: unknown,
  fallbackMessage = 'An unexpected error occurred'
): ApiErrorType {
  const message = getErrorMessage(error, fallbackMessage);
  const response: ApiErrorType = {
    success: false,
    message,
  };
  
  if (process.env.NODE_ENV === 'development') {
    response.stack = getErrorStack(error);
    if (isError(error) && error.message !== message) {
      response.error = error.message;
    }
  }
  
  return response;
}

/**
 * Wraps an async function with proper error handling
 * Useful for Express route handlers
 */
export function asyncHandler<T extends (...args: Parameters<T>) => Promise<ReturnType<T>>>(
  fn: T
): T {
  return ((...args: Parameters<T>) => {
    return Promise.resolve(fn(...args)).catch((error: unknown) => {
      // Re-throw with proper error typing
      throw isError(error) ? error : new Error(getErrorMessage(error));
    });
  }) as T;
}
