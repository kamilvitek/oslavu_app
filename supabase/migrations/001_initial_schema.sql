-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company VARCHAR(200),
  plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'agency')),
  analyses_used INTEGER DEFAULT 0,
  analyses_limit INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  city VARCHAR(100) NOT NULL,
  venue VARCHAR(200),
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  expected_attendees INTEGER,
  source VARCHAR(50) NOT NULL CHECK (source IN ('ticketmaster', 'eventbrite', 'meetup', 'predicthq', 'manual')),
  source_id VARCHAR(200),
  url TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conflict_analyses table
CREATE TABLE IF NOT EXISTS conflict_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  city VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  preferred_dates JSONB NOT NULL,
  expected_attendees INTEGER NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_city ON events(city);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
CREATE INDEX IF NOT EXISTS idx_conflict_analyses_user_id ON conflict_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_conflict_analyses_city ON conflict_analyses(city);
CREATE INDEX IF NOT EXISTS idx_conflict_analyses_created_at ON conflict_analyses(created_at);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_analyses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own data
CREATE POLICY "Users can only see own data" ON users
  FOR ALL USING (auth.uid() = id);

-- Events are publicly readable (for conflict analysis)
CREATE POLICY "Events are publicly readable" ON events
  FOR SELECT USING (true);

-- Only authenticated users can insert events (for manual entries)
CREATE POLICY "Authenticated users can insert events" ON events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can only see their own analyses
CREATE POLICY "Users can only see own analyses" ON conflict_analyses
  FOR ALL USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();