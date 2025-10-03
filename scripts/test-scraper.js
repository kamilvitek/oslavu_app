#!/usr/bin/env node

/**
 * Test script for the web scraper functionality
 * Run with: node scripts/test-scraper.js
 */

const { eventScraperService } = require('../src/lib/services/event-scraper');

async function testScraper() {
  console.log('🔍 Testing Web Scraper Infrastructure...\n');
  
  try {
    // Test 1: Connection test
    console.log('1. Testing scraper connection...');
    const connectionTest = await eventScraperService.testConnection();
    console.log(`   ${connectionTest.success ? '✅' : '❌'} ${connectionTest.message}\n`);
    
    if (!connectionTest.success) {
      console.log('❌ Connection test failed. Please check your environment variables:');
      console.log('   - FIRECRAWL_API_KEY');
      console.log('   - OPENAI_API_KEY');
      console.log('   - Database connection');
      return;
    }
    
    // Test 2: Scrape all sources (if connection is successful)
    console.log('2. Testing scrape all sources...');
    const scrapeResult = await eventScraperService.scrapeAllSources();
    console.log(`   ✅ Scraping completed:`);
    console.log(`   - Created: ${scrapeResult.created}`);
    console.log(`   - Skipped: ${scrapeResult.skipped}`);
    console.log(`   - Errors: ${scrapeResult.errors.length}`);
    
    if (scrapeResult.errors.length > 0) {
      console.log(`   - Error details: ${scrapeResult.errors.join(', ')}`);
    }
    
    console.log('\n🎉 Web scraper infrastructure is ready!');
    console.log('\nNext steps:');
    console.log('1. Set up your environment variables in .env.local');
    console.log('2. Run the Supabase migration: supabase db push');
    console.log('3. Test the scraper via the API: GET /api/scraper?action=test');
    console.log('4. Start scraping: GET /api/scraper?action=scrape');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure all dependencies are installed: npm install');
    console.error('2. Check your environment variables');
    console.error('3. Ensure the database is accessible');
  }
}

// Run the test
testScraper();
