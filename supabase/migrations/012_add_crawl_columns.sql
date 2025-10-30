-- Oslavu: Firecrawl crawling upgrade - DB changes
-- Adds crawl configuration/state to scraper_sources, crawl metrics to sync_logs,
-- and additional event detail fields to events.

-- scraper_sources: crawl config and scheduling
ALTER TABLE IF EXISTS public.scraper_sources
  ADD COLUMN IF NOT EXISTS crawl_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS max_pages_per_crawl INTEGER,
  ADD COLUMN IF NOT EXISTS crawl_frequency INTERVAL,
  ADD COLUMN IF NOT EXISTS crawl_state JSONB,
  ADD COLUMN IF NOT EXISTS use_crawl BOOLEAN NOT NULL DEFAULT false;

-- Helpful index for reading crawl-enabled sources
CREATE INDEX IF NOT EXISTS idx_scraper_sources_use_crawl
  ON public.scraper_sources (use_crawl);

-- sync_logs: capture crawl performance metrics
ALTER TABLE IF NOT EXISTS public.sync_logs
  ADD COLUMN IF NOT EXISTS pages_crawled INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pages_processed INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS crawl_duration_ms BIGINT;

-- events: persist richer detail page fields
ALTER TABLE IF NOT EXISTS public.events
  ADD COLUMN IF NOT EXISTS detail_url TEXT,
  ADD COLUMN IF NOT EXISTS image_urls TEXT[],
  ADD COLUMN IF NOT EXISTS price_min NUMERIC,
  ADD COLUMN IF NOT EXISTS price_max NUMERIC;

-- Optional: index detail_url for quick existence checks/deduping by URL
CREATE INDEX IF NOT EXISTS idx_events_detail_url
  ON public.events (detail_url);

-- Optional: functional index to quickly filter events that have images
-- CREATE INDEX IF NOT EXISTS idx_events_has_images ON public.events ((image_urls IS NOT NULL));


