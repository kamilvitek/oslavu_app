// src/app/api/holidays/regions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { holidayService } from '@/lib/services/holiday-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country_code = searchParams.get('country_code');

    if (!country_code) {
      return NextResponse.json(
        { error: 'Missing required parameter: country_code' },
        { status: 400 }
      );
    }

    const regions = await holidayService.getRegions(country_code);

    return NextResponse.json({
      success: true,
      data: regions
    });

  } catch (error) {
    console.error('Error fetching regions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch regions' },
      { status: 500 }
    );
  }
}
