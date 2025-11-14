// src/app/api/perplexity-research/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { perplexityResearchService } from '@/lib/services/perplexity-research';
import { PerplexityResearchParams } from '@/types/perplexity';
import { z } from 'zod';
import { withRateLimit, rateLimitConfigs, getClientIdentifier } from '@/lib/utils/rate-limiting';

const PerplexityResearchSchema = z.object({
  city: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  subcategory: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expectedAttendees: z.number().int().min(1).max(1000000),
  dateRange: z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).optional(),
});

/**
 * POST /api/perplexity-research - Perplexity-powered event conflict research
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting (strict for expensive AI operations)
  const rateLimitResult = withRateLimit({
    ...rateLimitConfigs.strict,
    identifier: getClientIdentifier(request),
  });

  const rateLimitResponse = await rateLimitResult(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Only log environment check in development mode, without exposing key details
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 API Route - Environment Check:', {
        hasPerplexityKey: !!process.env.PERPLEXITY_API_KEY
      });
    }

    const body = await request.json();
    const validatedData = PerplexityResearchSchema.parse(body);

    const params: PerplexityResearchParams = {
      city: validatedData.city,
      category: validatedData.category,
      subcategory: validatedData.subcategory,
      date: validatedData.date,
      expectedAttendees: validatedData.expectedAttendees,
      dateRange: validatedData.dateRange,
    };

    const result = await perplexityResearchService.researchEventConflicts(params);

    if (!result) {
      return NextResponse.json({
        success: false,
        error: 'Perplexity research unavailable. API key may not be configured.',
        timestamp: new Date().toISOString(),
      }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // 5 min cache
      },
    });
  } catch (error) {
    console.error('Error in Perplexity research API:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Perplexity research failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * GET /api/perplexity-research - Health check endpoint (secured)
 * Only returns minimal information, no API key details
 */
export async function GET(request: NextRequest) {
  // Only allow in development mode, or require authentication in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      error: 'Not available in production'
    }, { status: 403 });
  }
  
  return NextResponse.json({
    status: 'ok',
    hasPerplexityKey: !!process.env.PERPLEXITY_API_KEY,
    nodeEnv: process.env.NODE_ENV,
  });
}

