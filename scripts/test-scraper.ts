#!/usr/bin/env tsx

/**
 * Test script for the web scraper API endpoints
 * 
 * Usage:
 *   npm run scrape:test
 *   npm run scrape:run
 */

import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error('❌ CRON_SECRET not found in environment variables');
  console.error('Please set CRON_SECRET in your .env.local file');
  process.exit(1);
}

/**
 * Check if the server is running
 */
async function checkServerConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/scraper/status`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    return response.ok || response.status < 500;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return false;
    }
    // ECONNREFUSED means server isn't running
    return false;
  }
}

interface ScraperTestResult {
  success: boolean;
  data?: any;
  error?: string;
  duration_ms?: number;
}

/**
 * Test the scraper sync endpoint
 */
async function testScraperSync(): Promise<ScraperTestResult> {
  console.log('🧪 Testing scraper sync endpoint...');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/api/scraper/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(300000) // 5 minute timeout for sync
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    const duration = Date.now() - startTime;
    
    console.log('📊 Scraper sync result:', {
      status: response.status,
      success: result.success,
      duration: `${duration}ms`,
      eventsCreated: result.data?.created || 0,
      eventsSkipped: result.data?.skipped || 0,
      errors: result.data?.errors?.length || 0
    });
    
    return {
      success: result.success,
      data: result.data,
      error: result.error,
      duration_ms: duration
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ Scraper sync test failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: duration
    };
  }
}

/**
 * Test the scraper status endpoint
 */
async function testScraperStatus(): Promise<ScraperTestResult> {
  console.log('📊 Testing scraper status endpoint...');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/api/scraper/status`, {
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    const duration = Date.now() - startTime;
    
    console.log('📊 Scraper status result:', {
      status: response.status,
      success: result.success,
      duration: `${duration}ms`,
      totalScrapedEvents: result.data?.totalScrapedEvents || 0,
      activeSources: result.data?.activeSources?.length || 0,
      lastSync: result.data?.lastSync?.timestamp || 'Never'
    });
    
    return {
      success: result.success,
      data: result.data,
      error: result.error,
      duration_ms: duration
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Provide more helpful error messages
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('❌ Scraper status test failed: Request timed out');
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        console.error('❌ Scraper status test failed: Connection refused - server may not be running');
      } else {
        console.error('❌ Scraper status test failed:', error.message);
      }
    } else {
      console.error('❌ Scraper status test failed:', error);
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: duration
    };
  }
}

/**
 * Test the scraped events query endpoint
 */
async function testScrapedEvents(): Promise<ScraperTestResult> {
  console.log('🔍 Testing scraped events query endpoint...');
  
  const startTime = Date.now();
  
  try {
    const queryParams = new URLSearchParams({
      city: 'Brno',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      category: 'Music',
      size: '10'
    });
    
    const response = await fetch(`${BASE_URL}/api/events/scraped?${queryParams.toString()}`, {
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    const duration = Date.now() - startTime;
    
    console.log('🔍 Scraped events query result:', {
      status: response.status,
      success: result.success,
      duration: `${duration}ms`,
      eventsFound: result.data?.events?.length || 0,
      total: result.data?.total || 0
    });
    
    return {
      success: result.success,
      data: result.data,
      error: result.error,
      duration_ms: duration
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ Scraped events query test failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: duration
    };
  }
}

/**
 * Test unauthorized access
 */
async function testUnauthorizedAccess(): Promise<ScraperTestResult> {
  console.log('🔒 Testing unauthorized access...');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/api/scraper/sync`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid-token',
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    const result = await response.json();
    const duration = Date.now() - startTime;
    
    const isUnauthorized = response.status === 401;
    
    console.log('🔒 Unauthorized access test result:', {
      status: response.status,
      isUnauthorized,
      duration: `${duration}ms`,
      message: result.message || result.error
    });
    
    return {
      success: isUnauthorized,
      data: result,
      error: isUnauthorized ? undefined : 'Expected 401 status',
      duration_ms: duration
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ Unauthorized access test failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: duration
    };
  }
}

/**
 * Run all tests
 */
async function runAllTests(): Promise<void> {
  console.log('🚀 Starting scraper API tests...\n');
  
  // Check if server is running first
  console.log('🔍 Checking if server is running...');
  const serverRunning = await checkServerConnection();
  
  if (!serverRunning) {
    console.error('\n❌ Server is not running or not accessible!');
    console.error(`   Tried to connect to: ${BASE_URL}`);
    console.error('\n💡 To fix this:');
    console.error('   1. Start the development server: npm run dev');
    console.error('   2. Wait for the server to start (usually takes a few seconds)');
    console.error('   3. Run this test again: npm run scrape:test');
    console.error('\n💡 Alternative: Run scraper directly without API:');
    console.error('   npm run scrape:run');
    process.exit(1);
  }
  
  console.log(`✅ Server is running at ${BASE_URL}\n`);
  
  const tests = [
    { name: 'Scraper Status', fn: testScraperStatus },
    { name: 'Scraped Events Query', fn: testScrapedEvents },
    { name: 'Unauthorized Access', fn: testUnauthorizedAccess },
    { name: 'Scraper Sync', fn: testScraperSync }
  ];
  
  const results: Array<{ name: string; result: ScraperTestResult }> = [];
  
  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    const result = await test.fn();
    results.push({ name: test.name, result });
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  
  let passed = 0;
  let failed = 0;
  
  results.forEach(({ name, result }) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const duration = result.duration_ms ? ` (${result.duration_ms}ms)` : '';
    console.log(`${status} ${name}${duration}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    if (result.success) {
      passed++;
    } else {
      failed++;
    }
  });
  
  console.log(`\n🎯 Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('\n💡 Tips:');
    console.log('- Make sure the development server is running (npm run dev)');
    console.log('- Check that all environment variables are set correctly');
    console.log('- Verify database connection and migrations');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
  }
}

/**
 * Run only the scraper sync test
 */
async function runScraperSync(): Promise<void> {
  console.log('🚀 Running scraper sync...\n');
  
  const result = await testScraperSync();
  
  if (result.success) {
    console.log('\n🎉 Scraper sync completed successfully!');
    console.log(`📊 Created: ${result.data?.created || 0} events`);
    console.log(`📊 Skipped: ${result.data?.skipped || 0} events`);
    console.log(`📊 Errors: ${result.data?.errors?.length || 0}`);
    console.log(`⏱️ Duration: ${result.duration_ms}ms`);
  } else {
    console.log('\n❌ Scraper sync failed!');
    console.log(`Error: ${result.error}`);
    process.exit(1);
  }
}

// Main execution
async function main(): Promise<void> {
  const command = process.argv[2];
  
  switch (command) {
    case 'sync':
    case 'run':
      await runScraperSync();
      break;
    case 'test':
    default:
      await runAllTests();
      break;
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
