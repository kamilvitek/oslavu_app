import { NextRequest, NextResponse } from 'next/server';
import { apiRegistry } from '@/lib/services/api-registry';

/**
 * GET /api/usp-data
 * Returns dynamic USP data for frontend display
 */
export async function GET(request: NextRequest) {
  try {
    // Get USP data from registry
    const uspData = apiRegistry.getUSPData();
    
    // Add cache headers for better performance
    const response = NextResponse.json(uspData, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // 5 min cache, 10 min stale
        'Content-Type': 'application/json',
      },
    });

    return response;
  } catch (error) {
    console.error('Error fetching USP data:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch USP data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/usp-data
 * Add a new data source to the registry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.type || !body.status) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, status' },
        { status: 400 }
      );
    }

    // Add new data source
    const newDataSource = apiRegistry.addDataSource({
      name: body.name,
      type: body.type,
      status: body.status,
      description: body.description || '',
      endpoint: body.endpoint,
      coverage: body.coverage || [],
    });

    return NextResponse.json(newDataSource, { status: 201 });
  } catch (error) {
    console.error('Error adding data source:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to add data source',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/usp-data
 * Update an existing data source
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const updatedDataSource = apiRegistry.updateDataSource(body.id, {
      name: body.name,
      type: body.type,
      status: body.status,
      description: body.description,
      endpoint: body.endpoint,
      coverage: body.coverage,
      eventCount: body.eventCount,
    });

    if (!updatedDataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedDataSource, { status: 200 });
  } catch (error) {
    console.error('Error updating data source:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update data source',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/usp-data
 * Remove a data source from the registry
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    const success = apiRegistry.removeDataSource(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error removing data source:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to remove data source',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
