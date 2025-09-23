import { NextRequest, NextResponse } from 'next/server';
import { serverDatabaseService } from '@/lib/supabase';

/**
 * GET /api/debug-db - Show exactly what's in the database
 */
export async function GET() {
  try {
    console.log('Fetching all conflict analyses for debugging...');
    
    const { data: analyses, error } = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('conflict_analyses')
        .select('*')
        .order('created_at', { ascending: false });
      return result;
    });

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch analyses',
        details: error.message
      }, { status: 500 });
    }

    // Format the data for easy reading
    const formattedAnalyses = analyses?.map(analysis => ({
      id: analysis.id,
      created_at: analysis.created_at,
      city: analysis.results?.city,
      category: analysis.results?.category,
      expected_attendees: analysis.results?.expected_attendees,
      conflict_score: analysis.conflict_score,
      has_recommendations: analysis.results?.recommendedDates?.length > 0,
      has_high_risk_dates: analysis.results?.highRiskDates?.length > 0,
      total_events_analyzed: analysis.results?.allEvents?.length || 0
    })) || [];

    return NextResponse.json({
      success: true,
      message: `Found ${analyses?.length || 0} conflict analyses in your Supabase database`,
      data: {
        total_count: analyses?.length || 0,
        analyses: formattedAnalyses,
        raw_data: analyses // Include full data for debugging
      },
      instructions: {
        where_to_look: "Go to your Supabase dashboard > Table Editor > conflict_analyses table",
        what_to_look_for: "Records with user_id: null and results containing your analysis data",
        note: "The analysis data is stored in the 'results' JSONB column"
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug database error:', error);
    return NextResponse.json({
      success: false,
      error: 'Debug database failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
