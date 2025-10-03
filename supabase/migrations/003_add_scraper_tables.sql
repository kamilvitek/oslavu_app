-- Enable pgvector extension for semantic deduplication
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to existing events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS events_embedding_idx 
ON events USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create function for semantic similarity matching
CREATE OR REPLACE FUNCTION match_events(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.85,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title varchar,
  date date,
  city varchar,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.date,
    e.city,
    1 - (e.embedding <=> query_embedding) as similarity
  FROM events e
  WHERE e.embedding IS NOT NULL
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create scraper_sources configuration table
CREATE TABLE IF NOT EXISTS scraper_sources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name varchar(100) NOT NULL UNIQUE,
  url text NOT NULL,
  type varchar(20) NOT NULL CHECK (type IN ('firecrawl', 'agentql', 'api')),
  enabled boolean DEFAULT true,
  config jsonb DEFAULT '{}',
  last_scraped_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- Create sync_logs table for tracking scraper runs
CREATE TABLE IF NOT EXISTS sync_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source varchar(50) NOT NULL,
  status varchar(20) NOT NULL CHECK (status IN ('in_progress', 'success', 'error')),
  events_processed integer DEFAULT 0,
  events_created integer DEFAULT 0,
  events_updated integer DEFAULT 0,
  events_skipped integer DEFAULT 0,
  errors jsonb DEFAULT '[]',
  started_at timestamp with time zone NOT NULL,
  completed_at timestamp with time zone,
  duration_ms integer,
  metadata jsonb DEFAULT '{}'
);

-- Insert initial Czech event sources
INSERT INTO scraper_sources (name, url, type, config) VALUES
  ('GoOut_Brno', 'https://goout.net/cs/brno/akce/', 'firecrawl', 
   '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('GoOut_Prague', 'https://goout.net/cs/praha/akce/', 'firecrawl',
   '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('BrnoExpat', 'https://www.brnoexpat.com/events/', 'firecrawl',
   '{"waitFor": 2000, "onlyMainContent": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_scraper_sources_enabled ON scraper_sources(enabled);
