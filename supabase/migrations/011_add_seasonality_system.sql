-- Migration: Add seasonality system for enhanced conflict analysis
-- This migration creates tables for managing seasonal demand patterns and holiday impact rules
-- to enhance the existing conflict scoring algorithm with expert domain knowledge.

-- =============================================================================
-- SEASONAL RULES TABLE
-- =============================================================================
-- Stores monthly demand patterns for different event categories and subcategories
-- Based on expert domain knowledge and industry best practices

CREATE TABLE IF NOT EXISTS seasonal_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  region VARCHAR(50) NOT NULL DEFAULT 'CZ', -- ISO country code or region identifier
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  
  -- Core seasonal metrics
  demand_multiplier DECIMAL(3,2) NOT NULL CHECK (demand_multiplier >= 0.10 AND demand_multiplier <= 3.00),
  conflict_weight DECIMAL(3,2) NOT NULL CHECK (conflict_weight >= 0.50 AND conflict_weight <= 2.00),
  venue_availability DECIMAL(3,2) NOT NULL CHECK (venue_availability >= 0.00 AND venue_availability <= 1.00),
  
  -- Quality and confidence metrics
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0.00 AND confidence <= 1.00),
  data_source VARCHAR(50) NOT NULL DEFAULT 'expert_rules', -- 'expert_rules', 'historical_data', 'ai_analysis'
  
  -- Documentation and maintenance
  reasoning TEXT NOT NULL, -- Human-readable explanation of the seasonal pattern
  expert_source VARCHAR(200), -- Name/credentials of expert who defined this rule
  last_updated_by VARCHAR(100), -- User who last modified this rule
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique combination of category, subcategory, region, and month
  UNIQUE(category, subcategory, region, month)
);

-- =============================================================================
-- HOLIDAY IMPACT RULES TABLE
-- =============================================================================
-- Defines how holidays affect different event categories with specific multipliers
-- and impact windows (days before/after holiday)

CREATE TABLE IF NOT EXISTS holiday_impact_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  holiday_type VARCHAR(50) NOT NULL, -- References holiday_types.name
  event_category VARCHAR(100) NOT NULL,
  event_subcategory VARCHAR(100), -- Optional subcategory-specific rules
  
  -- Impact window definition
  days_before INTEGER NOT NULL DEFAULT 0 CHECK (days_before >= 0 AND days_before <= 14),
  days_after INTEGER NOT NULL DEFAULT 0 CHECK (days_after >= 0 AND days_after <= 14),
  
  -- Impact multipliers
  impact_multiplier DECIMAL(3,2) NOT NULL CHECK (impact_multiplier >= 0.10 AND impact_multiplier <= 5.00),
  impact_type VARCHAR(20) NOT NULL DEFAULT 'conflict' CHECK (impact_type IN ('conflict', 'demand', 'availability', 'combined')),
  
  -- Regional and temporal scope
  region VARCHAR(50) NOT NULL DEFAULT 'CZ',
  year_start INTEGER, -- First year this rule applies
  year_end INTEGER, -- Last year this rule applies (NULL for ongoing)
  
  -- Quality metrics
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0.00 AND confidence <= 1.00),
  data_source VARCHAR(50) NOT NULL DEFAULT 'expert_analysis',
  
  -- Documentation
  reasoning TEXT NOT NULL,
  expert_source VARCHAR(200),
  last_updated_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique combination
  UNIQUE(holiday_type, event_category, event_subcategory, region)
);

-- =============================================================================
-- SEASONAL INSIGHTS CACHE TABLE
-- =============================================================================
-- Caches calculated seasonal insights to improve performance
-- Automatically populated and maintained by the seasonality engine

CREATE TABLE IF NOT EXISTS seasonal_insights_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key VARCHAR(200) NOT NULL UNIQUE, -- Hash of category, subcategory, region, month
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  region VARCHAR(50) NOT NULL,
  month INTEGER NOT NULL,
  
  -- Cached calculations
  demand_score DECIMAL(3,2) NOT NULL,
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('very_low', 'low', 'medium', 'high', 'very_high')),
  optimal_score DECIMAL(3,2) NOT NULL, -- 0-1 score for how optimal this month is
  
  -- Metadata
  calculation_method VARCHAR(50) NOT NULL DEFAULT 'seasonal_rules',
  confidence DECIMAL(3,2) NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- No inline indexes - will be created separately below
);

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Seasonal rules indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_seasonal_rules_lookup 
ON seasonal_rules(category, subcategory, region, month);

CREATE INDEX IF NOT EXISTS idx_seasonal_rules_category 
ON seasonal_rules(category, region);

CREATE INDEX IF NOT EXISTS idx_seasonal_rules_month 
ON seasonal_rules(month, region);

-- Holiday impact rules indexes
CREATE INDEX IF NOT EXISTS idx_holiday_impact_lookup 
ON holiday_impact_rules(holiday_type, event_category, event_subcategory, region);

CREATE INDEX IF NOT EXISTS idx_holiday_impact_category 
ON holiday_impact_rules(event_category, region);

CREATE INDEX IF NOT EXISTS idx_holiday_impact_type 
ON holiday_impact_rules(holiday_type, region);

-- Seasonal insights cache indexes
CREATE INDEX IF NOT EXISTS idx_seasonal_cache_key 
ON seasonal_insights_cache(cache_key);

CREATE INDEX IF NOT EXISTS idx_seasonal_cache_lookup 
ON seasonal_insights_cache(category, subcategory, region, month);

CREATE INDEX IF NOT EXISTS idx_seasonal_cache_expiry 
ON seasonal_insights_cache(expires_at);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get seasonal multiplier for a specific date and category
CREATE OR REPLACE FUNCTION get_seasonal_multiplier(
  target_date DATE,
  event_category VARCHAR(100),
  event_subcategory VARCHAR(100) DEFAULT NULL,
  target_region VARCHAR(50) DEFAULT 'CZ'
) RETURNS TABLE (
  multiplier DECIMAL(3,2),
  confidence DECIMAL(3,2),
  reasoning TEXT,
  data_source VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.demand_multiplier,
    sr.confidence,
    sr.reasoning,
    sr.data_source
  FROM seasonal_rules sr
  WHERE sr.category = event_category
    AND (sr.subcategory = event_subcategory OR (sr.subcategory IS NULL AND event_subcategory IS NULL))
    AND sr.region = target_region
    AND sr.month = EXTRACT(MONTH FROM target_date)
  ORDER BY sr.confidence DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get holiday impact multiplier for a specific date and category
CREATE OR REPLACE FUNCTION get_holiday_impact_multiplier(
  target_date DATE,
  event_category VARCHAR(100),
  event_subcategory VARCHAR(100) DEFAULT NULL,
  target_region VARCHAR(50) DEFAULT 'CZ'
) RETURNS TABLE (
  total_multiplier DECIMAL(3,2),
  affected_holidays TEXT[],
  impact_reasoning TEXT[]
) AS $$
DECLARE
  total_mult DECIMAL(3,2) := 1.0;
  holidays TEXT[] := ARRAY[]::TEXT[];
  reasons TEXT[] := ARRAY[]::TEXT[];
  holiday_record RECORD;
  impact_record RECORD;
BEGIN
  -- Find all holidays within impact windows
  FOR holiday_record IN
    SELECT DISTINCT h.name, h.name_native, ht.name as holiday_type
    FROM holidays h
    JOIN holiday_types ht ON h.holiday_type_id = ht.id
    JOIN countries c ON h.country_id = c.id
    LEFT JOIN regions r ON h.region_id = r.id
    WHERE c.code = target_region
      AND (
        -- Check if target_date is within impact window of any holiday
        EXISTS (
          SELECT 1 FROM holiday_observances ho 
          WHERE ho.holiday_id = h.id 
            AND ho.observed_date BETWEEN target_date - INTERVAL '14 days' AND target_date + INTERVAL '14 days'
        )
        OR
        -- Check fixed date holidays
        (h.date_type = 'fixed' 
          AND h.month = EXTRACT(MONTH FROM target_date) 
          AND h.day = EXTRACT(DAY FROM target_date))
        OR
        -- Check variable date holidays (Easter-based)
        (h.date_type = 'variable' 
          AND h.easter_offset IS NOT NULL
          AND target_date = calculate_easter_date(EXTRACT(YEAR FROM target_date)::INTEGER) + INTERVAL '1 day' * h.easter_offset)
      )
  LOOP
    -- Get impact rules for this holiday and event category
    FOR impact_record IN
      SELECT hir.impact_multiplier, hir.reasoning, hir.days_before, hir.days_after
      FROM holiday_impact_rules hir
      WHERE hir.holiday_type = holiday_record.holiday_type
        AND hir.event_category = event_category
        AND (hir.event_subcategory = event_subcategory OR (hir.event_subcategory IS NULL AND event_subcategory IS NULL))
        AND hir.region = target_region
        AND (hir.year_start IS NULL OR EXTRACT(YEAR FROM target_date) >= hir.year_start)
        AND (hir.year_end IS NULL OR EXTRACT(YEAR FROM target_date) <= hir.year_end)
    LOOP
      -- Check if target_date is within impact window
      IF EXISTS (
        SELECT 1 FROM holiday_observances ho 
        JOIN holidays h ON ho.holiday_id = h.id
        WHERE h.name = holiday_record.name
          AND ho.observed_date BETWEEN target_date - INTERVAL '1 day' * impact_record.days_before 
                                   AND target_date + INTERVAL '1 day' * impact_record.days_after
      ) THEN
        total_mult := total_mult * impact_record.impact_multiplier;
        holidays := holidays || holiday_record.name;
        reasons := reasons || impact_record.reasoning;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT total_mult, holidays, reasons;
END;
$$ LANGUAGE plpgsql;

-- Function to get seasonal demand curve for a category (12 months)
CREATE OR REPLACE FUNCTION get_seasonal_demand_curve(
  event_category VARCHAR(100),
  event_subcategory VARCHAR(100) DEFAULT NULL,
  target_region VARCHAR(50) DEFAULT 'CZ'
) RETURNS TABLE (
  month INTEGER,
  demand_multiplier DECIMAL(3,2),
  risk_level VARCHAR(20),
  reasoning TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.month,
    sr.demand_multiplier,
    CASE 
      WHEN sr.demand_multiplier >= 1.5 THEN 'very_high'
      WHEN sr.demand_multiplier >= 1.2 THEN 'high'
      WHEN sr.demand_multiplier >= 0.8 THEN 'medium'
      WHEN sr.demand_multiplier >= 0.5 THEN 'low'
      ELSE 'very_low'
    END as risk_level,
    sr.reasoning
  FROM seasonal_rules sr
  WHERE sr.category = event_category
    AND (sr.subcategory = event_subcategory OR (sr.subcategory IS NULL AND event_subcategory IS NULL))
    AND sr.region = target_region
  ORDER BY sr.month;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- DOCUMENTATION AND MAINTENANCE VIEWS
-- =============================================================================

-- View for seasonal rules documentation
CREATE OR REPLACE VIEW seasonal_rules_documentation AS
SELECT 
  sr.category,
  sr.subcategory,
  sr.region,
  sr.month,
  TO_CHAR(TO_DATE(sr.month::TEXT, 'MM'), 'Month') as month_name,
  sr.demand_multiplier,
  sr.conflict_weight,
  sr.venue_availability,
  sr.confidence,
  sr.data_source,
  sr.reasoning,
  sr.expert_source,
  sr.created_at,
  sr.updated_at
FROM seasonal_rules sr
ORDER BY sr.category, sr.subcategory, sr.region, sr.month;

-- View for holiday impact rules documentation
CREATE OR REPLACE VIEW holiday_impact_documentation AS
SELECT 
  hir.holiday_type,
  hir.event_category,
  hir.event_subcategory,
  hir.region,
  hir.days_before,
  hir.days_after,
  hir.impact_multiplier,
  hir.impact_type,
  hir.confidence,
  hir.reasoning,
  hir.expert_source,
  hir.created_at,
  hir.updated_at
FROM holiday_impact_rules hir
ORDER BY hir.holiday_type, hir.event_category, hir.event_subcategory;

-- =============================================================================
-- INITIAL DATA SEEDING COMMENTS
-- =============================================================================

-- The following sections will be populated by seeding scripts:
-- 1. Technology category rules (AI/ML, Web Dev, Startups, etc.)
-- 2. Entertainment category rules (Music, Theater, Comedy, etc.)  
-- 3. Business category rules (Conferences, Trade Shows, Networking)
-- 4. Sports, Finance, Arts & Culture categories
-- 5. Czech-specific holiday impact rules
-- 6. Regional adjustments for Prague, Brno, etc.

-- =============================================================================
-- MAINTENANCE AND EXPANSION GUIDELINES
-- =============================================================================

/*
SEASONAL RULES MAINTENANCE:

1. ADDING NEW CATEGORIES:
   - Create rules for all 12 months
   - Use confidence 0.7-1.0 for expert rules, 0.5-0.7 for estimated rules
   - Provide detailed reasoning for each month
   - Consider regional variations (Prague vs Brno vs regional cities)

2. UPDATING EXISTING RULES:
   - Update reasoning field with change justification
   - Update last_updated_by field
   - Consider versioning for major changes
   - Test impact on existing conflict scores

3. REGIONAL EXPANSION:
   - Add new region codes (e.g., 'DE', 'AT', 'SK')
   - Create region-specific rules or copy from 'CZ' as baseline
   - Adjust for local holidays and cultural patterns
   - Consider venue availability differences

4. DATA SOURCES:
   - 'expert_rules': Industry expert knowledge (highest confidence)
   - 'historical_data': Analysis of past event success rates
   - 'ai_analysis': Machine learning insights
   - 'survey_data': User feedback and market research

HOLIDAY IMPACT RULES MAINTENANCE:

1. ADDING NEW HOLIDAYS:
   - Define impact windows (days before/after)
   - Set category-specific multipliers
   - Consider business vs entertainment event differences
   - Account for regional holiday variations

2. MULTIPLIER CALIBRATION:
   - 1.0 = no impact
   - 1.1-1.5 = low impact (minor holidays)
   - 1.5-2.5 = moderate impact (regional holidays)
   - 2.5-4.0 = high impact (major holidays)
   - 4.0+ = critical impact (national holidays, Christmas, etc.)

3. IMPACT TYPES:
   - 'conflict': Affects conflict scoring directly
   - 'demand': Affects expected attendance
   - 'availability': Affects venue availability
   - 'combined': Affects multiple factors

PERFORMANCE OPTIMIZATION:

1. CACHE STRATEGY:
   - Cache seasonal multipliers (static per category/month)
   - Cache holiday impact calculations
   - Use seasonal_insights_cache table for complex calculations
   - Implement cache warming for common combinations

2. QUERY OPTIMIZATION:
   - Use indexes for fast lookups
   - Batch holiday queries for date ranges
   - Consider materialized views for complex calculations
   - Monitor query performance with EXPLAIN ANALYZE

3. SCALABILITY:
   - Design for multiple regions
   - Support for subcategory-specific rules
   - Efficient batch processing for large date ranges
   - Consider partitioning for very large datasets

FUTURE EXPANSIONS:

1. MACHINE LEARNING INTEGRATION:
   - Use historical event success data to refine rules
   - Implement A/B testing for rule effectiveness
   - Add predictive analytics for emerging trends
   - Consider external data sources (weather, economic indicators)

2. ADVANCED FEATURES:
   - Venue-specific seasonal patterns
   - Audience demographic seasonal preferences
   - Cross-category seasonal interactions
   - Dynamic rule updates based on real-time data

3. API ENHANCEMENTS:
   - RESTful API for rule management
   - Bulk rule import/export functionality
   - Rule versioning and rollback capabilities
   - Integration with external calendar systems
*/
