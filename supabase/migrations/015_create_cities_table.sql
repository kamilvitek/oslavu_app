-- Migration: Create cities table with population and nearby cities data
-- This table stores city information including population, coordinates, and nearby cities
-- Used for small city fallback logic to find nearby larger cities that could impact attendance

CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en TEXT NOT NULL, -- English name for APIs (e.g., "Prague")
  name_cs TEXT, -- Czech name (e.g., "Praha")
  country_code TEXT NOT NULL DEFAULT 'CZ',
  population INTEGER,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  nearby_cities JSONB, -- Array of nearby city IDs with distances: [{"city_id": "uuid", "distance_km": 25.5}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name_en, country_code)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_cities_name_en ON cities(name_en);
CREATE INDEX IF NOT EXISTS idx_cities_name_cs ON cities(name_cs);
CREATE INDEX IF NOT EXISTS idx_cities_country ON cities(country_code);
CREATE INDEX IF NOT EXISTS idx_cities_population ON cities(population);
CREATE INDEX IF NOT EXISTS idx_cities_coordinates ON cities(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_cities_updated_at_trigger
  BEFORE UPDATE ON cities
  FOR EACH ROW
  EXECUTE FUNCTION update_cities_updated_at();

-- Insert major Czech cities with population data
-- Data source: Czech Statistical Office (approximate 2024 population)
INSERT INTO cities (name_en, name_cs, country_code, population, latitude, longitude) VALUES
  ('Prague', 'Praha', 'CZ', 1300000, 50.0755, 14.4378),
  ('Brno', 'Brno', 'CZ', 380000, 49.1951, 16.6068),
  ('Ostrava', 'Ostrava', 'CZ', 290000, 49.8209, 18.2625),
  ('Plzen', 'Plzeň', 'CZ', 170000, 49.7475, 13.3775),
  ('Liberec', 'Liberec', 'CZ', 104000, 50.7663, 15.0543),
  ('Olomouc', 'Olomouc', 'CZ', 100000, 49.5938, 17.2509),
  ('Ceske Budejovice', 'České Budějovice', 'CZ', 94000, 48.9745, 14.4747),
  ('Hradec Kralove', 'Hradec Králové', 'CZ', 93000, 50.2104, 15.8252),
  ('Usti nad Labem', 'Ústí nad Labem', 'CZ', 92000, 50.6611, 14.0531),
  ('Pardubice', 'Pardubice', 'CZ', 90000, 50.0344, 15.7812),
  ('Zlin', 'Zlín', 'CZ', 75000, 49.2265, 17.6707),
  ('Havirov', 'Havířov', 'CZ', 72000, 49.7798, 18.4369),
  ('Kladno', 'Kladno', 'CZ', 70000, 50.1477, 14.1028),
  ('Most', 'Most', 'CZ', 67000, 50.5030, 13.6362),
  ('Karlovy Vary', 'Karlovy Vary', 'CZ', 49000, 50.2305, 12.8711),
  ('Jihlava', 'Jihlava', 'CZ', 51000, 49.3961, 15.5912),
  ('Teplice', 'Teplice', 'CZ', 50000, 50.6404, 13.8245),
  ('Decin', 'Děčín', 'CZ', 49000, 50.7821, 14.2148),
  ('Chomutov', 'Chomutov', 'CZ', 48000, 50.4605, 13.4176),
  ('Jablonec nad Nisou', 'Jablonec nad Nisou', 'CZ', 45000, 50.7243, 15.1711)
ON CONFLICT (name_en, country_code) DO NOTHING;

-- Calculate and store nearby cities relationships for Czech cities
-- This helps identify which larger cities could impact attendance in smaller cities
-- We'll update this after all cities are inserted using a DO block

DO $$
DECLARE
  prague_id UUID;
  brno_id UUID;
  ostrava_id UUID;
  kladno_id UUID;
  jihlava_id UUID;
  havirov_id UUID;
BEGIN
  -- Get city IDs
  SELECT id INTO prague_id FROM cities WHERE name_en = 'Prague' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO brno_id FROM cities WHERE name_en = 'Brno' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO ostrava_id FROM cities WHERE name_en = 'Ostrava' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO kladno_id FROM cities WHERE name_en = 'Kladno' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO jihlava_id FROM cities WHERE name_en = 'Jihlava' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO havirov_id FROM cities WHERE name_en = 'Havirov' AND country_code = 'CZ' LIMIT 1;

  -- Update nearby_cities for smaller cities near Prague
  IF kladno_id IS NOT NULL AND prague_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', prague_id, 'distance_km', 25, 'impact_factor', 0.8)
    ) WHERE id = kladno_id;
  END IF;

  -- Update nearby_cities for cities near Brno
  IF jihlava_id IS NOT NULL AND brno_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', brno_id, 'distance_km', 30, 'impact_factor', 0.7)
    ) WHERE id = jihlava_id;
  END IF;

  -- Update nearby_cities for cities near Ostrava
  IF havirov_id IS NOT NULL AND ostrava_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', ostrava_id, 'distance_km', 15, 'impact_factor', 0.9)
    ) WHERE id = havirov_id;
  END IF;
END $$;

-- Add comment to table
COMMENT ON TABLE cities IS 'Stores city information including population, coordinates, and nearby cities for small city fallback logic';
COMMENT ON COLUMN cities.name_en IS 'English city name used for API calls (e.g., "Prague")';
COMMENT ON COLUMN cities.name_cs IS 'Czech city name (e.g., "Praha")';
COMMENT ON COLUMN cities.population IS 'City population (used to determine if city is "small" for fallback logic)';
COMMENT ON COLUMN cities.nearby_cities IS 'JSON array of nearby city IDs with distances and impact factors';

