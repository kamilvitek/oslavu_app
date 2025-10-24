// src/app/api/events/backfill-attendees/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { attendeeBackfillService } from '@/lib/services/attendee-backfill';

export async function POST(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') === 'true';
    const limit = parseInt(searchParams.get('limit') || '1000');
    const batchSize = parseInt(searchParams.get('batchSize') || '100');
    const verbose = searchParams.get('verbose') === 'true';

    // Validate parameters
    if (isNaN(limit) || limit <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid limit parameter. Must be a positive number.' 
        },
        { status: 400 }
      );
    }

    if (isNaN(batchSize) || batchSize <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid batchSize parameter. Must be a positive number.' 
        },
        { status: 400 }
      );
    }

    // Get current statistics before backfill
    const statsBefore = await attendeeBackfillService.getBackfillStats();

    console.log(`🔄 Starting attendee backfill via API (dryRun: ${dryRun}, limit: ${limit})`);

    // Run the backfill
    const result = await attendeeBackfillService.backfillMissingAttendees({
      dryRun,
      limit,
      batchSize,
      verbose
    });

    // Get updated statistics
    const statsAfter = await attendeeBackfillService.getBackfillStats();

    const response = {
      success: true,
      dryRun,
      parameters: {
        limit,
        batchSize,
        verbose
      },
      statistics: {
        before: statsBefore,
        after: statsAfter,
        improvement: {
          eventsUpdated: result.updatedEvents,
          percentageIncrease: statsBefore.totalEvents > 0 ? 
            ((statsAfter.eventsWithAttendees - statsBefore.eventsWithAttendees) / statsBefore.totalEvents) * 100 : 0
        }
      },
      result: {
        totalEvents: result.totalEvents,
        processedEvents: result.processedEvents,
        updatedEvents: result.updatedEvents,
        skippedEvents: result.skippedEvents,
        failedEvents: result.failedEvents,
        duration: result.duration,
        startTime: result.startTime,
        endTime: result.endTime
      },
      errors: result.errors.length > 0 ? result.errors.slice(0, 10) : [], // Limit errors in response
      errorCount: result.errors.length
    };

    console.log(`✅ Attendee backfill completed: ${result.updatedEvents} events updated`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Attendee backfill API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Backfill operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current statistics
    const stats = await attendeeBackfillService.getBackfillStats();

    return NextResponse.json({
      success: true,
      statistics: stats,
      message: 'Current attendee data statistics'
    });

  } catch (error) {
    console.error('❌ Failed to get attendee statistics:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
