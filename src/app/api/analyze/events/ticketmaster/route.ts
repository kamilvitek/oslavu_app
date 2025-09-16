// src/app/api/analyze/events/ticketmaster/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ticketmasterService } from '@/lib/services/ticketmaster';
import { Event } from '@/types';
import { sanitizeApiParameters, logSanitizationResults } from '@/lib/utils/input-sanitization';
import { getCityCountryCode } from '@/lib/utils/city-country-mapping';

// Helper function to create responses with proper headers
function createResponse(data: any, options: { status?: number } = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60', // 1 minute cache for performance
  });
  
  return NextResponse.json(data, { 
    status: options.status || 200,
    headers 
  });
}

// Define the interface for transformed parameters
interface TicketmasterTransformation {
  city?: string;
  countryCode?: string;
  postalCode?: string;
  classificationName?: string;
  keyword?: string;
  radius?: string;
}

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
    
    // Extract raw parameters
    const rawParams = Object.fromEntries(searchParams);
    
    // Log request parameters
    console.log('📥 Ticketmaster Route Request:', {
      method: request.method,
      url: request.url,
      searchParams: rawParams,
      timestamp: new Date().toISOString()
    });
    
    // Sanitize all input parameters
    const sanitizationResult = sanitizeApiParameters(rawParams);
    logSanitizationResults(rawParams, sanitizationResult, 'Ticketmaster Route Parameters');
    
    if (!sanitizationResult.isValid) {
      return createResponse(
        {
          error: 'Parameter validation failed',
          details: sanitizationResult.errors,
          warnings: sanitizationResult.warnings,
          received: rawParams
        },
        { status: 400 }
      );
    }
    
    const sanitizedParams = sanitizationResult.sanitizedParams;
    
    // Extract sanitized parameters
    const city = sanitizedParams.city;
    const startDate = sanitizedParams.startDate;
    const endDate = sanitizedParams.endDate;
    const category = sanitizedParams.category;
    const keyword = sanitizedParams.keyword;
    const radius = sanitizedParams.radius;
    const useComprehensiveFallback = searchParams.get('useComprehensiveFallback') === 'true';
    const page = sanitizedParams.page || 0;
    const size = Math.min(sanitizedParams.size || 199, 199); // Ticketmaster's maximum page size is 199

    // Use sanitized radius (already validated and converted)
    const cleanRadius = radius;

    console.log('🎟️ Ticketmaster API Request params:', { city, startDate, endDate, category, keyword, radius, useComprehensiveFallback, page, size });

    if (!city && !keyword) {
      return createResponse(
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
      
      return createResponse(
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
      let transformedParams: TicketmasterTransformation | null = null;
      // Note: AI transformer temporarily disabled to ensure basic Ticketmaster integration works
      // TODO: Re-enable and optimize AI transformer after confirming basic functionality
      console.log('🔧 Using basic Ticketmaster integration (AI transformer disabled)');

      // Check if this is a comprehensive search request
      const isComprehensiveSearch = searchParams.get('comprehensive') === 'true';

      if (isComprehensiveSearch && city && startDate && endDate) {
        // Use the new comprehensive multi-strategy search (AI transformer disabled, using original params)
        const searchCity = city;
        const searchCategory = category;
        
        events = await ticketmasterService.getEventsComprehensive(
          searchCity,
          startDate,
          endDate,
          searchCategory || undefined
        );
      } else if (keyword) {
        // Search by keyword (AI transformer disabled, using original params)
        const searchKeyword = keyword;
        const searchCity = city;
        
        // Ensure we have a valid keyword string before calling searchEvents
        if (searchKeyword) {
          // Use getEvents with full parameters instead of limited searchEvents
          const result = await ticketmasterService.getEvents({
            city: searchCity || undefined,
            countryCode: searchCity ? getCityCountryCode(searchCity) : undefined,
            radius: radius?.replace(/[^\d]/g, '') || undefined,
            startDateTime: startDate ? `${startDate}T00:00:00Z` : undefined,
            endDateTime: endDate ? `${endDate}T23:59:59Z` : undefined,
            classificationName: category || undefined,
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
        // Get events for city and date range - use direct getEvents method for better reliability (AI transformer disabled, using original params)
        const searchCity = city;
        const searchRadius = cleanRadius;
        
        // Use the Ticketmaster service's category mapping (don't duplicate logic)
        const searchCategory = category;
        
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
          countryCode: getCityCountryCode(searchCity), // Use proper country code mapping
          radius: searchRadius || undefined,
          postalCode: undefined,
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
        // Get general events (AI transformer disabled, using original params)
        const searchCity = city;
        const searchClassification = category;
        
        const result = await ticketmasterService.getEvents({
          city: searchCity || undefined,
          countryCode: searchCity ? getCityCountryCode(searchCity) : undefined,
          // marketId removed - using geographic parameters instead
          startDateTime: startDate ? `${startDate}T00:00:00Z` : undefined,
          endDateTime: endDate ? `${endDate}T23:59:59Z` : undefined,
          classificationName: searchClassification || undefined,
          keyword: keyword || undefined,
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
          return createResponse({
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
          return createResponse({
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
          return createResponse({
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

    return createResponse({
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
        return createResponse({
          success: false,
          error: 'Parameter validation failed',
          details: error.message,
          timestamp: new Date().toISOString()
        }, { status: 400 });
      }
      
      // API errors
      if (error.message.includes('Ticketmaster API')) {
        return createResponse({
          success: false,
          error: 'Ticketmaster API error',
          details: error.message,
          timestamp: new Date().toISOString()
        }, { status: 502 });
      }
    }
    
    // Return empty results instead of failing to keep the analysis working
    return createResponse({
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
        return createResponse({ 
          success: true, 
          data: result,
          message: 'Date range test successful'
        });
      } else {
        // Test basic connection
        const result = await ticketmasterService.testBasicConnection(city || 'New York');
        return createResponse({ 
          success: true, 
          data: result,
          message: 'Basic connection test successful'
        });
      }
    } catch (error) {
      console.error('🧪 Test connection failed:', error);
      return createResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      }, { status: 500 });
    }
  } catch (error) {
    console.error('🧪 POST request error:', error);
    return createResponse({ 
      success: false, 
      error: 'Invalid request format',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 400 });
  }
}