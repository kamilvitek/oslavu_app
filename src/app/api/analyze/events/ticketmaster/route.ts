// src/app/api/analyze/events/ticketmaster/route.ts
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

    // Validate radius parameter
    if (radius) {
      const radiusValue = parseInt(radius.replace(/[^\d]/g, ''));
      if (isNaN(radiusValue) || radiusValue < 0 || radiusValue > 19999) {
        return NextResponse.json(
          { error: 'Radius must be a number between 0 and 19,999' },
          { status: 400 }
        );
      }
    }

    console.log('🎟️ Ticketmaster API Request params:', { city, startDate, endDate, category, keyword, radius, useComprehensiveFallback, page, size });

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
        { 
          success: true,
          data: {
            events: [],
            total: 0,
            source: 'ticketmaster',
            message: 'Ticketmaster API key not configured - using empty results'
          }
        },
        { status: 200 }
      );
    }

    let events = [];

    try {
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
            radius?.replace(/[^\d]/g, '') || '50'
          );
        } else if (radius) {
          events = await ticketmasterService.getEventsWithRadius(
            city,
            startDate,
            endDate,
            radius.replace(/[^\d]/g, ''),
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
    } catch (serviceError) {
      console.error('🎟️ Ticketmaster service error:', serviceError);
      // Return empty results instead of failing
      events = [];
    }

    console.log(`🎟️ Ticketmaster: Retrieved ${events.length} total events for ${city} with radius ${radius || '50'} miles (0 available)`);

    return NextResponse.json({
      success: true,
      data: {
        events,
        total: events.length,
        source: 'ticketmaster',
        searchParams: {
          city,
          startDate,
          endDate,
          category,
          keyword,
          page,
          size,
        },
      },
    });

  } catch (error) {
    console.error('🎟️ Ticketmaster API error:', error);
    
    // Log additional context for debugging
    console.error('🎟️ Ticketmaster API Error Context:', {
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
        source: 'ticketmaster',
        error: 'Ticketmaster API temporarily unavailable',
        timestamp: new Date().toISOString()
      }
    });
  }
}