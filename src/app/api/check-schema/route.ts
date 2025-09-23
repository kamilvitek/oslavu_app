import { NextRequest, NextResponse } from 'next/server';
import { serverDatabaseService } from '@/lib/supabase';

/**
 * GET /api/check-schema - Check database schema
 */
export async function GET() {
  try {
    console.log('Checking database schema...');
    
    // Try to get table information
    const { data: tableInfo, error: tableError } = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('conflict_analyses')
        .select('*')
        .limit(0); // Just to test table access
      return result;
    });

    if (tableError) {
      return NextResponse.json({
        success: false,
        error: 'Table access failed',
        details: tableError.message,
        code: tableError.code,
        hint: tableError.hint
      }, { status: 500 });
    }

    // Try to get column information by attempting a simple insert with minimal data
    const minimalRecord = {
      city: "Test",
      category: "Test",
      preferred_dates: ["2025-10-23"],
      expected_attendees: 1,
      date_range_start: "2025-10-23",
      date_range_end: "2025-10-23",
      results: { test: true }
    };

    const { data: insertTest, error: insertError } = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('conflict_analyses')
        .insert(minimalRecord)
        .select()
        .single();
      return result;
    });

    if (insertError) {
      return NextResponse.json({
        success: false,
        error: 'Insert test failed',
        details: insertError.message,
        code: insertError.code,
        hint: insertError.hint,
        attempted_record: minimalRecord
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        table_accessible: true,
        insert_test: insertTest,
        message: 'Schema check completed successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Schema check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Schema check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
