# Location-Based Search Enhancements

This document outlines the comprehensive enhancements made to location-based searching across all API services in the Oslavu app.

## Overview

The enhancements add radius parameters, better geographic targeting, and comprehensive fallback strategies to improve event discovery and conflict analysis accuracy.

## Key Features Added

### 1. Radius-Based Searching
- **Ticketmaster**: Added `radius`, `postalCode`, and `marketId` parameters
- **Eventbrite**: Enhanced configurable `location_radius` parameter
- **PredictHQ**: Added `place.scope` parameter for geographic scope control

### 2. Geographic Targeting Improvements
- **City Coverage**: Expanded to 50+ major European cities
- **Postal Codes**: Added central postal codes for precise location targeting
- **Market IDs**: Added Ticketmaster market IDs for regional searches
- **Coordinates**: Enhanced PredictHQ with precise lat/lon coordinates

### 3. Comprehensive Fallback Strategies
- **Primary**: Exact city match with category
- **Secondary**: Exact city match without category
- **Tertiary**: Radius search with category
- **Quaternary**: Radius search without category
- **Extended**: Larger radius searches (100km)
- **Market-based**: Regional market searches
- **Country-wide**: High-impact event searches

### 4. Deduplication
- Smart event deduplication based on title, date, and venue
- Prevents duplicate events across different search strategies
- Maintains data quality and reduces noise

## Service-Specific Enhancements

### Ticketmaster Service (`src/lib/services/ticketmaster.ts`)

#### New Methods:
- `getEventsWithRadius()` - Radius-based event search
- `getEventsWithComprehensiveFallback()` - Multi-strategy fallback
- `getCityPostalCode()` - Postal code lookup for cities
- `getCityMarketId()` - Market ID lookup for cities
- `addUniqueEvents()` - Deduplication helper

#### Enhanced Parameters:
```typescript
interface TicketmasterParams {
  city?: string;
  countryCode?: string;
  radius?: string;        // NEW: e.g., "25", "50", "100"
  postalCode?: string;    // NEW: e.g., "11000" for Prague
  marketId?: string;      // NEW: e.g., "CZ-PR" for Prague
  // ... existing parameters
}
```

#### Geographic Coverage:
- **Czech Republic**: Prague, Brno, Ostrava, Olomouc
- **Germany**: Berlin, Munich, Hamburg, Cologne, Frankfurt, etc.
- **United Kingdom**: London, Edinburgh, Glasgow, Manchester, etc.
- **Other European Cities**: Paris, Amsterdam, Vienna, Warsaw, etc.

### Eventbrite Service (`src/lib/services/eventbrite.ts`)

#### New Methods:
- `getEventsWithRadius()` - Configurable radius search
- `getEventsWithComprehensiveFallback()` - Multi-strategy fallback
- `addUniqueEvents()` - Deduplication helper

#### Enhanced Parameters:
```typescript
interface EventbriteParams {
  location?: string;
  location_radius?: string;  // ENHANCED: Now configurable (25km, 50km, 100km)
  // ... existing parameters
}
```

#### Radius Options:
- **25km**: For small, local events
- **50km**: Default radius for most searches
- **100km**: For large conferences and major events

### PredictHQ Service (`src/lib/services/predicthq.ts`)

#### New Methods:
- `getEventsWithRadius()` - Radius-based search with scope control
- `getEventsWithComprehensiveFallback()` - Multi-strategy fallback
- `getRadiusParams()` - Converts radius to PredictHQ scope
- `addUniqueEvents()` - Deduplication helper

#### Enhanced Parameters:
```typescript
interface PredictHQParams {
  place?: string;
  'place.scope'?: string;  // NEW: 'city', 'metro', 'region', 'country'
  // ... existing parameters
}
```

#### Scope Mapping:
- **≤25km**: `city` scope
- **≤50km**: `metro` scope
- **≤100km**: `region` scope
- **>100km**: `country` scope

### Conflict Analysis Service (`src/lib/services/conflict-analysis.ts`)

#### Enhanced Parameters:
```typescript
interface ConflictAnalysisParams {
  // ... existing parameters
  searchRadius?: string;              // NEW: Default "50km"
  useComprehensiveFallback?: boolean; // NEW: Enable all fallback strategies
}
```

#### New Features:
- Configurable search radius for geographic coverage
- Option to use comprehensive fallback strategies
- Better event discovery for conflict analysis

## API Route Updates

### Updated Routes:
- `/api/analyze/events/ticketmaster` - Added radius and fallback support
- `/api/analyze/events/eventbrite` - Added radius and fallback support
- `/api/analyze/events/predicthq` - Added radius and fallback support

### New Query Parameters:
- `radius`: Search radius (e.g., "50km", "25miles")
- `useComprehensiveFallback`: Enable comprehensive fallback strategies

## Usage Examples

### Basic Radius Search
```typescript
// Search within 50km of Prague
const events = await ticketmasterService.getEventsWithRadius(
  'Prague', '2024-06-01', '2024-06-30', '50', 'Technology'
);
```

### Comprehensive Fallback
```typescript
// Use all available strategies for maximum coverage
const events = await eventbriteService.getEventsWithComprehensiveFallback(
  'Brno', '2024-07-01', '2024-07-31', 'Business', '25km'
);
```

### Conflict Analysis with Radius
```typescript
const result = await conflictAnalysisService.analyzeConflicts({
  city: 'Prague',
  category: 'Technology',
  expectedAttendees: 500,
  startDate: '2024-08-15',
  endDate: '2024-08-17',
  dateRangeStart: '2024-08-01',
  dateRangeEnd: '2024-08-31',
  searchRadius: '50km',
  useComprehensiveFallback: true
});
```

### Market-Based Search
```typescript
// Use Ticketmaster market ID for regional search
const events = await ticketmasterService.getEvents({
  marketId: 'DE-BER', // Berlin market
  startDateTime: '2024-10-01T00:00:00Z',
  endDateTime: '2024-10-31T23:59:59Z',
  classificationName: 'Arts & Theatre'
});
```

## Performance Considerations

### Optimizations:
- **Early Returns**: Stop searching when sufficient events are found
- **Pagination Limits**: Prevent excessive API calls
- **Deduplication**: Efficient event deduplication
- **Parallel Processing**: Multiple strategies run in parallel where possible

### Fallback Strategy Limits:
- **Ticketmaster**: Max 10 pages (2000 events)
- **Eventbrite**: Max 10 pages (2000 events)
- **PredictHQ**: Max 9 pages (4500 events)

## Geographic Coverage

### Supported Cities (50+):
- **Czech Republic**: Prague, Brno, Ostrava, Olomouc
- **Germany**: Berlin, Munich, Hamburg, Cologne, Frankfurt, Stuttgart, etc.
- **United Kingdom**: London, Edinburgh, Glasgow, Manchester, Birmingham, etc.
- **Other European**: Paris, Amsterdam, Vienna, Warsaw, Budapest, Zurich, etc.

### Data Sources:
- **Postal Codes**: Central postal codes for major cities
- **Market IDs**: Ticketmaster regional market identifiers
- **Coordinates**: Precise lat/lon for PredictHQ searches
- **Country Codes**: ISO country codes for all supported cities

## Benefits

### For Event Organizers:
- **Better Coverage**: Find events in nearby areas that might compete
- **Flexible Search**: Adjust radius based on event size and importance
- **Comprehensive Analysis**: Multiple search strategies ensure no events are missed

### For Conflict Analysis:
- **More Accurate**: Better geographic coverage leads to better conflict detection
- **Configurable**: Adjust search radius based on event type and size
- **Reliable**: Fallback strategies ensure consistent results

### For Performance:
- **Efficient**: Early returns and pagination limits prevent excessive API calls
- **Deduplicated**: Smart deduplication reduces noise and improves quality
- **Scalable**: Comprehensive fallback strategies scale with API availability

## Testing

See `src/lib/services/location-search-example.ts` for comprehensive usage examples and test cases.

## Future Enhancements

### Potential Improvements:
1. **Dynamic Radius**: Automatically adjust radius based on event size
2. **Travel Time**: Use travel time instead of distance for radius
3. **Event Density**: Adjust search strategy based on local event density
4. **User Preferences**: Allow users to customize search parameters
5. **Caching**: Cache geographic data and search results for performance

### API Enhancements:
1. **Batch Requests**: Support for multiple city searches in one request
2. **Real-time Updates**: WebSocket support for live event updates
3. **Advanced Filtering**: More sophisticated event filtering options
4. **Analytics**: Search performance and effectiveness metrics
