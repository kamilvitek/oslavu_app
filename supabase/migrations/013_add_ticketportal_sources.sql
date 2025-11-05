-- Add TicketPortal sources if they don't already exist
-- This migration ensures all requested TicketPortal category pages are in the scraper_sources table

INSERT INTO scraper_sources (name, url, type, config, enabled)
SELECT * FROM (VALUES
  ('TicketPortal Music', 'https://www.ticketportal.cz/hudba', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb, true),
  ('TicketPortal Theatre', 'https://www.ticketportal.cz/divadlo', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb, true),
  ('TicketPortal Shows', 'https://www.ticketportal.cz/show', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb, true),
  ('TicketPortal Kids', 'https://www.ticketportal.cz/pro-deti', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb, true),
  ('TicketPortal Social Events', 'https://www.ticketportal.cz/do-spolecnosti', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb, true),
  ('TicketPortal Sports', 'https://www.ticketportal.cz/sport', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb, true),
  ('TicketPortal O2 Arena', 'https://www.ticketportal.cz/o2-arena', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb, true),
  ('TicketPortal O2 Universum', 'https://www.ticketportal.cz/o2-universum', 'firecrawl', '{"waitFor": 2000, "onlyMainContent": true}'::jsonb, true)
) AS new_sources(name, url, type, config, enabled)
WHERE NOT EXISTS (
  SELECT 1 FROM scraper_sources WHERE scraper_sources.url = new_sources.url
);

