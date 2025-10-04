#!/usr/bin/env node

/**
 * Simple test script to verify Firecrawl API key and basic functionality
 */

const FirecrawlApp = require('@mendable/firecrawl-js').default;
require('dotenv').config({ path: '.env.local' });

async function testFirecrawl() {
  console.log('🧪 Testing Firecrawl API connection...');
  
  const apiKey = process.env.FIRECRAWL_API_KEY;
  
  if (!apiKey) {
    console.error('❌ FIRECRAWL_API_KEY not found in environment variables');
    process.exit(1);
  }
  
  console.log('✅ Firecrawl API key found:', apiKey.substring(0, 8) + '...');
  
  try {
    const firecrawl = new FirecrawlApp({ apiKey });
    
    // Test with a simple, reliable website
    console.log('🔍 Testing basic scraping with a simple website...');
    const result = await firecrawl.scrape('https://httpbin.org/html', {
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor: 1000,
      timeout: 10000
    });
    
    console.log('📊 Firecrawl test result:', {
      success: result.success,
      hasData: !!result.data,
      hasMarkdown: !!result.data?.markdown,
      markdownLength: result.data?.markdown?.length || 0,
      error: result.error,
      fullResult: JSON.stringify(result, null, 2)
    });
    
    if (result.success && result.data?.markdown) {
      console.log('✅ Firecrawl API is working correctly!');
      console.log('📄 Sample content:', result.data.markdown.substring(0, 200) + '...');
    } else {
      console.error('❌ Firecrawl API test failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Firecrawl test error:', error.message);
    console.error('Full error:', error);
  }
}

testFirecrawl();
