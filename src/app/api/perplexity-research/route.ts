// src/app/api/perplexity-research/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { perplexityResearchService } from '@/lib/services/perplexity-research';
import { PerplexityResearchParams } from '@/types/perplexity';
import { z } from 'zod';

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
  try {
    // Debug: Check environment variable directly in API route
    console.log('🔍 API Route - Environment Check:', {
      hasPerplexityKey: !!process.env.PERPLEXITY_API_KEY,
      keyLength: process.env.PERPLEXITY_API_KEY?.length || 0,
      keyPrefix: process.env.PERPLEXITY_API_KEY ? process.env.PERPLEXITY_API_KEY.substring(0, 8) + '...' : 'none',
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('PERPLEXITY') || k.includes('OPENAI')).join(', '),
    });

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
 * GET /api/perplexity-research - Debug endpoint to check API key
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    hasPerplexityKey: !!process.env.PERPLEXITY_API_KEY,
    keyLength: process.env.PERPLEXITY_API_KEY?.length || 0,
    keyPrefix: process.env.PERPLEXITY_API_KEY ? process.env.PERPLEXITY_API_KEY.substring(0, 8) + '...' : 'none',
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('PERPLEXITY') || k.includes('OPENAI')).join(', '),
    nodeEnv: process.env.NODE_ENV,
  });
}

