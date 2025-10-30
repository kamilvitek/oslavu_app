#!/usr/bin/env tsx
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

const { eventScraperService } = require('../src/lib/services/event-scraper');

async function main() {
  const sourceId = process.argv[2];
  if (!sourceId) {
    console.error('Usage: tsx scripts/test-firecrawl-crawl.ts <source_id>');
    process.exit(1);
  }

  console.log(`🚀 Running crawl for source: ${sourceId}`);
  const started = Date.now();
  try {
    const events = await eventScraperService.scrapeSource(sourceId);
    const duration = Date.now() - started;
    console.log(`✅ Completed. Extracted ${events.length} events in ${duration}ms`);
    console.log(events.slice(0, 3));
  } catch (e) {
    const duration = Date.now() - started;
    console.error(`❌ Crawl failed after ${duration}ms`, e);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('❌ Unhandled error', e);
  process.exit(1);
});


