# Conflict Analysis Feature

## Overview

The conflict analysis feature is the core functionality of Oslavu, providing AI-powered event conflict detection and risk assessment for event planners.

## Key Capabilities

### 1. Multi-Source Event Detection
- **External APIs**: Ticketmaster, PredictHQ integration
- **Web Scraping**: 400+ Czech event sources
- **Local Data**: Brno city events and regional calendars
- **Real-time Data**: Live event information

### 2. AI-Powered Analysis
- **Semantic Deduplication**: OpenAI embeddings for duplicate detection
- **Audience Overlap**: AI prediction of competing audiences
- **Category Normalization**: Intelligent event categorization
- **Confidence Scoring**: Quality metrics for analysis accuracy

### 3. Advanced Scoring System
- **Conflict Score**: 0-20 scale with detailed breakdown
- **Risk Levels**: Low/Medium/High risk assessment
- **Geographic Analysis**: Location-based conflict detection
- **Temporal Analysis**: Time-based conflict assessment

## API Endpoints

### POST /api/analyze

Performs comprehensive conflict analysis for event dates.

**Request Body:**
```json
{
  "city": "Prague",
  "category": "Technology",
  "subcategory": "AI/ML",
  "expectedAttendees": 500,
  "preferredDates": ["2024-03-15", "2024-03-16"],
  "dateRange": {
    "start": "2024-03-01",
    "end": "2024-03-31"
  },
  "enableAdvancedAnalysis": true
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "city": "Prague",
    "category": "Technology",
    "results": [
      {
        "date": "2024-03-15",
        "score": 15,
        "risk": "low",
        "conflictingEvents": [
          {
            "title": "Tech Conference 2024",
            "date": "2024-03-15",
            "attendees": 200,
            "overlapScore": 0.3,
            "reasoning": "Similar audience but different subcategory"
          }
        ],
        "recommendation": "Good choice! Minor conflicts detected."
      }
    ],
    "analysisDate": "2024-01-01T00:00:00Z"
  }
}
```

## Scoring Algorithm

### Conflict Score Calculation

The conflict score (0-20) is calculated based on multiple factors:

1. **Audience Overlap** (0-8 points)
   - High overlap: 6-8 points
   - Medium overlap: 3-5 points
   - Low overlap: 1-2 points
   - No overlap: 0 points

2. **Geographic Proximity** (0-4 points)
   - Same venue: 4 points
   - Same area: 3 points
   - Same city: 2 points
   - Different city: 0 points

3. **Temporal Proximity** (0-4 points)
   - Same day: 4 points
   - ±1 day: 3 points
   - ±3 days: 2 points
   - ±7 days: 1 point
   - >7 days: 0 points

4. **Category Similarity** (0-4 points)
   - Same category/subcategory: 4 points
   - Same category: 3 points
   - Related category: 2 points
   - Different category: 0 points

### Risk Level Assessment

- **Low Risk (0-5)**: Minimal conflicts, good choice
- **Medium Risk (6-12)**: Some conflicts, consider alternatives
- **High Risk (13-20)**: Significant conflicts, avoid this date

## AI Integration

### 1. Audience Overlap Analysis

**Service**: `ai-audience-overlap.ts`

**Process**:
1. Extract event details (title, description, category)
2. Generate embeddings for semantic analysis
3. Use GPT-4 to predict audience overlap
4. Return confidence scores and reasoning

**Example**:
```typescript
const overlapResult = await aiAudienceOverlapService.predictAudienceOverlap(
  plannedEvent,
  competingEvent
);
// Returns: { overlapScore: 0.7, confidence: 0.9, reasoning: "..." }
```

### 2. Event Normalization

**Service**: `ai-normalization.ts`

**Process**:
1. Multi-strategy city normalization
2. Content-based category classification
3. Confidence scoring for quality control
4. Venue-city dictionary learning

**Strategies**:
- Dictionary lookup (fastest)
- Geocoding API (medium)
- LLM analysis (most accurate)

### 3. Semantic Deduplication

**Service**: Vector similarity search

**Process**:
1. Generate embeddings for event titles/descriptions
2. Store in PostgreSQL with pgvector
3. Query for similar events using cosine similarity
4. Remove duplicates based on similarity threshold

## Performance Optimizations

### 1. Batch Processing

**Service**: `batch-audience-overlap.ts`

**Benefits**:
- Process 5 events simultaneously
- 5x faster than sequential processing
- Controlled concurrency (max 2 batches)
- Graceful fallback to individual analysis

### 2. Optimized OpenAI Integration

**Service**: `optimized-openai-audience-overlap.ts`

**Benefits**:
- Single API call for multiple events
- 10x cheaper than individual calls
- Smart caching for repeated queries
- Batch prompting for efficiency

### 3. Caching Strategy

**Request Deduplication**:
- Cache identical requests
- Return cached results for repeated queries
- 90% reduction in repeated processing

**Embedding Caching**:
- Cache embeddings for similar events
- Reuse embeddings for duplicate detection
- Significant cost savings

## Data Sources

### 1. External APIs

**Ticketmaster Discovery API**:
- Global event data
- High-quality event information
- Real-time availability

**PredictHQ API**:
- Event intelligence and forecasting
- Geographic radius search
- Category-based filtering

### 2. Web Scraping

**Czech Event Sources** (400+):
- Kudyznudy.cz (official tourism board)
- Prague.eu (city events)
- GoOut.net (culture/venues)
- TicketPortal.cz (ticketing)
- Regional tourism websites

**Scraping Process**:
1. Firecrawl extracts HTML content
2. GPT-4 extracts structured data
3. AI normalization processes data
4. Vector embeddings for deduplication
5. Store in database with metadata

### 3. Local Data

**Brno City Events**:
- Official city calendar
- Cultural events
- University events (MUNI)

**Regional Calendars**:
- Hradec Králové events
- Other Czech regions
- Cultural and business events

## Monitoring & Quality Control

### 1. Source Health Metrics

**Real-time Monitoring**:
- Event counts per source
- Success/failure rates
- Response times
- Error tracking

**Alerts**:
- Low event counts (< 10 per source)
- High error rates (> 10%)
- Stale data (> 7 days)

### 2. Normalization Quality

**Confidence Tracking**:
- Average confidence scores
- Method breakdown (dictionary/geocoding/LLM)
- Quality trends over time

**Quality Control**:
- Manual review of low-confidence events
- Continuous improvement of normalization rules
- A/B testing of different strategies

### 3. Performance Metrics

**Response Times**:
- Target: < 10 seconds
- Current: 3-10 seconds typical
- Monitoring: Real-time tracking

**Throughput**:
- Events processed per minute
- Batch processing efficiency
- Cache hit rates

## Usage Examples

### 1. Basic Conflict Analysis

```typescript
const analysisResult = await conflictAnalysisService.analyzeConflicts({
  city: "Prague",
  category: "Technology",
  expectedAttendees: 500,
  preferredDates: ["2024-03-15"],
  dateRange: {
    start: "2024-03-01",
    end: "2024-03-31"
  }
});
```

### 2. Advanced Analysis with Subcategories

```typescript
const advancedResult = await conflictAnalysisService.analyzeConflicts({
  city: "Prague",
  category: "Technology",
  subcategory: "AI/ML",
  expectedAttendees: 500,
  preferredDates: ["2024-03-15", "2024-03-16"],
  dateRange: {
    start: "2024-03-01",
    end: "2024-03-31"
  },
  enableAdvancedAnalysis: true
});
```

### 3. Batch Processing

```typescript
const batchResult = await batchAudienceOverlapService.processBatchOverlap({
  plannedEvent: myPlannedEvent,
  competingEvents: competingEvents
});
```

## Future Enhancements

### 1. Advanced AI Features
- LLM-based city extraction for ambiguous cases
- Embedding-based category classification
- Venue size prediction for attendance estimation

### 2. Real-time Learning
- Venue-city dictionary auto-updates
- Category synonym learning from user feedback
- Confidence score calibration

### 3. Performance Improvements
- Predictive caching for common queries
- Smart batching based on event similarity
- Cost optimization routing

### 4. Data Quality
- Duplicate detection improvements
- Multi-day event expansion
- Geographic boundary validation

## Troubleshooting

### Common Issues

1. **No Events Found**
   - Check if sources are enabled
   - Verify API keys are valid
   - Check normalization quality

2. **Slow Response Times**
   - Check batch processing status
   - Verify cache hit rates
   - Monitor API response times

3. **Low Quality Results**
   - Review confidence scores
   - Check normalization method breakdown
   - Verify data source health

### Debug Commands

```bash
# Check source metrics
curl "http://localhost:3000/api/observability?type=sources"

# Check normalization quality
curl "http://localhost:3000/api/observability?type=quality"

# Check health status
curl "http://localhost:3000/api/observability?type=health"
```
