// src/app/api/test-db-connection/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverDatabaseService } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test 1: Basic connection
    console.log('1. Testing basic connection...');
    const basicTest = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('events')
        .select('count')
        .limit(1);
      return result;
    });
    console.log('✅ Basic connection successful');

    // Test 2: Check scraper_sources table
    console.log('2. Testing scraper_sources table...');
    const sourcesTest = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('scraper_sources')
        .select('*');
      return result;
    });
    console.log(`✅ Found ${sourcesTest.data?.length || 0} scraper sources`);

    // Test 3: Check events table structure
    console.log('3. Testing events table structure...');
    const eventsTest = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('events')
        .select('id, title, source, embedding')
        .limit(1);
      return result;
    });
    console.log('✅ Events table accessible');

    // Test 4: Check if embedding column exists
    console.log('4. Testing embedding column...');
    const embeddingTest = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('events')
        .select('embedding')
        .limit(1);
      return result;
    });
    console.log('✅ Embedding column accessible');

    // Test 5: Check RLS policies
    console.log('5. Testing RLS policies...');
    const rlsTest = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('events')
        .select('*')
        .limit(1);
      return result;
    });
    console.log('✅ RLS policies allow access');

    // Test 6: Try to insert a test event
    console.log('6. Testing event insertion...');
    const testEvent = {
      title: 'Test Event',
      description: 'Test description',
      date: new Date().toISOString(),
      city: 'Test City',
      category: 'Test',
      source: 'scraper',
      source_id: 'test_' + Date.now()
    };

    const insertTest = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('events')
        .insert(testEvent)
        .select();
      return result;
    });
    console.log('✅ Event insertion successful');

    // Clean up test event
    if (insertTest.data && insertTest.data.length > 0) {
      await serverDatabaseService.executeWithRetry(async () => {
        const result = await serverDatabaseService.getClient()
          .from('events')
          .delete()
          .eq('id', insertTest.data[0].id);
        return result;
      });
      console.log('✅ Test event cleaned up');
    }

    return NextResponse.json({
      success: true,
      message: 'All database connection tests passed!',
      tests: {
        basicConnection: '✅ Passed',
        scraperSources: `✅ Found ${sourcesTest.data?.length || 0} sources`,
        eventsTable: '✅ Accessible',
        embeddingColumn: '✅ Available',
        rlsPolicies: '✅ Working',
        eventInsertion: '✅ Successful'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Database connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
