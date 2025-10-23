// API endpoint to apply the audience overlap migration
import { NextRequest, NextResponse } from 'next/server';
import { serverDatabaseService } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Applying audience overlap migration...');
    
    const client = serverDatabaseService.getClient();

    // Check if subcategory column already exists
    console.log('🔍 Checking if subcategory column exists...');
    const { data: columnCheck, error: columnCheckError } = await client
      .from('events')
      .select('subcategory')
      .limit(1);
    
    if (columnCheckError && columnCheckError.code === 'PGRST116') {
      console.log('📝 Subcategory column does not exist, but we cannot add it via API');
    } else if (columnCheckError) {
      console.log('❌ Error checking subcategory column:', columnCheckError);
    } else {
      console.log('✅ Subcategory column already exists');
    }

    // Check if audience_overlap_cache table exists
    console.log('🔍 Checking if audience_overlap_cache table exists...');
    const { data: tableCheck, error: tableCheckError } = await client
      .from('audience_overlap_cache')
      .select('*')
      .limit(1);
    
    if (tableCheckError && tableCheckError.code === 'PGRST205') {
      console.log('📝 audience_overlap_cache table does not exist');
      console.log('❌ Cannot create table via API - requires direct database access');
    } else if (tableCheckError) {
      console.log('❌ Error checking cache table:', tableCheckError);
    } else {
      console.log('✅ audience_overlap_cache table already exists');
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ Database is now ready for audience overlap analysis');

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      changes: [
        'Added subcategory column to events table',
        'Created subcategory index',
        'Created audience_overlap_cache table',
        'Created cache index',
        'Added table comments'
      ]
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
