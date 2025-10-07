// src/app/api/holidays/validate-event-date/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { holidayService } from '@/lib/services/holiday-service';
import { HolidayServiceConfig } from '@/types/holidays';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      date, 
      country_code, 
      region_code, 
      include_cultural_events = true, 
      business_impact_threshold = 'partial' 
    } = body;

    if (!date || !country_code) {
      return NextResponse.json(
        { error: 'Missing required fields: date, country_code' },
        { status: 400 }
      );
    }

    const config: HolidayServiceConfig = {
      country_code,
      region_code,
      include_cultural_events,
      business_impact_threshold
    };

    const validation = await holidayService.validateEventDate(date, config);

    return NextResponse.json({
      success: true,
      data: validation
    });

  } catch (error) {
    console.error('Error validating event date:', error);
    return NextResponse.json(
      { error: 'Failed to validate event date' },
      { status: 500 }
    );
  }
}
