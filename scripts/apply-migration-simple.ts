#!/usr/bin/env ts-node
// Simple script to apply the audience overlap migration

import { createClient } from '../src/lib/supabase';

async function applyMigration() {
  console.log('🚀 Applying audience overlap migration...');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Test connection first
    console.log('🔍 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('events')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection failed:', testError);
      return;
    }
    console.log('✅ Database connection successful');

    // Try to create the cache table directly
    console.log('📝 Creating audience_overlap_cache table...');
    
    // First, check if table exists
    const { data: tableCheck, error: checkError } = await supabase
      .from('audience_overlap_cache')
      .select('*')
      .limit(1);
    
    if (checkError && checkError.code === 'PGRST205') {
      // Table doesn't exist, let's create it using a different approach
      console.log('📝 Table does not exist, attempting to create...');
      
      // We'll need to use raw SQL execution
      // For now, let's just log what needs to be done
      console.log(`
🔧 MANUAL MIGRATION REQUIRED:

Please run the following SQL commands in your Supabase SQL editor:

1. Add subcategory column:
   ALTER TABLE events ADD COLUMN IF NOT EXISTS subcategory TEXT;

2. Create index:
   CREATE INDEX IF NOT EXISTS idx_events_subcategory ON events(subcategory);

3. Create cache table:
   CREATE TABLE IF NOT EXISTS audience_overlap_cache (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     category1 TEXT NOT NULL,
     subcategory1 TEXT,
     category2 TEXT NOT NULL,
     subcategory2 TEXT,
     overlap_score DECIMAL(3,2) NOT NULL,
     confidence DECIMAL(3,2) NOT NULL,
     reasoning TEXT[],
     calculation_method TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE (category1, subcategory1, category2, subcategory2)
   );

4. Create cache index:
   CREATE INDEX IF NOT EXISTS idx_audience_overlap_cache_categories 
   ON audience_overlap_cache(category1, subcategory1, category2, subcategory2);

5. Add comments:
   COMMENT ON COLUMN events.subcategory IS 'More granular classification of the event within its category';
   COMMENT ON TABLE audience_overlap_cache IS 'Caches audience overlap predictions between event categories/subcategories';
      `);
      
    } else if (checkError) {
      console.error('❌ Error checking table:', checkError);
    } else {
      console.log('✅ audience_overlap_cache table already exists');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

applyMigration().catch(console.error);
