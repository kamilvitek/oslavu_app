// src/app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { conflictAnalysisService } from '@/lib/services/conflict-analysis';
import { AnalysisRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();
    
    // Validate required fields
    if (!body.city || !body.category || !body.expectedAttendees || !body.dateRange) {
      return NextResponse.json(
        { error: 'Missing required fields: city, category, expectedAttendees, dateRange' },
        { status: 400 }
      );
    }

    // Validate date range
    const startDate = new Date(body.dateRange.start);
    const endDate = new Date(body.dateRange.end);
    
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    if (startDate < new Date()) {
      return NextResponse.json(
        { error: 'Start date cannot be in the past' },
        { status: 400 }
      );
    }

    // Perform conflict analysis
    console.log('Starting conflict analysis for:', {
      city: body.city,
      category: body.category,
      dateRange: body.dateRange,
    });

    // Map incoming request to service params
    const preferredStart = body.preferredDates?.[0] || body.dateRange.start;
    const preferredEnd = body.preferredDates?.[1] || preferredStart;

    const analysis = await conflictAnalysisService.analyzeConflicts({
      city: body.city,
      category: body.category,
      subcategory: body.subcategory,
      expectedAttendees: body.expectedAttendees,
      startDate: preferredStart,
      endDate: preferredEnd,
      dateRangeStart: body.dateRange.start,
      dateRangeEnd: body.dateRange.end,
      venue: body.venue,
      enableAdvancedAnalysis: body.enableAdvancedAnalysis,
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

    return NextResponse.json({
      data: analysis,
      message: 'Analysis completed successfully'
    });

  } catch (error) {
    console.error('Analysis error:', error);
    
    // Handle specific API errors
    if (error instanceof Error && error.message.includes('TICKETMASTER_API_KEY')) {
      return NextResponse.json(
        { error: 'Ticketmaster API configuration error' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Analysis failed',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : 'Unknown error') : 
          'Internal server error'
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