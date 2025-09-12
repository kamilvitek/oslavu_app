# Comprehensive Multi-Strategy Search Implementation

## Overview

This implementation adds a comprehensive multi-strategy search approach across all API services to maximize event discovery coverage. Instead of using single search strategies, the system now combines multiple search approaches and deduplicates results for better event discovery.

## Features Implemented

### 1. Multi-Strategy Search Methods

#### Ticketmaster Service (`getEventsComprehensive`)
- **Strategy 1**: Direct city search
- **Strategy 2**: Radius search (50 miles)
- **Strategy 3**: Market-based search for major cities
- **Strategy 4**: Keyword-based search for category
- **Strategy 5**: Extended radius search (100 miles)

#### Eventbrite Service (`getEventsComprehensive`)
- **Strategy 1**: Location-based search
- **Strategy 2**: Keyword search within location
- **Strategy 3**: Category-specific search
- **Strategy 4**: Broader regional search (100km)
- **Strategy 5**: Extended regional search (200km)

#### PredictHQ Service (`getEventsComprehensive`)
- **Strategy 1**: City-based search
- **Strategy 2**: Keyword search
- **Strategy 3**: High attendance events filter (1000+ attendees)
- **Strategy 4**: High local rank events filter (rank 50+)
- **Strategy 5**: Radius search with category (50km)
- **Strategy 6**: Extended radius search (100km)

### 2. Deduplication Logic

Each service includes a `deduplicateEvents` method that:
- Creates unique identifiers from title, date, and venue
- Removes duplicate events across different search strategies
- Maintains data integrity while maximizing coverage

### 3. Search Strategy Configuration

Added to `constants.ts`:
- Configurable timeouts for each strategy
- Enable/disable individual strategies
- Maximum concurrent strategies per service
- Performance monitoring settings

### 4. Enhanced API Routes

All API routes now support a `comprehensive=true` parameter:
- `/api/analyze/events/ticketmaster?comprehensive=true`
- `/api/analyze/events/eventbrite?comprehensive=true`
- `/api/analyze/events/predicthq?comprehensive=true`

### 5. Strategy Reporting and Logging

Enhanced logging includes:
- Individual strategy performance metrics
- Event counts per strategy
- Execution time per strategy
- Deduplication statistics
- Comprehensive vs standard search summaries

## Usage Examples

### 1. Using Comprehensive Search via API

```typescript
// Enable comprehensive search
const response = await fetch('/api/analyze/events/ticketmaster?comprehensive=true&city=Prague&startDate=2024-01-01&endDate=2024-01-31&category=Technology');
```

### 2. Using Comprehensive Search in Conflict Analysis

```typescript
const analysisParams = {
  city: 'Prague',
  category: 'Technology',
  startDate: '2024-01-15',
  endDate: '2024-01-17',
  dateRangeStart: '2024-01-01',
  dateRangeEnd: '2024-01-31',
  expectedAttendees: 500,
  useComprehensiveFallback: true // Enable comprehensive search
};

const result = await conflictAnalysisService.analyzeConflicts(analysisParams);
```

### 3. Direct Service Usage

```typescript
// Ticketmaster comprehensive search
const events = await ticketmasterService.getEventsComprehensive(
  'Prague',
  '2024-01-01',
  '2024-01-31',
  'Technology'
);

// Eventbrite comprehensive search
const events = await eventbriteService.getEventsComprehensive(
  'Prague',
  '2024-01-01',
  '2024-01-31',
  'Technology'
);

// PredictHQ comprehensive search
const events = await predicthqService.getEventsComprehensive(
  'Prague',
  '2024-01-01',
  '2024-01-31',
  'Technology'
);
```

## Configuration Options

### Search Strategy Configuration

```typescript
export const SEARCH_STRATEGIES = {
  TICKETMASTER: {
    enabled: true,
    strategies: {
      directCity: { enabled: true, timeout: 10000 },
      radiusSearch: { enabled: true, timeout: 15000, radius: '50' },
      marketBased: { enabled: true, timeout: 12000 },
      keywordSearch: { enabled: true, timeout: 10000 },
      extendedRadius: { enabled: true, timeout: 20000, radius: '100' },
    },
    maxConcurrentStrategies: 3,
    deduplicationEnabled: true,
  },
  // ... similar configs for Eventbrite and PredictHQ
};
```

### Global Search Configuration

```typescript
export const SEARCH_CONFIG = {
  defaultTimeout: 15000,
  maxRetries: 2,
  enableStrategyLogging: true,
  enablePerformanceMonitoring: true,
  deduplicationThreshold: 0.8,
  maxEventsPerStrategy: 1000,
  enableEarlyReturn: true,
  earlyReturnThreshold: 50,
};
```

## Performance Benefits

### Event Discovery Coverage
- **Before**: Single strategy per API (limited coverage)
- **After**: Multiple strategies per API (comprehensive coverage)

### Deduplication Efficiency
- Automatic removal of duplicate events across strategies
- Maintains unique events while maximizing discovery
- Configurable similarity thresholds

### Strategy Performance Monitoring
- Individual strategy timing and success rates
- Event counts per strategy
- Performance optimization insights

## Logging Output Example

```
🎟️ Ticketmaster: Starting comprehensive search for Prague (2024-01-01 to 2024-01-31)
🎟️ Ticketmaster: Strategy 1 - Direct city search
🎟️ Ticketmaster: Strategy 1 found 45 events in 1200ms
🎟️ Ticketmaster: Strategy 2 - Radius search (50 miles)
🎟️ Ticketmaster: Strategy 2 found 67 events in 1800ms
🎟️ Ticketmaster: Strategy 3 - Market-based search (CZ-PR)
🎟️ Ticketmaster: Strategy 3 found 52 events in 1500ms
🎟️ Ticketmaster: Strategy 4 - Keyword search for "Technology"
🎟️ Ticketmaster: Strategy 4 found 23 events in 900ms
🎟️ Ticketmaster: Strategy 5 - Extended radius search (100 miles)
🎟️ Ticketmaster: Strategy 5 found 89 events in 2200ms
🎟️ Ticketmaster: Comprehensive search completed
🎟️ Ticketmaster: Strategy Results:
  - Direct city search: 45 events in 1200ms
  - Radius search (50 miles): 67 events in 1800ms
  - Market-based search (CZ-PR): 52 events in 1500ms
  - Keyword search for "Technology": 23 events in 900ms
  - Extended radius search (100 miles): 89 events in 2200ms
🎟️ Ticketmaster: Total events before deduplication: 276
🎟️ Ticketmaster: Total unique events after deduplication: 198
```

## Migration Guide

### For Existing Code

1. **No Breaking Changes**: All existing API calls continue to work
2. **Opt-in Enhancement**: Add `comprehensive=true` parameter to enable new functionality
3. **Backward Compatible**: Existing `useComprehensiveFallback` parameter still works

### For New Implementations

1. Use `getEventsComprehensive()` methods for maximum coverage
2. Enable comprehensive search in conflict analysis with `useComprehensiveFallback: true`
3. Monitor strategy performance through enhanced logging

## Future Enhancements

1. **Adaptive Strategy Selection**: Automatically choose best strategies based on city/category
2. **Machine Learning Optimization**: Learn from strategy performance to optimize future searches
3. **Real-time Strategy Tuning**: Adjust strategy parameters based on API response times
4. **Cross-API Strategy Coordination**: Coordinate strategies across different APIs for optimal coverage

## Testing

The implementation includes comprehensive error handling and fallback mechanisms:
- Individual strategy failures don't affect other strategies
- Graceful degradation when APIs are unavailable
- Detailed error logging for debugging
- Performance monitoring for optimization

## Conclusion

This comprehensive multi-strategy search implementation significantly improves event discovery coverage while maintaining performance and reliability. The system is designed to be configurable, monitorable, and extensible for future enhancements.
