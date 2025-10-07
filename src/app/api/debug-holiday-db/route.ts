// src/app/api/debug-holiday-db/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverDatabaseService } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = serverDatabaseService.getClient();
    
    // Check what tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['countries', 'regions', 'holidays', 'cultural_events', 'holiday_types']);
    
    // Check what functions exist
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .in('routine_name', ['get_holidays_for_date', 'get_cultural_events_for_date', 'calculate_easter_date']);
    
    // Check if we have Czech Republic data
    const { data: countries, error: countriesError } = await supabase
      .from('countries')
      .select('*')
      .eq('code', 'CZE');
    
    // Check if we have Christmas Eve holiday
    const { data: holidays, error: holidaysError } = await supabase
      .from('holidays')
      .select('*')
      .ilike('name', '%Christmas%');
    
    return NextResponse.json({
      success: true,
      debug: {
        tables: tables?.map(t => t.table_name) || [],
        functions: functions?.map(f => f.routine_name) || [],
        czechRepublic: countries?.length || 0,
        christmasHolidays: holidays?.length || 0,
        tablesError: tablesError?.message,
        functionsError: functionsError?.message,
        countriesError: countriesError?.message,
        holidaysError: holidaysError?.message
      }
    });
    
  } catch (error) {
    console.error('Debug failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
