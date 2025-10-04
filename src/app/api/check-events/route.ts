// src/app/api/check-events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverDatabaseService } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🔍 Checking all events in database...');
    
    // Get all events
    const allEvents = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      return result;
    });
    
    // Get events by source
    const eventsBySource = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('events')
        .select('source');
      return result;
    });
    
    return NextResponse.json({
      success: true,
      message: 'Database events check completed',
      data: {
        totalEvents: allEvents.data?.length || 0,
        recentEvents: allEvents.data?.slice(0, 5) || [],
        eventsBySource: eventsBySource.data || [],
        allEvents: allEvents.data || []
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Database check failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Database check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
