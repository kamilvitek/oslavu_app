-- Fix source names to be consistent
UPDATE scraper_sources SET name = 'GoOut_Brno' WHERE name = 'GoOut.cz';
UPDATE scraper_sources SET name = 'BrnoExpat' WHERE name = 'Brno Expat';

-- Verify the changes
SELECT name, url, enabled FROM scraper_sources ORDER BY name;
