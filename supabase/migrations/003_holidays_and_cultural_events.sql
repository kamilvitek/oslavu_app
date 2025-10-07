-- Migration: Add holidays and cultural events system
-- This migration creates tables for managing public holidays and cultural customs globally

-- Create countries table for global support
CREATE TABLE IF NOT EXISTS countries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(3) NOT NULL UNIQUE, -- ISO 3166-1 alpha-3 code (e.g., 'CZE', 'USA', 'DEU')
  name VARCHAR(100) NOT NULL,
  name_native VARCHAR(100), -- Native name of the country
  region VARCHAR(50), -- Europe, North America, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create regions table for sub-national divisions
CREATE TABLE IF NOT EXISTS regions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL, -- Regional code (e.g., 'CZ-PR' for Prague, 'CZ-MO' for Moravia)
  name VARCHAR(100) NOT NULL,
  name_native VARCHAR(100),
  parent_region_id UUID REFERENCES regions(id) ON DELETE CASCADE, -- For hierarchical regions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(country_id, code)
);

-- Create holiday types table
CREATE TABLE IF NOT EXISTS holiday_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE, -- 'public_holiday', 'cultural_event', 'religious_holiday', 'bank_holiday'
  description TEXT,
  impact_level VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create holidays table
CREATE TABLE IF NOT EXISTS holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  name_native VARCHAR(200), -- Native name in local language
  description TEXT,
  holiday_type_id UUID REFERENCES holiday_types(id) ON DELETE RESTRICT,
  country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
  region_id UUID REFERENCES regions(id) ON DELETE CASCADE, -- NULL for country-wide holidays
  date_type VARCHAR(20) NOT NULL DEFAULT 'fixed' CHECK (date_type IN ('fixed', 'variable', 'floating')),
  month INTEGER, -- For fixed dates (1-12)
  day INTEGER, -- For fixed dates (1-31)
  weekday INTEGER, -- For floating dates (0=Sunday, 1=Monday, etc.)
  week_of_month INTEGER, -- For floating dates (1-4, -1 for last week)
  easter_offset INTEGER, -- Days offset from Easter (for Easter-dependent holidays)
  year_start INTEGER, -- First year this holiday was observed
  year_end INTEGER, -- Last year this holiday was observed (NULL for ongoing)
  is_observed BOOLEAN DEFAULT true, -- Whether this holiday is actually observed
  business_impact VARCHAR(20) NOT NULL DEFAULT 'partial' CHECK (business_impact IN ('none', 'partial', 'full')),
  venue_closure_expected BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create holiday_observances table for specific year instances
CREATE TABLE IF NOT EXISTS holiday_observances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  holiday_id UUID REFERENCES holidays(id) ON DELETE CASCADE,
  observed_date DATE NOT NULL,
  is_observed BOOLEAN DEFAULT true,
  notes TEXT, -- Any special notes for this year
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(holiday_id, observed_date)
);

-- Create cultural_events table for non-holiday cultural events
CREATE TABLE IF NOT EXISTS cultural_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  name_native VARCHAR(200),
  description TEXT,
  country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
  region_id UUID REFERENCES regions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'festival', 'tradition', 'celebration', 'religious_observance'
  date_type VARCHAR(20) NOT NULL DEFAULT 'fixed' CHECK (date_type IN ('fixed', 'variable', 'floating')),
  month INTEGER,
  day INTEGER,
  weekday INTEGER,
  week_of_month INTEGER,
  easter_offset INTEGER,
  duration_days INTEGER DEFAULT 1, -- How many days the event lasts
  business_impact VARCHAR(20) NOT NULL DEFAULT 'partial' CHECK (business_impact IN ('none', 'partial', 'full')),
  venue_closure_expected BOOLEAN DEFAULT false,
  year_start INTEGER,
  year_end INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_holidays_country_region ON holidays(country_id, region_id);
CREATE INDEX IF NOT EXISTS idx_holidays_date_type ON holidays(date_type);
CREATE INDEX IF NOT EXISTS idx_holidays_business_impact ON holidays(business_impact);
CREATE INDEX IF NOT EXISTS idx_holiday_observances_date ON holiday_observances(observed_date);
CREATE INDEX IF NOT EXISTS idx_cultural_events_country_region ON cultural_events(country_id, region_id);
CREATE INDEX IF NOT EXISTS idx_cultural_events_business_impact ON cultural_events(business_impact);

-- Insert initial holiday types
INSERT INTO holiday_types (name, description, impact_level) VALUES
('public_holiday', 'Official public holiday with legal status', 'high'),
('cultural_event', 'Traditional cultural celebration or event', 'medium'),
('religious_holiday', 'Religious observance or holiday', 'medium'),
('bank_holiday', 'Banking holiday affecting financial institutions', 'high'),
('regional_holiday', 'Regional or local holiday', 'medium'),
('unofficial_holiday', 'Unofficial but widely observed holiday', 'low');

-- Insert Czech Republic
INSERT INTO countries (code, name, name_native, region) VALUES
('CZE', 'Czech Republic', 'Česká republika', 'Europe');

-- Insert Czech regions
INSERT INTO regions (country_id, code, name, name_native) VALUES
((SELECT id FROM countries WHERE code = 'CZE'), 'CZ-PR', 'Prague', 'Praha'),
((SELECT id FROM countries WHERE code = 'CZE'), 'CZ-CE', 'Central Bohemia', 'Středočeský kraj'),
((SELECT id FROM countries WHERE code = 'CZE'), 'CZ-SO', 'South Bohemia', 'Jihočeský kraj'),
((SELECT id FROM countries WHERE code = 'CZE'), 'CZ-PL', 'Plzeň', 'Plzeňský kraj'),
((SELECT id FROM countries WHERE code = 'CZE'), 'CZ-KA', 'Karlovy Vary', 'Karlovarský kraj'),
((SELECT id FROM countries WHERE code = 'CZE'), 'CZ-US', 'Ústí nad Labem', 'Ústecký kraj'),
((SELECT id FROM countries WHERE code = 'CZE'), 'CZ-LI', 'Liberec', 'Liberecký kraj'),
((SELECT id FROM countries WHERE code = 'CZE'), 'CZ-KR', 'Hradec Králové', 'Královéhradecký kraj'),
((SELECT id FROM countries WHERE code = 'CZE'), 'CZ-PA', 'Pardubice', 'Pardubický kraj'),
((SELECT id FROM countries WHERE code = 'CZE'), 'CZ-VY', 'Vysočina', 'Kraj Vysočina'),
((SELECT id FROM countries WHERE code = 'CZE'), 'CZ-JM', 'South Moravia', 'Jihomoravský kraj'),
((SELECT id FROM countries WHERE code = 'CZE'), 'CZ-OL', 'Olomouc', 'Olomoucký kraj'),
((SELECT id FROM countries WHERE code = 'CZE'), 'CZ-ZL', 'Zlín', 'Zlínský kraj'),
((SELECT id FROM countries WHERE code = 'CZE'), 'CZ-MO', 'Moravia-Silesia', 'Moravskoslezský kraj');

-- Insert Czech public holidays
INSERT INTO holidays (name, name_native, description, holiday_type_id, country_id, date_type, month, day, business_impact, venue_closure_expected, year_start, year_end) VALUES
-- Fixed date holidays
('New Year''s Day', 'Nový rok', 'New Year''s Day', (SELECT id FROM holiday_types WHERE name = 'public_holiday'), (SELECT id FROM countries WHERE code = 'CZE'), 'fixed', 1, 1, 'full', true, 1993, NULL),
('Labour Day', 'Svátek práce', 'International Workers'' Day', (SELECT id FROM holiday_types WHERE name = 'public_holiday'), (SELECT id FROM countries WHERE code = 'CZE'), 'fixed', 5, 1, 'full', true, 1993, NULL),
('Liberation Day', 'Den vítězství', 'Victory Day - end of WWII in Europe', (SELECT id FROM holiday_types WHERE name = 'public_holiday'), (SELECT id FROM countries WHERE code = 'CZE'), 'fixed', 5, 8, 'full', true, 1993, NULL),
('St. Cyril and Methodius Day', 'Den slovanských věrozvěstů Cyrila a Metoděje', 'Slavic missionaries who brought Christianity to the region', (SELECT id FROM holiday_types WHERE name = 'public_holiday'), (SELECT id FROM countries WHERE code = 'CZE'), 'fixed', 7, 5, 'full', true, 1993, NULL),
('Jan Hus Day', 'Den upálení mistra Jana Husa', 'Jan Hus martyrdom day', (SELECT id FROM holiday_types WHERE name = 'public_holiday'), (SELECT id FROM countries WHERE code = 'CZE'), 'fixed', 7, 6, 'full', true, 1993, NULL),
('Czech Statehood Day', 'Den české státnosti', 'St. Wenceslas Day - patron saint of Czech Republic', (SELECT id FROM holiday_types WHERE name = 'public_holiday'), (SELECT id FROM countries WHERE code = 'CZE'), 'fixed', 9, 28, 'full', true, 1993, NULL),
('Independence Day', 'Den vzniku samostatného československého státu', 'Czechoslovak independence day', (SELECT id FROM holiday_types WHERE name = 'public_holiday'), (SELECT id FROM countries WHERE code = 'CZE'), 'fixed', 10, 28, 'full', true, 1993, NULL),
('Struggle for Freedom Day', 'Den boje za svobodu a demokracii', 'Commemorates the Velvet Revolution', (SELECT id FROM holiday_types WHERE name = 'public_holiday'), (SELECT id FROM countries WHERE code = 'CZE'), 'fixed', 11, 17, 'full', true, 1993, NULL),
('Christmas Eve', 'Štědrý den', 'Christmas Eve', (SELECT id FROM holiday_types WHERE name = 'public_holiday'), (SELECT id FROM countries WHERE code = 'CZE'), 'fixed', 12, 24, 'full', true, 1993, NULL),
('Christmas Day', '1. svátek vánoční', 'Christmas Day', (SELECT id FROM holiday_types WHERE name = 'public_holiday'), (SELECT id FROM countries WHERE code = 'CZE'), 'fixed', 12, 25, 'full', true, 1993, NULL),
('St. Stephen''s Day', '2. svátek vánoční', 'Boxing Day', (SELECT id FROM holiday_types WHERE name = 'public_holiday'), (SELECT id FROM countries WHERE code = 'CZE'), 'fixed', 12, 26, 'full', true, 1993, NULL);

-- Insert Easter-dependent holidays
INSERT INTO holidays (name, name_native, description, holiday_type_id, country_id, date_type, easter_offset, business_impact, venue_closure_expected, year_start, year_end) VALUES
('Easter Monday', 'Velikonoční pondělí', 'Easter Monday', (SELECT id FROM holiday_types WHERE name = 'public_holiday'), (SELECT id FROM countries WHERE code = 'CZE'), 'variable', 1, 'full', true, 1993, NULL);

-- Insert Czech cultural events
INSERT INTO cultural_events (name, name_native, description, country_id, region_id, event_type, date_type, month, day, business_impact, venue_closure_expected, year_start, year_end) VALUES
-- Prague-specific events
('Prague Spring International Music Festival', 'Mezinárodní hudební festival Pražské jaro', 'Major classical music festival', (SELECT id FROM countries WHERE code = 'CZE'), (SELECT id FROM regions WHERE code = 'CZ-PR'), 'festival', 'fixed', 5, 12, 'partial', false, 1946, NULL),
('Prague Fringe Festival', 'Prague Fringe Festival', 'International performing arts festival', (SELECT id FROM countries WHERE code = 'CZE'), (SELECT id FROM regions WHERE code = 'CZ-PR'), 'festival', 'fixed', 5, 20, 'partial', false, 2002, NULL),
('Prague Pride', 'Prague Pride', 'LGBTQ+ pride festival', (SELECT id FROM countries WHERE code = 'CZE'), (SELECT id FROM regions WHERE code = 'CZ-PR'), 'festival', 'fixed', 8, 1, 'partial', false, 2011, NULL),
('Prague Autumn International Music Festival', 'Mezinárodní hudební festival Pražský podzim', 'Classical music festival', (SELECT id FROM countries WHERE code = 'CZE'), (SELECT id FROM regions WHERE code = 'CZ-PR'), 'festival', 'fixed', 9, 1, 'partial', false, 1991, NULL);

-- Moravian cultural events (Fixed: these are actually fixed date traditions, not variable)
INSERT INTO cultural_events (name, name_native, description, country_id, region_id, event_type, date_type, month, day, business_impact, venue_closure_expected, year_start, year_end) VALUES
('Ride of the Kings', 'Jízda králů', 'Traditional folk festival in Moravia', (SELECT id FROM countries WHERE code = 'CZE'), (SELECT id FROM regions WHERE code = 'CZ-JM'), 'tradition', 'fixed', 5, 1, 'partial', false, 1800, NULL),
('Hody', 'Hody', 'Traditional harvest festival in Moravia', (SELECT id FROM countries WHERE code = 'CZE'), (SELECT id FROM regions WHERE code = 'CZ-JM'), 'tradition', 'fixed', 9, 1, 'partial', false, 1800, NULL);

-- National cultural events
INSERT INTO cultural_events (name, name_native, description, country_id, region_id, event_type, date_type, month, day, business_impact, venue_closure_expected, year_start, year_end) VALUES
('Czech Beer Festival', 'Český pivní festival', 'National beer festival', (SELECT id FROM countries WHERE code = 'CZE'), NULL, 'festival', 'fixed', 5, 15, 'partial', false, 2008, NULL),
('Czech Christmas Markets', 'Vánoční trhy', 'Traditional Christmas markets', (SELECT id FROM countries WHERE code = 'CZE'), NULL, 'tradition', 'fixed', 11, 25, 'partial', false, 1990, NULL);

-- Insert specific holiday observances for 2025 and 2026 to ensure system works for current/future years
INSERT INTO holiday_observances (holiday_id, observed_date, is_observed, notes) VALUES
-- 2025 Easter Monday (April 21, 2025)
((SELECT id FROM holidays WHERE name = 'Easter Monday' AND country_id = (SELECT id FROM countries WHERE code = 'CZE')), '2025-04-21', true, 'Easter Monday 2025'),
-- 2026 Easter Monday (April 6, 2026)  
((SELECT id FROM holidays WHERE name = 'Easter Monday' AND country_id = (SELECT id FROM countries WHERE code = 'CZE')), '2026-04-06', true, 'Easter Monday 2026');

-- Create a function to calculate Easter date for a given year
CREATE OR REPLACE FUNCTION calculate_easter_date(year INTEGER) RETURNS DATE AS $$
DECLARE
    a INTEGER;
    b INTEGER;
    c INTEGER;
    d INTEGER;
    e INTEGER;
    f INTEGER;
    g INTEGER;
    h INTEGER;
    i INTEGER;
    k INTEGER;
    l INTEGER;
    m INTEGER;
    n INTEGER;
    p INTEGER;
    easter_date DATE;
BEGIN
    -- Anonymous Gregorian algorithm
    a := year % 19;
    b := year / 100;
    c := year % 100;
    d := b / 4;
    e := b % 4;
    f := (b + 8) / 25;
    g := (b - f + 1) / 3;
    h := (19 * a + b - d - g + 15) % 30;
    i := c / 4;
    k := c % 4;
    l := (32 + 2 * e + 2 * i - h - k) % 7;
    m := (a + 11 * h + 22 * l) / 451;
    n := (h + l - 7 * m + 114) / 31;
    p := (h + l - 7 * m + 114) % 31;
    
    easter_date := MAKE_DATE(year, n, p + 1);
    RETURN easter_date;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get holidays for a specific date and location
CREATE OR REPLACE FUNCTION get_holidays_for_date(
    target_date DATE,
    country_code VARCHAR(3),
    region_code VARCHAR(20) DEFAULT NULL
) RETURNS TABLE (
    holiday_name VARCHAR(200),
    holiday_name_native VARCHAR(200),
    holiday_type VARCHAR(50),
    business_impact VARCHAR(20),
    venue_closure_expected BOOLEAN,
    is_observed BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH holiday_calculations AS (
        SELECT 
            h.id,
            h.name,
            h.name_native,
            ht.name as holiday_type,
            h.business_impact,
            h.venue_closure_expected,
            h.date_type,
            h.month,
            h.day,
            h.easter_offset,
            CASE 
                WHEN h.date_type = 'fixed' THEN 
                    DATE(EXTRACT(YEAR FROM target_date)::TEXT || '-' || LPAD(h.month::text, 2, '0') || '-' || LPAD(h.day::text, 2, '0'))
                WHEN h.date_type = 'variable' AND h.easter_offset IS NOT NULL THEN
                    calculate_easter_date(EXTRACT(YEAR FROM target_date)::INTEGER) + INTERVAL '1 day' * h.easter_offset
                ELSE NULL
            END as calculated_date,
            ho.is_observed
        FROM holidays h
        JOIN holiday_types ht ON h.holiday_type_id = ht.id
        JOIN countries c ON h.country_id = c.id
        LEFT JOIN regions r ON h.region_id = r.id
        LEFT JOIN holiday_observances ho ON h.id = ho.holiday_id AND ho.observed_date = target_date
        WHERE c.code = country_code
        AND (region_code IS NULL OR r.code = region_code OR h.region_id IS NULL)
        AND (h.year_start IS NULL OR EXTRACT(YEAR FROM target_date) >= h.year_start)
        AND (h.year_end IS NULL OR EXTRACT(YEAR FROM target_date) <= h.year_end)
    )
    SELECT 
        hc.name,
        hc.name_native,
        hc.holiday_type,
        hc.business_impact,
        hc.venue_closure_expected,
        COALESCE(hc.is_observed, true)
    FROM holiday_calculations hc
    WHERE hc.calculated_date = target_date;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get cultural events for a specific date and location
CREATE OR REPLACE FUNCTION get_cultural_events_for_date(
    target_date DATE,
    country_code VARCHAR(3),
    region_code VARCHAR(20) DEFAULT NULL
) RETURNS TABLE (
    event_name VARCHAR(200),
    event_name_native VARCHAR(200),
    event_type VARCHAR(50),
    business_impact VARCHAR(20),
    venue_closure_expected BOOLEAN,
    duration_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH event_calculations AS (
        SELECT 
            ce.id,
            ce.name,
            ce.name_native,
            ce.event_type,
            ce.business_impact,
            ce.venue_closure_expected,
            ce.date_type,
            ce.month,
            ce.day,
            ce.easter_offset,
            ce.duration_days,
            CASE 
                WHEN ce.date_type = 'fixed' THEN 
                    DATE(EXTRACT(YEAR FROM target_date)::TEXT || '-' || LPAD(ce.month::text, 2, '0') || '-' || LPAD(ce.day::text, 2, '0'))
                WHEN ce.date_type = 'variable' AND ce.easter_offset IS NOT NULL THEN
                    calculate_easter_date(EXTRACT(YEAR FROM target_date)::INTEGER) + INTERVAL '1 day' * ce.easter_offset
                ELSE NULL
            END as calculated_date
        FROM cultural_events ce
        JOIN countries c ON ce.country_id = c.id
        LEFT JOIN regions r ON ce.region_id = r.id
        WHERE c.code = country_code
        AND (region_code IS NULL OR r.code = region_code OR ce.region_id IS NULL)
        AND (ce.year_start IS NULL OR EXTRACT(YEAR FROM target_date) >= ce.year_start)
        AND (ce.year_end IS NULL OR EXTRACT(YEAR FROM target_date) <= ce.year_end)
    )
    SELECT 
        ec.name,
        ec.name_native,
        ec.event_type,
        ec.business_impact,
        ec.venue_closure_expected,
        ec.duration_days
    FROM event_calculations ec
    WHERE ec.calculated_date = target_date
    OR (ec.duration_days > 1 AND target_date BETWEEN ec.calculated_date AND ec.calculated_date + INTERVAL '1 day' * (ec.duration_days - 1));
END;
$$ LANGUAGE plpgsql;
