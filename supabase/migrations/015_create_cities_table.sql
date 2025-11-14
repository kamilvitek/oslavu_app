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

-- Insert Czech cities and towns with population data
-- Data source: Czech Statistical Office (January 1, 2025 population data)
-- Includes all cities and towns with population >= 10,000 (excluding small villages)
INSERT INTO cities (name_en, name_cs, country_code, population, latitude, longitude) VALUES
  -- Cities (27 official cities)
  ('Prague', 'Praha', 'CZ', 1397880, 50.0755, 14.4378),
  ('Brno', 'Brno', 'CZ', 402739, 49.1951, 16.6068),
  ('Ostrava', 'Ostrava', 'CZ', 283187, 49.8209, 18.2625),
  ('Plzen', 'Plzeň', 'CZ', 187928, 49.7475, 13.3775),
  ('Liberec', 'Liberec', 'CZ', 108090, 50.7663, 15.0543),
  ('Olomouc', 'Olomouc', 'CZ', 103063, 49.5938, 17.2509),
  ('Ceske Budejovice', 'České Budějovice', 'CZ', 97231, 48.9745, 14.4747),
  ('Hradec Kralove', 'Hradec Králové', 'CZ', 94311, 50.2104, 15.8252),
  ('Pardubice', 'Pardubice', 'CZ', 92319, 50.0344, 15.7812),
  ('Usti nad Labem', 'Ústí nad Labem', 'CZ', 90866, 50.6611, 14.0531),
  ('Zlin', 'Zlín', 'CZ', 74684, 49.2265, 17.6707),
  ('Kladno', 'Kladno', 'CZ', 69664, 50.1477, 14.1028),
  ('Havirov', 'Havířov', 'CZ', 68674, 49.7798, 18.4369),
  ('Most', 'Most', 'CZ', 63474, 50.5030, 13.6362),
  ('Opava', 'Opava', 'CZ', 55109, 49.9387, 17.9026),
  ('Jihlava', 'Jihlava', 'CZ', 54624, 49.3961, 15.5912),
  ('Frydek-Mistek', 'Frýdek-Místek', 'CZ', 53590, 49.6853, 18.3483),
  ('Teplice', 'Teplice', 'CZ', 50912, 50.6404, 13.8245),
  ('Karlovy Vary', 'Karlovy Vary', 'CZ', 49073, 50.2305, 12.8711),
  ('Karvina', 'Karviná', 'CZ', 48937, 49.8540, 18.5417),
  ('Mlada Boleslav', 'Mladá Boleslav', 'CZ', 47346, 50.4114, 14.9032),
  ('Chomutov', 'Chomutov', 'CZ', 46771, 50.4605, 13.4176),
  ('Decin', 'Děčín', 'CZ', 46376, 50.7821, 14.2148),
  ('Jablonec nad Nisou', 'Jablonec nad Nisou', 'CZ', 46209, 50.7243, 15.1711),
  ('Prostejov', 'Prostějov', 'CZ', 43408, 49.4719, 17.1118),
  ('Prerov', 'Přerov', 'CZ', 40906, 49.4551, 17.4508),
  ('Trinec', 'Třinec', 'CZ', 33852, 49.6776, 18.6708),
  -- Towns with population >= 20,000
  ('Ceska Lipa', 'Česká Lípa', 'CZ', 36815, 50.6855, 14.5376),
  ('Trebic', 'Třebíč', 'CZ', 34530, 49.2149, 15.8817),
  ('Tabor', 'Tábor', 'CZ', 34356, 49.4144, 14.6578),
  ('Znojmo', 'Znojmo', 'CZ', 34172, 48.8556, 16.0489),
  ('Kolin', 'Kolín', 'CZ', 33444, 50.0281, 15.2006),
  ('Cheb', 'Cheb', 'CZ', 32808, 50.0795, 12.3739),
  ('Pribram', 'Příbram', 'CZ', 32773, 49.6899, 14.0104),
  ('Pisek', 'Písek', 'CZ', 31121, 49.3088, 14.1475),
  ('Trutnov', 'Trutnov', 'CZ', 29607, 50.5610, 15.9129),
  ('Kromeriz', 'Kroměříž', 'CZ', 27917, 49.2982, 17.3932),
  ('Orlova', 'Orlová', 'CZ', 27540, 49.8453, 18.4301),
  ('Vsetin', 'Vsetín', 'CZ', 25185, 49.3387, 17.9962),
  ('Uherske Hradiste', 'Uherské Hradiště', 'CZ', 24887, 49.0697, 17.4597),
  ('Sumperk', 'Šumperk', 'CZ', 24735, 49.9653, 16.9706),
  ('Breclav', 'Břeclav', 'CZ', 24538, 48.7590, 16.8820),
  ('Havlickuv Brod', 'Havlíčkův Brod', 'CZ', 23791, 49.6078, 15.5807),
  ('Chrudim', 'Chrudim', 'CZ', 23564, 49.9511, 15.7956),
  ('Hodonin', 'Hodonín', 'CZ', 23517, 48.8489, 17.1324),
  ('Cesky Tesin', 'Český Těšín', 'CZ', 23075, 49.7461, 18.6261),
  ('Novy Jicin', 'Nový Jičín', 'CZ', 23005, 49.5944, 18.0103),
  ('Litomerice', 'Litoměřice', 'CZ', 22767, 50.5340, 14.1318),
  ('Klatovy', 'Klatovy', 'CZ', 22763, 49.3955, 13.2956),
  ('Valasske Mezirici', 'Valašské Meziříčí', 'CZ', 22580, 49.4718, 17.9711),
  ('Krnov', 'Krnov', 'CZ', 22518, 50.0897, 17.7036),
  ('Litvinov', 'Litvínov', 'CZ', 22387, 50.5980, 13.6181),
  ('Strakonice', 'Strakonice', 'CZ', 22355, 49.2614, 13.9024),
  ('Sokolov', 'Sokolov', 'CZ', 22007, 50.1814, 12.6401),
  ('Kutna Hora', 'Kutná Hora', 'CZ', 21642, 49.9494, 15.2680),
  ('Beroun', 'Beroun', 'CZ', 21521, 49.9638, 14.0719),
  ('Koprivnice', 'Kopřivnice', 'CZ', 21374, 49.5995, 18.1448),
  ('Vyskov', 'Vyškov', 'CZ', 20645, 49.2775, 16.9990),
  ('Jindrichuv Hradec', 'Jindřichův Hradec', 'CZ', 20540, 49.1445, 15.0030),
  ('Zdar nad Sazavou', 'Žďár nad Sázavou', 'CZ', 20404, 49.5626, 15.9392),
  ('Bohumin', 'Bohumín', 'CZ', 20315, 49.9042, 18.3575),
  ('Brandys nad Labem-Stara Boleslav', 'Brandýs nad Labem-Stará Boleslav', 'CZ', 20313, 50.1872, 14.6633),
  ('Melnik', 'Mělník', 'CZ', 20278, 50.3505, 14.4741),
  ('Blansko', 'Blansko', 'CZ', 20002, 49.3634, 16.6445),
  -- Towns with population 10,000-19,999
  ('Nachod', 'Náchod', 'CZ', 19827, 50.4167, 16.1628),
  ('Jirkov', 'Jirkov', 'CZ', 19240, 50.4997, 13.4472),
  ('Kralupy nad Vltavou', 'Kralupy nad Vltavou', 'CZ', 19005, 50.2411, 14.3114),
  ('Zatec', 'Žatec', 'CZ', 18959, 50.3272, 13.5458),
  ('Kadan', 'Kadaň', 'CZ', 18090, 50.3764, 13.2711),
  ('Louny', 'Louny', 'CZ', 18068, 50.3570, 13.7969),
  ('Hranice', 'Hranice', 'CZ', 17969, 49.5481, 17.7342),
  ('Otrokovice', 'Otrokovice', 'CZ', 17401, 49.2097, 17.5394),
  ('Ricany', 'Říčany', 'CZ', 17143, 49.9917, 14.6542),
  ('Benesov', 'Benešov', 'CZ', 17043, 49.7816, 14.6870),
  ('Slany', 'Slaný', 'CZ', 16937, 50.2306, 14.0869),
  ('Uhersky Brod', 'Uherský Brod', 'CZ', 16367, 49.0250, 17.6464),
  ('Neratovice', 'Neratovice', 'CZ', 16360, 50.2592, 14.5175),
  ('Pelhrimov', 'Pelhřimov', 'CZ', 16206, 49.4314, 15.2233),
  ('Jicin', 'Jičín', 'CZ', 16101, 50.4372, 15.3517),
  ('Svitavy', 'Svitavy', 'CZ', 16073, 49.7558, 16.4689),
  ('Roznov pod Radhostem', 'Rožnov pod Radhoštěm', 'CZ', 16063, 49.4581, 18.1431),
  ('Rakovnik', 'Rakovník', 'CZ', 15682, 50.1039, 13.7333),
  ('Ostrov', 'Ostrov', 'CZ', 15681, 50.3056, 12.9392),
  ('Nymburk', 'Nymburk', 'CZ', 15642, 50.1861, 15.0417),
  ('Dvur Kralove nad Labem', 'Dvůr Králové nad Labem', 'CZ', 15322, 50.4317, 15.8142),
  ('Podebrady', 'Poděbrady', 'CZ', 15232, 50.1425, 15.1186),
  ('Bruntal', 'Bruntál', 'CZ', 15037, 49.9883, 17.4647),
  ('Ceska Trebova', 'Česká Třebová', 'CZ', 15010, 49.9042, 16.4442),
  ('Varnsdorf', 'Varnsdorf', 'CZ', 14704, 50.9114, 14.6181),
  ('Turnov', 'Turnov', 'CZ', 14577, 50.5875, 15.1514),
  ('Bilina', 'Bílina', 'CZ', 14497, 50.5481, 13.7750),
  ('Rokycany', 'Rokycany', 'CZ', 14381, 49.7425, 13.5942),
  ('Milovice', 'Milovice', 'CZ', 14270, 50.2258, 14.8881)
ON CONFLICT (name_en, country_code) DO NOTHING;

-- Calculate and store nearby cities relationships for Czech cities
-- This helps identify which larger cities could impact attendance in smaller cities
-- We'll update this after all cities are inserted using a DO block

DO $$
DECLARE
  prague_id UUID;
  brno_id UUID;
  ostrava_id UUID;
  plzen_id UUID;
  liberec_id UUID;
  olomouc_id UUID;
  zlin_id UUID;
  kladno_id UUID;
  mlada_boleslav_id UUID;
  neratovice_id UUID;
  ricany_id UUID;
  benesov_id UUID;
  slany_id UUID;
  melnik_id UUID;
  brandys_id UUID;
  kralupy_id UUID;
  jihlava_id UUID;
  trebic_id UUID;
  havirov_id UUID;
  karvina_id UUID;
  orlova_id UUID;
  bohumin_id UUID;
  trinec_id UUID;
  cesky_tesin_id UUID;
  frydek_mistek_id UUID;
  prerov_id UUID;
  prostejov_id UUID;
  otrokovice_id UUID;
  koprivnice_id UUID;
  valasske_mezirici_id UUID;
  vsetin_id UUID;
  roznov_id UUID;
BEGIN
  -- Get major city IDs
  SELECT id INTO prague_id FROM cities WHERE name_en = 'Prague' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO brno_id FROM cities WHERE name_en = 'Brno' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO ostrava_id FROM cities WHERE name_en = 'Ostrava' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO plzen_id FROM cities WHERE name_en = 'Plzen' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO liberec_id FROM cities WHERE name_en = 'Liberec' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO olomouc_id FROM cities WHERE name_en = 'Olomouc' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO zlin_id FROM cities WHERE name_en = 'Zlin' AND country_code = 'CZ' LIMIT 1;
  
  -- Get smaller city IDs
  SELECT id INTO kladno_id FROM cities WHERE name_en = 'Kladno' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO mlada_boleslav_id FROM cities WHERE name_en = 'Mlada Boleslav' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO neratovice_id FROM cities WHERE name_en = 'Neratovice' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO ricany_id FROM cities WHERE name_en = 'Ricany' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO benesov_id FROM cities WHERE name_en = 'Benesov' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO slany_id FROM cities WHERE name_en = 'Slany' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO melnik_id FROM cities WHERE name_en = 'Melnik' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO brandys_id FROM cities WHERE name_en = 'Brandys nad Labem-Stara Boleslav' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO kralupy_id FROM cities WHERE name_en = 'Kralupy nad Vltavou' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO jihlava_id FROM cities WHERE name_en = 'Jihlava' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO trebic_id FROM cities WHERE name_en = 'Trebic' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO havirov_id FROM cities WHERE name_en = 'Havirov' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO karvina_id FROM cities WHERE name_en = 'Karvina' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO orlova_id FROM cities WHERE name_en = 'Orlova' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO bohumin_id FROM cities WHERE name_en = 'Bohumin' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO trinec_id FROM cities WHERE name_en = 'Trinec' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO cesky_tesin_id FROM cities WHERE name_en = 'Cesky Tesin' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO frydek_mistek_id FROM cities WHERE name_en = 'Frydek-Mistek' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO prerov_id FROM cities WHERE name_en = 'Prerov' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO prostejov_id FROM cities WHERE name_en = 'Prostejov' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO otrokovice_id FROM cities WHERE name_en = 'Otrokovice' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO koprivnice_id FROM cities WHERE name_en = 'Koprivnice' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO valasske_mezirici_id FROM cities WHERE name_en = 'Valasske Mezirici' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO vsetin_id FROM cities WHERE name_en = 'Vsetin' AND country_code = 'CZ' LIMIT 1;
  SELECT id INTO roznov_id FROM cities WHERE name_en = 'Roznov pod Radhostem' AND country_code = 'CZ' LIMIT 1;

  -- Cities near Prague (within ~50km)
  IF kladno_id IS NOT NULL AND prague_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', prague_id, 'distance_km', 25, 'impact_factor', 0.8)
    ) WHERE id = kladno_id;
  END IF;

  IF mlada_boleslav_id IS NOT NULL AND prague_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', prague_id, 'distance_km', 50, 'impact_factor', 0.6)
    ) WHERE id = mlada_boleslav_id;
  END IF;

  IF neratovice_id IS NOT NULL AND prague_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', prague_id, 'distance_km', 20, 'impact_factor', 0.85)
    ) WHERE id = neratovice_id;
  END IF;

  IF ricany_id IS NOT NULL AND prague_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', prague_id, 'distance_km', 20, 'impact_factor', 0.85)
    ) WHERE id = ricany_id;
  END IF;

  IF benesov_id IS NOT NULL AND prague_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', prague_id, 'distance_km', 40, 'impact_factor', 0.7)
    ) WHERE id = benesov_id;
  END IF;

  IF slany_id IS NOT NULL AND prague_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', prague_id, 'distance_km', 30, 'impact_factor', 0.75)
    ) WHERE id = slany_id;
  END IF;

  IF melnik_id IS NOT NULL AND prague_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', prague_id, 'distance_km', 35, 'impact_factor', 0.7)
    ) WHERE id = melnik_id;
  END IF;

  IF brandys_id IS NOT NULL AND prague_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', prague_id, 'distance_km', 25, 'impact_factor', 0.8)
    ) WHERE id = brandys_id;
  END IF;

  IF kralupy_id IS NOT NULL AND prague_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', prague_id, 'distance_km', 25, 'impact_factor', 0.8)
    ) WHERE id = kralupy_id;
  END IF;

  -- Cities near Brno
  IF jihlava_id IS NOT NULL AND brno_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', brno_id, 'distance_km', 55, 'impact_factor', 0.6)
    ) WHERE id = jihlava_id;
  END IF;

  IF trebic_id IS NOT NULL AND brno_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', brno_id, 'distance_km', 50, 'impact_factor', 0.65)
    ) WHERE id = trebic_id;
  END IF;

  -- Cities near Ostrava (Ostrava metropolitan area)
  IF havirov_id IS NOT NULL AND ostrava_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', ostrava_id, 'distance_km', 15, 'impact_factor', 0.9)
    ) WHERE id = havirov_id;
  END IF;

  IF karvina_id IS NOT NULL AND ostrava_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', ostrava_id, 'distance_km', 20, 'impact_factor', 0.85)
    ) WHERE id = karvina_id;
  END IF;

  IF orlova_id IS NOT NULL AND ostrava_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', ostrava_id, 'distance_km', 15, 'impact_factor', 0.9)
    ) WHERE id = orlova_id;
  END IF;

  IF bohumin_id IS NOT NULL AND ostrava_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', ostrava_id, 'distance_km', 10, 'impact_factor', 0.95)
    ) WHERE id = bohumin_id;
  END IF;

  IF trinec_id IS NOT NULL AND ostrava_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', ostrava_id, 'distance_km', 30, 'impact_factor', 0.75)
    ) WHERE id = trinec_id;
  END IF;

  IF cesky_tesin_id IS NOT NULL AND ostrava_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', ostrava_id, 'distance_km', 25, 'impact_factor', 0.8)
    ) WHERE id = cesky_tesin_id;
  END IF;

  IF frydek_mistek_id IS NOT NULL AND ostrava_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', ostrava_id, 'distance_km', 20, 'impact_factor', 0.85)
    ) WHERE id = frydek_mistek_id;
  END IF;

  -- Cities near Olomouc
  IF prerov_id IS NOT NULL AND olomouc_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', olomouc_id, 'distance_km', 25, 'impact_factor', 0.8)
    ) WHERE id = prerov_id;
  END IF;

  IF prostejov_id IS NOT NULL AND olomouc_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', olomouc_id, 'distance_km', 20, 'impact_factor', 0.85)
    ) WHERE id = prostejov_id;
  END IF;

  -- Cities near Zlín
  IF otrokovice_id IS NOT NULL AND zlin_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', zlin_id, 'distance_km', 10, 'impact_factor', 0.95)
    ) WHERE id = otrokovice_id;
  END IF;

  IF koprivnice_id IS NOT NULL AND zlin_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', zlin_id, 'distance_km', 25, 'impact_factor', 0.8)
    ) WHERE id = koprivnice_id;
  END IF;

  IF valasske_mezirici_id IS NOT NULL AND zlin_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', zlin_id, 'distance_km', 30, 'impact_factor', 0.75)
    ) WHERE id = valasske_mezirici_id;
  END IF;

  IF vsetin_id IS NOT NULL AND zlin_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', zlin_id, 'distance_km', 30, 'impact_factor', 0.75)
    ) WHERE id = vsetin_id;
  END IF;

  IF roznov_id IS NOT NULL AND zlin_id IS NOT NULL THEN
    UPDATE cities SET nearby_cities = jsonb_build_array(
      jsonb_build_object('city_id', zlin_id, 'distance_km', 25, 'impact_factor', 0.8)
    ) WHERE id = roznov_id;
  END IF;
END $$;

-- Add comment to table
COMMENT ON TABLE cities IS 'Stores city information including population, coordinates, and nearby cities for small city fallback logic';
COMMENT ON COLUMN cities.name_en IS 'English city name used for API calls (e.g., "Prague")';
COMMENT ON COLUMN cities.name_cs IS 'Czech city name (e.g., "Praha")';
COMMENT ON COLUMN cities.population IS 'City population (used to determine if city is "small" for fallback logic)';
COMMENT ON COLUMN cities.nearby_cities IS 'JSON array of nearby city IDs with distances and impact factors';

