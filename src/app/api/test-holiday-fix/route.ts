// src/app/api/test-holiday-fix/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverDatabaseService } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = serverDatabaseService.getClient();
    
    // Test 1: Check if tables exist
    const { data: countries, error: countriesError } = await supabase
      .from('countries')
      .select('*')
      .limit(1);
    
    if (countriesError) {
      return NextResponse.json({
        success: false,
        error: 'Database not set up',
        details: countriesError.message,
        step: 'Run the 003_holidays_and_cultural_events.sql migration in Supabase'
      }, { status: 500 });
    }
    
    // Test 2: Check if functions exist
    const { data: holidays, error: holidaysError } = await supabase
      .rpc('get_holidays_for_date', {
        target_date: '2025-12-24',
        country_code: 'CZE',
        region_code: 'CZ-PR'
      });
    
    if (holidaysError) {
      return NextResponse.json({
        success: false,
        error: 'Holiday functions not working',
        details: holidaysError.message,
        step: 'Check the SQL migration for syntax errors'
      }, { status: 500 });
    }
    
    // Test 3: Check if we get Christmas Eve
    const isChristmasEve = holidays?.some((h: any) => 
      h.holiday_name === 'Christmas Eve' || h.holiday_name_native === 'Štědrý den'
    );
    
    return NextResponse.json({
      success: true,
      message: 'Holiday system is working!',
      testResults: {
        countries: countries?.length || 0,
        holidays: holidays?.length || 0,
        christmasEve: isChristmasEve,
        testDate: '2025-12-24',
        testCountry: 'CZE',
        testRegion: 'CZ-PR'
      },
      nextStep: 'Now test the full conflict analysis with December 24, 2025'
    });
    
  } catch (error) {
    console.error('Holiday system test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      step: 'Check the database migration and function syntax'
    }, { status: 500 });
  }
}
