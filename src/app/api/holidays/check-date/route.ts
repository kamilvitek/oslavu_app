// src/app/api/holidays/check-date/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { holidayService } from '@/lib/services/holiday-service';
import { HolidayServiceConfig } from '@/types/holidays';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, country_code, region_code, include_cultural_events = true, business_impact_threshold = 'partial' } = body;

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

    const availability = await holidayService.checkDateAvailability(date, config);

    return NextResponse.json({
      success: true,
      data: availability
    });

  } catch (error) {
    console.error('Error checking date availability:', error);
    return NextResponse.json(
      { error: 'Failed to check date availability' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const country_code = searchParams.get('country_code');
  const region_code = searchParams.get('region_code');

  if (!date || !country_code) {
    return NextResponse.json(
      { error: 'Missing required parameters: date, country_code' },
      { status: 400 }
    );
  }

  try {
    const config: HolidayServiceConfig = {
      country_code,
      region_code: region_code || undefined,
      include_cultural_events: true,
      business_impact_threshold: 'partial'
    };

    const availability = await holidayService.checkDateAvailability(date, config);

    return NextResponse.json({
      success: true,
      data: availability
    });

  } catch (error) {
    console.error('Error checking date availability:', error);
    return NextResponse.json(
      { error: 'Failed to check date availability' },
      { status: 500 }
    );
  }
}
