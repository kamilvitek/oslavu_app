// src/app/api/debug-scraper/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { eventScraperService } from '@/lib/services/event-scraper';
import { serverDatabaseService } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🔍 Debugging scraper issues...');
    
    // Test 1: Check scraper sources
    console.log('1. Checking scraper sources...');
    const sources = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('scraper_sources')
        .select('*')
        .eq('enabled', true);
      return result;
    });
    console.log(`Found ${sources.data?.length || 0} enabled sources`);

    // Test 2: Test Firecrawl connection
    console.log('2. Testing Firecrawl connection...');
    const firecrawlTest = await eventScraperService.testConnection();
    console.log('Firecrawl test result:', firecrawlTest);

    // Test 3: Test one source manually
    if (sources.data && sources.data.length > 0) {
      const testSource = sources.data[0];
      console.log(`3. Testing source: ${testSource.name}`);
      
      try {
        // This will show detailed logs of what's happening
        const events = await eventScraperService.scrapeSource(testSource.id);
        console.log(`✅ Scraped ${events.length} events from ${testSource.name}`);
        
        return NextResponse.json({
          success: true,
          message: 'Scraper debug completed',
          results: {
            sourcesFound: sources.data.length,
            firecrawlTest: firecrawlTest,
            testSource: testSource.name,
            eventsScraped: events.length,
            sampleEvents: events.slice(0, 2) // Show first 2 events
          },
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error(`❌ Error scraping ${testSource.name}:`, error);
        
        return NextResponse.json({
          success: false,
          error: `Failed to scrape ${testSource.name}`,
          details: error instanceof Error ? error.message : 'Unknown error',
          stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'No enabled sources found',
      timestamp: new Date().toISOString()
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Scraper debug failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Scraper debug failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
