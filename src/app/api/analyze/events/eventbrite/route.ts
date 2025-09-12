// src/app/api/analyze/events/eventbrite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { eventbriteService } from '@/lib/services/eventbrite';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const city = searchParams.get('city');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');
    const keyword = searchParams.get('keyword');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '200'); // Increased from 50 to 200 (Eventbrite's max) for better event coverage

    console.log('Eventbrite API Request params:', { city, startDate, endDate, category, keyword, page, pageSize });

    if (!city && !keyword) {
      return NextResponse.json(
        { error: 'Either city or keyword parameter is required' },
        { status: 400 }
      );
    }

    // Check if private token is configured
    if (!process.env.EVENTBRITE_PRIVATE_TOKEN) {
      console.error('EVENTBRITE_PRIVATE_TOKEN is not configured');
      return NextResponse.json(
        { error: 'Eventbrite private token is not configured' },
        { status: 500 }
      );
    }

    let events;

    if (keyword) {
      // Search by keyword
      events = await eventbriteService.searchEvents(
        keyword,
        city || undefined,
        startDate || undefined,
        endDate || undefined
      );
    } else {
      // Search by city and date range
      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: 'startDate and endDate are required when searching by city' },
          { status: 400 }
        );
      }

      events = await eventbriteService.getEventsForCity(
        city!,
        startDate,
        endDate,
        category || undefined
      );
    }

    console.log(`Found ${events.length} Eventbrite events`);

    return NextResponse.json({
      success: true,
      data: {
        events,
        total: events.length,
        source: 'eventbrite',
        searchParams: {
          city,
          startDate,
          endDate,
          category,
          keyword,
          page,
          pageSize,
        },
      },
    });

  } catch (error) {
    console.error('Eventbrite API Error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        source: 'eventbrite'
      },
      { status: 500 }
    );
  }
}
