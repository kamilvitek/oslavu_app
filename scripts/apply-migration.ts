#!/usr/bin/env ts-node
// Script to apply the audience overlap migration directly

import { createClient } from '../src/lib/supabase';

async function applyMigration() {
  console.log('🚀 Applying audience overlap migration...');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Add subcategory column to events table
    console.log('📝 Adding subcategory column to events table...');
    const { error: subcategoryError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE events
        ADD COLUMN IF NOT EXISTS subcategory TEXT;
      `
    });
    
    if (subcategoryError) {
      console.error('❌ Error adding subcategory column:', subcategoryError);
      return;
    }
    console.log('✅ Subcategory column added successfully');

    // 2. Create index for subcategory
    console.log('📝 Creating index for subcategory...');
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_events_subcategory ON events(subcategory);
      `
    });
    
    if (indexError) {
      console.error('❌ Error creating subcategory index:', indexError);
      return;
    }
    console.log('✅ Subcategory index created successfully');

    // 3. Create audience_overlap_cache table
    console.log('📝 Creating audience_overlap_cache table...');
    const { error: cacheTableError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    
    if (cacheTableError) {
      console.error('❌ Error creating audience_overlap_cache table:', cacheTableError);
      return;
    }
    console.log('✅ Audience overlap cache table created successfully');

    // 4. Create index for cache table
    console.log('📝 Creating index for audience_overlap_cache...');
    const { error: cacheIndexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_audience_overlap_cache_categories 
        ON audience_overlap_cache(category1, subcategory1, category2, subcategory2);
      `
    });
    
    if (cacheIndexError) {
      console.error('❌ Error creating cache index:', cacheIndexError);
      return;
    }
    console.log('✅ Cache index created successfully');

    // 5. Add comments
    console.log('📝 Adding table comments...');
    const { error: commentError } = await supabase.rpc('exec_sql', {
      sql: `
        COMMENT ON COLUMN events.subcategory IS 'More granular classification of the event within its category';
        COMMENT ON TABLE audience_overlap_cache IS 'Caches audience overlap predictions between event categories/subcategories';
      `
    });
    
    if (commentError) {
      console.warn('⚠️ Warning: Could not add comments:', commentError);
    } else {
      console.log('✅ Comments added successfully');
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ Database is now ready for audience overlap analysis');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

applyMigration().catch(console.error);
