// Test Firecrawl API directly
require('dotenv').config({ path: '.env.local' });
const FirecrawlApp = require('@mendable/firecrawl-js').default;

async function testFirecrawl() {
  console.log('🔍 Testing Firecrawl API directly...');
  console.log('🔍 API Key:', process.env.FIRECRAWL_API_KEY ? 'SET' : 'NOT SET');
  
  const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
  
  try {
    console.log('🔍 Scraping https://httpbin.org/html...');
    const result = await app.scrape('https://httpbin.org/html', {
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor: 2000,
      timeout: 30000
    });
    
    console.log('✅ Firecrawl response structure:');
    console.log('Success:', result.success);
    console.log('Has data:', !!result.data);
    console.log('Has markdown:', !!result.data?.markdown);
    console.log('Has metadata:', !!result.data?.metadata);
    console.log('Full response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Firecrawl test failed:', error);
  }
}

testFirecrawl();
