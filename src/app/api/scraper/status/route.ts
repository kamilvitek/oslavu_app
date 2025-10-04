// src/app/api/scraper/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverDatabaseService } from '@/lib/supabase';

// Helper function to create responses with proper headers
function createResponse(data: any, options: { status?: number } = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60', // 1 minute cache
  });
  
  return NextResponse.json(data, { 
    status: options.status || 200,
    headers 
  });
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Scraper status request');
    
    // Get database statistics
    const stats = await serverDatabaseService.getStats();
    
    // Get total scraped events (events with scraper sources)
    const scrapedSources = ['goout', 'brnoexpat', 'firecrawl', 'agentql', 'scraper'];
    const totalScrapedEvents = Object.entries(stats.eventsBySource)
      .filter(([source]) => scrapedSources.includes(source))
      .reduce((sum, [, count]) => sum + count, 0);
    
    // Get last sync information
    const lastSync = await serverDatabaseService.executeWithRetry(async () => {
      const client = serverDatabaseService.getClient();
      const { data, error } = await client
        .from('sync_logs')
        .select('*')
        .eq('status', 'success')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }
      
      return data;
    });
    
    // Get active sources
    const activeSources = await serverDatabaseService.executeWithRetry(async () => {
      const client = serverDatabaseService.getClient();
      const { data, error } = await client
        .from('scraper_sources')
        .select('name, url, last_scraped_at, enabled')
        .eq('enabled', true)
        .order('name');
      
      if (error) {
        throw error;
      }
      
      return data || [];
    });
    
    // Get recent sync logs
    const recentLogs = await serverDatabaseService.executeWithRetry(async () => {
      const client = serverDatabaseService.getClient();
      const { data, error } = await client
        .from('sync_logs')
        .select('source, status, started_at, events_created')
        .order('started_at', { ascending: false })
        .limit(10);
      
      if (error) {
        throw error;
      }
      
      return data || [];
    });
    
    const response = {
      success: true,
      data: {
        totalScrapedEvents,
        lastSync: lastSync ? {
          timestamp: lastSync.completed_at || lastSync.started_at,
          status: lastSync.status,
          eventsCreated: lastSync.events_created || 0
        } : {
          timestamp: null,
          status: 'never',
          eventsCreated: 0
        },
        activeSources: activeSources.map(source => ({
          name: source.name,
          url: source.url,
          lastScraped: source.last_scraped_at,
          enabled: source.enabled
        })),
        recentLogs: recentLogs.map(log => ({
          source: log.source,
          status: log.status,
          timestamp: log.started_at,
          eventsCreated: log.events_created || 0
        }))
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('📊 Scraper status retrieved:', {
      totalScrapedEvents,
      activeSources: activeSources.length,
      recentLogs: recentLogs.length
    });
    
    return createResponse(response);
    
  } catch (error) {
    console.error('❌ Failed to get scraper status:', error);
    
    return createResponse(
      {
        success: false,
        error: 'Failed to retrieve scraper status',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
