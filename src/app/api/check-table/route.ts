// src/app/api/check-table/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverDatabaseService } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🔍 Checking events table structure...');
    
    // Try to get a sample event to see the structure
    const sampleEvent = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('events')
        .select('*')
        .limit(1);
      return result;
    });
    
    // Try to insert a minimal event to see what error we get
    let insertError = null;
    try {
      await serverDatabaseService.executeWithRetry(async () => {
        const result = await serverDatabaseService.getClient()
          .from('events')
          .insert({
            title: 'Test',
            date: '2024-01-01',
            city: 'Test',
            category: 'Test',
            source: 'manual'
          });
        return result;
      });
    } catch (error) {
      insertError = error;
    }
    
    return NextResponse.json({
      success: true,
      message: 'Table structure check completed',
      data: {
        sampleEvent: sampleEvent.data?.[0] || null,
        insertError: insertError && typeof insertError === 'object' && 'message' in insertError ? (insertError as any).message : null,
        tableExists: sampleEvent.data !== null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Table check failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Table check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
