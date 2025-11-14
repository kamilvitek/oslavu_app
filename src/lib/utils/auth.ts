/**
 * Authentication Utilities
 * Provides authentication helpers for API routes
 */

import { NextRequest } from 'next/server';

/**
 * Verify API key authentication
 * For public endpoints that need basic protection
 */
export function verifyApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const expectedApiKey = process.env.API_KEY;

  // If no API key is configured, allow access (for development)
  if (!expectedApiKey) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ API_KEY not configured in production - endpoint is unprotected');
      return false;
    }
    return true; // Allow in development if not configured
  }

  return apiKey === expectedApiKey;
}

/**
 * Verify Bearer token authentication
 */
export function verifyBearerToken(request: NextRequest, expectedToken?: string): boolean {
  const authHeader = request.headers.get('authorization');
  const token = expectedToken || process.env.API_TOKEN;

  if (!token) {
    return false;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const providedToken = authHeader.substring(7);
  return providedToken === token;
}

/**
 * Create authentication error response
 */
export function createAuthErrorResponse(message: string = 'Authentication required') {
  return Response.json(
    {
      error: 'Unauthorized',
      message,
    },
    { status: 401 }
  );
}

/**
 * Middleware to require API key authentication
 */
export function requireApiKey(request: NextRequest): Response | null {
  if (!verifyApiKey(request)) {
    return createAuthErrorResponse('Valid API key required');
  }
  return null;
}

/**
 * Middleware to require Bearer token authentication
 */
export function requireBearerToken(request: NextRequest, token?: string): Response | null {
  if (!verifyBearerToken(request, token)) {
    return createAuthErrorResponse('Valid Bearer token required');
  }
  return null;
}

