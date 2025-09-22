import { NextRequest, NextResponse } from 'next/server';
import { eventStorageService } from '@/lib/services/event-storage';
import { eventQueryService } from '@/lib/services/event-queries';
import { z } from 'zod';

const CityEventsQuerySchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.string().optional(),
  source: z.enum(['ticketmaster', 'predicthq', 'meetup', 'manual', 'brno']).optional(),
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().min(0).default(0),
  upcoming_only: z.boolean().optional().default(false),
  high_impact_only: z.boolean().optional().default(false)
});

/**
 * GET /api/events/city/[city] - Get events by city
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { city: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const city = decodeURIComponent(params.city);
    
    // Parse and validate query parameters
    const queryParams = {
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      category: searchParams.get('category') || undefined,
      source: searchParams.get('source') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      upcoming_only: searchParams.get('upcoming_only') === 'true',
      high_impact_only: searchParams.get('high_impact_only') === 'true'
    };

    const validatedParams = CityEventsQuerySchema.parse(queryParams);

    let events;

    // Handle different query types
    if (validatedParams.upcoming_only) {
      // Get upcoming events (next 30 days)
      events = await eventQueryService.getUpcomingEvents(
        city,
        validatedParams.category,
        validatedParams.limit
      );
    } else if (validatedParams.high_impact_only) {
      // Get high-impact events
      const startDate = validatedParams.start_date || new Date().toISOString().split('T')[0];
      const endDate = validatedParams.end_date || (() => {
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 6);
        return futureDate.toISOString().split('T')[0];
      })();
      
      events = await eventQueryService.getHighImpactEvents(
        city,
        startDate,
        endDate,
        1000, // Minimum 1000 attendees
        validatedParams.limit
      );
    } else {
      // Regular city-based query
      events = await eventStorageService.getEventsByCity(
        city,
        validatedParams.start_date,
        validatedParams.end_date,
        validatedParams.category,
        validatedParams.limit,
        validatedParams.offset
      );
    }

    // Filter by source if specified
    if (validatedParams.source) {
      events = events.filter(event => event.source === validatedParams.source);
    }

    return NextResponse.json({
      success: true,
      data: {
        city,
        events,
        count: events.length,
        query_params: validatedParams
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching events for city:', error);
    
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
      error: 'Failed to fetch events for city',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
