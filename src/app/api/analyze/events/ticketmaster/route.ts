// src/app/api/analyze/events/ticketmaster/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ticketmasterService } from '@/lib/services/ticketmaster';
import { Event } from '@/types';

export async function GET(request: NextRequest) {
  try {
    // Log environment check
    console.log('🔧 Environment Check:', {
      NODE_ENV: process.env.NODE_ENV,
      hasTicketmasterKey: !!process.env.TICKETMASTER_API_KEY,
      keyLength: process.env.TICKETMASTER_API_KEY?.length || 0,
      firstChars: process.env.TICKETMASTER_API_KEY ? process.env.TICKETMASTER_API_KEY.substring(0, 8) + '...' : 'none'
    });
    
    const { searchParams } = new URL(request.url);
    
    // Log request parameters
    console.log('📥 Ticketmaster Route Request:', {
      method: request.method,
      url: request.url,
      searchParams: Object.fromEntries(searchParams),
      timestamp: new Date().toISOString()
    });
    
    const city = searchParams.get('city');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');
    const keyword = searchParams.get('keyword');
    const radius = searchParams.get('radius');
    const useComprehensiveFallback = searchParams.get('useComprehensiveFallback') === 'true';
    const page = parseInt(searchParams.get('page') || '0');
    const rawSize = parseInt(searchParams.get('size') || '199'); // Ticketmaster's maximum page size is 199
    const size = Math.min(rawSize, 199); // Ticketmaster's maximum page size is 199

    // Validate radius parameter and clean format
    let cleanRadius = radius;
    if (radius) {
      const radiusValue = parseInt(radius.replace(/[^\d]/g, ''));
      if (isNaN(radiusValue) || radiusValue < 0 || radiusValue > 19999) {
        return NextResponse.json(
          { 
            error: 'Invalid radius parameter',
            details: 'Radius must be a number between 0 and 19,999',
            received: radius,
            parsed: radiusValue
          },
          { status: 400 }
        );
      }
      cleanRadius = radiusValue.toString(); // Convert to clean number string
    }

    // Validate other parameters
    const validationErrors: string[] = [];
    
    // Validate size parameter
    if (rawSize < 1 || rawSize > 199) {
      validationErrors.push(`Size must be between 1 and 199, got ${rawSize}`);
    }
    
    // Validate page parameter
    if (page < 0) {
      validationErrors.push(`Page must be non-negative, got ${page}`);
    }
    
    // Validate date format if provided
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      validationErrors.push(`Invalid startDate format: ${startDate}. Expected YYYY-MM-DD format.`);
    }
    
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      validationErrors.push(`Invalid endDate format: ${endDate}. Expected YYYY-MM-DD format.`);
    }
    
    // Return validation errors if any
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Parameter validation failed',
          details: validationErrors,
          received: {
            city,
            startDate,
            endDate,
            category,
            keyword,
            radius,
            page,
            size: rawSize
          }
        },
        { status: 400 }
      );
    }

    console.log('🎟️ Ticketmaster API Request params:', { city, startDate, endDate, category, keyword, radius, useComprehensiveFallback, page, size });

    if (!city && !keyword) {
      return NextResponse.json(
        { error: 'Either city or keyword parameter is required' },
        { status: 400 }
      );
    }

    // Check if API key is configured and valid
    const apiKey = process.env.TICKETMASTER_API_KEY;
    const isValidKey = !!(apiKey && apiKey.length > 10 && !apiKey.includes('your_') && !apiKey.includes('here'));
    
    if (!isValidKey) {
      console.error('❌ TICKETMASTER_API_KEY is not set in environment variables');
      console.error('🎟️ Ticketmaster API key is not properly configured');
      console.error('🎟️ Current key status:', {
        exists: !!apiKey,
        length: apiKey?.length || 0,
        isPlaceholder: apiKey?.includes('your_') || apiKey?.includes('here') || false
      });
      console.error('🎟️ Please set TICKETMASTER_API_KEY in your .env.local file');
      console.error('🎟️ Get your API key from: https://developer.ticketmaster.com/');
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Ticketmaster API key not configured',
          data: {
            events: [],
            total: 0,
            source: 'ticketmaster',
            message: 'Ticketmaster API key not configured - please set TICKETMASTER_API_KEY in .env.local',
            debug: {
              keyExists: !!apiKey,
              keyLength: apiKey?.length || 0,
              isPlaceholder: apiKey?.includes('your_') || apiKey?.includes('here') || false,
              setupUrl: 'https://developer.ticketmaster.com/'
            }
          }
        },
        { status: 500 }
      );
    }

    let events: Event[] = [];

    try {
      // Apply input optimizations for Ticketmaster API
      let transformedParams = null;
      // Note: AI transformer temporarily disabled to ensure basic Ticketmaster integration works
      // TODO: Re-enable and optimize AI transformer after confirming basic functionality
      console.log('🔧 Using basic Ticketmaster integration (AI transformer disabled)');

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
        // Get events for city and date range - use direct getEvents method for better reliability
        const searchCity = transformedParams?.city || city;
        const searchRadius = transformedParams?.radius || cleanRadius;
        
        // Use the Ticketmaster service's category mapping (don't duplicate logic)
        const searchCategory = transformedParams?.classificationName || category;
        
        console.log('🎟️ Using direct getEvents method for city search:', {
          city: searchCity,
          startDate,
          endDate,
          category: searchCategory,
          radius: searchRadius,
          useComprehensiveFallback
        });
        
        // Use direct getEvents method for better reliability, with comprehensive fallback if needed
        const result = await ticketmasterService.getEvents({
          city: searchCity,
          countryCode: transformedParams?.countryCode,
          radius: searchRadius,
          postalCode: transformedParams?.postalCode,
          // marketId removed - using geographic parameters instead
          startDateTime: `${startDate}T00:00:00Z`,
          endDateTime: `${endDate}T23:59:59Z`,
          classificationName: searchCategory || undefined, // Only pass if not undefined
          size,
          page,
        });
        events = result.events;
        
        // If no events found and useComprehensiveFallback is enabled, try comprehensive fallback
        if (events.length === 0 && useComprehensiveFallback) {
          console.log('🎟️ Ticketmaster: No events found with direct search, trying comprehensive fallback');
          events = await ticketmasterService.getEventsWithComprehensiveFallback(
            searchCity,
            startDate,
            endDate,
            searchCategory || undefined,
            searchRadius || '50'
          );
        }
      } else {
        // Get general events with transformed params
        const searchCity = transformedParams?.city || city;
        const searchClassification = transformedParams?.classificationName || category;
        
        const result = await ticketmasterService.getEvents({
          city: searchCity || undefined,
          countryCode: transformedParams?.countryCode,
          // marketId removed - using geographic parameters instead
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
      
      // Handle specific error types gracefully
      if (serviceError instanceof Error) {
        // Rate limit errors
        if (serviceError.message.includes('rate limit') || serviceError.message.includes('429')) {
          console.warn('🎟️ Ticketmaster: Rate limit exceeded');
          return NextResponse.json({
            success: false,
            error: 'Rate limit exceeded',
            data: {
              events: [],
              total: 0,
              source: 'ticketmaster',
              message: 'Ticketmaster API rate limit exceeded. Please try again later.'
            }
          }, { status: 429 });
        }
        
        // API key errors
        if (serviceError.message.includes('API key') || serviceError.message.includes('401') || serviceError.message.includes('403')) {
          console.warn('🎟️ Ticketmaster: API key issue');
          return NextResponse.json({
            success: false,
            error: 'API key issue',
            data: {
              events: [],
              total: 0,
              source: 'ticketmaster',
              message: 'Ticketmaster API key issue. Please check configuration.'
            }
          }, { status: 401 });
        }
        
        // Network errors
        if (serviceError.message.includes('fetch') || serviceError.message.includes('network') || serviceError.message.includes('timeout')) {
          console.warn('🎟️ Ticketmaster: Network error');
          return NextResponse.json({
            success: false,
            error: 'Network error',
            data: {
              events: [],
              total: 0,
              source: 'ticketmaster',
              message: 'Network error connecting to Ticketmaster API. Please try again later.'
            }
          }, { status: 503 });
        }
      }
      
      // For other errors, return empty results instead of failing
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
    
    // Handle specific error types
    if (error instanceof Error) {
      // Parameter validation errors
      if (error.message.includes('validation') || error.message.includes('Invalid')) {
        return NextResponse.json({
          success: false,
          error: 'Parameter validation failed',
          details: error.message,
          timestamp: new Date().toISOString()
        }, { status: 400 });
      }
      
      // API errors
      if (error.message.includes('Ticketmaster API')) {
        return NextResponse.json({
          success: false,
          error: 'Ticketmaster API error',
          details: error.message,
          timestamp: new Date().toISOString()
        }, { status: 502 });
      }
    }
    
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

// Add POST method for testing basic connection
export async function POST(request: NextRequest) {
  try {
    const { city, startDate, endDate } = await request.json();
    
    console.log('🧪 Testing Ticketmaster connection with dates:', { city: city || 'New York', startDate, endDate });
    
    try {
      if (startDate && endDate) {
        // Test with date range
        const result = await ticketmasterService.getEvents({
          city: city || 'Prague',
          startDateTime: `${startDate}T00:00:00Z`,
          endDateTime: `${endDate}T23:59:59Z`,
          size: 5
        });
        return NextResponse.json({ 
          success: true, 
          data: result,
          message: 'Date range test successful'
        });
      } else {
        // Test basic connection
        const result = await ticketmasterService.testBasicConnection(city || 'New York');
        return NextResponse.json({ 
          success: true, 
          data: result,
          message: 'Basic connection test successful'
        });
      }
    } catch (error) {
      console.error('🧪 Test connection failed:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, { status: 500 });
    }
  } catch (error) {
    console.error('🧪 POST request error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid request format',
      details: error.message
    }, { status: 400 });
  }
}