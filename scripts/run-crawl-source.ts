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
    console.log(`\n💡 Usage: npm run crawl:source <source-id-or-name>`);
    console.log(`   Examples:`);
    console.log(`   - npm run crawl:source ${sources[0]?.id || 'source-id'}`);
    console.log(`   - npm run crawl:source "${sources[0]?.name || 'Source Name'}"`);
    console.log(`   - npm run crawl:source JIC Events\n`);
  } catch (error) {
    console.error('❌ Error listing sources:', error);
  }
}

// Helper function to check if a string looks like a UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

async function findSourceByIdentifier(identifier: string) {
  const { serverDatabaseService } = await import('../src/lib/supabase');
  
  // If it looks like a UUID, try to find by ID first
  if (isUUID(identifier)) {
    const { data, error } = await serverDatabaseService.executeWithRetry(async () => {
      return await serverDatabaseService.getClient()
        .from('scraper_sources')
        .select('id, name, url, enabled, type')
        .eq('id', identifier)
        .single();
    });
    
    if (!error && data) {
      return data;
    }
  }
  
  // Try to find by name (case-insensitive, partial match)
  const { data, error } = await serverDatabaseService.executeWithRetry(async () => {
    return await serverDatabaseService.getClient()
      .from('scraper_sources')
      .select('id, name, url, enabled, type')
      .ilike('name', `%${identifier}%`)
      .order('name');
  });
  
  if (error || !data || data.length === 0) {
    return null;
  }
  
  // If multiple matches, return the first exact match, or the first result
  const exactMatch = data.find((s: any) => s.name.toLowerCase() === identifier.toLowerCase());
  if (exactMatch) {
    return exactMatch;
  }
  
  // If multiple matches, return all for user to choose
  if (data.length > 1) {
    return { multiple: true, sources: data };
  }
  
  return data[0];
}

async function crawlSource(sourceIdentifier: string) {
  const startedAt = Date.now();
  console.log(`🚀 Starting crawl for source: ${sourceIdentifier}`);
  
  try {
    const { eventScraperService } = await import('../src/lib/services/event-scraper');
    
    // Find the source by ID or name
    const sourceResult = await findSourceByIdentifier(sourceIdentifier);
    
    // Handle multiple matches
    if (sourceResult && typeof sourceResult === 'object' && 'multiple' in sourceResult) {
      console.error(`\n❌ Multiple sources found matching "${sourceIdentifier}":\n`);
      (sourceResult as any).sources.forEach((source: any) => {
        const status = source.enabled ? '✅' : '❌';
        console.log(`   ${status} ${source.name.padEnd(30)} | ${source.type.padEnd(10)} | ${source.id}`);
      });
      console.log('\n💡 Please use the exact source ID or a more specific name.\n');
      process.exit(1);
    }
    
    // Handle not found
    if (!sourceResult) {
      console.error(`❌ Source not found: ${sourceIdentifier}`);
      console.log('\n💡 Run without arguments to see available sources:');
      console.log('   npm run crawl:source\n');
      process.exit(1);
    }
    
    const source = sourceResult as any;

    if (!source.enabled) {
      console.warn(`⚠️  Source "${source.name}" is disabled.`);
      console.log('   Enable it in the database to run the crawl.');
      process.exit(1);
    }

    console.log(`📝 Source: ${source.name}`);
    console.log(`🔗 URL: ${source.url}`);
    console.log(`📦 Type: ${source.type}\n`);

    // Run the crawl using the source ID
    const events = await eventScraperService.scrapeSource(source.id);
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
  // Join all arguments after script name to handle spaces in names
  // process.argv[0] = node/tsx, process.argv[1] = script path, process.argv[2+] = arguments
  const sourceIdentifier = process.argv.slice(2).join(' ');

  if (!sourceIdentifier) {
    await listSources();
    process.exit(0);
  }

  await crawlSource(sourceIdentifier);
}

if (require.main === module) {
  main().catch((e) => {
    console.error('❌ Unhandled error', e);
    process.exit(1);
  });
}

