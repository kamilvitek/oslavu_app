// Observability API endpoint for monitoring event sources and normalization quality
import { NextRequest, NextResponse } from 'next/server';
import { observabilityService } from '@/lib/services/observability';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const city = searchParams.get('city');
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : new Date().getMonth() + 1;
    
    let data: any = {};
    
    switch (type) {
      case 'sources':
        data.sources = await observabilityService.getSourceMetrics();
        break;
        
      case 'quality':
        data.quality = await observabilityService.getNormalizationQuality();
        break;
        
      case 'health':
        data.health = await observabilityService.getHealthStatus();
        break;
        
      case 'baselines':
        if (city) {
          data.baselines = await observabilityService.checkSeasonalBaselines(city, month);
        } else {
          data.baselines = [];
        }
        break;
        
      case 'all':
      default:
        data.sources = await observabilityService.getSourceMetrics();
        data.quality = await observabilityService.getNormalizationQuality();
        data.health = await observabilityService.getHealthStatus();
        if (city) {
          data.baselines = await observabilityService.checkSeasonalBaselines(city, month);
        }
        break;
    }
    
    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Observability API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch observability data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
