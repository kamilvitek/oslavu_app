// src/app/api/analyze/events/predicthq/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { predicthqService } from '@/lib/services/predicthq';

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
    const minAttendance = searchParams.get('minAttendance');
    const minRank = searchParams.get('minRank');
    const limit = parseInt(searchParams.get('limit') || '200');

    console.log('PredictHQ API Request params:', { 
      city, 
      startDate, 
      endDate, 
      category, 
      keyword, 
      radius,
      useComprehensiveFallback,
      minAttendance, 
      minRank, 
      limit 
    });

    if (!city && !keyword) {
      return NextResponse.json(
        { error: 'Either city or keyword parameter is required' },
        { status: 400 }
      );
    }

    // Check if API key is configured
    if (!process.env.PREDICTHQ_API_KEY) {
      console.error('PREDICTHQ_API_KEY is not configured');
      return NextResponse.json(
        { 
          success: false,
          error: 'PredictHQ API key is not configured. Please set the PREDICTHQ_API_KEY environment variable.',
          source: 'predicthq'
        },
        { status: 500 }
      );
    }

    let events;

    if (keyword) {
      // Search by keyword
      events = await predicthqService.searchEvents(
        keyword,
        city || undefined,
        startDate || undefined,
        endDate || undefined
      );
    } else if (minAttendance) {
      // Get high attendance events
      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: 'startDate and endDate are required for high attendance search' },
          { status: 400 }
        );
      }
      
      events = await predicthqService.getHighAttendanceEvents(
        city!,
        startDate,
        endDate,
        parseInt(minAttendance)
      );
    } else if (minRank) {
      // Get high rank events
      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: 'startDate and endDate are required for high rank search' },
          { status: 400 }
        );
      }
      
      events = await predicthqService.getHighRankEvents(
        city!,
        startDate,
        endDate,
        parseInt(minRank)
      );
    } else {
      // Search by city and date range
      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: 'startDate and endDate are required when searching by city' },
          { status: 400 }
        );
      }

      // Get events for city and date range with radius and fallback options
      if (useComprehensiveFallback) {
        events = await predicthqService.getEventsWithComprehensiveFallback(
          city!,
          startDate,
          endDate,
          category || undefined,
          radius || '50km'
        );
      } else if (radius) {
        events = await predicthqService.getEventsWithRadius(
          city!,
          startDate,
          endDate,
          radius,
          category || undefined
        );
      } else {
        events = await predicthqService.getEventsForCity(
          city!,
          startDate,
          endDate,
          category || undefined
        );
      }
    }

    console.log(`Found ${events.length} PredictHQ events`);

    return NextResponse.json({
      success: true,
      data: {
        events,
        total: events.length,
        source: 'predicthq',
        searchParams: {
          city,
          startDate,
          endDate,
          category,
          keyword,
          minAttendance,
          minRank,
          limit,
        },
      },
    });

  } catch (error) {
    console.error('PredictHQ API Error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        source: 'predicthq'
      },
      { status: 500 }
    );
  }
}
