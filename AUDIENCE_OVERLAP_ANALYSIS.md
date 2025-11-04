# Audience Overlap Feature Analysis

## Current Implementation Issues

### 1. **Missing Date Proximity Factor** ⚠️ CRITICAL
**Problem**: The audience overlap calculation **completely ignores** the temporal distance between events.

**Current Behavior**:
- Two Rock events happening 1 day apart = 58% overlap
- Two Rock events happening 6 months apart = 58% overlap (same!)

**Expected Behavior**:
- Two Rock events happening 1 day apart = **85-95% overlap** (people can't attend both)
- Two Rock events happening 6 months apart = **40-60% overlap** (people can attend both)

**Why This Matters**:
- If you organize a Rock event just before/after "Rock for People" (major festival), the audience overlap should be **much higher** because:
  - Same target audience (Rock fans)
  - Same geographic area (Czechia)
  - **Proximity effect**: People who attend major festivals are unlikely to attend competing events within days/weeks
  - Budget/time constraints: People can't attend multiple events in quick succession

### 2. **Missing Event Dates in AI Prompt** ⚠️ CRITICAL
**Location**: `src/lib/services/optimized-openai-audience-overlap.ts` (lines 114-136)

**Current Prompt** includes:
- Event title
- Category/subcategory
- Description
- Venue
- Expected attendees
- ❌ **MISSING: Event dates**

**Impact**: OpenAI cannot factor in temporal proximity because it doesn't know when the events occur!

### 3. **Missing Event Significance/Prominence Context**
**Problem**: The system doesn't tell OpenAI that "Rock for People" is a **major, well-known festival** (20k+ attendees).

**Current Behavior**: Treats all events equally regardless of size/prominence.

**Expected Behavior**: Major events (10k+ attendees) should have higher overlap scores because they:
- Draw from larger, overlapping audience pools
- Have stronger "brand recognition" that competes with nearby events
- Create "event fatigue" in the local market

### 4. **Cache Key Doesn't Include Dates** ⚠️
**Location**: Multiple files use `OverlapCacheKey` which only includes:
- category1, subcategory1
- category2, subcategory2

**Problem**: The same cache entry is used for events that are:
- 1 day apart (should be 90%+ overlap)
- 6 months apart (should be 50% overlap)

**Impact**: Cached results are incorrect for events with different temporal distances.

## Variables That SHOULD Affect Audience Overlap

Based on the codebase analysis, here are the variables that **currently** affect overlap:

### ✅ Currently Implemented:
1. **Category Match** (`calculateSubcategoryOverlap`)
   - Same category + subcategory: 92% overlap
   - Same category, different subcategory: Uses taxonomy coefficients
   - Different categories: 10% overlap

2. **Subcategory Relationships** (`subcategory-taxonomy.ts`)
   - Related subcategories (e.g., Rock/Metal): 60-75% overlap
   - Same category, one has subcategory: 40% overlap

3. **Traditional Factors** (via OpenAI analysis):
   - Demographic similarity
   - Interest alignment
   - Behavior patterns
   - Historical preference

4. **Event Size** (indirectly via `calculateAudienceScalingFactor`)
   - Affects conflict score, not overlap percentage directly

### ❌ Missing Critical Variables:
1. **Date Proximity/Temporal Distance** ⚠️ **CRITICAL**
   - Should significantly increase overlap for events within days/weeks
   - Should decrease overlap for events months apart

2. **Event Prominence/Significance**
   - Major events (10k+ attendees) should have higher overlap
   - Well-known festivals should compete more strongly

3. **Geographic Proximity** (partially implemented)
   - Same city already filtered, but radius/proximity could be enhanced

4. **Event Type/Format**
   - Festival vs. concert vs. workshop
   - Multi-day vs. single-day events

## Example: Rock for People Scenario

**User's Event**:
- Date: June 10-13, 2026
- Category: Entertainment
- Subcategory: Rock
- Expected attendees: 500-800
- City: Prague → Hradec Králové (same region)

**Competing Event**: "Rock for People 2026"
- Date: June 14-16, 2026 (1 day after!)
- Category: Entertainment
- Subcategory: Rock (likely)
- Expected attendees: 20,000+
- City: Hradec Králové
- **Major festival**: Well-known, annual, draws national/international audience

**Current Calculation**: 58% overlap
**Expected Calculation**: **85-95% overlap** because:
1. ✅ Same category + subcategory (Rock) → 92% base
2. ✅ Same city/region → +5%
3. ❌ **1 day apart** → Should apply **+15-20% temporal proximity bonus**
4. ❌ **Major event (20k+)** → Should apply **+10-15% prominence bonus**
5. ❌ **Festival fatigue** → People who attend major festivals are less likely to attend nearby events immediately after

**Result**: Should be **85-95%** overlap, not 58%!

## Recommended Fixes

### Priority 1: Add Date Proximity to AI Prompt
**File**: `src/lib/services/optimized-openai-audience-overlap.ts`
- Include event dates in the prompt
- Add instructions to consider temporal proximity
- Provide temporal proximity guidelines:
  - Same day: 95-100% overlap
  - 1-3 days apart: 85-95% overlap
  - 1-2 weeks apart: 70-85% overlap
  - 1 month apart: 50-70% overlap
  - 3+ months apart: 30-50% overlap

### Priority 2: Add Event Prominence to AI Prompt
- Include expected attendees
- Add context about event size/significance
- Instruct AI to consider:
  - Major events (10k+): +10-15% overlap
  - Medium events (1k-10k): +5-10% overlap
  - Small events (<1k): Base overlap

### Priority 3: Update Cache Key to Include Temporal Proximity
**File**: `src/lib/services/audience-overlap-cache.ts`
- Add date proximity buckets to cache key:
  - Same day: "same_day"
  - 1-7 days: "week"
  - 1-4 weeks: "month"
  - 1-3 months: "quarter"
  - 3+ months: "distant"
- Or invalidate cache for events with different date distances

### Priority 4: Add Post-Processing Temporal Adjustment
**File**: `src/lib/services/audience-overlap.ts` or `conflict-analysis.ts`
- After AI calculates base overlap, apply temporal proximity multiplier:
  - Calculate days between events
  - Apply proximity adjustment factor
  - Final overlap = base_overlap * temporal_multiplier

## Implementation Strategy

1. **Quick Fix**: Add dates to AI prompt (immediate impact)
2. **Enhanced Fix**: Add temporal proximity post-processing (more accurate)
3. **Long-term**: Update cache strategy to include temporal proximity

