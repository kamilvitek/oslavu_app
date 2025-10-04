// src/app/api/check-migration/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverDatabaseService } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🔍 Checking if migration was applied...');
    
    // Check if scraper_sources table exists
    const scraperSources = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('scraper_sources')
        .select('*')
        .limit(1);
      return result;
    });
    
    // Check if sync_logs table exists
    const syncLogs = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('sync_logs')
        .select('*')
        .limit(1);
      return result;
    });
    
    // Check if events table has embedding column
    const eventsWithEmbedding = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('events')
        .select('embedding')
        .limit(1);
      return result;
    });
    
    return NextResponse.json({
      success: true,
      message: 'Migration check completed',
      data: {
        scraperSourcesExists: scraperSources.data !== null,
        syncLogsExists: syncLogs.data !== null,
        eventsHasEmbedding: eventsWithEmbedding.data !== null,
        scraperSourcesCount: scraperSources.data?.length || 0,
        syncLogsCount: syncLogs.data?.length || 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Migration check failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Migration check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
