-- Add confidence tracking columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS attendee_source VARCHAR(30),
ADD COLUMN IF NOT EXISTS attendee_confidence DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS attendee_reasoning JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS attendee_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS attendee_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS attendee_verified_by UUID;

-- Create index for confidence queries
CREATE INDEX IF NOT EXISTS idx_events_attendee_confidence 
ON events(attendee_confidence) WHERE expected_attendees IS NOT NULL;

-- Create index for verification status
CREATE INDEX IF NOT EXISTS idx_events_attendee_verified 
ON events(attendee_verified);

-- Add comments
COMMENT ON COLUMN events.attendee_source IS 'Source of attendee data: explicit, phq_api, venue_capacity, ai_extraction, category_default, user_verified';
COMMENT ON COLUMN events.attendee_confidence IS 'Confidence score 0.0-1.0 for attendee estimate';
COMMENT ON COLUMN events.attendee_reasoning IS 'Array of reasoning steps for estimate';
COMMENT ON COLUMN events.attendee_verified IS 'Whether estimate has been verified by user or post-event data';
