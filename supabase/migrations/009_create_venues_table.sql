CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  normalized_name VARCHAR(200) NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) DEFAULT 'Czech Republic',
  
  -- Capacity information
  capacity INTEGER NOT NULL,
  capacity_standing INTEGER,
  capacity_seated INTEGER,
  capacity_source VARCHAR(50), -- 'official', 'estimated', 'user_reported'
  capacity_verified BOOLEAN DEFAULT false,
  capacity_verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Venue metadata
  venue_type VARCHAR(50), -- 'stadium', 'arena', 'hotel', 'conference_center', etc.
  address TEXT,
  coordinates POINT,
  website TEXT,
  
  -- Historical data
  average_attendance INTEGER,
  typical_utilization DECIMAL(3,2), -- 0.0-1.0
  events_hosted INTEGER DEFAULT 0,
  
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  data_source VARCHAR(50) -- 'manual', 'api', 'scraper', 'user_contribution'
);

-- Create indexes
CREATE INDEX idx_venues_normalized_name ON venues(normalized_name);
CREATE INDEX idx_venues_city ON venues(city);
CREATE INDEX idx_venues_capacity ON venues(capacity);
CREATE UNIQUE INDEX idx_venues_name_city ON venues(normalized_name, city);

-- Create function to normalize venue names
CREATE OR REPLACE FUNCTION normalize_venue_name(name TEXT) 
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(TRIM(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s]', '', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comments
COMMENT ON TABLE venues IS 'Venue database with capacity and metadata for accurate attendee estimation';
COMMENT ON COLUMN venues.capacity IS 'Maximum venue capacity';
COMMENT ON COLUMN venues.capacity_source IS 'Source of capacity data: official, estimated, user_reported';
COMMENT ON COLUMN venues.venue_type IS 'Type of venue: stadium, arena, hotel, conference_center, etc.';
COMMENT ON COLUMN venues.average_attendance IS 'Historical average attendance at this venue';
COMMENT ON COLUMN venues.typical_utilization IS 'Typical capacity utilization (0.0-1.0)';
