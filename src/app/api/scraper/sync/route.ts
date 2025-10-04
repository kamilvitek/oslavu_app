// src/app/api/scraper/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { eventScraperService } from '@/lib/services/event-scraper';
import { serverDatabaseService } from '@/lib/supabase';

// Helper function to create responses with proper headers
function createResponse(data: any, options: { status?: number } = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  });
  
  return NextResponse.json(data, { 
    status: options.status || 200,
    headers 
  });
}

// Helper function to verify authorization
function verifyAuthorization(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.error('❌ CRON_SECRET not configured');
    return false;
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('❌ Missing or invalid authorization header');
    return false;
  }
  
  const token = authHeader.substring(7);
  return token === cronSecret;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Scraper sync request received');
    
    // Verify authorization
    if (!verifyAuthorization(request)) {
      console.error('❌ Unauthorized scraper sync request');
      return createResponse(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or missing authorization token'
        },
        { status: 401 }
      );
    }
    
    console.log('✅ Authorization verified, starting scraper sync');
    
    // Start the scraping process
    const result = await eventScraperService.scrapeAllSources();
    
    // Calculate duration
    const duration = Date.now() - startTime;
    
    // Get additional statistics
    const stats = await serverDatabaseService.getStats();
    const totalScrapedEvents = stats.eventsBySource.scraper || 0;
    
    // Update last_scraped_at for all sources
    try {
      await serverDatabaseService.executeWithRetry(async () => {
        const client = serverDatabaseService.getClient();
        await client
          .from('scraper_sources')
          .update({ last_scraped_at: new Date().toISOString() })
          .eq('enabled', true);
      });
    } catch (error) {
      console.warn('⚠️ Failed to update last_scraped_at for sources:', error);
    }
    
    const response = {
      success: true,
      data: {
        total: result.created + result.skipped,
        created: result.created,
        updated: 0, // Not implemented yet
        skipped: result.skipped,
        errors: result.errors,
        duration_ms: duration,
        sources_processed: result.errors.length > 0 ? 'partial' : 'all',
        total_scraped_events: totalScrapedEvents
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Scraper sync completed:', {
      created: result.created,
      skipped: result.skipped,
      errors: result.errors.length,
      duration: `${duration}ms`
    });
    
    return createResponse(response);
    
  } catch (error) {
    console.error('❌ Scraper sync failed:', error);
    
    const duration = Date.now() - startTime;
    
    return createResponse(
      {
        success: false,
        error: 'Scraper sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: duration,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Add GET method for testing (with auth)
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Scraper sync test request');
    
    // Verify authorization
    if (!verifyAuthorization(request)) {
      return createResponse(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or missing authorization token'
        },
        { status: 401 }
      );
    }
    
    // Test scraper connection
    const testResult = await eventScraperService.testConnection();
    
    return createResponse({
      success: testResult.success,
      data: {
        message: testResult.message,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Scraper test failed:', error);
    
    return createResponse(
      {
        success: false,
        error: 'Scraper test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
