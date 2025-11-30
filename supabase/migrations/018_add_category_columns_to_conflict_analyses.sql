-- Migration to add category and subcategory columns to conflict_analyses table
-- This aligns the database with the original migration schema

-- Add category column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conflict_analyses' AND column_name = 'category'
    ) THEN
        ALTER TABLE conflict_analyses 
        ADD COLUMN category VARCHAR(100);
        
        -- Backfill existing records: extract category from results JSONB
        UPDATE conflict_analyses 
        SET category = COALESCE(
            (results->>'category')::VARCHAR(100),
            (results->'request_data'->>'category')::VARCHAR(100),
            'Unknown'
        )
        WHERE category IS NULL;
        
        -- Make it NOT NULL after backfilling
        ALTER TABLE conflict_analyses 
        ALTER COLUMN category SET NOT NULL;
        
        -- Create index for better query performance
        CREATE INDEX IF NOT EXISTS idx_conflict_analyses_category 
        ON conflict_analyses(category);
    END IF;
END $$;

-- Add subcategory column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conflict_analyses' AND column_name = 'subcategory'
    ) THEN
        ALTER TABLE conflict_analyses 
        ADD COLUMN subcategory VARCHAR(100);
        
        -- Backfill existing records: extract subcategory from results JSONB
        UPDATE conflict_analyses 
        SET subcategory = COALESCE(
            (results->>'subcategory')::VARCHAR(100),
            (results->'request_data'->>'subcategory')::VARCHAR(100),
            NULL
        )
        WHERE subcategory IS NULL;
        
        -- Create index for better query performance
        CREATE INDEX IF NOT EXISTS idx_conflict_analyses_subcategory 
        ON conflict_analyses(subcategory);
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN conflict_analyses.category IS 'Event category - also stored in results JSONB for backward compatibility';
COMMENT ON COLUMN conflict_analyses.subcategory IS 'Event subcategory - also stored in results JSONB for backward compatibility';

