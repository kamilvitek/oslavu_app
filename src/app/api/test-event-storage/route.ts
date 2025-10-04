// src/app/api/test-event-storage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { eventStorageService } from '@/lib/services/event-storage';

export async function POST() {
  try {
    console.log('🧪 Testing event storage directly...');
    
    // Create a test event
    const testEvent = {
      title: 'Test Event from API',
      description: 'This is a test event created via API',
      date: '2024-12-25',
      city: 'Test City',
      category: 'Test',
      source: 'scraper' as const,
      source_id: 'test_' + Date.now()
    };
    
    console.log('🧪 Test event before validation:', testEvent);
    
    console.log('🧪 Test event data:', testEvent);
    
    // Try to save the event
    const result = await eventStorageService.saveEvents([testEvent]);
    
    console.log('🧪 Save result:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Event storage test completed',
      data: {
        testEvent,
        saveResult: result
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Event storage test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Event storage test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
