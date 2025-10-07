// src/app/api/holidays/countries/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { holidayService } from '@/lib/services/holiday-service';

export async function GET(request: NextRequest) {
  try {
    const countries = await holidayService.getCountries();

    return NextResponse.json({
      success: true,
      data: countries
    });

  } catch (error) {
    console.error('Error fetching countries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countries' },
      { status: 500 }
    );
  }
}
