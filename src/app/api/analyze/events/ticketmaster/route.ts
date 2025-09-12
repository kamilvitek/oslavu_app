// src/app/api/events/ticketmaster/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ticketmasterService } from '@/lib/services/ticketmaster';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const city = searchParams.get('city');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');
    const keyword = searchParams.get('keyword');
    const radius = searchParams.get('radius');
    const useComprehensiveFallback = searchParams.get('useComprehensiveFallback') === 'true';
    const page = parseInt(searchParams.get('page') || '0');
    const size = parseInt(searchParams.get('size') || '200'); // Ticketmaster's maximum page size

    console.log('API Request params:', { city, startDate, endDate, category, keyword, radius, useComprehensiveFallback, page, size });

    if (!city && !keyword) {
      return NextResponse.json(
        { error: 'Either city or keyword parameter is required' },
        { status: 400 }
      );
    }

    // Check if API key is configured
    if (!process.env.TICKETMASTER_API_KEY) {
      console.error('TICKETMASTER_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Ticketmaster API key is not configured' },
        { status: 500 }
      );
    }

    let events;

    // Check if this is a comprehensive search request
    const isComprehensiveSearch = searchParams.get('comprehensive') === 'true';

    if (isComprehensiveSearch && city && startDate && endDate) {
      // Use the new comprehensive multi-strategy search
      events = await ticketmasterService.getEventsComprehensive(
        city,
        startDate,
        endDate,
        category || undefined
      );
    } else if (keyword) {
      // Search by keyword
      events = await ticketmasterService.searchEvents(
        keyword,
        city || undefined,
        startDate || undefined,
        endDate || undefined
      );
    } else if (city && startDate && endDate) {
      // Get events for city and date range with radius and fallback options
      if (useComprehensiveFallback) {
        events = await ticketmasterService.getEventsWithComprehensiveFallback(
          city,
          startDate,
          endDate,
          category || undefined,
          radius || '50'
        );
      } else if (radius) {
        events = await ticketmasterService.getEventsWithRadius(
          city,
          startDate,
          endDate,
          radius,
          category || undefined
        );
      } else {
        events = await ticketmasterService.getEventsForCity(
          city,
          startDate,
          endDate,
          category || undefined
        );
      }
    } else {
      // Get general events
      const result = await ticketmasterService.getEvents({
        city: city || undefined,
        startDateTime: startDate ? `${startDate}T00:00:00Z` : undefined,
        endDateTime: endDate ? `${endDate}T23:59:59Z` : undefined,
        classificationName: category || undefined,
        page,
        size,
      });
      events = result.events;
    }

    return NextResponse.json({
      data: events,
      count: events.length,
      message: 'Events fetched successfully'
    });

  } catch (error) {
    console.error('Ticketmaster API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch events',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Example usage endpoints:
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'getVenue':
        const venue = await ticketmasterService.getVenue(params.venueId);
        return NextResponse.json({ data: venue });

      case 'getClassifications':
        const classifications = await ticketmasterService.getClassifications();
        return NextResponse.json({ data: classifications });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Ticketmaster API error:', error);
    return NextResponse.json(
      { error: 'API request failed' },
      { status: 500 }
    );
  }
}