# Data Structures Documentation

Complete documentation of all data types, models, and schemas used in the Oslavu application.

## Core Types

### Event Types

#### Event (`types/index.ts`, `lib/types/events.ts`)

Main event interface representing an event in the system.

```typescript
interface Event {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO 8601 timestamp
  endDate?: string; // ISO 8601 timestamp
  city: string;
  venue?: string;
  category: string;
  subcategory?: string;
  expectedAttendees?: number;
  source: 'ticketmaster' | 'meetup' | 'predicthq' | 'manual' | 'brno' | 'online_research' | 'scraper';
  sourceId?: string;
  url?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  // Audience overlap properties
  audienceOverlapPercentage?: number;
  overlapReasoning?: string[];
}
```

#### DatabaseEvent (`lib/types/events.ts`)

Database representation of an event matching Supabase schema.

```typescript
interface DatabaseEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  end_date?: string;
  city: string;
  venue?: string;
  category: string;
  subcategory?: string;
  expected_attendees?: number;
  attendee_source?: 'explicit' | 'phq_api' | 'venue_capacity' | 'ai_extraction' | 'category_default' | 'user_verified';
  attendee_confidence?: number;
  attendee_reasoning?: string[];
  attendee_verified?: boolean;
  source: 'ticketmaster' | 'predicthq' | 'meetup' | 'manual' | 'brno' | 'scraper';
  source_id?: string;
  url?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}
```

#### CreateEventData (`lib/types/events.ts`)

Data structure for creating new events.

```typescript
interface CreateEventData {
  title: string;
  description?: string;
  date: string;
  end_date?: string;
  city: string;
  venue?: string;
  category: string;
  subcategory?: string;
  expected_attendees?: number;
  attendee_source?: 'explicit' | 'phq_api' | 'venue_capacity' | 'ai_extraction' | 'category_default' | 'user_verified';
  attendee_confidence?: number;
  attendee_reasoning?: string[];
  attendee_verified?: boolean;
  source: 'ticketmaster' | 'predicthq' | 'meetup' | 'manual' | 'brno' | 'scraper';
  source_id?: string;
  url?: string;
  image_url?: string;
}
```

### Conflict Analysis Types

#### AnalysisRequest (`types/index.ts`)

Request structure for conflict analysis.

```typescript
interface AnalysisRequest {
  city: string;
  category: string;
  subcategory: string;
  preferredDates: string[];
  expectedAttendees: number;
  dateRange: {
    start: string; // YYYY-MM-DD
    end: string; // YYYY-MM-DD
  };
  enableAdvancedAnalysis?: boolean;
  enablePerplexityResearch?: boolean;
  enableLLMRelevanceFilter?: boolean;
}
```

#### ConflictAnalysisResult (`lib/services/conflict-analysis.ts`)

Result structure from conflict analysis.

```typescript
interface ConflictAnalysisResult {
  recommendedDates: DateRecommendation[];
  highRiskDates: DateRecommendation[];
  allEvents: Event[];
  analysisDate: string;
  userPreferredStartDate?: string;
  userPreferredEndDate?: string;
  deduplicationMetrics?: DeduplicationMetrics;
  seasonalIntelligence?: {
    hasSeasonalRisk: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    seasonalFactors: string[];
    recommendations: string[];
    confidence: number;
    dataCoverageWarning?: string;
  };
}
```

#### DateRecommendation (`lib/services/conflict-analysis.ts`)

Recommendation for a specific date range.

```typescript
interface DateRecommendation {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  conflictScore: number; // 0-20 scale
  riskLevel: 'Low' | 'Medium' | 'High';
  competingEvents: Event[];
  reasons: string[];
  audienceOverlap?: {
    averageOverlap: number; // 0-100
    highOverlapEvents: Event[];
    overlapReasoning: string[];
  };
  holidayRestrictions?: {
    holidays: any[];
    cultural_events: any[];
    business_impact: 'none' | 'partial' | 'full';
    venue_closure_expected: boolean;
    reasons: string[];
  };
  seasonalFactors?: {
    demandLevel: string;
    seasonalMultiplier: number;
    holidayMultiplier: number;
    seasonalReasoning: string[];
    holidayReasoning: string[];
    optimalityScore: number; // 0-1
    venueAvailability: number; // 0-1
  };
  perplexityResearch?: PerplexityConflictResearch;
  consolidatedRanges?: {
    count: number;
    originalRanges: Array<{ startDate: string; endDate: string; conflictScore: number }>;
  };
  aggregatedStats?: {
    maxConflictScore: number;
    avgConflictScore: number;
    minConflictScore: number;
  };
}
```

#### ConflictAnalysis (`types/index.ts`, `lib/types/events.ts`)

Saved conflict analysis record.

```typescript
interface ConflictAnalysis {
  id: string;
  userId: string | null;
  city: string;
  category: string;
  subcategory?: string | null;
  preferredDates: string[];
  expectedAttendees: number;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  results: ConflictScore[] | Record<string, any>;
  createdAt: string;
}
```

#### ConflictScore (`types/index.ts`)

Conflict score for a specific date.

```typescript
interface ConflictScore {
  date: string;
  score: number; // 0-20
  risk: 'low' | 'medium' | 'high';
  conflictingEvents: ConflictingEvent[];
  recommendation: string;
}
```

#### ConflictingEvent (`types/index.ts`)

Event that conflicts with the user's event.

```typescript
interface ConflictingEvent {
  id: string;
  title: string;
  date: string;
  category: string;
  subcategory?: string;
  expectedAttendees?: number;
  impact: number; // 0-100
  audienceOverlapPercentage: number; // 0-100
  overlapReasoning?: string[];
  reason: string;
}
```

### Holiday Types

#### HolidayServiceConfig (`types/holidays.ts`)

Configuration for holiday service.

```typescript
interface HolidayServiceConfig {
  country_code: string; // ISO country code (e.g., "CZ")
  region_code?: string; // Region code (e.g., "CZ-10")
  include_cultural_events?: boolean;
  business_impact_threshold?: 'none' | 'partial' | 'full';
}
```

### Seasonality Types

#### SeasonalRule (`types/seasonality.ts`)

Seasonal rule definition.

```typescript
interface SeasonalRule {
  id: string;
  category: string;
  subcategory?: string;
  city?: string;
  month: number; // 1-12
  demand_level: 'low' | 'normal' | 'high' | 'peak';
  multiplier: number; // 0.5 - 2.0
  reasoning: string;
  confidence: number; // 0-1
}
```

### Venue Types

#### Venue (`types/venue.ts`)

Venue information.

```typescript
interface Venue {
  id: string;
  name: string;
  city: string;
  address?: string;
  capacity?: number;
  category?: string;
  url?: string;
  created_at: string;
  updated_at: string;
}
```

#### VenueValidationResult (`lib/services/venue-validation.ts`)

Result of venue validation.

```typescript
interface VenueValidationResult {
  isValid: boolean;
  normalizedName?: string;
  normalizedCity?: string;
  confidence: number;
  suggestions?: string[];
  warnings?: string[];
}
```

### Audience Types

#### AudienceOverlapResult (`types/audience.ts`)

Result of audience overlap analysis.

```typescript
interface AudienceOverlapResult {
  overlapPercentage: number; // 0-100
  reasoning: string[];
  confidence: number; // 0-1
  factors: {
    categoryMatch: boolean;
    subcategoryMatch: boolean;
    temporalProximity: number; // days
    geographicProximity: number; // km
  };
}
```

### Perplexity Types

#### PerplexityResearchParams (`types/perplexity.ts`)

Parameters for Perplexity research.

```typescript
interface PerplexityResearchParams {
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

#### PerplexityConflictResearch (`types/perplexity.ts`)

Result from Perplexity research.

```typescript
interface PerplexityConflictResearch {
  conflicts: Array<{
    title: string;
    date: string;
    description: string;
    source: string;
    relevance: number; // 0-1
  }>;
  recommendations: string[];
  sources: string[];
  confidence: number; // 0-1
}
```

## Database Schema Types

### Events Table

```typescript
interface EventsTable {
  id: string; // UUID
  title: string; // VARCHAR(500)
  description?: string; // TEXT
  date: string; // TIMESTAMP WITH TIME ZONE
  end_date?: string; // TIMESTAMP WITH TIME ZONE
  city: string; // VARCHAR(100)
  venue?: string; // VARCHAR(200)
  category: string; // VARCHAR(100)
  subcategory?: string; // VARCHAR(100)
  expected_attendees?: number; // INTEGER
  attendee_source?: string;
  attendee_confidence?: number;
  attendee_reasoning?: string[];
  attendee_verified?: boolean;
  source: string; // VARCHAR(50)
  source_id?: string; // VARCHAR(200)
  url?: string; // TEXT
  image_url?: string; // TEXT
  embedding?: number[]; // VECTOR(1536) for semantic search
  normalized_city?: string; // TEXT
  normalized_category?: string; // TEXT
  confidence_score?: number; // DECIMAL(3,2)
  normalization_method?: string; // TEXT
  created_at: string; // TIMESTAMP WITH TIME ZONE
  updated_at: string; // TIMESTAMP WITH TIME ZONE
}
```

### Conflict Analyses Table

```typescript
interface ConflictAnalysesTable {
  id: string; // UUID
  user_id: string | null; // UUID (references users table)
  city: string; // VARCHAR(100)
  category: string; // VARCHAR(100)
  subcategory: string | null; // VARCHAR(100)
  preferred_dates: string[]; // JSONB array
  expected_attendees: number; // INTEGER
  date_range_start: string; // DATE
  date_range_end: string; // DATE
  results: Record<string, any>; // JSONB
  created_at: string; // TIMESTAMP WITH TIME ZONE
}
```

### Scraper Sources Table

```typescript
interface ScraperSourcesTable {
  id: string; // UUID
  name: string; // VARCHAR(100)
  url: string; // TEXT
  type: string; // VARCHAR(20) - 'firecrawl', 'agentql', 'api'
  enabled: boolean; // BOOLEAN
  config: Record<string, any>; // JSONB
  last_scraped_at?: string; // TIMESTAMP WITH TIME ZONE
  created_at: string; // TIMESTAMP WITH TIME ZONE
}
```

### Sync Logs Table

```typescript
interface SyncLogsTable {
  id: string; // UUID
  source: string; // VARCHAR(100)
  status: 'success' | 'error' | 'in_progress'; // VARCHAR(20)
  events_processed: number; // INTEGER
  events_created: number; // INTEGER
  events_updated: number; // INTEGER
  events_skipped: number; // INTEGER
  errors: string[]; // TEXT[]
  started_at: string; // TIMESTAMP WITH TIME ZONE
  completed_at?: string; // TIMESTAMP WITH TIME ZONE
  duration_ms?: number; // INTEGER
}
```

## API Response Types

### ApiResponse

Generic API response wrapper.

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}
```

### PaginatedResponse

Paginated API response.

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}
```

## Validation Schemas

### Zod Schemas

All data validation uses Zod schemas:

#### CreateEventSchema

```typescript
const CreateEventSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  date: z.string().transform(normalizeDate),
  end_date: z.string().transform(normalizeDate).optional(),
  city: z.string().min(1).max(100),
  venue: z.string().max(200).optional(),
  category: z.string().min(1).max(50),
  subcategory: z.string().max(50).optional(),
  expected_attendees: z.number().int().min(0).max(1000000).optional(),
  source: z.enum(['ticketmaster', 'predicthq', 'meetup', 'manual', 'brno', 'scraper']),
  source_id: z.string().max(100).optional(),
  url: z.string().url().max(500).optional(),
  image_url: z.string().url().max(500).optional(),
});
```

#### EventQuerySchema

```typescript
const EventQuerySchema = z.object({
  city: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  source: z.enum(['ticketmaster', 'predicthq', 'meetup', 'manual', 'brno', 'scraper']).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().min(0).default(0),
  order_by: z.enum(['date', 'created_at', 'updated_at']).default('date'),
  order_direction: z.enum(['asc', 'desc']).default('asc'),
});
```

## Constants

### Event Categories

```typescript
const EVENT_CATEGORIES = [
  'Technology',
  'Business',
  'Marketing',
  'Healthcare',
  'Education',
  'Finance',
  'Entertainment',
  'Sports',
  'Arts & Culture',
  'Other'
] as const;

type EventCategory = typeof EVENT_CATEGORIES[number];
```

### Subcategory Taxonomy

Subcategories are organized by category in `lib/constants/subcategory-taxonomy.ts`:

```typescript
const SUBCATEGORY_TAXONOMY: Record<string, Record<string, SubcategoryDefinition>> = {
  Technology: {
    'AI & Machine Learning': { ... },
    'Web Development': { ... },
    // ...
  },
  // ...
};
```

## Type Guards

### isDatabaseEvent

```typescript
function isDatabaseEvent(obj: any): obj is DatabaseEvent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.date === 'string' &&
    typeof obj.city === 'string' &&
    typeof obj.category === 'string' &&
    typeof obj.source === 'string' &&
    typeof obj.created_at === 'string' &&
    typeof obj.updated_at === 'string'
  );
}
```

### isCreateEventData

```typescript
function isCreateEventData(obj: any): obj is CreateEventData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.title === 'string' &&
    typeof obj.date === 'string' &&
    typeof obj.city === 'string' &&
    typeof obj.category === 'string' &&
    typeof obj.source === 'string'
  );
}
```

## Data Transformation

### Event Transformer

```typescript
interface EventTransformer {
  source: string;
  transform: (rawEvent: any) => CreateEventData;
  validate: (event: CreateEventData) => boolean;
}
```

### Data Validation Result

```typescript
interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData: CreateEventData;
}
```

## Utility Types

```typescript
type EventSource = DatabaseEvent['source'];
type EventCategory = string;
type EventSortField = 'date' | 'created_at' | 'updated_at';
type EventSortDirection = 'asc' | 'desc';
```

