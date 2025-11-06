-- Oslavu: Enhanced scraper configuration for incremental crawling and better extraction
-- Adds last_crawled_at tracking and crawl_state for incremental crawling

-- Add last_crawled_at to scraper_sources if not exists
ALTER TABLE IF EXISTS public.scraper_sources
  ADD COLUMN IF NOT EXISTS last_crawled_at TIMESTAMP WITH TIME ZONE;

-- Add crawl_state JSONB for tracking crawl progress if not exists
ALTER TABLE IF EXISTS public.scraper_sources
  ADD COLUMN IF NOT EXISTS crawl_state JSONB DEFAULT '{}'::jsonb;

-- Add index for last_crawled_at to optimize incremental crawl queries
CREATE INDEX IF NOT EXISTS idx_scraper_sources_last_crawled_at
  ON public.scraper_sources (last_crawled_at);

-- Add index for crawl_state to optimize queries
CREATE INDEX IF NOT EXISTS idx_scraper_sources_crawl_state
  ON public.scraper_sources USING GIN (crawl_state);

-- Add metadata column to sync_logs for enhanced metrics if not exists
ALTER TABLE IF EXISTS public.sync_logs
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for metadata to optimize queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_metadata
  ON public.sync_logs USING GIN (metadata);

