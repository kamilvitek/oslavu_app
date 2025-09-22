import { NextRequest, NextResponse } from 'next/server';
import { dataSyncService } from '@/lib/services/data-sync';
import { ticketmasterService } from '@/lib/services/ticketmaster';
import { predicthqService } from '@/lib/services/predicthq';
import { z } from 'zod';

const SyncRequestSchema = z.object({
  sources: z.array(z.enum(['ticketmaster', 'predicthq', 'all'])).optional().default(['all']),
  cities: z.array(z.string()).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  force: z.boolean().optional().default(false)
});

/**
 * POST /api/events/sync - Trigger data synchronization from APIs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = SyncRequestSchema.parse(body);

    const results = [];

    // Determine which sources to sync
    const sourcesToSync = validatedData.sources.includes('all') 
      ? ['ticketmaster', 'predicthq'] 
      : validatedData.sources;

    // If specific cities are provided, sync those cities
    if (validatedData.cities && validatedData.cities.length > 0) {
      const startDate = validatedData.start_date || new Date().toISOString().split('T')[0];
      const endDate = validatedData.end_date || (() => {
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 6);
        return futureDate.toISOString().split('T')[0];
      })();

      for (const city of validatedData.cities) {
        for (const source of sourcesToSync) {
          try {
            let result;
            if (source === 'ticketmaster') {
              result = await ticketmasterService.syncEventsForCity(city, startDate, endDate);
            } else if (source === 'predicthq') {
              result = await predicthqService.syncEventsForCity(city, startDate, endDate);
            } else {
              continue;
            }

            results.push({
              source,
              city,
              success: result.errors.length === 0,
              events_found: result.events.length,
              events_stored: result.stored,
              errors: result.errors
            });
          } catch (error) {
            results.push({
              source,
              city,
              success: false,
              events_found: 0,
              events_stored: 0,
              errors: [error instanceof Error ? error.message : 'Unknown error']
            });
          }
        }
      }
    } else {
      // Perform full sync
      const syncResults = await dataSyncService.performFullSync();
      
      for (const result of syncResults) {
        results.push({
          source: result.source,
          success: result.success,
          events_processed: result.events_processed,
          events_created: result.events_created,
          events_updated: result.events_updated,
          events_skipped: result.events_skipped,
          errors: result.errors,
          duration_ms: result.duration_ms
        });
      }
    }

    const totalEvents = results.reduce((sum, r) => sum + (r.events_found || r.events_processed || 0), 0);
    const totalStored = results.reduce((sum, r) => sum + (r.events_stored || r.events_created || 0), 0);
    const totalErrors = results.reduce((sum, r) => sum + (r.errors?.length || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: {
          total_events: totalEvents,
          total_stored: totalStored,
          total_errors: totalErrors,
          sources_synced: sourcesToSync.length,
          cities_synced: validatedData.cities?.length || 'all'
        }
      },
      message: `Sync completed: ${totalEvents} events processed, ${totalStored} stored`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error during sync:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid sync parameters',
        details: error.errors,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Sync failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * GET /api/events/sync - Get sync status
 */
export async function GET() {
  try {
    const syncStatus = dataSyncService.getSyncStatus();
    const statistics = await dataSyncService.getSyncStatistics();

    return NextResponse.json({
      success: true,
      data: {
        is_running: dataSyncService.isSyncRunning(),
        status: Object.fromEntries(syncStatus),
        statistics
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get sync status',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
