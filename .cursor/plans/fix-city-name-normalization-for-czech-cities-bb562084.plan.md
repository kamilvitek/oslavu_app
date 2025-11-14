<!-- bb562084-744f-45d4-b69e-a70af414a549 4c9a8ec9-d649-4c09-abff-ce4d075c5e40 -->
# Fix City Name Normalization for Czech Cities

## Root Cause Analysis

The app performs worse with Czech city names because:

1. **City names are not normalized before API calls**: When "Praha" is passed, it's sent directly to Ticketmaster API which expects "Prague". The normalization only happens AFTER API calls for location filtering.

2. **Special case only matches "prague" (lowercase)**: In `ticketmaster.ts:248`, the check `sanitizedParams.city.toLowerCase() === 'prague'` doesn't match "Praha".

3. **Inconsistent city name handling**: Different APIs receive different city name formats, and the scraped events database may have inconsistent city names.

4. **No centralized normalization**: City recognition service is only used for filtering, not before API calls.

5. **Czech character encoding**: Potential issues with URL encoding of Czech characters (ě, ř, ž, etc.).

## Implementation Plan

### Phase 1: Centralized City Normalization Service

**File: `src/lib/services/city-normalization.ts` (NEW)**

- Create a centralized service that normalizes city names before API calls
- Use `cityRecognitionService.recognizeCity()` to get normalized English name
- Cache recognition results to avoid repeated LLM calls
- Return both normalized name and original for logging
- Handle Czech characters properly (UTF-8 encoding)

**Key functions:**

- `normalizeCityForAPI(city: string): Promise<{ normalized: string, original: string, aliases: string[] }>`
- `getAPICityName(city: string): Promise<string>` - Returns English name for APIs
- `getDatabaseCityName(city: string): Promise<string>` - Returns normalized name for DB queries

### Phase 2: Update API Call Points

**File: `src/lib/services/conflict-analysis.ts`**

- Line 666: Normalize city before building query params
- Update `fetchEventsFromAPI()` to normalize city before making API calls
- Pass normalized city to all event source APIs

**File: `src/app/api/analyze/events/ticketmaster/route.ts`**

- Line 95: Normalize city before using it
- Line 222: Update special case to check normalized city name
- Line 315: Update fallback check to use normalized city

**File: `src/lib/services/ticketmaster.ts`**

- Line 248: Update check to use normalized city name
- Line 394: Update target city filtering to use normalized name
- Ensure all city parameters are normalized before API calls

**File: `src/app/api/events/scraped/route.ts`**

- Line 48: Normalize city before database query
- Use normalized city for both exact and fuzzy matching

### Phase 3: City Database with Population Data

**Database Schema (Migration):**

```sql
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en TEXT NOT NULL, -- English name for APIs
  name_cs TEXT, -- Czech name
  country_code TEXT NOT NULL,
  population INTEGER,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  nearby_cities JSONB, -- Array of nearby city IDs with distances
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name_en, country_code)
);

CREATE INDEX idx_cities_name_en ON cities(name_en);
CREATE INDEX idx_cities_name_cs ON cities(name_cs);
CREATE INDEX idx_cities_country ON cities(country_code);
CREATE INDEX idx_cities_population ON cities(population);
```

**File: `src/lib/services/city-database.ts` (NEW)**

- Service to query city database
- `getCityInfo(city: string): Promise<CityInfo | null>`
- `findNearbyCities(cityId: string, maxDistance: number): Promise<CityInfo[]>`
- `getFallbackCity(smallCity: string, minPopulation: number): Promise<CityInfo | null>`

**File: `src/lib/services/conflict-analysis.ts`**

- Before API calls, check if city is small (< threshold population)
- If small, find nearby larger city and run analysis for both
- Merge results with appropriate weighting

### Phase 4: URL Encoding Fixes

**File: `src/lib/utils/input-sanitization.ts`**

- Ensure proper UTF-8 encoding for city names in URL parameters
- Use `encodeURIComponent()` for city names in query strings
- Test with Czech characters: ě, ř, ž, š, č, ř, ň, ů, ý, á, í, é, ó

**File: `src/lib/services/conflict-analysis.ts`**

- Line 665-672: Ensure city names are properly encoded in URLSearchParams
- Test URL encoding with "Praha", "Brno", "Ostrava", etc.

### Phase 5: Scraped Events Database Normalization

**File: `src/lib/services/event-storage.ts`**

- Update `getEventsByCity()` to use normalized city names
- Query both `normalized_city` and `city` fields with fuzzy matching
- Use city aliases for matching

**Migration Script:**

- Normalize existing city names in database
- Update all "Praha" to "Prague", "Brno" stays "Brno", etc.
- Populate `normalized_city` field for all events

### Phase 6: Testing & Validation

**Test Cases:**

1. "Praha" → should normalize to "Prague" before Ticketmaster API call
2. "Brno" → should work (already English)
3. "Ostrava" → should work (already English)
4. Small city → should trigger fallback to nearby larger city
5. Czech characters in URL → should encode properly
6. Scraped events query with "Praha" → should find events with "Prague" in DB

**Files to update:**

- `src/lib/services/conflict-analysis.ts` (normalize before API calls)
- `src/app/api/analyze/events/ticketmaster/route.ts` (normalize city)
- `src/lib/services/ticketmaster.ts` (use normalized city)
- `src/app/api/events/scraped/route.ts` (normalize for DB query)
- `src/lib/utils/input-sanitization.ts` (URL encoding)
- `src/lib/services/event-storage.ts` (DB query normalization)

**New files:**

- `src/lib/services/city-normalization.ts` (centralized normalization)
- `src/lib/services/city-database.ts` (city database service)
- Database migration for cities table
- Seed script for Czech cities with population data

## Implementation Order

1. Create `city-normalization.ts` service with caching
2. Update `conflict-analysis.ts` to normalize before API calls
3. Update Ticketmaster route and service to use normalized names
4. Fix URL encoding for Czech characters
5. Update scraped events route for normalized queries
6. Create city database schema and seed data
7. Implement small city fallback logic
8. Test with "Praha" vs "Prague" inputs
9. Run database migration to normalize existing events

## Success Criteria

- "Praha" input produces same results as "Prague" input
- All API calls receive normalized English city names
- Czech characters are properly encoded in URLs
- Small cities include events from nearby larger cities in the analysis (analysis still for submitted city)
- Database queries match both Czech and English city names
- No performance degradation (caching prevents repeated LLM calls)

### To-dos

- [ ] Create centralized city normalization service (city-normalization.ts) with caching and API/database name methods
- [ ] Update conflict-analysis.ts to normalize city names before making API calls in fetchEventsFromAPI()
- [ ] Update ticketmaster route.ts to normalize city before API calls and fix special case checks
- [ ] Update ticketmaster.ts service to use normalized city names in all API calls
- [ ] Fix URL encoding in input-sanitization.ts to properly handle Czech characters
- [ ] Update scraped events route to normalize city before database queries
- [ ] Create database migration for cities table with population and nearby cities data
- [ ] Create city-database.ts service for querying city info and finding nearby cities
- [ ] Implement small city fallback logic in conflict-analysis.ts to use nearby larger cities
- [ ] Create migration script to normalize existing city names in events database
- [ ] Test with Praha, Brno, Ostrava and verify same results as English names