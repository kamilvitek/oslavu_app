import { NextRequest, NextResponse } from 'next/server';
import { eventStorageService } from '@/lib/services/event-storage';
import { eventQueryService } from '@/lib/services/event-queries';
import { EventSearchSchema, CreateEventSchema } from '@/lib/types/events';
import { z } from 'zod';

/**
 * GET /api/events - Search and retrieve events
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const queryParams = {
      query: searchParams.get('query') || undefined,
      city: searchParams.get('city') || undefined,
      category: searchParams.get('category') || undefined,
      source: searchParams.get('source') || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      min_attendees: searchParams.get('min_attendees') ? parseInt(searchParams.get('min_attendees')!) : undefined,
      max_attendees: searchParams.get('max_attendees') ? parseInt(searchParams.get('max_attendees')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    // Validate parameters
    const validatedParams = EventSearchSchema.parse(queryParams);

    // Search events
    const events = await eventStorageService.searchEvents(validatedParams);

    return NextResponse.json({
      success: true,
      data: events,
      pagination: {
        limit: validatedParams.limit,
        offset: validatedParams.offset,
        total: events.length,
        has_more: events.length === validatedParams.limit
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    
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
      error: 'Failed to fetch events',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * POST /api/events - Create a new event
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = CreateEventSchema.parse(body);

    // Create event
    const saveResult = await eventStorageService.saveEvents([validatedData]);

    if (saveResult.errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create event',
        details: saveResult.errors,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        created: saveResult.created,
        updated: saveResult.updated,
        skipped: saveResult.skipped
      },
      message: 'Event created successfully',
      timestamp: new Date().toISOString()
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid event data',
        details: error.errors,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to create event',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
