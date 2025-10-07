// src/app/api/test-direct-holiday/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverDatabaseService } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = serverDatabaseService.getClient();
    
    // Test direct query for Christmas Eve
    const { data: holidays, error: holidaysError } = await supabase
      .from('holidays')
      .select(`
        name,
        name_native,
        month,
        day,
        business_impact,
        venue_closure_expected
      `)
      .eq('month', 12)
      .eq('day', 24);
    
    if (holidaysError) {
      return NextResponse.json({
        success: false,
        error: 'Direct query failed',
        details: holidaysError.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Direct holiday query successful',
      holidays: holidays,
      count: holidays?.length || 0
    });
    
  } catch (error) {
    console.error('Direct test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Direct test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
