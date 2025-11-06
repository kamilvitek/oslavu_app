<!-- f82730b3-e017-43a7-94c8-d5f3422cea0c ff74e7e9-bd11-4bb7-85a9-2646bfb1dbd6 -->
# Comprehensive Event Scraping System Overhaul

## Problem Analysis

### Current Issues Identified:

1. **Early Exit Bug**: Line 706 stops at 10 events per chunk - critical issue
2. **Poor Extraction Quality**: GPT extracts markdown/URLs/images as titles instead of clean text
3. **Missing City Data**: Many events fail validation due to missing cities (73% of 182 events skipped) - missing AI recognition (app should be able to recognize in which city is the venue located)
4. **Source ID Overflow**: Generated from full title, exceeds 100 char limit
5. **Page Limit Too Low**: Default 50 pages stops crawling before finding all events
6. **No Post-Processing**: Extracted data isn't cleaned before validation
7. **No Incremental Updates**: Every crawl starts from scratch
8. **No Smart Pagination**: Doesn't detect or handle all pagination patterns
9. **No Retry Logic**: Failed extractions aren't retried with better prompts
10. **No Auto-Fix**: Validation fails but doesn't attempt to fix issues

### Root Causes:

- Extraction pipeline doesn't clean markdown/HTML artifacts
- City extraction not emphasized as REQUIRED in GPT prompt
- No fallback logic for missing city data
- Source ID generation uses full title instead of URL hash
- Chunked extraction has premature exit condition
- No incremental crawling strategy

## Solution Architecture

### Phase 1: Extraction Quality & Reliability

#### 1.1 Fix Early Exit Bug

**File**: `src/lib/services/event-scraper.ts` (Line 706)

- Remove `if (allEvents.length >= 10) break;` condition
- Process all chunks to completion
- Add chunk-level deduplication instead

#### 1.2 Post-Extraction Cleaning Pipeline

**New File**: `src/lib/services/event-cleaning.service.ts`

- Strip markdown from titles (remove `**`, `[]`, `![]()`, URLs)
- Extract clean text from HTML artifacts
- Remove image URLs and markdown links from titles
- Clean venue names (remove location suffixes, normalize)
- Extract city from venue name if missing
- Extract city from URL path if missing
- Extract city from title if missing (fallback)
- Normalize source_id to use URL hash instead of full title

**Implementation**:

```typescript
class EventCleaningService {
  cleanTitle(title: string): string
  extractCityFallback(event: ScrapedEvent, sourceName: string): string
  normalizeSourceId(sourceName: string, url: string, date: string): string
  cleanEvent(event: ScrapedEvent): ScrapedEvent
}
```

#### 1.3 Enhanced GPT Prompt

**File**: `src/lib/services/event-scraper.ts` (Lines 449-543)

- Add explicit instruction: "Extract CLEAN titles - NO markdown, NO URLs, NO images"
- Emphasize city is REQUIRED (not optional)
- Add examples of bad vs good extraction
- Add explicit instruction: "If city is missing, extract from venue name, URL, or event title"
- Add regex pattern examples for city extraction
- Increase emphasis on completeness over speed

#### 1.4 City Extraction Fallback Logic

**File**: `src/lib/services/event-scraper.ts` (transformScrapedEvent method)

- Before validation, check if city is missing
- Try extract from venue name (use existing extractCityFromVenueName)
- Try extract from URL path (e.g., `/brno/` → Brno)
- Try extract from title (e.g., "Concert in Prague" → Prague)

### Phase 2: Crawling Completeness & Scalability

#### 2.1 Dynamic Page Limit Strategy

**File**: `src/lib/services/event-scraper.ts` (Lines 215-271)

- Remove hard 50-page limit
- Implement adaptive limit: start with 100, increase if events found per page > threshold
- Add maxPages configurable per source (default: 500)
- Add "smart limit" mode: stop when event discovery rate drops below threshold
- Track events per page ratio to detect when crawling is no longer productive

#### 2.2 Smart Pagination Detection

**New File**: `src/lib/services/pagination-detector.service.ts`

- Detect pagination patterns (next button, page numbers, "load more")
- Extract pagination URLs automatically
- Add pagination URLs to startUrls dynamically
- Support infinite scroll detection
- Handle different pagination patterns (numbered, next/prev, load more)

#### 2.3 Incremental Crawling

**File**: `src/lib/services/event-scraper.ts`

- Add `last_crawled_at` tracking to scraper_sources
- For detail pages, check if URL already exists in database
- Skip already-crawled detail pages (unless force refresh)
- Track crawl progress: pages crawled, events found, events created
- Add incremental mode: only crawl new/changed pages

**Database Migration**:

```sql
ALTER TABLE scraper_sources 
ADD COLUMN last_crawled_at TIMESTAMP WITH TIME ZONE,
```

### Phase 3: Error Handling & Retry Logic

#### 3.1 Retry with Better Prompts

**File**: `src/lib/services/event-scraper.ts` (extractEventsWithGPT)

- If extraction returns 0 events, retry with more specific prompt
- If extraction returns invalid events (missing city), retry with city emphasis
- If extraction returns markdown in titles, retry with cleaning emphasis
- Add retry counter (max 2 retries)
- Log retry reasons for debugging

#### 3.2 Validation Auto-Fix Pipeline

**File**: `src/lib/services/event-scraper.ts` (processScrapedEvents)

- Before skipping invalid events, attempt auto-fix:
  - Missing city → try extraction fallback
  - Source ID too long → use URL hash
  - Invalid date format → try parsing
  - Missing required fields → try extraction from context
- Only skip if auto-fix fails
- Log auto-fix attempts and results

#### 3.3 Error Recovery

**File**: `src/lib/services/event-scraper.ts`

- If crawl fails partially, resume from last successful page
- Track failed pages for retry
- Add exponential backoff for rate limits
- Add circuit breaker pattern for repeated failures

### Phase 4: Multi-Pass Extraction Strategy

#### 4.1 Listing Page Extraction

**File**: `src/lib/services/event-scraper.ts`

- First pass: Extract event URLs from listing pages
- Prioritize detail page URLs over listing pages
- Build URL queue for detail pages
- Deduplicate URLs before crawling

#### 4.2 Detail Page Enrichment

**File**: `src/lib/services/event-scraper.ts`

- Second pass: Crawl detail pages for full event data
- Merge listing page data with detail page data
- Use detail page data as source of truth
- Fallback to listing page data if detail page fails

### Phase 5: Configuration & Monitoring

#### 5.1 Enhanced Source Configuration

**File**: `supabase/migrations/014_enhance_scraper_config.sql`

- Add per-source extraction settings
- Add city extraction rules per source
- Add default city per source
- Add pagination detection settings
- Add extraction quality thresholds

#### 5.2 Crawl Metrics & Monitoring

**File**: `src/lib/services/event-scraper.ts`

- Track detailed metrics:
  - Pages crawled vs pages processed
  - Events extracted vs events validated vs events stored
  - Extraction quality score (avg fields per event)
  - City extraction success rate
  - Retry rate and reasons
- Store metrics in sync_logs table
- Add alerting for low extraction quality

## Implementation Priority

### Critical (Fix Immediately):

1. Fix early exit bug (Line 706)
2. Post-extraction cleaning pipeline
3. City extraction fallback logic
4. Source ID normalization (use URL hash)

### High Priority:

5. Enhanced GPT prompt with examples
6. Dynamic page limit strategy
7. Validation auto-fix pipeline
8. Retry logic with better prompts

### Medium Priority:

9. Smart pagination detection
10. Incremental crawling
11. Multi-pass extraction
12. Enhanced monitoring

## Testing Strategy

1. **Unit Tests**: Test cleaning functions, city extraction, source ID generation
2. **Integration Tests**: Test full extraction pipeline with sample pages
3. **Regression Tests**: Ensure smsticket.cz extraction improves significantly
4. **Performance Tests**: Measure extraction time vs events found
5. **Quality Tests**: Measure extraction quality score (fields per event, city success rate)

## Success Metrics

- **Completeness**: Extract >90% of events from test sources
- **Quality**: >95% of events pass validation (vs current 20%)
- **City Extraction**: >98% of events have valid city
- **Source ID**: 0% exceed 100 char limit
- **Performance**: Extract events in <2x current time despite more pages

### To-dos

- [ ] Remove early exit bug at line 706 in event-scraper.ts - process all chunks to completion
- [ ] Create event-cleaning.service.ts with markdown stripping, title cleaning, and city fallback logic
- [ ] Update GPT prompt in extractEventsWithGPT to emphasize clean titles, required city, and add examples
- [ ] Implement city extraction fallback: venue → URL → title → source default
- [ ] Change source_id generation to use URL hash instead of full title to prevent 100 char overflow
- [ ] Implement adaptive page limit strategy with smart stopping based on event discovery rate
- [ ] Add auto-fix pipeline before validation: attempt to fix missing city, long source_id, invalid dates
- [ ] Add retry logic for failed extractions with better prompts (max 2 retries)
- [ ] Create pagination-detector.service.ts to automatically detect and handle pagination patterns
- [ ] Add incremental crawling with last_crawled_at tracking and URL deduplication
- [ ] Implement two-phase extraction: listing pages first, then detail page enrichment
- [ ] Add detailed crawl metrics: quality scores, city extraction rate, retry rate, store in sync_logs