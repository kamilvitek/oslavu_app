// src/app/api/holidays/check-range/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { holidayService } from '@/lib/services/holiday-service';
import { HolidayServiceConfig } from '@/types/holidays';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      start_date, 
      end_date, 
      country_code, 
      region_code, 
      include_cultural_events = true, 
      business_impact_threshold = 'partial' 
    } = body;

    if (!start_date || !end_date || !country_code) {
      return NextResponse.json(
        { error: 'Missing required fields: start_date, end_date, country_code' },
        { status: 400 }
      );
    }

    const config: HolidayServiceConfig = {
      country_code,
      region_code,
      include_cultural_events,
      business_impact_threshold
    };

    const availability = await holidayService.checkDateRangeAvailability(start_date, end_date, config);

    return NextResponse.json({
      success: true,
      data: availability
    });

  } catch (error) {
    console.error('Error checking date range availability:', error);
    return NextResponse.json(
      { error: 'Failed to check date range availability' },
      { status: 500 }
    );
  }
}
