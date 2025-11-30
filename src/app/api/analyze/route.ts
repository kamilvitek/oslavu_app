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
    if (!sanitizedBody.city || !sanitizedBody.category || !sanitizedBody.subcategory || !sanitizedBody.expectedAttendees || !sanitizedBody.dateRange) {
      return NextResponse.json(
        { error: 'Missing required fields: city, category, subcategory, expectedAttendees, dateRange' },
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

    // Get preferred dates (event dates) - these are what we need to validate
    const preferredStart = sanitizedBody.preferredDates?.[0] || sanitizedBody.dateRange.start;
    const preferredEnd = sanitizedBody.preferredDates?.[1] || sanitizedBody.dateRange.end;
    const preferredStartDate = new Date(preferredStart);
    const preferredEndDate = new Date(preferredEnd);
    
    // Validate that preferred start is before preferred end
    if (preferredStartDate >= preferredEndDate) {
      return NextResponse.json(
        { error: 'Event start date must be before event end date' },
        { status: 400 }
      );
    }

    // Validate maximum event duration: 31 days (this is the actual event length, not the analysis range)
    const eventDurationDays = Math.ceil((preferredEndDate.getTime() - preferredStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (eventDurationDays > 31) {
      return NextResponse.json(
        { error: `Event duration cannot exceed 31 days. Current event duration: ${eventDurationDays} days` },
        { status: 400 }
      );
    }

    // Validate that preferred dates are within the analysis range
    if (preferredStartDate < analysisStartDate || preferredEndDate > analysisEndDate) {
      return NextResponse.json(
        { error: 'Preferred event dates must be within the analysis date range' },
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
    // (preferredStart and preferredEnd already calculated above during validation)

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
      enableLLMRelevanceFilter: sanitizedBody.enableLLMRelevanceFilter || true, // Opt-in LLM relevance filtering
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
        category: sanitizedBody.category, // Top-level column for querying/filtering
        subcategory: sanitizedBody.subcategory || null, // Top-level column for querying/filtering
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
        // Handle schema cache errors gracefully
        if (saveError.code === 'PGRST204') {
          console.warn('⚠️ Database schema cache needs refresh. Analysis results not saved. Please refresh PostgREST schema cache in Supabase Dashboard (Settings → API → Refresh schema cache).');
        } else {
          console.error('Failed to save analysis to database:', saveError);
        }
        // Continue with response even if save fails - analysis is still valid
      } else {
        console.log('Analysis saved to database with ID:', savedAnalysis?.id);
      }
    } catch (saveError) {
      // Handle schema cache errors gracefully
      if (saveError instanceof Error && saveError.message.includes('PGRST204')) {
        console.warn('⚠️ Database schema cache needs refresh. Analysis results not saved. Please refresh PostgREST schema cache in Supabase Dashboard.');
      } else {
        console.error('Error saving analysis to database:', saveError);
      }
      // Continue with response even if save fails - analysis is still valid
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