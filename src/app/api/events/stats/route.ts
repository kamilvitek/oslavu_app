import { NextRequest, NextResponse } from 'next/server';
import { eventStorageService } from '@/lib/services/event-storage';
import { eventQueryService } from '@/lib/services/event-queries';
import { databaseService } from '@/lib/supabase';
import { z } from 'zod';

const StatsQuerySchema = z.object({
  city: z.string().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  include_analytics: z.boolean().optional().default(false)
});

/**
 * GET /api/events/stats - Get database statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const queryParams = {
      city: searchParams.get('city') || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      include_analytics: searchParams.get('include_analytics') === 'true'
    };

    const validatedParams = StatsQuerySchema.parse(queryParams);

    // Get basic statistics
    const basicStats = await eventStorageService.getEventStats();
    
    // Get database health status
    const isHealthy = await databaseService.isHealthy();
    
    let analytics = null;
    if (validatedParams.include_analytics) {
      try {
        analytics = await eventQueryService.getEventAnalytics(
          validatedParams.city,
          validatedParams.start_date,
          validatedParams.end_date
        );
      } catch (error) {
        console.warn('Failed to get analytics:', error);
      }
    }

    // Get venue popularity if city is specified
    let venuePopularity = null;
    if (validatedParams.city) {
      try {
        venuePopularity = await eventQueryService.getVenuePopularity(
          validatedParams.city,
          validatedParams.start_date,
          validatedParams.end_date
        );
      } catch (error) {
        console.warn('Failed to get venue popularity:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        database_health: {
          is_healthy: isHealthy,
          last_check: new Date().toISOString()
        },
        statistics: basicStats,
        analytics,
        venue_popularity: venuePopularity,
        query_params: validatedParams
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching event statistics:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch event statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
