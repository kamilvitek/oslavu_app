-- Add AI normalization fields to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS normalized_city TEXT,
ADD COLUMN IF NOT EXISTS normalized_category TEXT,
ADD COLUMN IF NOT EXISTS normalized_venue TEXT,
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS normalization_method TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS raw_category TEXT,
ADD COLUMN IF NOT EXISTS raw_city TEXT,
ADD COLUMN IF NOT EXISTS last_normalized_at TIMESTAMP WITH TIME ZONE;

-- Create index for normalized fields for faster queries
CREATE INDEX IF NOT EXISTS idx_events_normalized_city ON events(normalized_city);
CREATE INDEX IF NOT EXISTS idx_events_normalized_category ON events(normalized_category);
CREATE INDEX IF NOT EXISTS idx_events_confidence ON events(confidence_score);

-- Create function to update normalization timestamp
CREATE OR REPLACE FUNCTION update_normalization_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_normalized_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update timestamp
CREATE TRIGGER trigger_update_normalization_timestamp
  BEFORE UPDATE OF normalized_city, normalized_category, normalized_venue, confidence_score
  ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_normalization_timestamp();

-- Add comments for documentation
COMMENT ON COLUMN events.normalized_city IS 'AI-normalized city name for consistent filtering';
COMMENT ON COLUMN events.normalized_category IS 'AI-normalized category for consistent filtering';
COMMENT ON COLUMN events.normalized_venue IS 'AI-normalized venue name for better matching';
COMMENT ON COLUMN events.confidence_score IS 'AI confidence score (0.0-1.0) for normalization quality';
COMMENT ON COLUMN events.normalization_method IS 'Method used for normalization (dictionary, geocoding, llm, etc.)';
COMMENT ON COLUMN events.raw_category IS 'Original category before normalization';
COMMENT ON COLUMN events.raw_city IS 'Original city before normalization';
COMMENT ON COLUMN events.last_normalized_at IS 'Timestamp of last normalization update';
