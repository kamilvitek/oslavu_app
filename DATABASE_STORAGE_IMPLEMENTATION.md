# Database Storage Layer Implementation

This document outlines the comprehensive database storage layer implementation for the Oslavu app, which provides centralized event storage, data synchronization, and advanced querying capabilities.

## Overview

The database storage layer provides:
- **Centralized Event Storage**: All API data is stored in Supabase with proper deduplication
- **Data Transformation**: Standardized event format across all sources
- **Background Synchronization**: Automated data sync from external APIs
- **Advanced Querying**: Optimized queries for conflict analysis and analytics
- **Error Handling**: Comprehensive error handling and validation
- **Type Safety**: Full TypeScript support with runtime validation

## Architecture

### Core Components

1. **Database Service** (`src/lib/supabase.ts`)
   - Enhanced Supabase client with connection validation
   - Retry logic and health checks
   - Database statistics and monitoring

2. **Event Storage Service** (`src/lib/services/event-storage.ts`)
   - CRUD operations for events
   - Upsert logic with duplicate prevention
   - Batch processing for large datasets
   - Advanced search and filtering

3. **Data Transformation Layer** (`src/lib/services/data-transformer.ts`)
   - Standardized event format conversion
   - Data validation and sanitization
   - Source-specific transformations
   - Business rule validation

4. **Query Utilities** (`src/lib/services/event-queries.ts`)
   - Conflict analysis queries
   - High-impact event detection
   - Venue popularity analysis
   - Advanced analytics

5. **Background Sync Service** (`src/lib/services/data-sync.ts`)
   - Automated data synchronization
   - Multi-source sync coordination
   - Data quality validation
   - Cleanup and maintenance

## Database Schema

### Events Table
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  end_date DATE,
  city VARCHAR(100) NOT NULL,
  venue VARCHAR(200),
  category VARCHAR(50) NOT NULL,
  subcategory VARCHAR(50),
  expected_attendees INTEGER,
  source VARCHAR(20) NOT NULL,
  source_id VARCHAR(100),
  url VARCHAR(500),
  image_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_events_city_date ON events(city, date);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_source ON events(source);
CREATE INDEX idx_events_source_id ON events(source_id);
CREATE INDEX idx_events_attendees ON events(expected_attendees);
```

## API Endpoints

### Event Management
- `GET /api/events` - Search and retrieve events
- `POST /api/events` - Create a new event
- `GET /api/events/city/[city]` - Get events by city
- `GET /api/events/stats` - Get database statistics

### Data Synchronization
- `POST /api/events/sync` - Trigger data synchronization
- `GET /api/events/sync` - Get sync status

### Conflict Analysis
- `POST /api/conflict-analysis` - Enhanced conflict analysis

## Usage Examples

### Basic Event Storage
```typescript
import { eventStorageService } from '@/lib/services/event-storage';

// Save events with automatic deduplication
const events = [
  {
    title: 'Tech Conference 2024',
    date: '2024-06-15',
    city: 'Prague',
    category: 'Technology',
    source: 'ticketmaster',
    source_id: 'tm_12345'
  }
];

const result = await eventStorageService.saveEvents(events);
console.log(`Created: ${result.created}, Updated: ${result.updated}`);
```

### Advanced Querying
```typescript
import { eventQueryService } from '@/lib/services/event-queries';

// Get high-impact events
const highImpactEvents = await eventQueryService.getHighImpactEvents(
  'Prague',
  '2024-06-01',
  '2024-06-30',
  1000 // Minimum attendees
);

// Detect conflicts
const conflictScore = await eventQueryService.detectConflicts(
  'Prague',
  '2024-06-15',
  'Technology',
  500 // Expected attendees
);
```

### Data Synchronization
```typescript
import { dataSyncService } from '@/lib/services/data-sync';

// Start automatic sync (every 60 minutes)
dataSyncService.startAutoSync(60);

// Manual sync for specific cities
const results = await dataSyncService.syncForCity(
  'Prague',
  '2024-06-01',
  '2024-06-30',
  ['ticketmaster', 'predicthq']
);
```

### API Service Integration
```typescript
import { ticketmasterService } from '@/lib/services/ticketmaster';

// Get events with automatic storage
const { events, stored } = await ticketmasterService.getEventsForCityWithStorage(
  'Prague',
  '2024-06-01',
  '2024-06-30',
  'Technology'
);

// Get events from database (cached)
const cachedEvents = await ticketmasterService.getEventsFromDatabase(
  'Prague',
  '2024-06-01',
  '2024-06-30',
  'Technology'
);
```

## Data Transformation

### Supported Sources
- **Ticketmaster**: Music, sports, arts events
- **PredictHQ**: Business events, conferences, festivals
- **Manual**: User-created events
- **Meetup**: Community events (future)
- **Brno**: Local events (future)

### Standardized Event Format
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
  source: 'ticketmaster' | 'predicthq' | 'meetup' | 'manual' | 'brno';
  source_id?: string;
  url?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}
```

## Error Handling

### Comprehensive Error Types
- `DatabaseError`: Database operation failures
- `ValidationError`: Data validation failures
- `ApiError`: API operation failures
- `SyncError`: Synchronization failures
- `RateLimitError`: Rate limiting
- `AuthenticationError`: Authentication failures
- `AuthorizationError`: Permission failures
- `NotFoundError`: Resource not found
- `ConflictError`: Resource conflicts

### Error Response Format
```typescript
{
  success: false,
  error: "Error message",
  code: "ERROR_CODE",
  details: { /* Additional error details */ },
  timestamp: "2024-01-01T00:00:00.000Z"
}
```

## Data Validation

### Input Validation
- **Schema Validation**: Zod schemas for runtime validation
- **Business Rules**: Custom validation logic
- **Data Sanitization**: Input cleaning and normalization
- **Type Safety**: Full TypeScript support

### Validation Examples
```typescript
import { DataValidator } from '@/lib/utils/data-validation';

// Validate event data
const validation = DataValidator.validateEventData(eventData);
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}

// Validate search parameters
const searchValidation = DataValidator.validateSearchParams(searchParams);
```

## Performance Optimizations

### Database Optimizations
- **Indexes**: Optimized indexes for common queries
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Optimized SQL queries
- **Caching**: Intelligent caching strategies

### API Optimizations
- **Batch Processing**: Process multiple events efficiently
- **Pagination**: Efficient pagination for large datasets
- **Rate Limiting**: Respect API rate limits
- **Retry Logic**: Automatic retry for failed operations

## Monitoring and Analytics

### Database Statistics
```typescript
const stats = await eventStorageService.getEventStats();
console.log(`Total events: ${stats.total_events}`);
console.log(`Events by source: ${stats.events_by_source}`);
console.log(`Events by category: ${stats.events_by_category}`);
```

### Sync Monitoring
```typescript
const syncStatus = dataSyncService.getSyncStatus();
const statistics = await dataSyncService.getSyncStatistics();
```

### Data Quality Validation
```typescript
const quality = await dataSyncService.validateDataQuality();
console.log(`Quality score: ${quality.quality_score}%`);
```

## Configuration

### Environment Variables
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# API Keys
TICKETMASTER_API_KEY=your_ticketmaster_key
PREDICTHQ_API_KEY=your_predicthq_key
```

### Database Configuration
- **Connection Pooling**: Configured for optimal performance
- **Retry Logic**: 3 attempts with exponential backoff
- **Health Checks**: 30-second intervals
- **Timeout Handling**: 30-second timeouts

## Testing

### Unit Tests
- Service layer tests
- Data transformation tests
- Validation tests
- Error handling tests

### Integration Tests
- Database operation tests
- API integration tests
- Sync process tests
- End-to-end workflow tests

## Deployment Considerations

### Database Setup
1. Create Supabase project
2. Run database migrations
3. Configure indexes
4. Set up monitoring

### Environment Configuration
1. Set environment variables
2. Configure API keys
3. Set up monitoring
4. Configure backup strategies

### Performance Monitoring
- Database query performance
- API response times
- Sync process monitoring
- Error rate tracking

## Future Enhancements

### Planned Features
- **Real-time Updates**: WebSocket support for live updates
- **Advanced Analytics**: Machine learning for event insights
- **Data Export**: Export capabilities for analytics
- **Multi-tenant Support**: Support for multiple organizations
- **API Rate Limiting**: Advanced rate limiting strategies
- **Data Archiving**: Automatic data archiving for old events

### Scalability Considerations
- **Horizontal Scaling**: Database sharding strategies
- **Caching Layer**: Redis integration for caching
- **CDN Integration**: Static asset optimization
- **Load Balancing**: API load balancing strategies

## Troubleshooting

### Common Issues
1. **Database Connection Issues**
   - Check Supabase configuration
   - Verify network connectivity
   - Check service role permissions

2. **Sync Failures**
   - Verify API keys
   - Check rate limits
   - Review error logs

3. **Data Quality Issues**
   - Run data validation
   - Check transformation logic
   - Review source data quality

### Debug Tools
- Database query logging
- API request/response logging
- Sync process monitoring
- Error tracking and alerting

## Conclusion

The database storage layer provides a robust, scalable foundation for the Oslavu app's event management capabilities. With comprehensive error handling, data validation, and performance optimizations, it ensures reliable data storage and retrieval while maintaining high performance and data quality standards.

The implementation follows best practices for:
- **Type Safety**: Full TypeScript support
- **Error Handling**: Comprehensive error management
- **Performance**: Optimized queries and caching
- **Scalability**: Designed for growth
- **Maintainability**: Clean, well-documented code
- **Testing**: Comprehensive test coverage
