import { NextRequest, NextResponse } from 'next/server';
import { serverDatabaseService } from '@/lib/supabase';

/**
 * POST /api/test-db - Test database insertion
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Testing database insertion...');
    
    const testRecord = {
      user_id: null,
      request_data: {
        city: "Test City",
        category: "Test Category",
        expected_attendees: 100,
        test: true
      },
      conflict_score: 5.5, // Add required conflict_score field
      results: {
        // Store all data in the results JSONB field
        city: "Test City",
        category: "Test Category",
        subcategory: null,
        preferred_dates: ["2025-10-23", "2025-11-22"],
        expected_attendees: 100,
        date_range_start: "2025-10-23",
        date_range_end: "2025-11-22",
        test: true,
        message: "This is a test record",
        timestamp: new Date().toISOString()
      }
    };

    console.log('Attempting to insert test record:', testRecord);

    const { data: insertedRecord, error: insertError } = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('conflict_analyses')
        .insert(testRecord)
        .select()
        .single();
      return result;
    });

    if (insertError) {
      console.error('Database insertion failed:', insertError);
      return NextResponse.json({
        success: false,
        error: 'Database insertion failed',
        details: insertError.message,
        code: insertError.code,
        hint: insertError.hint
      }, { status: 500 });
    }

    console.log('✅ Test record inserted successfully:', insertedRecord);

    return NextResponse.json({
      success: true,
      data: {
        inserted_record: insertedRecord,
        message: 'Test record inserted successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/test-db - Test database connection and table access
 */
export async function GET() {
  try {
    console.log('Testing database connection and table access...');
    
    // Test 1: Basic connection
    const { data: connectionTest, error: connectionError } = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('conflict_analyses')
        .select('count', { count: 'exact' });
      return result;
    });

    if (connectionError) {
      return NextResponse.json({
        success: false,
        error: 'Connection test failed',
        details: connectionError.message,
        code: connectionError.code
      }, { status: 500 });
    }

    // Test 2: Try to select from table
    const { data: tableData, error: tableError } = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('conflict_analyses')
        .select('*')
        .limit(5);
      return result;
    });

    return NextResponse.json({
      success: true,
      data: {
        connection: 'OK',
        total_records: connectionTest?.count || 0,
        table_accessible: !tableError,
        sample_records: tableData || [],
        table_error: tableError ? {
          message: tableError.message,
          code: tableError.code,
          hint: tableError.hint
        } : null
      },
      message: 'Database test completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
