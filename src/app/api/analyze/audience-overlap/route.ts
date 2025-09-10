import { NextRequest, NextResponse } from 'next/server';
import { openaiAudienceOverlapService } from '@/lib/services/openai-audience-overlap';
import { audienceOverlapService } from '@/lib/services/audience-overlap';
import { Event } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event1, event2 } = body;

    if (!event1 || !event2) {
      return NextResponse.json(
        { error: 'Both event1 and event2 are required' },
        { status: 400 }
      );
    }

    // Use OpenAI if available, otherwise fallback to rule-based
    const result = openaiAudienceOverlapService.isAvailable()
      ? await openaiAudienceOverlapService.predictAudienceOverlap(event1, event2)
      : await audienceOverlapService.predictAudienceOverlap(event1, event2);

    return NextResponse.json({
      success: true,
      data: result,
      method: openaiAudienceOverlapService.isAvailable() ? 'AI-powered' : 'rule-based'
    });

  } catch (error) {
    console.error('Audience overlap analysis failed:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to analyze audience overlap',
        method: 'error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if OpenAI is available
    const isAvailable = openaiAudienceOverlapService.isAvailable();
    
    return NextResponse.json({
      success: true,
      openaiAvailable: isAvailable,
      method: isAvailable ? 'AI-powered' : 'rule-based'
    });

  } catch (error) {
    console.error('Failed to check OpenAI status:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to check status',
        openaiAvailable: false,
        method: 'error'
      },
      { status: 500 }
    );
  }
}
