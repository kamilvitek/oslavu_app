// src/app/api/analyze/events/eventbrite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { eventbriteService } from '@/lib/services/eventbrite';
import { Event } from '@/types';

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
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '200'); // Increased from 50 to 200 (Eventbrite's max) for better event coverage

    console.log('Eventbrite API Request params:', { city, startDate, endDate, category, keyword, radius, useComprehensiveFallback, page, pageSize });

    if (!city && !keyword) {
      return NextResponse.json(
        { error: 'Either city or keyword parameter is required' },
        { status: 400 }
      );
    }

    // Check if private token is configured
    if (!process.env.EVENTBRITE_PRIVATE_TOKEN) {
      console.error('EVENTBRITE_PRIVATE_TOKEN is not configured');
      return NextResponse.json({
        success: true,
        data: {
          events: [],
          total: 0,
          source: 'eventbrite',
          message: 'Eventbrite API token not configured - using empty results'
        }
      });
    }

    let events: Event[];

    // Apply input optimizations for Eventbrite API
    let transformedParams = null;
    if (city && category && startDate && endDate) {
      try {
        console.log('🔧 Applying input optimizations for Eventbrite API');
        
        // Dynamic import to avoid module loading issues
        const { aiInputTransformerService } = await import('@/lib/services/ai-input-transformer');
        
        transformedParams = await aiInputTransformerService.transformForEventbrite({
          city,
          category,
          startDate,
          endDate,
          expectedAttendees: parseInt(searchParams.get('expectedAttendees') || '0') || undefined,
          venue: searchParams.get('venue') || undefined
        });
        console.log('🤖 Transformed Eventbrite params:', transformedParams);
      } catch (transformError) {
        console.error('🤖 Error in input transformation, using original params:', transformError);
        transformedParams = null; // Fall back to original params
      }
    }

    // Check if this is a comprehensive search request
    const isComprehensiveSearch = searchParams.get('comprehensive') === 'true';

    if (isComprehensiveSearch && city && startDate && endDate) {
      // Use the new comprehensive multi-strategy search with transformed params
      const searchCity = transformedParams?.location || city;
      const searchCategory = transformedParams?.categories ? 
        Object.entries({
          '101': 'Business',
          '102': 'Technology', 
          '103': 'Music',
          '105': 'Arts & Culture',
          '108': 'Sports',
          '110': 'Education'
        }).find(([key]) => key === transformedParams.categories)?.[1] || category : 
        category;
      
      events = await eventbriteService.getEventsComprehensive(
        searchCity,
        startDate,
        endDate,
        searchCategory || undefined
      );
    } else if (keyword || transformedParams?.q) {
      // Search by keyword (use transformed query if available)
      const searchKeyword = transformedParams?.q || keyword;
      const searchCity = transformedParams?.location || city;
      
      // Ensure we have a valid keyword string before calling searchEvents
      if (searchKeyword) {
        events = await eventbriteService.searchEvents(
          searchKeyword,
          searchCity || undefined,
          startDate || undefined,
          endDate || undefined
        );
      } else {
        // If no valid keyword, return empty results
        events = [];
      }
    } else {
      // Search by city and date range
      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: 'startDate and endDate are required when searching by city' },
          { status: 400 }
        );
      }

      // Get events for city and date range with radius and fallback options
      const searchCity = transformedParams?.location || city!;
      const searchRadius = transformedParams?.location_radius || radius || '50km';
      const searchCategory = transformedParams?.categories ? 
        Object.entries({
          '101': 'Business',
          '102': 'Technology', 
          '103': 'Music',
          '105': 'Arts & Culture',
          '108': 'Sports',
          '110': 'Education'
        }).find(([key]) => key === transformedParams.categories)?.[1] || category : 
        category;

      if (useComprehensiveFallback) {
        events = await eventbriteService.getEventsWithComprehensiveFallback(
          searchCity,
          startDate,
          endDate,
          searchCategory || undefined,
          searchRadius
        );
      } else if (radius || transformedParams?.location_radius) {
        events = await eventbriteService.getEventsWithRadius(
          searchCity,
          startDate,
          endDate,
          searchRadius,
          searchCategory || undefined
        );
      } else {
        events = await eventbriteService.getEventsForCity(
          searchCity,
          startDate,
          endDate,
          searchCategory || undefined
        );
      }
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
    
    // Log additional context for debugging
    console.error('Eventbrite API Error Context:', {
      url: request.url,
      searchParams: Object.fromEntries(new URL(request.url).searchParams),
      timestamp: new Date().toISOString()
    });
    
    // Return empty results instead of failing to keep the analysis working
    return NextResponse.json({
      success: true,
      data: {
        events: [],
        total: 0,
        source: 'eventbrite',
        error: 'Eventbrite API temporarily unavailable',
        timestamp: new Date().toISOString()
      }
    });
  }
}
