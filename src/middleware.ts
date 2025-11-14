import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Security headers middleware
 * Adds security headers to all responses to protect against common attacks
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers - use Record type for proper typing with conditional HSTS
  const securityHeaders: Record<string, string> = {
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // XSS Protection (legacy, but still useful)
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer Policy - control referrer information
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions Policy - restrict browser features
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    
    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: unsafe-eval may be needed for some libraries
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://api.openai.com https://api.firecrawl.dev https://api.perplexity.ai https://api.ticketmaster.com https://api.predicthq.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ].join('; '),
  };

  // Add HSTS header for HTTPS enforcement (only in production)
  if (process.env.NODE_ENV === 'production') {
    securityHeaders['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  // Apply security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

