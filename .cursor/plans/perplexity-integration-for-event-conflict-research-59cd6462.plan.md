<!-- 59cd6462-d714-4cc8-b094-bd995517ebb3 48692c5c-720b-4606-b8a2-4020790ef749 -->
# Perplexity Integration for Event Conflict Research

## Overview

This plan integrates Perplexity Sonar Large (Online) LLM model to enhance the conflict analysis system with real-time online research capabilities. The implementation will provide comprehensive event conflict intelligence by searching the web for competing events, major artists touring, local festivals, holidays, and cultural events that might impact attendance.

## Core Implementation

### 1. Perplexity Service Layer

**File**: `src/lib/services/perplexity-research.ts`

Create a new service class following the pattern of `openai-audience-overlap.ts`:

- **Class**: `PerplexityResearchService`
- **Purpose**: Handle all Perplexity API interactions with structured outputs
- **Key Methods**:
  - `researchEventConflicts()` - Main research method
  - `searchConflictingEvents()` - Search for competing events
  - `searchTouringArtists()` - Find major artists touring
  - `searchLocalFestivals()` - Find local festivals and cultural events
  - `searchHolidaysAndCulturalEvents()` - Find holidays and special events
  - `generateDateRecommendations()` - AI-powered date recommendations

**Features**:

- Use Perplexity's structured outputs for reliable JSON parsing
- Implement request caching (5-minute TTL) similar to conflict analysis cache
- Error handling with graceful fallbacks
- Rate limiting and retry logic
- Request deduplication

**Structured Output Schema**:

```typescript
interface PerplexityConflictResearch {
  conflictingEvents: Array<{
    name: string;
    date: string;
    location: string;
    type: 'concert' | 'festival' | 'cultural_event' | 'other';
    expectedAttendance?: number;
    description?: string;
    source?: string;
  }>;
  touringArtists: Array<{
    artistName: string;
    tourDates: string[];
    locations: string[];
    genre?: string;
  }>;
  localFestivals: Array<{
    name: string;
    dates: string;
    location: string;
    type: string;
    description?: string;
  }>;
  holidaysAndCulturalEvents: Array<{
    name: string;
    date: string;
    type: 'holiday' | 'cultural_event';
    impact: 'low' | 'medium' | 'high';
    description?: string;
  }>;
  recommendations: {
    shouldMoveDate: boolean;
    recommendedDates?: string[];
    reasoning: string[];
    riskLevel: 'low' | 'medium' | 'high';
  };
}
```

### 2. Environment Configuration

**File**: `env-template.txt`

Add Perplexity API key:

```
# Perplexity Configuration (for online event research)
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

**File**: `.env.local` (user's local file)

User needs to add their Perplexity API key.

### 3. Integration with Conflict Analysis

**File**: `src/lib/services/conflict-analysis.ts`

Enhance the `ConflictAnalysisService` class:

- **New Method**: `enhanceWithPerplexityResearch()`
  - Called after initial conflict analysis
  - Merges Perplexity research results with existing database events
  - Updates conflict scores based on online findings
  - Adds Perplexity insights to `DateRecommendation` objects

- **Update**: `DateRecommendation` interface
  - Add `perplexityResearch?: PerplexityConflictResearch` field
  - Include online research findings in recommendations

**Integration Points**:

- After `fetchEventsFromAPI()` completes
- Before `generateDateRecommendationsOptimized()` finalizes results
- Merge Perplexity findings with database events (deduplicate)

### 4. API Endpoint

**File**: `src/app/api/perplexity-research/route.ts`

Create new API endpoint for Perplexity-powered research:

- **POST** `/api/perplexity-research`
- **Request Schema**:
  ```typescript
  {
    city: string;
    category: string;
    subcategory?: string;
    date: string; // YYYY-MM-DD
    expectedAttendees: number;
    dateRange?: {
      start: string;
      end: string;
    };
  }
  ```

- **Response**: `PerplexityConflictResearch` object
- **Features**:
  - Input validation with Zod
  - Error handling
  - Caching headers
  - Rate limiting

### 5. Enhanced Conflict Analysis API

**File**: `src/app/api/analyze/route.ts`

Update existing analyze endpoint:

- Add optional `enablePerplexityResearch?: boolean` parameter
- When enabled, call `PerplexityResearchService` after initial analysis
- Merge results and return enhanced analysis

**File**: `src/app/api/conflict-analysis/route.ts`

Similar updates to conflict-analysis endpoint.

### 6. Type Definitions

**File**: `src/types/perplexity.ts` (new file)

Define all Perplexity-related types:

- `PerplexityConflictResearch`
- `PerplexityEvent`
- `PerplexityTouringArtist`
- `PerplexityFestival`
- `PerplexityHoliday`
- `PerplexityRecommendation`

### 7. Caching Strategy

**File**: `src/lib/services/perplexity-research.ts`

Implement caching similar to conflict analysis:

- **Cache Key**: Based on city, category, subcategory, date range
- **TTL**: 5 minutes (Perplexity provides real-time data)
- **Storage**: In-memory Map with expiry timestamps
- **Cache Invalidation**: Manual invalidation on request

### 8. Error Handling & Fallbacks

**File**: `src/lib/services/perplexity-research.ts`

- **API Failures**: Return empty results, don't break main analysis
- **Rate Limits**: Implement exponential backoff
- **Invalid Responses**: Validate structured outputs, fallback to text parsing
- **Timeout**: 30-second timeout for Perplexity requests
- **Logging**: Comprehensive error logging for debugging

## Additional Features

### 9. Dynamic Prompt Generation

**File**: `src/lib/services/perplexity-research.ts`

Create intelligent prompts based on category/subcategory:

- **Entertainment/Pop**: Focus on concerts, music festivals, touring artists
- **Technology**: Focus on tech conferences, hackathons, meetups
- **Business**: Focus on business conferences, networking events
- **Sports**: Focus on sports events, tournaments
- **Arts & Culture**: Focus on cultural festivals, art exhibitions

**Prompt Template**:

```
You are an event conflict analyst. A user is organizing a [category] event 
([subcategory]) in [city] on [date]. They expect [expectedAttendees] attendees.

Search for:
1. Other [category-specific events] in [city] and nearby cities ([nearby cities]) 
   during [date range]
2. Major [category] artists/events touring Czech Republic that week
3. Local festivals or cultural events targeting similar audiences
4. Holidays or special events in Czech Republic during that period

Provide structured JSON with:
- Conflicting events with dates, locations, expected attendance
- Touring artists with tour dates and locations
- Local festivals with dates and descriptions
- Holidays and cultural events with impact levels
- Recommendation: Should they move the date? What dates would be better?
```

### 10. Nearby Cities Detection

**File**: `src/lib/utils/city-proximity.ts` (new file)

Create utility to determine nearby cities for search:

- **Prague**: Brno, Pardubice, Hradec Králové, České Budějovice
- **Brno**: Prague, Pardubice, Olomouc, Zlín
- **Hradec Králové**: Prague, Pardubice, Brno
- **Pardubice**: Prague, Hradec Králové, Brno
- **Ostrava**: Brno, Prague, Olomouc

Use this in Perplexity prompts to search broader geographic area.

### 11. Event Deduplication with Perplexity Results

**File**: `src/lib/services/conflict-analysis.ts`

Enhance deduplication to handle Perplexity events:

- Compare Perplexity events with database events
- Use semantic similarity (existing embeddings)
- Merge duplicate events, keep best data source
- Mark Perplexity events as "online_research" source

### 12. Confidence Scoring

**File**: `src/lib/services/perplexity-research.ts`

Add confidence scores to Perplexity findings:

- **High Confidence**: Multiple sources confirm, specific dates/venues
- **Medium Confidence**: Single source, general dates
- **Low Confidence**: Unverified information, estimated dates

Include confidence in response for UI display.

### 13. Response Formatting

**File**: `src/lib/services/perplexity-research.ts`

Format Perplexity responses for UI:

- Convert dates to consistent format (YYYY-MM-DD)
- Normalize city names (match database format)
- Extract and structure URLs/sources
- Generate human-readable summaries

## Implementation Steps

1. **Setup** (1-2 hours)

   - Install Perplexity SDK or create HTTP client
   - Add environment variable
   - Create type definitions

2. **Core Service** (4-6 hours)

   - Implement `PerplexityResearchService` class
   - Add structured output handling
   - Implement caching and error handling

3. **Integration** (2-3 hours)

   - Integrate with `ConflictAnalysisService`
   - Update API endpoints
   - Add request/response types

4. **Testing** (2-3 hours)

   - Unit tests for service methods
   - Integration tests with conflict analysis
   - Error scenario testing

5. **Documentation** (1 hour)

   - Update API documentation
   - Add usage examples
   - Document environment setup

## Additional Beneficial Features

### 14. Historical Event Analysis

Use Perplexity to research past events:

- "What events happened in [city] during [month] in previous years?"
- Identify recurring festivals/events
- Predict likely event dates based on historical patterns

### 15. Venue Availability Research

Enhance venue conflict detection:

- "What events are scheduled at [venue] during [date range]?"
- Cross-reference with Perplexity research for venue conflicts

### 16. Audience Sentiment Analysis

Research audience interest:

- "What is the current interest level for [category] events in [city]?"
- Identify trending topics/artists
- Gauge market demand

### 17. Competitive Intelligence

Research competitor events:

- "What similar events are being promoted in [city]?"
- Identify marketing campaigns
- Track competitor strategies

### 18. Transportation & Logistics

Research transportation impacts:

- "Are there major transportation disruptions in [city] during [date range]?"
- Factor in public transport schedules
- Consider traffic patterns

### 20. Cost Analysis

Research event costs:

- "What are typical costs for [category] events in [city]?"
- Compare venue pricing
- Identify cost-effective dates

## Reliability Measures

1. **Structured Outputs**: Use Perplexity's structured output feature for reliable JSON parsing
2. **Validation**: Validate all Perplexity responses with Zod schemas
3. **Fallbacks**: Always fallback to database-only analysis if Perplexity fails
4. **Caching**: Cache results to reduce API calls and improve reliability
5. **Error Handling**: Comprehensive try-catch with detailed logging
6. **Timeout Protection**: 30-second timeout prevents hanging requests
7. **Rate Limiting**: Respect Perplexity rate limits with exponential backoff
8. **Deduplication**: Merge Perplexity results with database events to avoid duplicates
9. **Source Attribution**: Track data sources for transparency
10. **Testing**: Comprehensive test coverage for all scenarios

## Files to Create/Modify

**New Files**:

- `src/lib/services/perplexity-research.ts`
- `src/types/perplexity.ts`
- `src/lib/utils/city-proximity.ts`
- `src/app/api/perplexity-research/route.ts`

**Modified Files**:

- `src/lib/services/conflict-analysis.ts`
- `src/app/api/analyze/route.ts`
- `src/app/api/conflict-analysis/route.ts`
- `env-template.txt`
- `package.json` (if Perplexity SDK needed)

## Dependencies

- Perplexity API access (API key required)
- Existing OpenAI integration (for reference pattern)
- Existing caching infrastructure
- Existing error handling utilities