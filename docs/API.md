# API Reference

Complete API documentation for all backend endpoints in the Oslavu application.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`

## Authentication

Most endpoints are publicly accessible. Some endpoints may require authentication via:
- **API Key**: `X-API-Key` header (if `API_KEY` environment variable is set)
- **Cron Secret**: For cron job endpoints (`CRON_SECRET` header)

## Rate Limiting

- **Strict endpoints** (AI operations): 10 requests per minute
- **Standard endpoints**: 100 requests per minute
- Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Response Format

All API responses follow this structure:

```typescript
{
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  timestamp: string;
}
```

## Endpoints

### Conflict Analysis

#### POST /api/analyze

Performs comprehensive conflict analysis for event dates.

**Request Body:**
```json
{
  "city": "Prague",
  "category": "Technology",
  "subcategory": "AI & Machine Learning",
  "expectedAttendees": 500,
  "dateRange": {
    "start": "2024-03-01",
    "end": "2024-03-31"
  },
  "preferredDates": ["2024-03-15", "2024-03-16"],
  "enableAdvancedAnalysis": true,
  "enablePerplexityResearch": false,
  "enableLLMRelevanceFilter": true
}
```

**Response:**
```json
{
  "data": {
    "recommendedDates": [
      {
        "startDate": "2024-03-15",
        "endDate": "2024-03-16",
        "conflictScore": 2.5,
        "riskLevel": "Low",
        "competingEvents": [],
        "reasons": ["No major conflicts detected"],
        "audienceOverlap": {
          "averageOverlap": 5.2,
          "highOverlapEvents": [],
          "overlapReasoning": []
        },
        "holidayRestrictions": {
          "holidays": [],
          "cultural_events": [],
          "business_impact": "none",
          "venue_closure_expected": false,
          "reasons": []
        },
        "seasonalFactors": {
          "demandLevel": "normal",
          "seasonalMultiplier": 1.0,
          "holidayMultiplier": 1.0,
          "seasonalReasoning": [],
          "holidayReasoning": [],
          "optimalityScore": 0.85,
          "venueAvailability": 0.9
        }
      }
    ],
    "highRiskDates": [],
    "allEvents": [],
    "analysisDate": "2024-01-01T00:00:00Z"
  },
  "message": "Analysis completed successfully"
}
```

**Rate Limit**: Strict (10 req/min)

**Validation:**
- Event duration cannot exceed 31 days
- Preferred dates must be within analysis date range
- All required fields must be present

#### GET /api/analyze

Health check endpoint.

**Response:**
```json
{
  "message": "Conflict Analysis API is running",
  "timestamp": "2024-01-01T00:00:00Z",
  "services": {
    "ticketmaster": true
  }
}
```

### Event Management

#### GET /api/events

Search and retrieve events with advanced filtering.

**Query Parameters:**
- `query` (string, optional): Search query
- `city` (string, optional): Filter by city
- `category` (string, optional): Filter by category
- `source` (string, optional): Filter by source (`ticketmaster`, `predicthq`, `meetup`, `manual`, `brno`, `scraper`)
- `start_date` (string, optional): Filter by start date (YYYY-MM-DD)
- `end_date` (string, optional): Filter by end date (YYYY-MM-DD)
- `min_attendees` (number, optional): Minimum expected attendees
- `max_attendees` (number, optional): Maximum expected attendees
- `limit` (number, optional, default: 50): Number of results
- `offset` (number, optional, default: 0): Pagination offset

**Example:**
```
GET /api/events?city=Prague&category=Technology&limit=20&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Event Title",
      "description": "Event description",
      "date": "2024-03-15T10:00:00Z",
      "end_date": "2024-03-15T18:00:00Z",
      "city": "Prague",
      "venue": "Venue Name",
      "category": "Technology",
      "subcategory": "AI & Machine Learning",
      "expected_attendees": 500,
      "source": "ticketmaster",
      "url": "https://example.com/event",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 1,
    "has_more": false
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### POST /api/events

Create a new event.

**Request Body:**
```json
{
  "title": "Event Title",
  "description": "Event description",
  "date": "2024-03-15",
  "end_date": "2024-03-15",
  "city": "Prague",
  "venue": "Venue Name",
  "category": "Technology",
  "subcategory": "AI & Machine Learning",
  "expected_attendees": 500,
  "source": "manual",
  "url": "https://example.com/event"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "created": 1,
    "updated": 0,
    "skipped": 0
  },
  "message": "Event created successfully",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### GET /api/events/city/[city]

Get events for a specific city.

**Path Parameters:**
- `city` (string): City name

**Query Parameters:**
- `start_date` (string, optional): Filter by start date
- `end_date` (string, optional): Filter by end date
- `category` (string, optional): Filter by category
- `limit` (number, optional): Number of results

**Response:**
```json
{
  "success": true,
  "data": [],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### GET /api/events/stats

Get event statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_events": 1000,
    "events_by_source": {
      "ticketmaster": 300,
      "predicthq": 200,
      "scraper": 500
    },
    "events_by_category": {
      "Technology": 400,
      "Business": 300,
      "Entertainment": 300
    },
    "events_by_city": {
      "Prague": 500,
      "Brno": 300,
      "Ostrava": 200
    },
    "last_updated": "2024-01-01T00:00:00Z"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### POST /api/events/sync

Sync events from external sources.

**Request Body:**
```json
{
  "sources": ["ticketmaster", "predicthq"],
  "city": "Prague",
  "startDate": "2024-03-01",
  "endDate": "2024-03-31"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ticketmaster": {
      "events_processed": 100,
      "events_created": 50,
      "events_updated": 30,
      "events_skipped": 20
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### GET /api/events/scraped

Get scraped events with filtering.

**Query Parameters:**
- `city` (string, optional): Filter by city
- `category` (string, optional): Filter by category
- `start_date` (string, optional): Filter by start date
- `end_date` (string, optional): Filter by end date
- `limit` (number, optional): Number of results

**Response:**
```json
{
  "success": true,
  "data": [],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### POST /api/events/backfill-attendees

Backfill attendee data for events (cron job).

**Headers:**
- `CRON_SECRET`: Required for authentication

**Response:**
```json
{
  "success": true,
  "data": {
    "events_processed": 100,
    "events_updated": 50
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Web Scraping

#### GET /api/scraper

Test scraper or trigger scraping.

**Query Parameters:**
- `action` (string, optional, default: "test"): Action to perform (`test`, `scrape`)

**Example:**
```
GET /api/scraper?action=test
GET /api/scraper?action=scrape
```

**Response (test):**
```json
{
  "success": true,
  "message": "Connection test successful"
}
```

**Response (scrape):**
```json
{
  "success": true,
  "result": {
    "sources_scraped": 10,
    "events_found": 50,
    "events_created": 30
  }
}
```

#### POST /api/scraper

Scrape a specific source.

**Request Body:**
```json
{
  "action": "scrape-source",
  "sourceId": "source-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "events_found": 10,
    "events_created": 5
  }
}
```

#### GET /api/scraper/status

Get scraper status and statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_sources": 10,
    "enabled_sources": 8,
    "last_scraped": "2024-01-01T00:00:00Z",
    "events_scraped": 1000
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### POST /api/scraper/sync

Trigger scraper sync (cron job).

**Headers:**
- `CRON_SECRET`: Required for authentication

**Response:**
```json
{
  "success": true,
  "data": {
    "sources_synced": 10,
    "events_created": 50
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Holiday Management

#### GET /api/holidays/check-date

Check date availability for holidays.

**Query Parameters:**
- `date` (string, required): Date to check (YYYY-MM-DD)
- `country_code` (string, required): ISO country code (e.g., "CZ")
- `region_code` (string, optional): Region code
- `include_cultural_events` (boolean, optional, default: true)
- `business_impact_threshold` (string, optional, default: "partial"): `none`, `partial`, `full`

**Example:**
```
GET /api/holidays/check-date?date=2024-03-15&country_code=CZ
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2024-03-15",
    "is_available": true,
    "holidays": [],
    "cultural_events": [],
    "business_impact": "none",
    "venue_closure_expected": false
  }
}
```

#### POST /api/holidays/check-date

Check date availability (POST version).

**Request Body:**
```json
{
  "date": "2024-03-15",
  "country_code": "CZ",
  "region_code": "CZ-10",
  "include_cultural_events": true,
  "business_impact_threshold": "partial"
}
```

**Response:** Same as GET version

#### POST /api/holidays/check-range

Check date range availability.

**Request Body:**
```json
{
  "start_date": "2024-03-01",
  "end_date": "2024-03-31",
  "country_code": "CZ",
  "region_code": "CZ-10"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "start_date": "2024-03-01",
    "end_date": "2024-03-31",
    "available_dates": ["2024-03-01", "2024-03-02", ...],
    "unavailable_dates": ["2024-03-15"],
    "holidays": [],
    "cultural_events": []
  }
}
```

#### GET /api/holidays/countries

Get list of supported countries.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "code": "CZ",
      "name": "Czech Republic"
    }
  ],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### GET /api/holidays/regions

Get list of regions for a country.

**Query Parameters:**
- `country_code` (string, required): ISO country code

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "code": "CZ-10",
      "name": "Prague"
    }
  ],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### POST /api/holidays/validate-event-date

Validate event date against holidays.

**Request Body:**
```json
{
  "date": "2024-03-15",
  "country_code": "CZ",
  "event_type": "conference"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "is_valid": true,
    "warnings": [],
    "recommendations": []
  }
}
```

### Analysis History

#### GET /api/analyses

Get saved conflict analyses.

**Query Parameters:**
- `city` (string, optional): Filter by city
- `category` (string, optional): Filter by category
- `limit` (number, optional): Number of results
- `offset` (number, optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "city": "Prague",
      "category": "Technology",
      "subcategory": "AI & Machine Learning",
      "preferred_dates": ["2024-03-15", "2024-03-16"],
      "expected_attendees": 500,
      "date_range_start": "2024-03-01",
      "date_range_end": "2024-03-31",
      "results": {},
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### POST /api/analyses

Save a conflict analysis.

**Request Body:**
```json
{
  "city": "Prague",
  "category": "Technology",
  "subcategory": "AI & Machine Learning",
  "preferred_dates": ["2024-03-15", "2024-03-16"],
  "expected_attendees": 500,
  "date_range_start": "2024-03-01",
  "date_range_end": "2024-03-31",
  "results": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Perplexity Research

#### POST /api/perplexity-research

Perform Perplexity-powered event conflict research.

**Request Body:**
```json
{
  "city": "Prague",
  "category": "Technology",
  "subcategory": "AI & Machine Learning",
  "date": "2024-03-15",
  "expectedAttendees": 500,
  "dateRange": {
    "start": "2024-03-01",
    "end": "2024-03-31"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conflicts": [],
    "recommendations": [],
    "sources": []
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**Rate Limit**: Strict (10 req/min)

### Observability

#### GET /api/observability

Get observability metrics.

**Query Parameters:**
- `type` (string, optional, default: "all"): Type of metrics (`sources`, `quality`, `health`, `baselines`, `all`)
- `city` (string, optional): Filter by city (for baselines)
- `month` (number, optional): Month number (1-12, for baselines)

**Example:**
```
GET /api/observability?type=sources
GET /api/observability?type=baselines&city=Prague&month=3
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sources": {
      "ticketmaster": {
        "event_count": 300,
        "last_sync": "2024-01-01T00:00:00Z",
        "status": "healthy"
      }
    },
    "quality": {
      "average_confidence": 0.85,
      "normalization_methods": {
        "dictionary": 0.6,
        "geocoding": 0.3,
        "llm": 0.1
      }
    },
    "health": {
      "status": "healthy",
      "issues": []
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### GET /api/observability/crawl-metrics

Get crawl metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_crawls": 100,
    "successful_crawls": 95,
    "failed_crawls": 5,
    "events_scraped": 1000
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Data Sources

#### GET /api/analyze/events/ticketmaster

Get events from Ticketmaster.

**Query Parameters:**
- `city` (string, required): City name
- `startDate` (string, optional): Start date (YYYY-MM-DD)
- `endDate` (string, optional): End date (YYYY-MM-DD)
- `category` (string, optional): Event category

**Response:**
```json
{
  "success": true,
  "data": [],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### GET /api/analyze/events/predicthq

Get events from PredictHQ.

**Query Parameters:**
- `city` (string, required): City name
- `startDate` (string, optional): Start date
- `endDate` (string, optional): End date
- `category` (string, optional): Event category

**Response:**
```json
{
  "success": true,
  "data": [],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### GET /api/analyze/events/brno

Get events from Brno sources.

**Query Parameters:**
- `startDate` (string, optional): Start date
- `endDate` (string, optional): End date

**Response:**
```json
{
  "success": true,
  "data": [],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Audience Overlap

#### GET /api/analyze/audience-overlap

Check OpenAI availability for audience overlap analysis.

**Response:**
```json
{
  "openaiAvailable": true,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### USP Data

#### GET /api/usp-data

Get USP (Unique Selling Proposition) data.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalEvents": 1000,
    "dataSources": 5,
    "lastUpdated": "2024-01-01T00:00:00Z"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### POST /api/usp-data

Update USP data.

**Request Body:**
```json
{
  "totalEvents": 1000,
  "dataSources": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### PUT /api/usp-data

Update existing USP data.

**Request Body:**
```json
{
  "totalEvents": 1100,
  "dataSources": 6
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": {},
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Common Error Codes

- `400` - Bad Request: Invalid parameters or missing required fields
- `401` - Unauthorized: Missing or invalid authentication
- `403` - Forbidden: Insufficient permissions
- `404` - Not Found: Resource not found
- `429` - Too Many Requests: Rate limit exceeded
- `500` - Internal Server Error: Server-side error
- `503` - Service Unavailable: External service unavailable

## Rate Limiting Headers

When rate limited, responses include:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200
Retry-After: 60
```

## Caching

Some endpoints support caching with the following headers:

```
Cache-Control: public, s-maxage=300, stale-while-revalidate=600
```

Cached endpoints:
- `/api/perplexity-research` - 5 minutes cache
- `/api/observability` - Varies by endpoint

