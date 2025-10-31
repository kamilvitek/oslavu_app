// src/app/api/events/scraped/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverDatabaseService } from '@/lib/supabase';
import { sanitizeApiParameters } from '@/lib/utils/input-sanitization';
import { getCategorySynonyms, normalizeCategory } from '@/lib/constants/taxonomy';
import { aiNormalizationService } from '@/lib/services/ai-normalization';

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
      // Use AI-first category matching with synonyms
      const normalizedCategory = normalizeCategory(category);
      const synonyms = getCategorySynonyms(normalizedCategory);
      
      // Build OR condition for category matching
      // Supabase .or() format: field.operator.value,field.operator.value
      const categoryConditions = synonyms.map(syn => `category.ilike.*${syn}*`).join(',');
      query = query.or(categoryConditions);
      
      console.log(`🔍 Using AI-normalized category matching: ${category} -> ${normalizedCategory} (${synonyms.length} synonyms)`);
    }
    
    if (search) {
      // Supabase .or() format: field.operator.value,field.operator.value
      // Use * for wildcards in ilike operator
      query = query.or(`title.ilike.*${search}*,description.ilike.*${search}*,venue.ilike.*${search}*`);
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
    
    // Transform and normalize events using AI
    const rawEvents = (events || []).map(event => ({
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
      imageUrl: event.image_url
    }));

    // Apply AI normalization
    const normalizedEvents = await aiNormalizationService.normalizeEvents(rawEvents);
    
    // Transform to expected format with backward compatibility
    const transformedEvents = normalizedEvents.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      endDate: event.endDate,
      city: event.city,
      venue: event.venue,
      category: event.category,
      subcategory: event.subcategory,
      expectedAttendees: event.expectedAttendees,
      source: event.source,
      sourceId: event.sourceId,
      url: event.url,
      imageUrl: event.imageUrl,
      createdAt: (event.rawData as any).createdAt || new Date().toISOString(),
      updatedAt: (event.rawData as any).updatedAt || new Date().toISOString(),
      // Add AI metadata (optional for backward compatibility)
      ...(event.confidence && { confidence: event.confidence }),
      ...(event.confidence && { normalized: true })
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
