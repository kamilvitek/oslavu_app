# Application Flows Documentation

Complete documentation of user flows, state management, and logic flows in the Oslavu application.

## User Flows

### 1. Conflict Analysis Flow

**Entry Point**: Home page → Conflict Analyzer section

**Steps:**
1. User fills out the conflict analysis form:
   - Selects city
   - Selects category and subcategory
   - Enters expected attendees
   - Selects date range
   - Optionally selects preferred dates
   - Optionally enables advanced features

2. Form validation:
   - Client-side validation using Zod schema
   - Date range validation (start < end)
   - Event duration validation (max 31 days)
   - Required field validation

3. Form submission:
   - Form data sent to `/api/analyze` endpoint
   - Loading state activated
   - Progress indicator shows analysis steps

4. Backend processing:
   - Input sanitization and validation
   - Rate limiting check
   - Event data gathering from multiple sources
   - Conflict analysis calculation
   - AI-powered audience overlap analysis (if enabled)
   - Holiday and seasonality analysis
   - Perplexity research (if enabled)

5. Results display:
   - Recommended dates with conflict scores
   - High-risk dates highlighted
   - Competing events list
   - Risk level indicators
   - Detailed explanations for each recommendation

**State Management:**
- Form state: `react-hook-form` with Zod validation
- Analysis state: React `useState` for results, loading, error
- Progress state: Step-by-step progress tracking

**Components Involved:**
- `ConflictAnalysisForm` - Form input
- `ConflictAnalyzer` - Main container
- `ProgressIndicator` - Progress tracking
- `MetricCard` - Metrics display
- `StatusBadge` - Status indicators

### 2. Event Search Flow

**Entry Point**: Dashboard or Events API

**Steps:**
1. User enters search criteria:
   - City filter
   - Category filter
   - Date range
   - Source filter
   - Attendee range

2. Search request:
   - Query parameters sent to `/api/events`
   - Server-side filtering and pagination

3. Results display:
   - Event cards with details
   - Pagination controls
   - Filter summary

**State Management:**
- Search state: URL query parameters
- Results state: React Query cache
- Pagination state: URL query parameters

**Components Involved:**
- Event list components
- Filter components
- Pagination components

### 3. Web Scraping Flow

**Entry Point**: Admin interface or cron job

**Steps:**
1. Trigger scraping:
   - Manual trigger via `/api/scraper?action=scrape`
   - Automated trigger via cron job (`/api/scraper/sync`)

2. Source iteration:
   - Iterate through enabled scraper sources
   - For each source:
     - Fetch HTML content via Firecrawl
     - Extract event data using GPT-4
     - Generate embeddings for deduplication
     - Store events in database

3. Deduplication:
   - Compare new events with existing events
   - Use semantic similarity (embeddings)
   - Merge or skip duplicates

4. Completion:
   - Update sync logs
   - Return summary statistics

**State Management:**
- Scraping state: Service-level state
- Progress state: Sync logs in database

**Components Involved:**
- Scraper service
- Event storage service
- Deduplication service

## State Management

### Frontend State

#### React Query (Server State)

Used for server-side data fetching and caching:

```typescript
// Example: Fetching USP metrics
const { data, isLoading, error } = useQuery({
  queryKey: ['usp-metrics'],
  queryFn: fetchUSPMetrics,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

**Query Keys:**
- `['usp-metrics']` - USP data
- `['events', filters]` - Event search results
- `['analysis', id]` - Saved analysis results

#### React State (Client State)

Used for UI state and form state:

```typescript
// Form state with react-hook-form
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(analysisSchema),
});

// Component state
const [analysisResult, setAnalysisResult] = useState<ConflictAnalysisResult | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

#### URL State

Used for shareable state (filters, pagination):

```typescript
// Search params in URL
const searchParams = useSearchParams();
const city = searchParams.get('city');
const category = searchParams.get('category');
```

### Backend State

#### Request Caching

Request deduplication cache in conflict analysis service:

```typescript
private requestCache = new Map<string, Promise<any>>();
private cacheExpiry = new Map<string, number>();
private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

#### Conflict Cache

Conflict comparison cache:

```typescript
private conflictCache: ConflictCache = {
  comparisons: new Map(),
  expiry: new Map(),
  ttl: 10 * 60 * 1000 // 10 minutes
};
```

#### Database State

- Events stored in Supabase PostgreSQL
- Conflict analyses stored in `conflict_analyses` table
- Sync logs stored in `sync_logs` table
- Scraper sources stored in `scraper_sources` table

## Logic Flows

### 1. Conflict Analysis Logic

**Flow:**
1. **Input Validation**
   - Sanitize and validate input parameters
   - Check rate limits
   - Validate date ranges

2. **Event Gathering**
   - Fetch events from multiple sources:
     - Ticketmaster API
     - PredictHQ API
     - Brno events
     - Scraped events
   - Filter by city and date range
   - Apply category matching

3. **Event Processing**
   - Normalize event data (city, category)
   - Deduplicate events using semantic similarity
   - Calculate attendee estimates
   - Apply relevance filtering (if enabled)

4. **Conflict Calculation**
   - For each date in range:
     - Find competing events
     - Calculate conflict score (0-20):
       - Geographic proximity
       - Temporal proximity
       - Category/subcategory overlap
       - Audience overlap (if enabled)
       - Attendee size impact
     - Determine risk level (Low/Medium/High)

5. **Advanced Analysis** (if enabled)
   - Audience overlap analysis:
     - Batch process events with OpenAI
     - Calculate overlap percentages
     - Generate reasoning
   - Holiday analysis:
     - Check holidays in date range
     - Check cultural events
     - Assess business impact
   - Seasonality analysis:
     - Apply seasonal rules
     - Calculate demand multipliers
     - Generate recommendations

6. **Perplexity Research** (if enabled)
   - Query Perplexity API for online events
   - Analyze relevance
   - Integrate into conflict scores

7. **Result Generation**
   - Sort dates by conflict score
   - Generate recommendations
   - Create detailed explanations
   - Save to database

**Key Services:**
- `conflictAnalysisService` - Main analysis engine
- `audienceOverlapService` - Audience overlap calculation
- `holidayService` - Holiday checking
- `seasonalityEngine` - Seasonality analysis
- `perplexityResearchService` - Online research

### 2. Event Normalization Logic

**Flow:**
1. **Dictionary Lookup**
   - Check city normalization dictionary
   - Check category normalization dictionary
   - Apply if match found

2. **Geocoding Fallback**
   - Use geocoding API for city normalization
   - Validate city-country pairs

3. **LLM Fallback**
   - Use GPT-4 for normalization if dictionary/geocoding fail
   - Extract normalized values from event description
   - Calculate confidence score

4. **Storage**
   - Store normalized values
   - Store normalization method
   - Store confidence score

**Key Services:**
- `cityNormalizationService` - City normalization
- `aiNormalizationService` - AI-powered normalization
- `cityDatabaseService` - City database lookup

### 3. Event Deduplication Logic

**Flow:**
1. **Embedding Generation**
   - Generate embeddings for event title + description
   - Use OpenAI embeddings API
   - Cache embeddings

2. **Similarity Search**
   - Query database for similar events using vector search
   - Calculate cosine similarity
   - Apply similarity threshold (0.85)

3. **Duplicate Detection**
   - Compare dates (within 1 day)
   - Compare cities (exact match)
   - Compare categories (exact match)
   - Check semantic similarity

4. **Merge or Skip**
   - If duplicate: merge data, keep best source
   - If not duplicate: create new event

**Key Services:**
- `eventDeduplicator` - Deduplication logic
- `eventStorageService` - Event storage

### 4. Audience Overlap Analysis Logic

**Flow:**
1. **Event Selection**
   - Select events within date range
   - Filter by category/subcategory relevance
   - Limit to top N events

2. **Batch Processing**
   - Group events into batches (5 per batch)
   - Process batches in parallel (max 2 concurrent)
   - Use OpenAI batch API

3. **Overlap Calculation**
   - For each event pair:
     - Calculate category match
     - Calculate subcategory match
     - Calculate temporal proximity
     - Calculate geographic proximity
     - Generate AI reasoning

4. **Score Aggregation**
   - Average overlap percentages
   - Identify high-overlap events
   - Generate recommendations

**Key Services:**
- `batchAudienceOverlapService` - Batch processing
- `openaiAudienceOverlapService` - OpenAI integration
- `audienceOverlapService` - Main service

### 5. Web Scraping Logic

**Flow:**
1. **Source Selection**
   - Query database for enabled sources
   - Filter by type (firecrawl, agentql, api)

2. **Content Fetching**
   - For each source:
     - Call Firecrawl API
     - Fetch HTML content
     - Apply rate limiting (10 req/min)

3. **Content Extraction**
   - Send HTML to GPT-4
   - Extract structured event data
   - Validate extracted data

4. **Event Processing**
   - Normalize event data
   - Generate embeddings
   - Deduplicate events
   - Store in database

5. **Logging**
   - Update sync logs
   - Record errors
   - Update last_scraped_at timestamp

**Key Services:**
- `eventScraperService` - Main scraper service
- `crawlConfigurationService` - Source configuration
- `eventStorageService` - Event storage

## Error Handling Flows

### API Error Handling

1. **Validation Errors** (400)
   - Return validation error details
   - Log sanitization warnings
   - Continue processing if warnings only

2. **Rate Limit Errors** (429)
   - Return rate limit headers
   - Include retry-after information
   - Log rate limit violations

3. **Server Errors** (500)
   - Log full error details server-side
   - Return generic error message to client
   - Don't expose internal details

4. **External API Errors**
   - Handle gracefully
   - Continue with available data
   - Log errors for monitoring

### Frontend Error Handling

1. **Form Validation Errors**
   - Display inline error messages
   - Highlight invalid fields
   - Prevent submission

2. **API Request Errors**
   - Display user-friendly error messages
   - Show retry options
   - Log errors for debugging

3. **Network Errors**
   - Show connection error message
   - Provide retry mechanism
   - Cache data when possible

## Performance Optimization Flows

### Request Deduplication

1. **Cache Key Generation**
   - Generate cache key from request parameters
   - Include city, category, date range

2. **Cache Lookup**
   - Check if request is in progress
   - Return existing promise if found
   - Check cache expiry

3. **Cache Invalidation**
   - Invalidate after TTL (5 minutes)
   - Invalidate on data updates

### Batch Processing

1. **Event Grouping**
   - Group events into batches (5 per batch)
   - Prioritize by relevance

2. **Parallel Processing**
   - Process max 2 batches concurrently
   - Queue additional batches

3. **Result Aggregation**
   - Combine batch results
   - Handle partial failures
   - Return complete results

### Database Optimization

1. **Query Optimization**
   - Use indexes on frequently queried fields
   - Limit result sets
   - Use pagination

2. **Connection Pooling**
   - Reuse database connections
   - Monitor connection health
   - Handle connection errors

3. **Caching Strategy**
   - Cache frequently accessed data
   - Invalidate on updates
   - Use appropriate TTLs

## Monitoring Flows

### Observability

1. **Metrics Collection**
   - Source health metrics
   - Normalization quality metrics
   - Performance metrics
   - Error rates

2. **Alerting**
   - Low event counts
   - Poor normalization quality
   - Stale data
   - Performance issues

3. **Dashboard**
   - Real-time metrics display
   - Historical trends
   - Source status

**Key Services:**
- `observabilityService` - Metrics collection
- `/api/observability` - Metrics API

