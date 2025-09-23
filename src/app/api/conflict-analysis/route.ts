import { NextRequest, NextResponse } from 'next/server';
import { eventQueryService } from '@/lib/services/event-queries';
import { eventStorageService } from '@/lib/services/event-storage';
import { serverDatabaseService } from '@/lib/supabase';
import { z } from 'zod';

const ConflictAnalysisSchema = z.object({
  city: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  preferred_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(10),
  expected_attendees: z.number().int().min(1).max(1000000).default(100),
  date_range: z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  }).optional(),
  enable_advanced_analysis: z.boolean().optional().default(false)
});

/**
 * POST /api/conflict-analysis - Enhanced conflict analysis using stored data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ConflictAnalysisSchema.parse(body);

    const { city, category, preferred_dates, expected_attendees, date_range, enable_advanced_analysis } = validatedData;

    // Determine date range for analysis
    const startDate = date_range?.start || preferred_dates[0];
    const endDate = date_range?.end || preferred_dates[preferred_dates.length - 1];

    // Get events for conflict analysis
    const events = await eventQueryService.getEventsForConflictAnalysis(
      city,
      startDate,
      endDate,
      category,
      Math.max(50, expected_attendees / 10) // Minimum 50 attendees or 10% of expected
    );

    // Analyze conflicts for each preferred date
    const conflictScores = [];
    for (const date of preferred_dates) {
      try {
        const conflictScore = await eventQueryService.detectConflicts(
          city,
          date,
          category,
          expected_attendees
        );
        conflictScores.push(conflictScore);
      } catch (error) {
        console.warn(`Failed to analyze conflicts for date ${date}:`, error);
        conflictScores.push({
          date,
          score: 0,
          risk: 'low' as const,
          conflicting_events: [],
          recommendation: 'Unable to analyze conflicts for this date'
        });
      }
    }

    // Get additional insights if advanced analysis is enabled
    let additionalInsights = null;
    if (enable_advanced_analysis) {
      try {
        // Get high-impact events in the area
        const highImpactEvents = await eventQueryService.getHighImpactEvents(
          city,
          startDate,
          endDate,
          expected_attendees,
          20 // Limit to top 20
        );

        // Get venue popularity analysis
        const venuePopularity = await eventQueryService.getVenuePopularity(
          city,
          startDate,
          endDate
        );

        // Get similar events
        const similarEvents = await eventStorageService.getEventsByCategory(
          category,
          city,
          startDate,
          endDate,
          10
        );

        additionalInsights = {
          high_impact_events: highImpactEvents,
          venue_popularity: venuePopularity.slice(0, 10), // Top 10 venues
          similar_events: similarEvents,
          total_events_in_period: events.length,
          analysis_date_range: { start: startDate, end: endDate }
        };
      } catch (error) {
        console.warn('Failed to get additional insights:', error);
      }
    }

    // Calculate overall risk assessment
    const averageScore = conflictScores.reduce((sum, score) => sum + score.score, 0) / conflictScores.length;
    const maxScore = Math.max(...conflictScores.map(score => score.score));
    const highRiskDates = conflictScores.filter(score => score.risk === 'high').length;
    
    const overallRisk = highRiskDates > 0 ? 'high' : 
                      averageScore > 10 ? 'medium' : 'low';

    // Generate recommendations
    const recommendations = [];
    if (overallRisk === 'high') {
      recommendations.push('Consider alternative dates or venues due to high conflict risk');
    } else if (overallRisk === 'medium') {
      recommendations.push('Monitor competing events and consider marketing strategies');
    } else {
      recommendations.push('Low conflict risk - good time for your event');
    }

    if (highRiskDates > 0) {
      recommendations.push(`${highRiskDates} of your preferred dates have high conflict risk`);
    }

    // Prepare analysis data for response
    const analysisData = {
      analysis_id: `analysis_${Date.now()}`,
      city,
      category,
      expected_attendees,
      preferred_dates,
      conflict_scores: conflictScores,
      overall_assessment: {
        risk_level: overallRisk,
        average_score: Math.round(averageScore * 10) / 10,
        max_score: maxScore,
        high_risk_dates: highRiskDates,
        total_dates_analyzed: preferred_dates.length
      },
      recommendations,
      additional_insights: additionalInsights,
      analysis_metadata: {
        events_analyzed: events.length,
        date_range: { start: startDate, end: endDate },
        analysis_timestamp: new Date().toISOString(),
        advanced_analysis_enabled: enable_advanced_analysis
      }
    };

    // Save analysis results to database
    try {
      console.log('Saving conflict analysis results to database...');
      
      const analysisRecord = {
        user_id: null, // Anonymous analysis for now
        results: {
          // Store all analysis data in the results JSONB field
          subcategory: null,
          date_range_start: startDate,
          date_range_end: endDate,
          ...analysisData
        }
      };

      const { data: savedAnalysis, error: saveError } = await serverDatabaseService.executeWithRetry(async () => {
        const result = await serverDatabaseService.getClient()
          .from('conflict_analyses')
          .insert(analysisRecord)
          .select()
          .single();
        return result;
      });

      if (saveError) {
        console.error('Failed to save conflict analysis to database:', saveError);
      } else {
        console.log('Conflict analysis saved to database with ID:', savedAnalysis?.id);
        analysisData.analysis_id = savedAnalysis?.id || analysisData.analysis_id;
      }
    } catch (saveError) {
      console.error('Error saving conflict analysis to database:', saveError);
    }

    return NextResponse.json({
      success: true,
      data: analysisData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in conflict analysis:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid analysis parameters',
        details: error.errors,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Conflict analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
