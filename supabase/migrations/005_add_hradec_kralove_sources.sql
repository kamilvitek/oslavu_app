-- Add Hradec Králové specific event sources
-- This migration adds comprehensive event sources for Hradec Králové

-- Insert Hradec Králové specific scraper sources
INSERT INTO scraper_sources (name, url, type, config, enabled) VALUES
  -- Official city sources
  ('Hradec Králové Info Center', 'https://www.hkinfo.cz/en/calendar-of-events', 'firecrawl', '{"waitFor": 3000, "onlyMainContent": true, "city": "Hradec Králové"}'::jsonb, true),
  ('Hradec Králové Region Tourism', 'https://www.hkregion.cz/redakce/index.php?events_type=2&lanG=en&pageev=1&subakce=eventsearch', 'firecrawl', '{"waitFor": 3000, "onlyMainContent": true, "city": "Hradec Králové"}'::jsonb, true),
  
  -- Major Czech event platforms for Hradec Králové
  ('GoOut Hradec Králové', 'https://goout.net/cs/hradec-kralove/akce/', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true, "city": "Hradec Králové"}'::jsonb, true),
  ('TicketPortal Hradec Králové', 'https://www.ticketportal.cz/hradec-kralove', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true, "city": "Hradec Králové"}'::jsonb, true),
  
  -- Venue-specific sources
  ('Hradec Králové Arena', 'https://www.hradeckralove.cz/arena', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true, "city": "Hradec Králové"}'::jsonb, true),
  ('Klicper Theatre', 'https://www.klicperovodivadlo.cz/program/', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true, "city": "Hradec Králové"}'::jsonb, true),
  ('Filharmonie Hradec Králové', 'https://www.filharmoniehk.cz/program/', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true, "city": "Hradec Králové"}'::jsonb, true),
  ('University of Hradec Králové Events', 'https://www.uhk.cz/cs/akce', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true, "city": "Hradec Králové"}'::jsonb, true),
  
  -- Cultural centers and venues
  ('Galerie moderního umění', 'https://www.gmuhk.cz/akce/', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true, "city": "Hradec Králové"}'::jsonb, true),
  ('Knihovna města Hradce Králové', 'https://www.knihovnahk.cz/akce/', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true, "city": "Hradec Králové"}'::jsonb, true),
  ('Kulturní centrum Aldis', 'https://www.aldis.cz/akce/', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true, "city": "Hradec Králové"}'::jsonb, true),
  
  -- Additional Czech event platforms with Hradec Králové focus
  ('AllEvents Hradec Králové', 'https://allevents.in/hradec-kralove', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true, "city": "Hradec Králové"}'::jsonb, true),
  ('ME-TICKET Hradec Králové', 'https://me-ticket.com/catalog/czech-republic/hradec-kralove', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true, "city": "Hradec Králové"}'::jsonb, true),
  
  -- Music and entertainment specific
  ('Songkick Hradec Králové', 'https://www.songkick.com/metro-areas/28413-czech-republic-hradec-kralove', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true, "city": "Hradec Králové"}'::jsonb, true),
  ('Bandsintown Hradec Králové', 'https://www.bandsintown.com/c/hradec-kralove-czech-republic', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true, "city": "Hradec Králové"}'::jsonb, true),
  
  -- Regional sources
  ('Královehradecko Info', 'https://www.kralovehradecko-info.cz/en/akce.php', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true, "city": "Hradec Králové"}'::jsonb, true),
  ('Koobit Hradec Králové', 'https://www.koobit.com/czechia-l166/hradec-kralove-l753', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true, "city": "Hradec Králové"}'::jsonb, true)
ON CONFLICT (name) DO UPDATE SET
  url = EXCLUDED.url,
  type = EXCLUDED.type,
  config = EXCLUDED.config,
  enabled = EXCLUDED.enabled,
  updated_at = NOW();

-- Add Hradec Králové specific venue mappings
-- This will be handled by the venue-city-mapping service, but we can add some specific venues
-- Note: The venue mappings are handled in the application code, not in the database
