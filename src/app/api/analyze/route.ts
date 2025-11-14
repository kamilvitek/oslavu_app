// src/app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { conflictAnalysisService } from '@/lib/services/conflict-analysis';
import { AnalysisRequest } from '@/types';
import { sanitizeApiParameters, logSanitizationResults } from '@/lib/utils/input-sanitization';
import { serverDatabaseService } from '@/lib/supabase';
import { withRateLimit, rateLimitConfigs, getClientIdentifier } from '@/lib/utils/rate-limiting';

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
    const body: AnalysisRequest = await request.json();
    
    // Sanitize input parameters
    const sanitizationResult = sanitizeApiParameters(body as unknown as Record<string, unknown>);
    logSanitizationResults(body as unknown as Record<string, unknown>, sanitizationResult, 'Analysis Request Parameters');
    
    if (!sanitizationResult.isValid) {
      return NextResponse.json(
        {
          error: 'Parameter validation failed',
          details: sanitizationResult.errors,
          warnings: sanitizationResult.warnings
        },
        { status: 400 }
      );
    }
    
    const sanitizedBody = sanitizationResult.sanitizedParams;
    
    // Validate required fields
    if (!sanitizedBody.city || !sanitizedBody.category || !sanitizedBody.expectedAttendees || !sanitizedBody.dateRange) {
      return NextResponse.json(
        { error: 'Missing required fields: city, category, expectedAttendees, dateRange' },
        { status: 400 }
      );
    }

    // Validate date range using sanitized data
    const analysisStartDate = new Date(sanitizedBody.dateRange.start);
    const analysisEndDate = new Date(sanitizedBody.dateRange.end);
    
    if (analysisStartDate >= analysisEndDate) {
      return NextResponse.json(
        { error: 'Analysis start date must be before analysis end date' },
        { status: 400 }
      );
    }

    // Validate maximum date range: 31 days
    const dateRangeDays = Math.ceil((analysisEndDate.getTime() - analysisStartDate.getTime()) / (1000 * 60 * 60 * 24));
    if (dateRangeDays > 31) {
      return NextResponse.json(
        { error: `Analysis date range cannot exceed 31 days. Current range: ${dateRangeDays} days` },
        { status: 400 }
      );
    }

    // Allow dates from 30 days ago onwards for testing purposes
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (analysisStartDate < thirtyDaysAgo) {
      return NextResponse.json(
        { error: 'Analysis start date cannot be more than 30 days in the past' },
        { status: 400 }
      );
    }

    // Perform conflict analysis
    console.log('Starting conflict analysis for:', {
      city: sanitizedBody.city,
      category: sanitizedBody.category,
      dateRange: sanitizedBody.dateRange,
    });

    // Map incoming request to service params using sanitized data
    const preferredStart = sanitizedBody.preferredDates?.[0] || sanitizedBody.dateRange.start;
    const preferredEnd = sanitizedBody.preferredDates?.[1] || sanitizedBody.dateRange.end;

    const analysis = await conflictAnalysisService.analyzeConflicts({
      city: sanitizedBody.city,
      category: sanitizedBody.category,
      subcategory: sanitizedBody.subcategory,
      expectedAttendees: sanitizedBody.expectedAttendees,
      startDate: preferredStart,
      endDate: preferredEnd,
      dateRangeStart: sanitizedBody.dateRange.start,
      dateRangeEnd: sanitizedBody.dateRange.end,
      enableAdvancedAnalysis: true, // ENABLED for audience overlap analysis
      enablePerplexityResearch: sanitizedBody.enablePerplexityResearch || false, // Optional Perplexity research
      useComprehensiveFallback: false, // DISABLED for performance - was causing 5min delays
    });
    
    console.log('Analysis completed:', {
      recommendations: analysis.recommendedDates.length,
      highRisk: analysis.highRiskDates.length,
      eventsConsidered: analysis.allEvents.length,
      avgScore: (() => {
        const all = [...analysis.recommendedDates, ...analysis.highRiskDates];
        if (all.length === 0) return 0;
        return all.reduce((sum, r) => sum + r.conflictScore, 0) / all.length;
      })(),
    });

    // Save analysis results to database
    try {
      console.log('Saving analysis results to database...');
      
      // Create analysis record for database (using actual schema)
      const averageConflictScore = (() => {
        const all = [...analysis.recommendedDates, ...analysis.highRiskDates];
        if (all.length === 0) return 0;
        return all.reduce((sum, r) => sum + r.conflictScore, 0) / all.length;
      })();

      const analysisRecord = {
        user_id: null, // Anonymous analysis for now
        // Top-level fields matching database schema
        city: sanitizedBody.city,
        category: sanitizedBody.category,
        subcategory: sanitizedBody.subcategory || null, // Save subcategory at top level
        preferred_dates: [preferredStart, preferredEnd],
        expected_attendees: sanitizedBody.expectedAttendees,
        date_range_start: sanitizedBody.dateRange.start,
        date_range_end: sanitizedBody.dateRange.end,
        results: {
          // Store all analysis data in the results JSONB field
          city: sanitizedBody.city,
          category: sanitizedBody.category,
          subcategory: sanitizedBody.subcategory || null,
          preferred_dates: [preferredStart, preferredEnd],
          expected_attendees: sanitizedBody.expectedAttendees,
          date_range_start: sanitizedBody.dateRange.start,
          date_range_end: sanitizedBody.dateRange.end,
          request_data: {
            city: sanitizedBody.city,
            category: sanitizedBody.category,
            expected_attendees: sanitizedBody.expectedAttendees,
            date_range: sanitizedBody.dateRange,
            preferred_dates: [preferredStart, preferredEnd]
          },
          conflict_score: averageConflictScore,
          recommendedDates: analysis.recommendedDates,
          highRiskDates: analysis.highRiskDates,
          allEvents: analysis.allEvents,
          analysisDate: analysis.analysisDate,
          summary: {
            totalRecommendations: analysis.recommendedDates.length,
            totalHighRiskDates: analysis.highRiskDates.length,
            totalEventsAnalyzed: analysis.allEvents.length,
            averageConflictScore: averageConflictScore
          }
        }
      };

      // Insert into conflict_analyses table
      const { data: savedAnalysis, error: saveError } = await serverDatabaseService.executeWithRetry(async () => {
        const result = await serverDatabaseService.getClient()
          .from('conflict_analyses')
          .insert(analysisRecord)
          .select()
          .single();
        return result;
      });

      if (saveError) {
        console.error('Failed to save analysis to database:', saveError);
        // Continue with response even if save fails
      } else {
        console.log('Analysis saved to database with ID:', savedAnalysis?.id);
      }
    } catch (saveError) {
      console.error('Error saving analysis to database:', saveError);
      // Continue with response even if save fails
    }

    return NextResponse.json({
      data: analysis,
      message: 'Analysis completed successfully'
    });

  } catch (error) {
    // Log error server-side only, without exposing sensitive details
    console.error('Analysis error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      ...(process.env.NODE_ENV === 'development' && { fullError: error })
    });
    
    // Handle specific API errors without exposing internal details
    if (error instanceof Error && error.message.includes('TICKETMASTER_API_KEY')) {
      return NextResponse.json(
        { error: 'External service configuration error' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Analysis failed',
        message: 'An error occurred while processing the analysis'
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    message: 'Conflict Analysis API is running',
    timestamp: new Date().toISOString(),
    services: {
      ticketmaster: !!process.env.TICKETMASTER_API_KEY,
      // Add other service checks here
    }
  });
}

// 