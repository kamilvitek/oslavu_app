// src/app/api/analyze/events/brno/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { brnoEventsService } from '@/lib/services/brno';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '200', 10);

    const events = await brnoEventsService.getEvents({ startDate, endDate, page, pageSize });

    return NextResponse.json({
      data: events,
      count: events.length,
      source: 'brno'
    });
  } catch (error) {
    console.error('Brno events API error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


