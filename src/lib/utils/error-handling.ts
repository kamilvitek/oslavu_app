import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Custom error classes for better error handling
 */
export class DatabaseError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string, public value?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ApiError extends Error {
  constructor(
    message: string, 
    public statusCode: number = 500, 
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class SyncError extends Error {
  constructor(message: string, public source?: string, public retryable: boolean = true) {
    super(message);
    this.name = 'SyncError';
  }
}

/**
 * Error handling utilities
 */
export class ErrorHandler {
  /**
   * Handle Zod validation errors
   */
  static handleValidationError(error: z.ZodError): NextResponse {
    const formattedErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      received: (err as any).received
    }));

    return NextResponse.json({
      success: false,
      error: 'Validation failed',
      details: formattedErrors,
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }

  /**
   * Handle database errors
   * Never exposes sensitive database structure or query details
   */
  static handleDatabaseError(error: any): NextResponse {
    // Log full error details server-side only
    console.error('Database error:', {
      code: error?.code,
      message: error?.message,
      // Never log full error object or stack traces in production
      ...(process.env.NODE_ENV === 'development' && { fullError: error })
    });

    // Supabase specific error handling
    if (error.code) {
      switch (error.code) {
        case 'PGRST116':
          return NextResponse.json({
            success: false,
            error: 'Resource not found',
            code: 'NOT_FOUND',
            timestamp: new Date().toISOString()
          }, { status: 404 });

        case '23505':
          return NextResponse.json({
            success: false,
            error: 'Duplicate entry',
            code: 'DUPLICATE_ENTRY',
            // Never expose database details in production
            details: process.env.NODE_ENV === 'development' ? error.details : undefined,
            timestamp: new Date().toISOString()
          }, { status: 409 });

        case '23503':
          return NextResponse.json({
            success: false,
            error: 'Invalid reference',
            code: 'FOREIGN_KEY_VIOLATION',
            // Never expose database details in production
            details: process.env.NODE_ENV === 'development' ? error.details : undefined,
            timestamp: new Date().toISOString()
          }, { status: 400 });

        case '42501':
          return NextResponse.json({
            success: false,
            error: 'Insufficient privileges',
            code: 'INSUFFICIENT_PRIVILEGES',
            timestamp: new Date().toISOString()
          }, { status: 403 });

        default:
          return NextResponse.json({
            success: false,
            error: 'Database operation failed',
            code: error.code,
            // Never expose internal error messages in production
            message: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
          }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Database error',
      message: 'A database operation failed',
      code: 'DATABASE_ERROR',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }

  /**
   * Handle API errors
   */
  static handleApiError(error: ApiError): NextResponse {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
      timestamp: new Date().toISOString()
    }, { status: error.statusCode });
  }

  /**
   * Handle sync errors
   */
  static handleSyncError(error: SyncError): NextResponse {
    const statusCode = error.retryable ? 503 : 500;
    
    return NextResponse.json({
      success: false,
      error: 'Data synchronization failed',
      message: error.message,
      source: error.source,
      retryable: error.retryable,
      timestamp: new Date().toISOString()
    }, { status: statusCode });
  }

  /**
   * Handle generic errors
   * Never exposes sensitive information like stack traces or internal details
   */
  static handleGenericError(error: any): NextResponse {
    // Log full error details server-side only (for debugging)
    console.error('Unexpected error:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      // Never log stack traces or sensitive data in production logs
      ...(process.env.NODE_ENV === 'development' && { stack: error?.stack })
    });

    // Check if it's a known error type
    if (error instanceof ValidationError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Invalid input provided',
        field: error.field,
        // Never expose actual values in production
        value: process.env.NODE_ENV === 'development' ? error.value : undefined,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    if (error instanceof DatabaseError) {
      return this.handleDatabaseError(error);
    }

    if (error instanceof ApiError) {
      return this.handleApiError(error);
    }

    if (error instanceof SyncError) {
      return this.handleSyncError(error);
    }

    // Handle network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return NextResponse.json({
        success: false,
        error: 'Network error',
        message: 'Unable to connect to external service',
        code: 'NETWORK_ERROR',
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }

    // Handle timeout errors
    if (error.code === 'ETIMEDOUT') {
      return NextResponse.json({
        success: false,
        error: 'Request timeout',
        message: 'The request took too long to complete',
        code: 'TIMEOUT',
        timestamp: new Date().toISOString()
      }, { status: 408 });
    }

    // Default error response - never expose internal error details
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }

  /**
   * Wrap async functions with error handling
   */
  static async withErrorHandling<T>(
    fn: () => Promise<T>,
    context?: string
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (context) {
        console.error(`Error in ${context}:`, error);
      }
      throw error;
    }
  }

  /**
   * Retry function with exponential backoff
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    context?: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          if (context) {
            console.error(`Failed after ${maxRetries} attempts in ${context}:`, lastError);
          }
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`Attempt ${attempt} failed in ${context || 'operation'}, retrying in ${delay}ms:`, error);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Validate and sanitize input data
   */
  static validateInput<T>(
    data: unknown,
    schema: z.ZodSchema<T>,
    context?: string
  ): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = context 
          ? `Validation failed for ${context}: ${error.errors.map(e => e.message).join(', ')}`
          : `Validation failed: ${error.errors.map(e => e.message).join(', ')}`;
        throw new ValidationError(message);
      }
      throw error;
    }
  }

  /**
   * Safe JSON parsing with error handling
   */
  static safeJsonParse<T>(json: string, fallback?: T): T | null {
    try {
      return JSON.parse(json);
    } catch (error) {
      console.warn('Failed to parse JSON:', error);
      return fallback || null;
    }
  }

  /**
   * Safe async operation with timeout
   */
  static async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    context?: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms${context ? ` in ${context}` : ''}`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Log error with context
   * Never logs sensitive information like API keys, tokens, or user data
   */
  static logError(error: any, context: string, additionalData?: any): void {
    // Sanitize additional data to remove sensitive information
    const sanitizedAdditionalData = additionalData ? this.sanitizeLogData(additionalData) : undefined;
    
    const errorInfo = {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      context,
      timestamp: new Date().toISOString(),
      // Only include stack traces in development
      ...(process.env.NODE_ENV === 'development' && { stack: error?.stack }),
      ...sanitizedAdditionalData
    };

    console.error('Error logged:', errorInfo);
  }

  /**
   * Sanitize log data to remove sensitive information
   */
  private static sanitizeLogData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'apiKey', 'apikey', 'authorization', 'auth'];
    const sanitized = { ...data };

    for (const key in sanitized) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeLogData(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Create standardized error response
   */
  static createErrorResponse(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any
  ): NextResponse {
    return NextResponse.json({
      success: false,
      error: message,
      code,
      details,
      timestamp: new Date().toISOString()
    }, { status: statusCode });
  }
}

/**
 * Middleware for error handling in API routes
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      ErrorHandler.logError(error, 'API Route');
      throw error;
    }
  };
}

/**
 * Rate limiting error
 */
export class RateLimitError extends ApiError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
    this.name = 'RateLimitError';
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_REQUIRED');
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends ApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'INSUFFICIENT_PERMISSIONS');
    this.name = 'AuthorizationError';
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error (e.g., duplicate resource)
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}
