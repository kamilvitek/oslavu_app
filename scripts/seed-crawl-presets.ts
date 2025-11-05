#!/usr/bin/env tsx
import { config } from 'dotenv';
import path from 'path';

// Load env BEFORE importing any project modules (ESM import hoisting would otherwise run imports first)
config({ path: path.resolve(process.cwd(), '.env.local') });

async function seedPresets() {
  const { serverDatabaseService } = await import('@/lib/supabase');
  const { CrawlConfigurationService } = await import('@/lib/services/crawl-configuration.service');
  const db = serverDatabaseService;
  // Fetch all sources with pagination (Supabase defaults to 1000 row limit)
  const pageSize = 1000;
  let offset = 0;
  let sources: any[] = [];
  while (true) {
    const { data, error } = await db.executeWithRetry(async () => {
      return await db.getClient()
        .from('scraper_sources')
        .select('id, name, url, crawl_config, use_crawl, max_pages_per_crawl')
        .range(offset, offset + pageSize - 1);
    });
    if (error) {
      console.error('❌ Failed to fetch scraper_sources page', { offset, error });
      process.exit(1);
    }
    const chunk = (data as any[]) ?? [];
    sources = sources.concat(chunk);
    if (chunk.length < pageSize) break;
    offset += pageSize;
  }
  console.log(`🔧 Found ${sources.length} sources`);

  let updated = 0;
  for (const s of sources) {
    try {
      const hostname = new URL(s.url).hostname;
      const presetKey = CrawlConfigurationService.getPresetForHost(hostname);
      const preset = CrawlConfigurationService.buildPreset(presetKey);
      const merged = CrawlConfigurationService.mergeConfig(
        { ...(s.crawl_config ?? {}), startUrls: [s.url] },
        { ...preset, maxPages: s.max_pages_per_crawl ?? 50 }
      );
      CrawlConfigurationService.validateConfig(merged);

      const { error: upErr } = await db.executeWithRetry(async () => {
        return await db.getClient()
          .from('scraper_sources')
          .update({
            crawl_config: merged as any,
            use_crawl: true,
            max_pages_per_crawl: s.max_pages_per_crawl ?? 50,
          })
          .eq('id', s.id);
      });
      if (upErr) throw upErr;
      updated++;
      console.log(`✅ Updated ${s.name} (${presetKey})`);
    } catch (e) {
      console.warn(`⚠️ Skipped ${s.name}:`, e);
    }
  }

  console.log(`\n🎯 Presets applied to ${updated}/${sources.length} sources`);
}

if (require.main === module) {
  seedPresets().catch((e) => {
    console.error('❌ Seeding crawl presets failed', e);
    process.exit(1);
  });
}


