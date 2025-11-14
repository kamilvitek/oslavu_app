-- Add WorkzSpace event source if it doesn't already exist
-- WorkzSpace is a coworking & business hub in Hodonín that hosts various events
-- Source: https://www.workzspace.cz/event-list

INSERT INTO scraper_sources (name, url, type, config, enabled)
SELECT * FROM (VALUES
  ('WorkzSpace Events', 'https://www.workzspace.cz/event-list', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true, "city": "Hodonín"}'::jsonb, true)
) AS new_sources(name, url, type, config, enabled)
WHERE NOT EXISTS (
  SELECT 1 FROM scraper_sources WHERE scraper_sources.url = new_sources.url
);

