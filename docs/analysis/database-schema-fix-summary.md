# Database Schema Fix - Root Cause Analysis & Solution

## Problem Summary

The `conflict_analyses` table had a schema mismatch causing `PGRST204` errors when saving analyses.

## Root Cause Analysis

### 1. Schema Mismatch
- **Migration File** (`001_initial_schema.sql`): Defines `category VARCHAR(100) NOT NULL` as a top-level column
- **Actual Database**: `category` column does NOT exist as a top-level column (only in JSONB fields)
- **Code Behavior**: Was trying to insert `category` as a top-level column → `PGRST204` error

### 2. Why Previous Changes Were Necessary (But Temporary)
The previous commit that removed `category` from top-level inserts was **necessary** because:
- ✅ Fixed the immediate `PGRST204` error
- ✅ Aligned code with actual database state
- ❌ But created a mismatch with the intended schema (migration file)

### 3. Why It Worked Before November 14
- PostgREST schema cache was stale
- Cache allowed inserts with extra columns (lenient validation)
- After cache refresh, strict validation started → errors began

## Solution Implemented

### Option 1: Add Missing Columns (Recommended) ✅

**Why This Approach:**
- Matches the original migration schema
- Enables efficient querying/filtering by category
- Better database normalization
- Maintains backward compatibility (data also in JSONB)

**Steps:**
1. ✅ Created migration `018_add_category_columns_to_conflict_analyses.sql`
   - Adds `category` and `subcategory` columns
   - Backfills existing data from JSONB
   - Creates indexes for performance

2. ✅ Updated code to insert `category` and `subcategory` at top level
   - `src/app/api/analyze/route.ts`
   - `src/app/api/conflict-analysis/route.ts`

**To Apply:**
```sql
-- Run the migration in Supabase SQL Editor or via migration tool
-- File: supabase/migrations/018_add_category_columns_to_conflict_analyses.sql
```

**After Migration:**
- Refresh PostgREST schema cache in Supabase Dashboard
- Analyses will save successfully with category at top level

### Option 2: Keep JSONB-Only (Alternative)

If you prefer to keep category only in JSONB:
1. Update migration file `001_initial_schema.sql` to remove category columns
2. Keep the code changes from previous commit (no top-level category)
3. Note: This makes querying by category less efficient

## Additional Issue: Date Range Validation

The 31-day limit validation is working correctly:
- User tried: 39 days (2026-05-09 to 2026-06-17)
- Limit: 31 days
- Error message: "Analysis date range cannot exceed 31 days. Current range: 39 days"

**This is expected behavior** - user needs to reduce date range to ≤31 days.

## Verification Steps

1. **Apply Migration:**
   ```sql
   -- Check if columns exist
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'conflict_analyses' 
   AND column_name IN ('category', 'subcategory');
   ```

2. **Refresh Schema Cache:**
   - Supabase Dashboard → Settings → API → Refresh schema cache

3. **Test Analysis:**
   - Run an analysis with date range ≤31 days
   - Verify it saves successfully
   - Check database for new record with category at top level

## Files Changed

1. ✅ `supabase/migrations/018_add_category_columns_to_conflict_analyses.sql` (NEW)
2. ✅ `src/app/api/analyze/route.ts` (Updated)
3. ✅ `src/app/api/conflict-analysis/route.ts` (Updated)

## Summary

- **Previous changes were necessary** to fix immediate error
- **Current solution** aligns database with intended schema
- **Migration needed** to add missing columns
- **Code updated** to match migration schema
- **Date validation** working correctly (separate issue)

