import { NextRequest, NextResponse } from 'next/server';
import { serverDatabaseService } from '@/lib/supabase';

/**
 * GET /api/check-table-structure - Check the actual table structure
 */
export async function GET() {
  try {
    console.log('Checking actual table structure...');
    
    // Try to get all columns by selecting all
    const { data: allData, error: allError } = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('conflict_analyses')
        .select('*')
        .limit(1);
      return result;
    });

    if (allError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to query table',
        details: allError.message,
        code: allError.code
      }, { status: 500 });
    }

    // Try to insert a minimal record to see what's required
    const minimalRecord = {
      user_id: null,
      results: { test: true }
    };

    const { data: insertData, error: insertError } = await serverDatabaseService.executeWithRetry(async () => {
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
        existing_records: allData,
        insert_test: insertData,
        message: 'Table structure check completed'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Table structure check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Table structure check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
