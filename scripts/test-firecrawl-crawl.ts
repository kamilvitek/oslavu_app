#!/usr/bin/env tsx
import { config } from 'dotenv';
import path from 'path';

// Ensure env is loaded before dynamic imports
config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const { eventScraperService } = await import('../src/lib/services/event-scraper');
  const { serverDatabaseService } = await import('../src/lib/supabase');
  const sourceIdentifier = process.argv[2];
  if (!sourceIdentifier) {
    console.error('Usage: tsx scripts/test-firecrawl-crawl.ts <source_id_or_name>');
    process.exit(1);
  }

  // Check if it's a UUID (source ID) or a name
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sourceIdentifier);
  let sourceId = sourceIdentifier;

  // If it's not a UUID, try to find by name
  if (!isUUID) {
    console.log(`🔍 Looking up source by name: "${sourceIdentifier}"`);
    const { data, error } = await serverDatabaseService.executeWithRetry(async () => {
      return await serverDatabaseService.getClient()
        .from('scraper_sources')
        .select('id, name')
        .ilike('name', `%${sourceIdentifier}%`)
        .limit(1)
        .single();
    });

    if (error || !data) {
      console.error(`❌ Source not found: "${sourceIdentifier}"`);
      console.error('   Please use a valid source ID (UUID) or source name');
      process.exit(1);
    }

    sourceId = data.id;
    console.log(`✅ Found source: "${data.name}" (ID: ${sourceId})`);
  }

  console.log(`🚀 Running crawl for source: ${sourceId}`);
  const started = Date.now();
  try {
    const events = await eventScraperService.scrapeSource(sourceId);
    const duration = Date.now() - started;
    console.log(`✅ Completed. Extracted ${events.length} events in ${duration}ms`);
    if (events.length > 0) {
      console.log('\n📋 Sample events:');
      events.slice(0, 3).forEach((e, i) => {
        console.log(`  ${i + 1}. ${e.title} - ${e.date} (${e.city})`);
      });
    }
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


