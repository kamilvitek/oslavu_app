import { NextRequest, NextResponse } from 'next/server';
import { serverDatabaseService } from '@/lib/supabase';

/**
 * GET /api/check-columns - Check what columns exist in conflict_analyses table
 */
export async function GET() {
  try {
    console.log('Checking table columns...');
    
    // Try different column combinations to see what exists
    const columnTests = [
      { name: 'id', test: () => serverDatabaseService.getClient().from('conflict_analyses').select('id').limit(1) },
      { name: 'user_id', test: () => serverDatabaseService.getClient().from('conflict_analyses').select('user_id').limit(1) },
      { name: 'city', test: () => serverDatabaseService.getClient().from('conflict_analyses').select('city').limit(1) },
      { name: 'category', test: () => serverDatabaseService.getClient().from('conflict_analyses').select('category').limit(1) },
      { name: 'subcategory', test: () => serverDatabaseService.getClient().from('conflict_analyses').select('subcategory').limit(1) },
      { name: 'preferred_dates', test: () => serverDatabaseService.getClient().from('conflict_analyses').select('preferred_dates').limit(1) },
      { name: 'expected_attendees', test: () => serverDatabaseService.getClient().from('conflict_analyses').select('expected_attendees').limit(1) },
      { name: 'date_range_start', test: () => serverDatabaseService.getClient().from('conflict_analyses').select('date_range_start').limit(1) },
      { name: 'date_range_end', test: () => serverDatabaseService.getClient().from('conflict_analyses').select('date_range_end').limit(1) },
      { name: 'results', test: () => serverDatabaseService.getClient().from('conflict_analyses').select('results').limit(1) },
      { name: 'created_at', test: () => serverDatabaseService.getClient().from('conflict_analyses').select('created_at').limit(1) }
    ];

    const results = {};
    
    for (const columnTest of columnTests) {
      try {
        const { data, error } = await serverDatabaseService.executeWithRetry(async () => {
          return await columnTest.test();
        });
        
        results[columnTest.name] = {
          exists: !error,
          error: error ? error.message : null
        };
      } catch (err) {
        results[columnTest.name] = {
          exists: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        column_tests: results,
        message: 'Column check completed'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Column check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Column check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
