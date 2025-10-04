// src/app/api/check-actual-schema/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverDatabaseService } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🔍 Checking actual database schema...');
    
    // Try to get the actual table structure by attempting to insert with different fields
    const testFields = [
      { title: 'Test', date: '2024-01-01', city: 'Test', category: 'Test', source: 'manual' },
      { title: 'Test', name: 'Test Name', date: '2024-01-01', city: 'Test', category: 'Test', source: 'manual' },
      { title: 'Test', date: '2024-01-01', city: 'Test', category: 'Test', source: 'manual', name: 'Test Name' }
    ];
    
    const results = [];
    
    for (let i = 0; i < testFields.length; i++) {
      try {
        const result = await serverDatabaseService.executeWithRetry(async () => {
          const insertResult = await serverDatabaseService.getClient()
            .from('events')
            .insert(testFields[i])
            .select();
          return insertResult;
        });
        
        results.push({
          test: i + 1,
          fields: testFields[i],
          success: true,
          result: result.data
        });
        
        // Clean up the test record
        if (result.data && result.data.length > 0) {
          await serverDatabaseService.executeWithRetry(async () => {
            await serverDatabaseService.getClient()
              .from('events')
              .delete()
              .eq('id', result.data[0].id);
          });
        }
        
      } catch (error) {
        results.push({
          test: i + 1,
          fields: testFields[i],
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Actual schema check completed',
      data: {
        results
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Schema check failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Schema check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
