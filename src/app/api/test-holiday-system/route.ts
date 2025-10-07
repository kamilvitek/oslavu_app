// src/app/api/test-holiday-system/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverDatabaseService } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = serverDatabaseService.getClient();
    
    // Test 1: Check if countries table exists
    const { data: countries, error: countriesError } = await supabase
      .from('countries')
      .select('*')
      .limit(1);
    
    if (countriesError) {
      return NextResponse.json({
        success: false,
        error: 'Countries table not found',
        details: countriesError.message,
        suggestion: 'Please run the 003_holidays_and_cultural_events.sql migration in Supabase'
      }, { status: 500 });
    }
    
    // Test 2: Check if holiday functions exist
    const { data: holidays, error: holidaysError } = await supabase
      .rpc('get_holidays_for_date', {
        target_date: '2024-12-25',
        country_code: 'CZE',
        region_code: 'CZ-PR'
      });
    
    if (holidaysError) {
      return NextResponse.json({
        success: false,
        error: 'Holiday functions not found',
        details: holidaysError.message,
        suggestion: 'Please run the 003_holidays_and_cultural_events.sql migration in Supabase'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Holiday system is properly set up',
      data: {
        countries: countries?.length || 0,
        holidays: holidays?.length || 0,
        testDate: '2024-12-25',
        testCountry: 'CZE',
        testRegion: 'CZ-PR'
      }
    });
    
  } catch (error) {
    console.error('Holiday system test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Holiday system test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Please run the 003_holidays_and_cultural_events.sql migration in Supabase'
    }, { status: 500 });
  }
}
