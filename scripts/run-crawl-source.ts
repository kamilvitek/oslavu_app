#!/usr/bin/env tsx
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') });

async function listSources() {
  try {
    const { serverDatabaseService } = await import('../src/lib/supabase');
    const { data, error } = await serverDatabaseService.executeWithRetry(async () => {
      return await serverDatabaseService.getClient()
        .from('scraper_sources')
        .select('id, name, url, enabled, type')
        .order('name');
    });

    if (error) {
      console.error('❌ Error fetching sources:', error);
      return;
    }

    const sources = data || [];
    console.log('\n📋 Available scraper sources:');
    console.log('─'.repeat(80));
    
    if (sources.length === 0) {
      console.log('No sources found.');
      return;
    }

    sources.forEach((source: any) => {
      const status = source.enabled ? '✅' : '❌';
      console.log(`${status} ${source.name.padEnd(30)} | ${source.type.padEnd(10)} | ${source.id}`);
      console.log(`   ${source.url}`);
    });
    
    console.log('─'.repeat(80));
    console.log(`\n💡 Usage: npm run crawl:source <source-id>`);
    console.log(`   Example: npm run crawl:source ${sources[0]?.id || 'source-id'}\n`);
  } catch (error) {
    console.error('❌ Error listing sources:', error);
  }
}

async function crawlSource(sourceId: string) {
  const startedAt = Date.now();
  console.log(`🚀 Starting crawl for source: ${sourceId}`);
  
  try {
    const { eventScraperService } = await import('../src/lib/services/event-scraper');
    const { serverDatabaseService } = await import('../src/lib/supabase');
    
    // First, verify the source exists
    const { data: source, error: sourceError } = await serverDatabaseService.executeWithRetry(async () => {
      return await serverDatabaseService.getClient()
        .from('scraper_sources')
        .select('id, name, url, enabled, type')
        .eq('id', sourceId)
        .single();
    });

    if (sourceError || !source) {
      console.error(`❌ Source not found: ${sourceId}`);
      console.log('\n💡 Run without arguments to see available sources:');
      console.log('   npm run crawl:source\n');
      process.exit(1);
    }

    if (!source.enabled) {
      console.warn(`⚠️  Source "${source.name}" is disabled.`);
      console.log('   Enable it in the database to run the crawl.');
      process.exit(1);
    }

    console.log(`📝 Source: ${source.name}`);
    console.log(`🔗 URL: ${source.url}`);
    console.log(`📦 Type: ${source.type}\n`);

    // Run the crawl
    const events = await eventScraperService.scrapeSource(sourceId);
    const duration = Date.now() - startedAt;
    
    console.log('\n✅ Crawl completed!');
    console.log(`📊 Events scraped: ${events.length}`);
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s\n`);
    
  } catch (error) {
    console.error('❌ Crawl failed:', error);
    process.exit(1);
  }
}

async function main() {
  const sourceId = process.argv[2];

  if (!sourceId) {
    await listSources();
    process.exit(0);
  }

  await crawlSource(sourceId);
}

if (require.main === module) {
  main().catch((e) => {
    console.error('❌ Unhandled error', e);
    process.exit(1);
  });
}

