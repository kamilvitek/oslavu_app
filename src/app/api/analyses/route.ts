import { NextRequest, NextResponse } from 'next/server';
import { serverDatabaseService } from '@/lib/supabase';

/**
 * GET /api/analyses - Get all saved conflict analyses
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Fetching all conflict analyses from database...');
    
    const { data: analyses, error } = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('conflict_analyses')
        .select('*')
        .order('created_at', { ascending: false });
      return result;
    });

    if (error) {
      console.error('Failed to fetch analyses:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch analyses',
        details: error.message
      }, { status: 500 });
    }

    console.log(`Found ${analyses?.length || 0} analyses in database`);

    return NextResponse.json({
      success: true,
      data: {
        analyses: analyses || [],
        count: analyses?.length || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching analyses:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analyses',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/analyses - Test database connection
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const { data: connectionTest, error: connectionError } = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('conflict_analyses')
        .select('count', { count: 'exact' });
      return result;
    });

    if (connectionError) {
      console.error('Database connection test failed:', connectionError);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: connectionError.message
      }, { status: 500 });
    }

    // Test table structure
    const { data: tableInfo, error: tableError } = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('conflict_analyses')
        .select('id, city, category, created_at')
        .limit(1);
      return result;
    });

    return NextResponse.json({
      success: true,
      data: {
        connection: 'OK',
        total_analyses: connectionTest?.count || 0,
        table_accessible: !tableError,
        sample_record: tableInfo?.[0] || null
      },
      message: 'Database connection test successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database connection test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Database connection test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
