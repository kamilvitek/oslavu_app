#!/usr/bin/env tsx
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') });

const { eventScraperService } = require('../src/lib/services/event-scraper');

async function main() {
  const startedAt = Date.now();
  console.log('🚀 Starting crawl for all enabled sources...');
  try {
    const result = await eventScraperService.scrapeAllSources();
    const duration = Date.now() - startedAt;
    console.log('📊 Crawl summary:', result);
    console.log(`⏱️ Total duration: ${duration}ms`);
    if (result.errors && result.errors.length > 0) {
      process.exitCode = 1;
    }
  } catch (e) {
    console.error('❌ Crawl failed:', e);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error('❌ Unhandled error', e);
    process.exit(1);
  });
}


