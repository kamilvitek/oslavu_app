// src/app/api/events/scraped/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverDatabaseService } from '@/lib/supabase';
import { sanitizeApiParameters } from '@/lib/utils/input-sanitization';

// Helper function to create responses with proper headers
function createResponse(data: any, options: { status?: number } = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300', // 5 minute cache
  });
  
  return NextResponse.json(data, { 
    status: options.status || 200,
    headers 
  });
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Scraped events query request');
    
    const { searchParams } = new URL(request.url);
    
    // Extract raw parameters
    const rawParams = Object.fromEntries(searchParams);
    
    // Sanitize input parameters
    const sanitizationResult = sanitizeApiParameters(rawParams);
    
    if (!sanitizationResult.isValid) {
      return createResponse(
        {
          success: false,
          error: 'Parameter validation failed',
          details: sanitizationResult.errors,
          warnings: sanitizationResult.warnings
        },
        { status: 400 }
      );
    }
    
    const sanitizedParams = sanitizationResult.sanitizedParams;
    
    // Extract parameters
    const city = sanitizedParams.city;
    const startDate = sanitizedParams.startDate;
    const endDate = sanitizedParams.endDate;
    const category = sanitizedParams.category;
    const search = sanitizedParams.keyword;
    const page = Math.max(0, sanitizedParams.page || 0);
    const limit = Math.min(100, sanitizedParams.size || 25);
    
    console.log('🔍 Querying scraped events:', {
      city,
      startDate,
      endDate,
      category,
      search,
      page,
      limit
    });
    
    // Build query - include all scraper sources
    let query = serverDatabaseService.getClient()
      .from('events')
      .select('*')
      .in('source', ['goout', 'brnoexpat', 'firecrawl', 'agentql', 'scraper'])
      .order('date', { ascending: true });
    
    // Apply filters
    if (startDate) {
      query = query.gte('date', `${startDate}T00:00:00Z`);
    }
    
    if (endDate) {
      query = query.lte('date', `${endDate}T23:59:59Z`);
    }
    
    if (city) {
      query = query.ilike('city', `%${city}%`);
    }
    
    if (category) {
      query = query.eq('category', category);
    }
    
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,venue.ilike.%${search}%`);
    }
    
    // Apply pagination
    const from = page * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
    
    // Execute query
    const { data: events, error, count } = await serverDatabaseService.executeWithRetry(async () => {
      const result = await query;
      return result;
    });
    
    if (error) {
      console.error('❌ Database query failed:', error);
      return createResponse(
        {
          success: false,
          error: 'Database query failed',
          details: error.message
        },
        { status: 500 }
      );
    }
    
    // Transform events to match expected format
    const transformedEvents = (events || []).map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      endDate: event.end_date,
      city: event.city,
      venue: event.venue,
      category: event.category,
      subcategory: event.subcategory,
      expectedAttendees: event.expected_attendees,
      source: event.source,
      sourceId: event.source_id,
      url: event.url,
      imageUrl: event.image_url,
      createdAt: event.created_at,
      updatedAt: event.updated_at
    }));
    
    const response = {
      success: true,
      data: {
        events: transformedEvents,
        total: count || transformedEvents.length,
        page,
        limit,
        hasMore: transformedEvents.length === limit
      },
      timestamp: new Date().toISOString()
    };
    
    console.log(`✅ Retrieved ${transformedEvents.length} scraped events`);
    
    return createResponse(response);
    
  } catch (error) {
    console.error('❌ Scraped events query failed:', error);
    
    return createResponse(
      {
        success: false,
        error: 'Scraped events query failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
