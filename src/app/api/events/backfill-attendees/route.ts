import { NextRequest, NextResponse } from 'next/server';
import { attendeeBackfillService } from '@/lib/services/attendee-backfill';

function createResponse(data: any, options: { status?: number } = {}) {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  
  // CORS: Only allow specific origins in production, or restrict to same-origin
  // This is a cron endpoint, so CORS should be minimal
  const allowedOrigin = process.env.ALLOWED_ORIGIN || (process.env.NODE_ENV === 'production' ? undefined : '*');
  if (allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  return new NextResponse(JSON.stringify(data), {
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
    console.log('🔄 Attendee backfill request received');
    
    // Verify authorization
    if (!verifyAuthorization(request)) {
      console.error('❌ Unauthorized backfill request');
      return createResponse(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or missing authorization token'
        },
        { status: 401 }
      );
    }
    
    console.log('✅ Authorization verified, starting attendee backfill');
    
    // Get current statistics
    const stats = await attendeeBackfillService.getBackfillStats();
    console.log('📊 Current statistics:', stats);
    
    // Only run if there are events without attendee data
    if (stats.eventsWithoutAttendees === 0) {
      console.log('✅ All events already have attendee data');
      return createResponse({
        success: true,
        message: 'All events already have attendee data',
        data: stats
      });
    }
    
    // Run backfill with reasonable limits for cron
    const result = await attendeeBackfillService.backfillMissingAttendees({
      limit: 500, // Process up to 500 events per cron run
      batchSize: 50,
      verbose: false
    });
    
    // Calculate duration
    const duration = Date.now() - startTime;
    
    const response = {
      success: true,
      data: {
        ...result,
        duration_ms: duration,
        processed_at: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Attendee backfill completed:', {
      totalEvents: result.totalEvents,
      processedEvents: result.processedEvents,
      updatedEvents: result.updatedEvents,
      duration: `${duration}ms`
    });
    
    return createResponse(response);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ Attendee backfill failed:', error);
    
    return createResponse(
      {
        success: false,
        error: 'Backfill failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: duration
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Getting attendee backfill statistics');
    
    const stats = await attendeeBackfillService.getBackfillStats();
    
    return createResponse({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Failed to get backfill statistics:', error);
    
    return createResponse(
      {
        success: false,
        error: 'Statistics failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}