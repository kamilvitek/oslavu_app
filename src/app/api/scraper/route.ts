import { NextRequest, NextResponse } from 'next/server';
import { eventScraperService } from '@/lib/services/event-scraper';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'test';
    
    switch (action) {
      case 'test':
        const testResult = await eventScraperService.testConnection();
        return NextResponse.json({
          success: testResult.success,
          message: testResult.message
        });
        
      case 'scrape':
        const scrapeResult = await eventScraperService.scrapeAllSources();
        return NextResponse.json({
          success: true,
          result: scrapeResult
        });
        
      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action. Use "test" or "scrape"'
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Scraper API error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sourceId } = body;
    
    switch (action) {
      case 'scrape-source':
        if (!sourceId) {
          return NextResponse.json({
            success: false,
            message: 'sourceId is required'
          }, { status: 400 });
        }
        
        const events = await eventScraperService.scrapeSource(sourceId);
        return NextResponse.json({
          success: true,
          events: events,
          count: events.length
        });
        
      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action'
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Scraper API error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
