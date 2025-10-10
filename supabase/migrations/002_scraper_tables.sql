-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing tables if they exist (to avoid conflicts)
DROP TABLE IF EXISTS sync_logs CASCADE;
DROP TABLE IF EXISTS scraper_sources CASCADE;

-- Create scraper_sources table
CREATE TABLE IF NOT EXISTS scraper_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('firecrawl', 'agentql', 'api')),
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sync_logs table
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('in_progress', 'success', 'error')),
  events_processed INTEGER DEFAULT 0,
  events_created INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  events_skipped INTEGER DEFAULT 0,
  errors TEXT[],
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER
);

-- Add embedding column to events table for semantic deduplication
-- First check if column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'embedding') THEN
        ALTER TABLE events ADD COLUMN embedding VECTOR(1536);
    END IF;
END $$;

-- Update events table to allow scraper sources
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_source_check;
ALTER TABLE events ADD CONSTRAINT events_source_check 
  CHECK (source IN ('ticketmaster', 'meetup', 'predicthq', 'manual', 'brno', 'goout', 'brnoexpat', 'firecrawl', 'agentql', 'scraper'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scraper_sources_enabled ON scraper_sources(enabled);
CREATE INDEX IF NOT EXISTS idx_sync_logs_source ON sync_logs(source);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_events_embedding ON events USING ivfflat (embedding vector_cosine_ops);

-- Drop existing function if it exists (to avoid signature conflicts)
DROP FUNCTION IF EXISTS match_events(VECTOR, FLOAT, INT);
DROP FUNCTION IF EXISTS match_events(VECTOR, DOUBLE PRECISION, INTEGER);

-- Create function for semantic similarity search
CREATE OR REPLACE FUNCTION match_events(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.85,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  date TIMESTAMP WITH TIME ZONE,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    events.id,
    events.title,
    events.date,
    1 - (events.embedding <=> query_embedding) AS similarity
  FROM events
  WHERE events.embedding IS NOT NULL
    AND 1 - (events.embedding <=> query_embedding) > match_threshold
  ORDER BY events.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Enable RLS for new tables
ALTER TABLE scraper_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Scraper sources are publicly readable
CREATE POLICY "Scraper sources are publicly readable" ON scraper_sources
  FOR SELECT USING (true);

-- Sync logs are publicly readable for monitoring
CREATE POLICY "Sync logs are publicly readable" ON sync_logs
  FOR SELECT USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_scraper_sources_updated_at BEFORE UPDATE ON scraper_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default scraper sources
INSERT INTO scraper_sources (name, url, type, config) VALUES
  ('GoOut.cz', 'https://www.goout.net/cs/brno/', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('GoOut_Prague', 'https://goout.net/cs/praha/akce/', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('Brno Expat', 'https://www.brnoexpatcentre.eu/events/', 'firecrawl', '{"waitFor": 3000, "onlyMainContent": true}'::jsonb),
  ('TicketPortal Music', 'https://www.ticketportal.cz/hudba', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('TicketPortal Theatre', 'https://www.ticketportal.cz/divadlo', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('TicketPortal Shows', 'https://www.ticketportal.cz/show', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('TicketPortal Festivals', 'https://www.ticketportal.cz/festivaly', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('TicketPortal Kids', 'https://www.ticketportal.cz/pro-deti', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('TicketPortal Sports', 'https://www.ticketportal.cz/sport', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('TicketPortal Cinema', 'https://www.ticketportal.cz/kino', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('TicketPortal O2 Arena', 'https://www.ticketportal.cz/o2-arena', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('TicketPortal O2 Universum', 'https://www.ticketportal.cz/o2-universum', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('Bandzone', 'https://bandzone.cz/', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('Eventlook', 'https://www.eventlook.cz/', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('CC Events', 'https://cc.cz/eventy/', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('Forbes Events', 'https://forbes.cz/eventy/', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('JIC Events', 'https://www.jic.cz/cz/akce', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('Impact Hub Calendar', 'https://impacthub.cz/kalendar/', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('BVV Calendar', 'https://www.bvv.cz/kalendar', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('Forum Karlin Program', 'https://www.forumkarlin.cz/program/', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('Cubex Centrum Events', 'https://www.cubexcentrum.cz/navstevnici/#event-calendar', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('ND Brno Program', 'https://www.ndbrno.cz/program/', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('Sono Program', 'https://www.sono.cz/program/', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('La Fabrika Program', 'https://www.lafabrika.cz/cs/program', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('DOX Whats On', 'https://www.dox.cz/en/whats-on', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('Navystavisti Program Page 1', 'https://navystavisti.cz/program/?stranka=1', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('Navystavisti Program Page 2', 'https://navystavisti.cz/program/?stranka=2', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('Navystavisti Program Page 3', 'https://navystavisti.cz/program/?stranka=3', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('Navystavisti Program Page 4', 'https://navystavisti.cz/program/?stranka=4', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('Navystavisti Program Page 5', 'https://navystavisti.cz/program/?stranka=5', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('Navystavisti Program Page 6', 'https://navystavisti.cz/program/?stranka=6', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('Velryba Koncerty', 'https://www.velryba.cz/koncerty', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('Pragokoncert', 'https://www.pragokoncert.com/cs/koncerty', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('Masters of Rock Cafe', 'https://www.mastersofrockcafe.cz/cs/koncerty/', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('Reduta Jazz Club', 'https://www.redutajazzclub.cz/program-cs', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb),
  ('Guarant Event Calendar', 'https://guarant.cz/en/event-calendar-2/', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb)
ON CONFLICT DO NOTHING;
