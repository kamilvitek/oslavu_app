// src/app/api/analyze/events/ticketmaster/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ticketmasterService } from '@/lib/services/ticketmaster';
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
    const page = parseInt(searchParams.get('page') || '0');
    const rawSize = parseInt(searchParams.get('size') || '200');
    const size = Math.min(rawSize, 199); // Ticketmaster's maximum page size is 199

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

    let events: Event[] = [];

    try {
      // Apply input optimizations for Ticketmaster API
      let transformedParams = null;
      if (city && category && startDate && endDate) {
        try {
          console.log('🔧 Applying input optimizations for Ticketmaster API');
          
          // Dynamic import to avoid module loading issues
          const { aiInputTransformerService } = await import('@/lib/services/ai-input-transformer');
          
          transformedParams = await aiInputTransformerService.transformForTicketmaster({
            city,
            category,
            startDate,
            endDate,
            expectedAttendees: parseInt(searchParams.get('expectedAttendees') || '0') || undefined,
            venue: searchParams.get('venue') || undefined
          });
          console.log('🤖 Transformed Ticketmaster params:', transformedParams);
        } catch (transformError) {
          console.error('🤖 Error in input transformation, using original params:', transformError);
          transformedParams = null; // Fall back to original params
        }
      }

      // Check if this is a comprehensive search request
      const isComprehensiveSearch = searchParams.get('comprehensive') === 'true';

      if (isComprehensiveSearch && city && startDate && endDate) {
        // Use the new comprehensive multi-strategy search with transformed params
        const searchCity = transformedParams?.city || city;
        const searchCategory = transformedParams?.classificationName ? 
          Object.entries({
            'Music': 'Music',
            'Sports': 'Sports', 
            'Arts & Theatre': 'Arts & Culture',
            'Miscellaneous': category
          }).find(([key]) => key === transformedParams.classificationName)?.[1] || category : 
          category;
        
        events = await ticketmasterService.getEventsComprehensive(
          searchCity,
          startDate,
          endDate,
          searchCategory || undefined
        );
      } else if (keyword || transformedParams?.keyword) {
        // Search by keyword with full transformed parameters
        const searchKeyword = transformedParams?.keyword || keyword;
        const searchCity = transformedParams?.city || city;
        
        // Ensure we have a valid keyword string before calling searchEvents
        if (searchKeyword) {
          // Use getEvents with full parameters instead of limited searchEvents
          const result = await ticketmasterService.getEvents({
            city: searchCity || undefined,
            countryCode: transformedParams?.countryCode,
            radius: transformedParams?.radius || radius?.replace(/[^\d]/g, '') || undefined,
            startDateTime: startDate ? `${startDate}T00:00:00Z` : undefined,
            endDateTime: endDate ? `${endDate}T23:59:59Z` : undefined,
            classificationName: transformedParams?.classificationName || category,
            keyword: searchKeyword,
            page,
            size,
          });
          events = result.events;
        } else {
          // If no valid keyword, return empty results
          events = [];
        }
      } else if (city && startDate && endDate) {
        // Get events for city and date range with radius and fallback options
        const searchCity = transformedParams?.city || city;
        const searchRadius = transformedParams?.radius || radius?.replace(/[^\d]/g, '') || '50';
        const searchCategory = transformedParams?.classificationName ? 
          Object.entries({
            'Music': 'Music',
            'Sports': 'Sports', 
            'Arts & Theatre': 'Arts & Culture',
            'Miscellaneous': category
          }).find(([key]) => key === transformedParams.classificationName)?.[1] || category : 
          category;
        
        if (useComprehensiveFallback) {
          events = await ticketmasterService.getEventsWithComprehensiveFallback(
            searchCity,
            startDate,
            endDate,
            searchCategory || undefined,
            searchRadius
          );
        } else if (radius || transformedParams?.radius) {
          events = await ticketmasterService.getEventsWithRadius(
            searchCity,
            startDate,
            endDate,
            searchRadius,
            searchCategory || undefined
          );
        } else {
          events = await ticketmasterService.getEventsForCity(
            searchCity,
            startDate,
            endDate,
            searchCategory || undefined
          );
        }
      } else {
        // Get general events with transformed params
        const searchCity = transformedParams?.city || city;
        const searchClassification = transformedParams?.classificationName || category;
        
        const result = await ticketmasterService.getEvents({
          city: searchCity || undefined,
          countryCode: transformedParams?.countryCode,
          marketId: transformedParams?.marketId,
          startDateTime: startDate ? `${startDate}T00:00:00Z` : undefined,
          endDateTime: endDate ? `${endDate}T23:59:59Z` : undefined,
          classificationName: searchClassification || undefined,
          keyword: transformedParams?.keyword,
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