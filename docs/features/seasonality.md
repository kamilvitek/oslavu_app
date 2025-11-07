# Seasonality System Documentation

## Overview

The Seasonality System is a comprehensive enhancement to the Oslavu conflict analysis engine that combines expert domain knowledge with holiday/cultural event conflict detection to provide more accurate and contextually-aware event conflict scoring.

## Architecture

### Core Components

1. **Database Schema** (`supabase/migrations/011_add_seasonality_system.sql`)
   - `seasonal_rules`: Monthly demand patterns by category/subcategory
   - `holiday_impact_rules`: Holiday-specific conflict multipliers
   - `seasonal_insights_cache`: Performance optimization cache
   - Helper functions for seasonal analysis

2. **Seasonality Engine** (`src/lib/services/seasonality-engine.ts`)
   - Core calculation and recommendation logic
   - Seasonal multiplier calculations
   - Demand curve analysis
   - Risk assessment

3. **Holiday Conflict Detector** (`src/lib/services/holiday-conflict-detector.ts`)
   - Holiday impact detection
   - Category-specific multipliers
   - Integration with existing holiday system

4. **Enhanced Conflict Analysis** (`src/lib/services/conflict-analysis.ts`)
   - Integration of seasonal and holiday multipliers
   - Enhanced date recommendations with seasonal insights
   - Performance-optimized calculations

## Key Features

### Expert Seasonal Rules

The system implements comprehensive seasonal patterns based on industry expertise:

#### Technology Events
- **AI/ML Conferences**: Peak in spring (March-May) and fall (September-November), low in summer and holidays
- **Web Development**: Similar patterns with slight variations
- **Startup Events**: Peak in Q1 and Q3, avoid Q4 holidays

#### Entertainment Events
- **Music Events**: Peak in summer (June-August), low in winter
- **Theater Events**: Peak in fall/winter (October-April), low in summer
- **Cultural Events**: Seasonal patterns based on Czech cultural calendar

#### Business Events
- **Conferences**: Peak in Q1 and Q3, avoid summer vacation and holidays
- **Trade Shows**: Avoid December and July vacation periods
- **Networking**: Follow business quarters, avoid holidays

### Holiday Impact Detection

#### Major Czech Holidays
- **Christmas Eve/Day**: Critical impact (4.0x multiplier) on all business events
- **New Year's Day**: High impact (3.0x multiplier) on business events
- **Easter Monday**: High impact (2.5x multiplier) on business events
- **Public Holidays**: Moderate impact (1.5-2.0x multiplier) on business events

#### Category-Specific Impacts
- **Business Events**: High sensitivity to all holidays
- **Entertainment Events**: Moderate sensitivity, some holidays increase demand
- **Technology Events**: High sensitivity to major holidays, low sensitivity to minor ones

### Regional Customization

#### Czech Republic Focus
- Prague Spring Festival impact on classical music events
- Summer vacation period (July-August) adjustments
- Christmas markets impact on cultural events
- Regional holiday variations (Prague vs Brno vs regional cities)

## Data Structure

### Seasonal Rules

```typescript
interface SeasonalRule {
  category: string;           // Event category
  subcategory?: string;       // Event subcategory
  region: string;            // Geographic region (CZ, CZ-PR, etc.)
  month: number;             // Month (1-12)
  demandMultiplier: number;  // 0.1-3.0 seasonal demand
  conflictWeight: number;    // 0.5-2.0 conflict weight adjustment
  venueAvailability: number; // 0.0-1.0 venue availability factor
  confidence: number;        // 0.0-1.0 confidence in rule
  reasoning: string;         // Human-readable explanation
}
```

### Holiday Impact Rules

```typescript
interface HolidayImpactRule {
  holidayType: string;       // Type of holiday
  eventCategory: string;    // Affected event category
  daysBefore: number;      // Days before holiday with impact
  daysAfter: number;        // Days after holiday with impact
  impactMultiplier: number; // 0.1-5.0 impact multiplier
  impactType: string;       // 'conflict', 'demand', 'availability', 'combined'
  region: string;          // Geographic region
  reasoning: string;        // Human-readable explanation
}
```

## Integration Points

### Conflict Scoring Flow

```
1. Get competing events for date range
2. For each competing event:
   a. Calculate base conflict score (existing logic)
   b. Get seasonal multiplier for event date/category → NEW
   c. Get holiday multiplier for event date/category → NEW
   d. Apply: baseScore * seasonal * holiday
   e. Calculate audience overlap (existing)
   f. Apply audience overlap multiplier (existing)
3. Sum all event scores
4. Generate recommendations with seasonal insights
```

### Enhanced Date Recommendations

```typescript
interface DateRecommendation {
  startDate: string;
  endDate: string;
  conflictScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  competingEvents: Event[];
  reasons: string[];
  seasonalFactors?: {
    demandLevel: string;
    seasonalMultiplier: number;
    holidayMultiplier: number;
    seasonalReasoning: string[];
    holidayReasoning: string[];
    optimalityScore: number;
    venueAvailability: number;
  };
  // ... existing fields
}
```

## Performance Characteristics

### Optimization Strategies

1. **Caching**: Seasonal multipliers are cached (30-minute TTL)
2. **Batch Processing**: Holiday queries are batched for date ranges
3. **Database Indexes**: Optimized indexes for fast lookups
4. **Lazy Loading**: Seasonal insights only calculated when needed

### Performance Budget

- **Target**: <500ms additional overhead for seasonality calculations
- **Cache Hit Rate**: >80% for common category/month combinations
- **Database Queries**: Minimized through intelligent caching
- **Memory Usage**: <50MB for seasonal data cache

## Usage Examples

### Basic Seasonal Analysis

```typescript
import { seasonalityEngine } from '@/lib/services/seasonality-engine';

// Get seasonal multiplier for a specific date
const multiplier = await seasonalityEngine.getSeasonalMultiplier(
  '2024-03-15',
  'Technology',
  'AI/ML',
  'CZ'
);

console.log(`Seasonal multiplier: ${multiplier.multiplier}x (${multiplier.demandLevel})`);
```

### Holiday Impact Analysis

```typescript
import { holidayConflictDetector } from '@/lib/services/holiday-conflict-detector';

// Get holiday impact for a specific date
const impact = await holidayConflictDetector.getHolidayImpact(
  '2024-12-24',
  'Business',
  'Conferences',
  'CZ'
);

console.log(`Holiday multiplier: ${impact.multiplier}x (${impact.totalImpact})`);
```

### Seasonal Demand Curve

```typescript
// Get 12-month demand curve for a category
const demandCurve = await seasonalityEngine.getSeasonalDemandCurve({
  category: 'Technology',
  subcategory: 'AI/ML',
  region: 'CZ',
  includeReasoning: true
});

console.log('Optimal months:', demandCurve.optimalMonths);
console.log('Avoid months:', demandCurve.avoidMonths);
```

## Maintenance and Expansion

### Adding New Categories

1. **Create Seasonal Rules**: Add 12 months of data for the new category
2. **Define Subcategories**: Create subcategory-specific rules if needed
3. **Set Confidence Levels**: Use 0.7-1.0 for expert rules, 0.5-0.7 for estimated rules
4. **Provide Reasoning**: Include detailed explanations for each month

### Regional Expansion

1. **Add New Region**: Create region-specific rules (e.g., 'DE' for Germany)
2. **Copy Baseline Rules**: Start with Czech rules as baseline
3. **Adjust for Local Patterns**: Modify based on local business and cultural patterns
4. **Add Local Holidays**: Include region-specific holidays and cultural events

### Updating Existing Rules

1. **Version Control**: Track changes with reasoning and expert source
2. **A/B Testing**: Test rule effectiveness before full deployment
3. **Gradual Rollout**: Use feature flags for controlled deployment
4. **Performance Monitoring**: Monitor impact on conflict analysis performance

## Data Sources and Quality

### Expert Rules (Confidence: 0.7-1.0)
- Industry expert analysis
- Conference industry reports
- Event management best practices
- Czech business calendar analysis

### Historical Data (Confidence: 0.5-0.7)
- Past event success rates
- Attendance pattern analysis
- Venue booking patterns
- Market research data

### AI Analysis (Confidence: 0.3-0.6)
- Machine learning insights
- Pattern recognition
- Predictive analytics
- External data integration

## Troubleshooting

### Common Issues

1. **Missing Seasonal Data**: System falls back to default multipliers (1.0x)
2. **Holiday Detection Failures**: Uses conservative holiday impact estimation
3. **Performance Issues**: Check cache hit rates and database query performance
4. **Incorrect Multipliers**: Verify seasonal rules data and confidence levels

### Debug Information

```typescript
// Enable debug logging
const seasonalityEngine = new SeasonalityEngine({
  debugMode: true
});

// Check cache performance
console.log('Cache hit rate:', seasonalityEngine.getCacheStats());
```

## Future Enhancements

### Planned Features

1. **Machine Learning Integration**: Use historical data to refine rules
2. **Dynamic Rule Updates**: Real-time rule adjustments based on performance
3. **External Data Sources**: Weather, economic indicators, social media trends
4. **Advanced Analytics**: Predictive seasonal modeling

### Scalability Considerations

1. **Multi-Region Support**: Architecture supports adding new regions
2. **Subcategory Granularity**: Fine-grained seasonal patterns
3. **Venue-Specific Rules**: Venue-specific seasonal adjustments
4. **Audience Demographics**: Demographic-based seasonal preferences

## API Reference

### SeasonalityEngine Methods

- `getSeasonalMultiplier(date, category, subcategory?, region?)`: Get seasonal multiplier
- `getSeasonalDemandCurve(params)`: Get 12-month demand curve
- `calculateSeasonalRisk(date, category, subcategory?, region?)`: Calculate risk level
- `suggestOptimalSeasons(category, subcategory?, region?, limit?)`: Get optimal months

### HolidayConflictDetector Methods

- `detectHolidayConflicts(date, category, subcategory?, region?)`: Detect holiday conflicts
- `getHolidayMultiplier(date, category, subcategory?, region?)`: Get holiday multiplier
- `getHolidayImpact(date, category, subcategory?, region?)`: Get comprehensive impact
- `getUpcomingHolidays(startDate, endDate, region?)`: Get upcoming holidays

## Conclusion

The Seasonality System provides a robust foundation for enhanced conflict analysis, combining expert domain knowledge with sophisticated holiday impact detection. The system is designed for scalability, performance, and maintainability, with comprehensive documentation for future expansion and optimization.

For technical support or questions about the seasonality system, please refer to the codebase documentation or contact the development team.
