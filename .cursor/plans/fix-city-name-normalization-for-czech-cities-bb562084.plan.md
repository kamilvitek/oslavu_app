<!-- bb562084-744f-45d4-b69e-a70af414a549 2ecf7aa8-f914-4fc4-8198-826b174ad810 -->
# Hybrid AI-First City Database with Normalization Verification

## Goals

1. Verify city name normalization is working reliably across all API calls
2. Implement hybrid AI-first city database (database first, AI fallback)
3. Ensure small city fallback mechanism finds competing events from nearby larger cities

## Phase 1: Verify City Normalization Implementation

### Files to Verify

**File: `src/lib/services/city-normalization.ts`**

- Verify caching mechanism works correctly
- Ensure TTL is appropriate (24 hours)
- Check that normalization always returns consistent results

**File: `src/lib/services/conflict-analysis.ts`**

- Line 661: Verify city normalization happens before API calls
- Line 803: Verify city info lookup uses normalized city
- Line 808: Verify impact cities search uses normalized city
- Ensure normalized city is used in all API URL construction

**File: `src/app/api/analyze/events/ticketmaster/route.ts`**

- Line 108: Verify normalization happens before API call
- Line 110: Verify normalized city is used for API
- Ensure special case handling (Prague) uses normalized name

**File: `src/app/api/events/scraped/route.ts`**

- Line 63: Verify normalization for database queries
- Line 96-102: Verify fuzzy matching uses normalized name and aliases
- Ensure both Czech and English names are found

**File: `src/lib/services/ticketmaster.ts`**

- Line 250-260: Verify Prague special case uses normalized city
- Ensure all city parameters are normalized before API calls

### Verification Steps

1. Add comprehensive logging to track normalization flow
2. Test with "Praha" and "Prague" - should produce identical results
3. Test with typos and variations - should normalize correctly
4. Verify cache is working (second call should be faster)
5. Check all console logs show normalization happening

## Phase 2: Implement Hybrid AI-First City Database Service

### File: `src/lib/services/city-database.ts`

**Update `getCityInfo` method:**

- Current: Only queries database, returns null if not found
- New: Query database first, if not found use AI to get city info, then cache in database

**Implementation:**

```typescript
async getCityInfo(cityName: string): Promise<CityInfo | null> {
  // Step 1: Normalize city name
  const normalizedCity = await cityNormalizationService.getAPICityName(cityName);
  
  // Step 2: Try database first (by English name)
  let cityInfo = await this.getCityInfoFromDatabase(normalizedCity);
  if (cityInfo) {
    console.log(`✅ City info found in database: ${normalizedCity}`);
    return cityInfo;
  }
  
  // Step 3: Try database by Czech name (if original was Czech)
  if (cityName !== normalizedCity) {
    cityInfo = await this.getCityInfoFromDatabase(cityName, 'name_cs');
    if (cityInfo) {
      console.log(`✅ City info found in database (Czech name): ${cityName}`);
      return cityInfo;
    }
  }
  
  // Step 4: Database not found - use AI to get city info
  console.log(`🤖 City not in database, using AI: ${cityName}`);
  cityInfo = await this.getCityInfoFromAI(cityName, normalizedCity);
  
  // Step 5: Cache AI result in database for future use
  if (cityInfo) {
    await this.cacheCityInfoInDatabase(cityInfo);
    console.log(`💾 Cached city info in database: ${normalizedCity}`);
  }
  
  return cityInfo;
}
```

**New Methods to Add:**

1. `getCityInfoFromDatabase(name: string, field: 'name_en' | 'name_cs' = 'name_en'): Promise<CityInfo | null>`

   - Extracts current database query logic
   - Returns null if not found

2. `getCityInfoFromAI(originalName: string, normalizedName: string): Promise<CityInfo | null>`

   - Uses OpenAI to get city information (population, coordinates)
   - Returns structured CityInfo object
   - Handles errors gracefully

3. `cacheCityInfoInDatabase(cityInfo: CityInfo): Promise<void>`

   - Inserts city info into database
   - Handles conflicts (ON CONFLICT DO NOTHING)
   - Only caches if city has population and coordinates

**Update `getImpactCities` method:**

- Current: Only uses database relationships or calculates from database
- New: If database doesn't have relationships, use AI to find nearby cities, then cache relationships

**Implementation:**

```typescript
async getImpactCities(cityName: string, minPopulation: number = 50000, maxDistance: number = 50): Promise<NearbyCityInfo[]> {
  const cityInfo = await this.getCityInfo(cityName);
  if (!cityInfo) return [];
  
  // Check if city is small
  const SMALL_CITY_THRESHOLD = 50000;
  if (cityInfo.population && cityInfo.population >= SMALL_CITY_THRESHOLD) {
    return [];
  }
  
  // Step 1: Check database for pre-computed relationships
  if (cityInfo.nearby_cities && cityInfo.nearby_cities.length > 0) {
    return await this.getImpactCitiesFromDatabase(cityInfo);
  }
  
  // Step 2: Calculate from database (existing logic)
  const calculated = await this.findNearbyCities(cityInfo.id, maxDistance, minPopulation);
  if (calculated.length > 0) {
    // Cache relationships for future use
    await this.cacheCityRelationships(cityInfo.id, calculated);
    return calculated;
  }
  
  // Step 3: Use AI to find nearby cities
  console.log(`🤖 Using AI to find impact cities for: ${cityName}`);
  const aiResult = await this.findImpactCitiesWithAI(cityInfo, minPopulation, maxDistance);
  
  // Step 4: Cache AI result in database
  if (aiResult.length > 0) {
    await this.cacheCityRelationships(cityInfo.id, aiResult);
  }
  
  return aiResult;
}
```

**New Methods to Add:**

1. `getImpactCitiesFromDatabase(cityInfo: CityInfo): Promise<NearbyCityInfo[]>`

   - Extracts current logic for getting impact cities from nearby_cities JSONB

2. `findImpactCitiesWithAI(cityInfo: CityInfo, minPopulation: number, maxDistance: number): Promise<NearbyCityInfo[]>`

   - Uses OpenAI to find nearby larger cities
   - Returns cities with distance and impact factor
   - Validates results before returning

3. `cacheCityRelationships(cityId: string, relationships: NearbyCityInfo[]): Promise<void>`

   - Updates city's nearby_cities JSONB field
   - Only updates if relationships are valid

### File: Create `src/lib/services/ai-city-info.ts` (NEW)

**Purpose:** Centralized AI service for city information

**Methods:**

1. `getCityInfoFromLLM(cityName: string, normalizedName: string): Promise<CityInfo | null>`

   - Uses OpenAI to get city population, coordinates, country code
   - Returns structured CityInfo
   - Handles errors and invalid responses

2. `findNearbyCitiesFromLLM(cityInfo: CityInfo, minPopulation: number, maxDistance: number): Promise<NearbyCityInfo[]>`

   - Uses OpenAI to find nearby larger cities
   - Calculates distances and impact factors
   - Returns validated results

**AI Prompts:**

- Use structured JSON responses
- Request specific fields: population, latitude, longitude, country_code
- For nearby cities: request name, distance_km, reasoning
- Validate all numeric values before returning

## Phase 3: Update Database Migration

### File: `supabase/migrations/015_create_cities_table.sql`

**Changes:**

1. Keep table structure as is
2. Only insert major cities (population >= 10,000) initially
3. Remove requirement for all cities > 3,000 (AI will handle smaller cities)
4. Add comment explaining hybrid approach

**Update comment:**

```sql
-- Migration: Create cities table with population and nearby cities data
-- This table stores city information including population, coordinates, and nearby cities
-- Used for small city fallback logic to find nearby larger cities that could impact attendance
-- 
-- HYBRID APPROACH:
-- - Database stores frequently used cities (population >= 10,000) and pre-computed relationships
-- - AI is used as fallback for cities not in database
-- - AI results are cached in database for future use
-- - This provides fast lookups for common cities while maintaining flexibility
```

## Phase 4: Update Conflict Analysis Service

### File: `src/lib/services/conflict-analysis.ts`

**Verify and Update:**

1. Line 803: Ensure `getCityInfo` is called with original city name (normalization happens inside)
2. Line 806: Verify small city detection logic
3. Line 808: Verify `getImpactCities` is called correctly
4. Line 865-882: Verify impact city API requests are created correctly
5. Ensure impact city events are properly marked with metadata

**Add Error Handling:**

- If city info lookup fails, log warning but continue with main city search
- If impact cities lookup fails, log warning but don't fail entire analysis
- Ensure analysis always returns results for submitted city, even if impact cities fail

## Phase 5: Testing and Validation

### Test Cases

1. **City Normalization Tests:**

   - "Praha" → "Prague" (should normalize)
   - "prague" → "Prague" (case normalization)
   - "Brno" → "Brno" (already English)
   - "xyz" → should handle gracefully

2. **Database-First Tests:**

   - Query "Prague" (should find in database immediately)
   - Query "Praha" (should normalize, then find in database)
   - Verify no AI call is made for cities in database

3. **AI Fallback Tests:**

   - Query small city not in database (e.g., "Velké Meziříčí")
   - Verify AI is called
   - Verify result is cached in database
   - Query same city again (should use database, not AI)

4. **Small City Fallback Tests:**

   - Query "Břeclav" (population 24,538)
   - Verify small city is detected
   - Verify impact cities are found (Brno)
   - Verify additional API requests are made for impact cities
   - Verify events from impact cities are included with metadata

5. **Impact Cities Tests:**

   - Query small city with pre-computed relationships (should use database)
   - Query small city without relationships (should calculate or use AI)
   - Verify impact factors are calculated correctly
   - Verify distance calculations are accurate

### Validation Checklist

- [ ] All API calls use normalized city names
- [ ] Database is checked before AI calls
- [ ] AI results are cached in database
- [ ] Small cities trigger impact city searches
- [ ] Impact city events are properly marked
- [ ] Analysis always returns results for submitted city
- [ ] Error handling prevents failures from breaking analysis
- [ ] Logging provides clear visibility into flow

## Phase 6: Performance Optimization

1. **Caching Strategy:**

   - In-memory cache for city normalization (already implemented)
   - Database cache for city info (new)
   - Consider Redis for distributed caching if needed

2. **Batch Operations:**

   - If multiple cities need AI lookup, batch them
   - Use parallel processing where possible

3. **Database Indexes:**

   - Verify indexes exist on name_en, name_cs, population
   - Add index on country_code if missing

## Implementation Order

1. Create `ai-city-info.ts` service
2. Update `city-database.ts` with hybrid approach
3. Update migration file comments
4. Verify normalization in all files
5. Add comprehensive logging
6. Test with various city names
7. Test small city fallback
8. Performance testing
9. Error handling improvements
10. Documentation updates

### To-dos

- [ ] Verify city normalization is working correctly in all API call points (conflict-analysis.ts, ticketmaster route, scraped route, ticketmaster service)
- [ ] Create new ai-city-info.ts service with methods to get city info and find nearby cities using LLM
- [ ] Update city-database.ts to implement hybrid approach: database first, then AI fallback, then cache AI results
- [ ] Update migration file to reflect hybrid approach and remove requirement for all cities > 3000
- [ ] Verify and update conflict-analysis.ts to ensure proper use of city database service and impact cities
- [ ] Add detailed logging throughout city normalization and database lookup flow for debugging
- [ ] Test city normalization with various inputs (Praha, Prague, typos, variations)
- [ ] Test that database is checked before AI calls and AI results are cached
- [ ] Test small city fallback mechanism with Břeclav and verify impact cities are found and events are included
- [ ] Add comprehensive error handling to prevent failures from breaking analysis flow