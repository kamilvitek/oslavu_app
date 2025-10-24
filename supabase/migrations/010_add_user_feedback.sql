CREATE TABLE IF NOT EXISTS event_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID,
  
  -- Feedback types
  feedback_type VARCHAR(30) NOT NULL, -- 'attendee_correction', 'venue_correction', 'capacity_report'
  
  -- Attendee feedback
  reported_attendees INTEGER,
  actual_attendees INTEGER, -- Post-event actual
  attendance_source VARCHAR(50), -- 'ticket_sales', 'manual_count', 'organizer_report'
  
  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_event_feedback_event ON event_feedback(event_id);
CREATE INDEX idx_event_feedback_type ON event_feedback(feedback_type);
CREATE INDEX idx_event_feedback_user ON event_feedback(user_id);
CREATE INDEX idx_event_feedback_verified ON event_feedback(is_verified);

-- Add comments
COMMENT ON TABLE event_feedback IS 'User feedback and corrections for event attendee estimates';
COMMENT ON COLUMN event_feedback.feedback_type IS 'Type of feedback: attendee_correction, venue_correction, capacity_report';
COMMENT ON COLUMN event_feedback.reported_attendees IS 'User-reported attendee count';
COMMENT ON COLUMN event_feedback.actual_attendees IS 'Post-event actual attendance';
COMMENT ON COLUMN event_feedback.attendance_source IS 'Source of attendance data: ticket_sales, manual_count, organizer_report';
COMMENT ON COLUMN event_feedback.is_verified IS 'Whether feedback has been verified by admin';
