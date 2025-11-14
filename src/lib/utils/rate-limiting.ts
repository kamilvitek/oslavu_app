/**
 * Rate Limiting Utilities
 * Provides rate limiting functionality for API routes
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (for single-instance deployments)
// For distributed deployments, use Redis or similar
const rateLimitStore: RateLimitStore = {};

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}, 60000); // Clean up every minute

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  identifier?: string; // Custom identifier (defaults to IP)
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when limit resets
  retryAfter?: number; // Seconds until retry is allowed
}

/**
 * Rate limit check
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param options - Rate limit options
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const { windowMs, maxRequests } = options;
  const now = Date.now();
  const key = identifier;

  // Get or create rate limit entry
  let entry = rateLimitStore[key];

  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired entry
    entry = {
      count: 0,
      resetTime: now + windowMs,
    };
    rateLimitStore[key] = entry;
  }

  // Increment count
  entry.count += 1;

  const remaining = Math.max(0, maxRequests - entry.count);
  const success = entry.count <= maxRequests;

  return {
    success,
    limit: maxRequests,
    remaining,
    reset: Math.floor(entry.resetTime / 1000),
    retryAfter: success ? undefined : Math.ceil((entry.resetTime - now) / 1000),
  };
}

/**
 * Get client identifier from request
 * Uses IP address, or X-Forwarded-For header if behind proxy
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from headers (when behind proxy)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP in the chain
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a default identifier
  return 'unknown';
}

/**
 * Rate limit middleware for Next.js API routes
 */
export function withRateLimit(
  options: RateLimitOptions
) {
  return async (request: Request): Promise<Response | null> => {
    const identifier = options.identifier || getClientIdentifier(request);
    const result = checkRateLimit(identifier, options);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again after ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.reset.toString(),
            'Retry-After': result.retryAfter?.toString() || '0',
          },
        }
      );
    }

    return null; // Continue with request
  };
}

/**
 * Predefined rate limit configurations
 */
export const rateLimitConfigs = {
  // Strict limit for expensive operations (AI calls)
  strict: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },
  // Standard limit for regular API calls
  standard: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
  },
  // Lenient limit for read-only operations
  lenient: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },
  // Very strict for authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  },
};

