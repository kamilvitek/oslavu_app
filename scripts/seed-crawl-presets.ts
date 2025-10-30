#!/usr/bin/env tsx
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

import { serverDatabaseService } from '@/lib/supabase';
import { CrawlConfigurationService } from '@/lib/services/crawl-configuration.service';

async function seedPresets() {
  const db = serverDatabaseService;
  const { data, error } = await db.executeWithRetry(async () => {
    return await db.getClient().from('scraper_sources').select('id, name, url, crawl_config, use_crawl, max_pages_per_crawl');
  });
  if (error) {
    console.error('❌ Failed to fetch scraper_sources', error);
    process.exit(1);
  }
  const sources = (data as any[]) ?? [];
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


