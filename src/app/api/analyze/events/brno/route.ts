// src/app/api/analyze/events/brno/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { brnoEventsService } from '@/lib/services/brno';

// Helper function to create compressed responses
function createCompressedResponse(data: any, options: { status?: number } = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Content-Encoding': 'gzip',
    'Cache-Control': 'public, max-age=60', // 1 minute cache for performance
    'Vary': 'Accept-Encoding'
  });
  
  return NextResponse.json(data, { 
    status: options.status || 200,
    headers 
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '200', 10);

    const events = await brnoEventsService.getEvents({ startDate, endDate, page, pageSize });

    return createCompressedResponse({
      data: events,
      count: events.length,
      source: 'brno'
    });
  } catch (error) {
    console.error('Brno events API error:', error);
    return createCompressedResponse({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


