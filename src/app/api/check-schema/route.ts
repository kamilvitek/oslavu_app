// src/app/api/check-schema/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverDatabaseService } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🔍 Checking database schema...');
    
    // Get table structure
    const tableInfo = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', 'events')
        .order('ordinal_position');
      return result;
    });
    
    return NextResponse.json({
      success: true,
      message: 'Database schema check completed',
      data: {
        eventsTableColumns: tableInfo.data || []
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