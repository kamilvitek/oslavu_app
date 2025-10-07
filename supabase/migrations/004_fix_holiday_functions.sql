-- Fix migration: Correct the holiday functions
-- This fixes the PostgreSQL syntax errors in the holiday system

-- Fix the calculate_easter_date function
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

-- Fix the get_holidays_for_date function
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

-- Fix the get_cultural_events_for_date function
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
