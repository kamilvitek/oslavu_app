<!-- 7cd71675-4567-4c34-ae0f-41c3f4f77a52 2209b297-fae4-4967-85ad-23ad6ca574f2 -->
# Perplexity Research Service - Comprehensive Improvement Plan

## Overview

Transform the Perplexity Research Service into a production-ready, scalable, and cost-optimized system with persistent caching, robust error handling, and comprehensive observability.

## Phase 1: Critical Infrastructure (Week 1)

### 1.1 Persistent Database Cache

**File:** `supabase/migrations/017_add_perplexity_research_cache.sql`

Create database cache table following existing patterns (`audience_overlap_cache`, `seasonal_insights_cache`):

- Table: `perplexity_research_cache`
- Fields: `id`, `cache_key` (unique), `city`, `category`, `subcategory`, `date`, `date_range_start`, `date_range_end`, `expected_attendees`, `result_data` (JSONB), `prompt_version`, `events_found_count`, `confidence`, `created_at`, `expires_at`
- Indexes: `cache_key`, `(city, category, date)`, `expires_at`
- TTL: 24 hours for successful results, 1 hour for "no results"

**File:** `src/lib/services/perplexity-research-cache.ts` (new)

Create cache service with two-tier caching:

- Memory cache (fast, first check)
- Database cache (persistent, fallback)
- Methods: `getCachedResult()`, `cacheResult()`, `invalidateCache()`
- Follow pattern from `AudienceOverlapCacheService`

**File:** `src/lib/services/perplexity-research.ts`

Integrate persistent cache:

- Replace in-memory `Map` with `PerplexityResearchCacheService`
- Check database cache before API call
- Store results in both memory and database
- Handle cache misses gracefully

### 1.2 City Lookup Timeout

**File:** `src/lib/services/perplexity-research.ts`

Add timeout to `getNearbyCitiesForPrompt()`:

- Wrap `cityDatabaseService.getImpactCities()` in `Promise.race()` with 5-second timeout
- Fallback to hardcoded list immediately on timeout
- Log timeout events for monitoring
- Don't block prompt generation

### 1.3 Circuit Breaker for Fallback Prompt

**File:** `src/lib/services/perplexity-research.ts`

Prevent unnecessary fallback API calls:

- Skip fallback if city population < 10,000 (too small)
- Skip fallback if category is very niche (configurable list)
- Cache "no results" responses with 1-hour TTL
- Add config flag: `ENABLE_PERPLEXITY_FALLBACK` (default: true)

## Phase 2: Reliability & Error Handling (Week 1-2)

### 2.1 Retry Logic with Exponential Backoff

**File:** `src/lib/services/perplexity-research.ts`

Implement retry in `callPerplexityAPI()`:

- Retry on 5xx errors and network timeouts (max 3 attempts)
- Exponential backoff: 1s, 2s, 4s
- Don't retry on 4xx errors (invalid request)
- Don't retry on rate limit (429) - handle separately
- Log retry attempts

### 2.2 Rate Limit Handling

**File:** `src/lib/services/perplexity-research.ts`

Handle Perplexity API rate limits:

- Check response headers: `x-ratelimit-remaining`, `x-ratelimit-reset`
- On 429 error, extract `retry-after` header
- Queue requests when rate limited
- Return cached result if available during rate limit
- Log rate limit events

### 2.3 Result Validation (Location & Attendance)

**File:** `src/lib/services/perplexity-research.ts`

Enhance `validateAndParseResponse()`:

- Validate locations: Filter events not in Czech Republic (check for country codes, city names)
- Validate attendance: Ensure 1-1,000,000 range, flag unrealistic numbers
- Validate event names: Filter empty or invalid names
- Add validation flags to confidence scoring
- Log filtered events for analysis

## Phase 3: Configuration & Business Logic (Week 2)

### 3.1 Configurable Thresholds

**File:** `supabase/migrations/018_add_perplexity_config.sql`

Create configuration table:

- Table: `perplexity_config`
- Fields: `category`, `event_type`, `large_event_threshold`, `nearby_city_radius_km`, `temporal_window_days`
- Defaults: Business (500), Music/Entertainment (1000), Festivals (2000)

**File:** `src/lib/services/perplexity-config.ts` (new)

Configuration service:

- Load config from database with in-memory cache
- Fallback to defaults if not configured
- Methods: `getLargeEventThreshold()`, `getTemporalWindow()`, `getNearbyCityRadius()`

**File:** `src/lib/services/perplexity-research.ts`

Use configurable thresholds:

- Replace hardcoded `1000` with `perplexityConfigService.getLargeEventThreshold(category)`
- Use configurable temporal windows per category
- Use configurable radius for nearby cities

### 3.2 Event Type-Specific Logic

**File:** `src/lib/services/perplexity-research.ts`

Enhance prompt generation:

- Business events: 3-day temporal window, 30km radius
- Music/Entertainment: 7-day temporal window, 50km radius
- Festivals: 14-day temporal window, 100km radius
- Use configuration service for values

## Phase 4: Quality & Confidence (Week 2-3)

### 4.1 Enhanced Confidence Scoring

**File:** `src/lib/services/perplexity-research.ts`

Improve confidence calculation:

- Source quality: Official sites (0.9), news sites (0.7), unknown (0.5)
- Date specificity: Exact date (0.9), date range (0.7), relative (0.5)
- Attendance data: Provided (0.8), estimated (0.6), missing (0.4)
- Description completeness: >100 chars (0.7), <100 chars (0.5), missing (0.3)
- Location validation: Validated (0.8), unvalidated (0.5)
- Combine factors with weighted average

### 4.2 Multi-Day Event Handling

**File:** `src/lib/services/perplexity-research.ts`

Update prompt and validation:

- Prompt: Explicitly request date ranges for multi-day events
- Validation: Check if event date range overlaps with target date range
- Include events that span target dates

### 4.3 Timezone Handling

**File:** `src/lib/services/perplexity-research.ts`

Explicit timezone specification:

- Add timezone to prompt: "All dates in Europe/Prague timezone"
- Normalize all dates to UTC for storage
- Validate date parsing includes timezone awareness

## Phase 5: Observability & Monitoring (Week 3)

### 5.1 Structured Logging

**File:** `src/lib/services/perplexity-research.ts`

Add structured logging:

- Log all API calls with: timestamp, city, category, prompt_version, tokens_used, success, duration_ms
- Log cache hits/misses
- Log validation failures
- Use consistent log format for parsing

### 5.2 Metrics Collection

**File:** `src/lib/services/perplexity-metrics.ts` (new)

Metrics service:

- Track: API calls, cache hit rate, avg response time, error rate, cost estimate
- Store in database: `perplexity_metrics` table (daily aggregates)
- Methods: `recordApiCall()`, `recordCacheHit()`, `recordError()`

**File:** `supabase/migrations/019_add_perplexity_metrics.sql`

Create metrics table:

- Daily aggregates: date, total_calls, cache_hits, avg_response_time_ms, error_count, estimated_cost_usd

### 5.3 Health Check Endpoint

**File:** `src/app/api/perplexity-research/health/route.ts` (new)

Health check:

- Check API key configured
- Check database connectivity
- Check cache service status
- Return service status

## Phase 6: Optimization (Week 3-4)

### 6.1 Prompt Optimization

**File:** `src/lib/services/perplexity-research.ts`

Optimize prompts for token usage:

- Remove redundant instructions
- Use shorter, more direct language
- Test different prompt versions
- Track token usage per version

### 6.2 A/B Testing Framework

**File:** `src/lib/services/perplexity-research.ts`

Prompt versioning:

- Add `prompt_version` field to cache
- Support multiple prompt versions
- Track performance per version
- Gradually roll out better versions

### 6.3 Batch Processing Optimization

**File:** `src/lib/services/perplexity-research.ts`

Optimize for date ranges:

- Combine multiple dates in single prompt when possible
- Use date ranges instead of individual dates
- Reduce API calls for date range queries

## Implementation Details

### Cache Key Generation

```typescript
function generateCacheKey(params: PerplexityResearchParams): string {
  const dateStr = params.dateRange 
    ? `${params.dateRange.start}-${params.dateRange.end}`
    : params.date;
  return `perplexity:${params.city}:${params.category}:${params.subcategory || ''}:${dateStr}:${params.expectedAttendees}`;
}
```

### Error Handling Strategy

- API errors: Retry with backoff, fallback to cache, return null
- Validation errors: Log and filter, continue with valid data
- Timeout errors: Use cached result if available, return null
- Rate limit: Queue request, return cached result

### Database Schema

Follow existing migration patterns:

- Use `IF NOT EXISTS` for safety
- Add proper indexes
- Include `created_at`, `updated_at`, `expires_at`
- Use JSONB for flexible data storage

### Testing Strategy

- Unit tests for cache service
- Integration tests for API calls
- Test retry logic
- Test rate limit handling
- Test validation logic

## Success Metrics

- Cache hit rate: >50%
- API cost reduction: 40-60%
- Error rate: <5%
- Average response time: <2s (with cache)
- 99th percentile response time: <5s

## Rollout Plan

1. Deploy database migrations
2. Deploy cache service (disabled initially)
3. Enable cache service gradually (10%, 50%, 100%)
4. Monitor metrics and adjust
5. Enable retry logic
6. Enable rate limit handling
7. Roll out configuration system
8. Enable enhanced validation

## Risk Mitigation

- Feature flags for all new features
- Gradual rollout with monitoring
- Fallback to existing behavior on errors
- Comprehensive logging for debugging
- Database migrations are reversible

### To-dos

- [ ] Create database migration for perplexity_research_cache table with proper schema, indexes, and TTL fields
- [ ] Create PerplexityResearchCacheService with two-tier caching (memory + database) following AudienceOverlapCacheService pattern
- [ ] Integrate persistent cache into PerplexityResearchService, replacing in-memory Map
- [ ] Add 5-second timeout to getNearbyCitiesForPrompt() with immediate fallback to hardcoded list
- [ ] Implement circuit breaker for fallback prompt: skip for small cities, cache no-results, add config flag
- [ ] Implement retry logic with exponential backoff (3 attempts, 1s/2s/4s) for 5xx errors and timeouts
- [ ] Implement rate limit handling: check headers, queue requests, return cached results during rate limits
- [ ] Enhance result validation: filter non-Czech locations, validate attendance range (1-1M), validate event names
- [ ] Create perplexity_config table migration with category-specific thresholds and settings
- [ ] Create PerplexityConfigService to load and cache configuration from database with defaults
- [ ] Replace hardcoded thresholds in PerplexityResearchService with configurable values from config service
- [ ] Implement event type-specific temporal windows and radius based on category (Business/Music/Festivals)
- [ ] Enhance confidence scoring with source quality, date specificity, attendance data, description completeness, location validation
- [ ] Update prompt and validation to properly handle multi-day events with date range overlap checking
- [ ] Add explicit timezone specification (Europe/Prague) to prompts and normalize all dates to UTC
- [ ] Add structured logging for all API calls, cache operations, and validation failures
- [ ] Create perplexity_metrics table for daily aggregates of API usage, cache performance, and costs
- [ ] Create PerplexityMetricsService to track and store metrics (API calls, cache hits, response times, errors)
- [ ] Create health check endpoint to verify API key, database connectivity, and cache service status
- [ ] Optimize prompts for token usage: remove redundancy, use shorter language, track token usage per version
- [ ] Add prompt versioning system with A/B testing capability to track performance per version
- [ ] Optimize batch processing: combine multiple dates in single prompt, use date ranges efficiently