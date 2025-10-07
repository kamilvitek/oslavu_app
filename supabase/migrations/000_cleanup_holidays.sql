-- Cleanup migration: Remove all holiday-related tables and functions
-- Run this first to start fresh

-- Drop functions first (they depend on tables)
DROP FUNCTION IF EXISTS get_cultural_events_for_date(DATE, VARCHAR(3), VARCHAR(20));
DROP FUNCTION IF EXISTS get_holidays_for_date(DATE, VARCHAR(3), VARCHAR(20));
DROP FUNCTION IF EXISTS calculate_easter_date(INTEGER);

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS holiday_observances CASCADE;
DROP TABLE IF EXISTS cultural_events CASCADE;
DROP TABLE IF EXISTS holidays CASCADE;
DROP TABLE IF EXISTS holiday_types CASCADE;
DROP TABLE IF EXISTS regions CASCADE;
DROP TABLE IF EXISTS countries CASCADE;
