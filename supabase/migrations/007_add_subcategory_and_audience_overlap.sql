-- Add subcategory and audience overlap fields to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100),
ADD COLUMN IF NOT EXISTS genre_tags JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS subcategory_confidence DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS subcategory_method VARCHAR(20) DEFAULT 'rule_based';

-- Create audience overlap cache table
CREATE TABLE IF NOT EXISTS audience_overlap_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category1 VARCHAR(100) NOT NULL,
  subcategory1 VARCHAR(100),
  category2 VARCHAR(100) NOT NULL,
  subcategory2 VARCHAR(100),
  overlap_score DECIMAL(3,2) NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  reasoning TEXT[],
  calculation_method VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_subcategory ON events(subcategory);
CREATE INDEX IF NOT EXISTS idx_events_genre_tags ON events USING GIN(genre_tags);
CREATE INDEX IF NOT EXISTS idx_events_subcategory_confidence ON events(subcategory_confidence);

-- Create unique index for overlap cache to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_audience_overlap_cache_unique 
ON audience_overlap_cache(category1, subcategory1, category2, subcategory2);

-- Create indexes for overlap cache queries
CREATE INDEX IF NOT EXISTS idx_audience_overlap_cache_categories 
ON audience_overlap_cache(category1, category2);
CREATE INDEX IF NOT EXISTS idx_audience_overlap_cache_expires 
ON audience_overlap_cache(expires_at);

-- Create function to update overlap cache timestamp
CREATE OR REPLACE FUNCTION update_overlap_cache_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for overlap cache timestamp updates
CREATE TRIGGER trigger_update_overlap_cache_timestamp
  BEFORE UPDATE ON audience_overlap_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_overlap_cache_timestamp();

-- Add comments for documentation
COMMENT ON COLUMN events.subcategory IS 'Event subcategory/genre for granular audience analysis';
COMMENT ON COLUMN events.genre_tags IS 'Array of genre tags for multi-genre events';
COMMENT ON COLUMN events.subcategory_confidence IS 'Confidence score (0.0-1.0) for subcategory classification';
COMMENT ON COLUMN events.subcategory_method IS 'Method used for subcategory extraction (rule_based, ai_verified, fallback)';

COMMENT ON TABLE audience_overlap_cache IS 'Cached audience overlap calculations between event categories/subcategories';
COMMENT ON COLUMN audience_overlap_cache.overlap_score IS 'Audience overlap percentage (0.0-1.0)';
COMMENT ON COLUMN audience_overlap_cache.confidence IS 'Confidence in overlap calculation (0.0-1.0)';
COMMENT ON COLUMN audience_overlap_cache.reasoning IS 'AI-generated reasoning for overlap calculation';
COMMENT ON COLUMN audience_overlap_cache.calculation_method IS 'Method used (ai_powered, rule_based, cached)';
COMMENT ON COLUMN audience_overlap_cache.expires_at IS 'Cache expiration timestamp (30 days default)';
