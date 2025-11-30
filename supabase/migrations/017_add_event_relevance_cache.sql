-- Create event relevance cache table
CREATE TABLE IF NOT EXISTS event_relevance_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planned_category VARCHAR(100) NOT NULL,
  planned_subcategory VARCHAR(100),
  competing_category VARCHAR(100) NOT NULL,
  competing_subcategory VARCHAR(100),
  is_relevant BOOLEAN NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  reasoning TEXT[],
  evaluation_method VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Create unique index for relevance cache to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_relevance_cache_unique 
ON event_relevance_cache(planned_category, planned_subcategory, competing_category, competing_subcategory);

-- Create indexes for relevance cache queries
CREATE INDEX IF NOT EXISTS idx_event_relevance_cache_categories 
ON event_relevance_cache(planned_category, competing_category);

CREATE INDEX IF NOT EXISTS idx_event_relevance_cache_expires 
ON event_relevance_cache(expires_at);

-- Create function to update relevance cache timestamp
CREATE OR REPLACE FUNCTION update_relevance_cache_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for relevance cache timestamp updates
CREATE TRIGGER trigger_update_relevance_cache_timestamp
  BEFORE UPDATE ON event_relevance_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_relevance_cache_timestamp();

-- Add comments for documentation
COMMENT ON TABLE event_relevance_cache IS 'Cached event relevance evaluations between planned and competing events';
COMMENT ON COLUMN event_relevance_cache.is_relevant IS 'Whether the competing event is relevant competition (true/false)';
COMMENT ON COLUMN event_relevance_cache.confidence IS 'Confidence in relevance evaluation (0.0-1.0)';
COMMENT ON COLUMN event_relevance_cache.reasoning IS 'AI-generated reasoning for relevance evaluation';
COMMENT ON COLUMN event_relevance_cache.evaluation_method IS 'Method used (llm, rule_based_fallback)';
COMMENT ON COLUMN event_relevance_cache.expires_at IS 'Cache expiration timestamp (30 days default)';

