// src/lib/services/perplexity-research.ts
import { PerplexityConflictResearch, PerplexityResearchParams, PerplexityBatchResearchParams, PerplexityBatchResearchResult } from '@/types/perplexity';
import { formatNearbyCities } from '@/lib/utils/city-proximity';
import { cityDatabaseService } from '@/lib/services/city-database';
import { z } from 'zod';

// Zod schema for structured output validation
const PerplexityEventSchema = z.object({
  name: z.string(),
  date: z.string(),
  location: z.string(),
  type: z.enum(['concert', 'festival', 'cultural_event', 'other']),
  expectedAttendance: z.number().optional(),
  description: z.string().optional(),
  source: z.string().optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
  onDate: z.boolean().optional(), // true if on exact target date, false if within temporal window
  daysFromTarget: z.number().optional(), // negative for days before, positive for days after
  temporalImpact: z.enum(['high', 'medium', 'low']).optional(), // impact based on proximity and size
});

const PerplexityTouringArtistSchema = z.object({
  artistName: z.string(),
  tourDates: z.array(z.string()),
  locations: z.array(z.string()),
  genre: z.string().optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
});

const PerplexityFestivalSchema = z.object({
  name: z.string(),
  dates: z.string(),
  location: z.string(),
  type: z.string(),
  description: z.string().optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
});

const PerplexityHolidaySchema = z.object({
  name: z.string(),
  date: z.string(),
  type: z.enum(['holiday', 'cultural_event']),
  impact: z.enum(['low', 'medium', 'high']),
  description: z.string().optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
});

const PerplexityRecommendationSchema = z.object({
  shouldMoveDate: z.boolean(),
  recommendedDates: z.array(z.string()).optional(),
  reasoning: z.array(z.string()),
  riskLevel: z.enum(['low', 'medium', 'high']),
});

const PerplexityConflictResearchSchema = z.object({
  conflictingEvents: z.array(PerplexityEventSchema),
  touringArtists: z.array(PerplexityTouringArtistSchema),
  localFestivals: z.array(PerplexityFestivalSchema),
  holidaysAndCulturalEvents: z.array(PerplexityHolidaySchema),
  recommendations: PerplexityRecommendationSchema,
  researchMetadata: z.object({
    query: z.string(),
    timestamp: z.string(),
    sourcesUsed: z.number(),
    confidence: z.enum(['high', 'medium', 'low']),
  }).optional(),
});

export class PerplexityResearchService {
  private readonly baseUrl = 'https://api.perplexity.ai';
  // Using sonar-pro: Advanced search model with grounding, best for complex queries and structured outputs
  // Cost-effective compared to reasoning/research models, perfect for event conflict research
  private readonly model = 'sonar-pro';
  
  // Request cache with TTL
  private requestCache = new Map<string, { data: PerplexityConflictResearch; expiry: number }>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    // Don't store API key in constructor - read it at runtime
    // This ensures environment variables are loaded when needed
  }

  /**
   * Get API key at runtime (ensures env vars are loaded)
   */
  private getApiKey(): string {
    return process.env.PERPLEXITY_API_KEY || '';
  }

  /**
   * Main research method for event conflicts
   */
  async researchEventConflicts(params: PerplexityResearchParams): Promise<PerplexityConflictResearch | null> {
    const apiKey = this.getApiKey();
    
    // Debug logging (only in development, without exposing key details)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Perplexity API Key Check:', {
        hasKey: !!apiKey,
        keyLength: apiKey.length,
        envVar: process.env.PERPLEXITY_API_KEY ? 'SET' : 'NOT SET',
      });
    }
    
    if (!apiKey) {
      console.warn('Perplexity API key not configured. Skipping research.');
      return null;
    }

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(params);
      const cached = this.requestCache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        console.log('🔄 Using cached Perplexity research result');
        return cached.data;
      }

      // Generate prompt based on category (now async to get dynamic nearby cities)
      const prompt = await this.generatePrompt(params);
      
      // Call Perplexity API
      const result = await this.callPerplexityAPI(prompt);
      
      // Validate and parse response
      let validatedResult = this.validateAndParseResponse(result);
      
      // OPTIMIZATION: Removed fallback prompt to reduce API calls
      // The comprehensive prompt should be sufficient for most cases
      // If no events are found, it's likely because there truly are no events, not because of prompt issues
      
      // Add metadata
      if (!validatedResult.researchMetadata) {
        validatedResult.researchMetadata = {
          query: prompt,
          timestamp: new Date().toISOString(),
          sourcesUsed: this.extractSourceCount(result),
          confidence: this.calculateOverallConfidence(validatedResult),
        };
      }
      
      // Cache the result
      this.requestCache.set(cacheKey, {
        data: validatedResult,
        expiry: Date.now() + this.CACHE_TTL,
      });
      
      return validatedResult;
    } catch (error) {
      console.error('Perplexity research failed:', error);
      // Return null instead of throwing - don't break main analysis
      return null;
    }
  }

  /**
   * Batch research method for multiple date ranges in a single API call
   * This optimizes API usage by consolidating multiple date queries into one request
   */
  async researchEventConflictsBatch(params: PerplexityBatchResearchParams): Promise<PerplexityBatchResearchResult> {
    const apiKey = this.getApiKey();
    
    if (!apiKey) {
      console.warn('Perplexity API key not configured. Skipping batch research.');
      return {};
    }

    if (params.dateRanges.length === 0) {
      return {};
    }

    try {
      // Generate batch prompt that covers all date ranges
      const prompt = await this.generateBatchPrompt(params);
      
      // Call Perplexity API once for all dates
      console.log(`🔍 Perplexity Batch: Calling for ${params.dateRanges.length} date ranges in a single API call`);
      const result = await this.callPerplexityAPI(prompt);
      
      // Validate and parse response
      const validatedResult = this.validateAndParseResponse(result);
      
      // Distribute events to their respective date ranges
      const batchResults: PerplexityBatchResearchResult = {};
      
      for (const dateRange of params.dateRanges) {
        const rangeId = dateRange.id || `${dateRange.start}_${dateRange.end}`;
        const rangeStart = new Date(dateRange.start);
        const rangeEnd = new Date(dateRange.end);
        
        // Filter events that fall within this date range (with ±7 day window)
        const windowStart = new Date(rangeStart);
        windowStart.setDate(windowStart.getDate() - 7);
        const windowEnd = new Date(rangeEnd);
        windowEnd.setDate(windowEnd.getDate() + 7);
        
        const filteredEvents = validatedResult.conflictingEvents.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= windowStart && eventDate <= windowEnd;
        });
        
        const filteredTouringArtists = validatedResult.touringArtists.filter(artist => {
          return artist.tourDates.some(date => {
            const tourDate = new Date(date);
            return tourDate >= windowStart && tourDate <= windowEnd;
          });
        });
        
        const filteredFestivals = validatedResult.localFestivals.filter(festival => {
          // Parse festival date range (could be "YYYY-MM-DD to YYYY-MM-DD" or single date)
          const dateMatch = festival.dates.match(/(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            const festivalDate = new Date(dateMatch[1]);
            return festivalDate >= windowStart && festivalDate <= windowEnd;
          }
          return false;
        });
        
        const filteredHolidays = validatedResult.holidaysAndCulturalEvents.filter(holiday => {
          const holidayDate = new Date(holiday.date);
          return holidayDate >= windowStart && holidayDate <= windowEnd;
        });
        
        // Create a research result for this date range
        batchResults[rangeId] = {
          conflictingEvents: filteredEvents,
          touringArtists: filteredTouringArtists,
          localFestivals: filteredFestivals,
          holidaysAndCulturalEvents: filteredHolidays,
          recommendations: {
            shouldMoveDate: validatedResult.recommendations.shouldMoveDate,
            recommendedDates: validatedResult.recommendations.recommendedDates?.filter(date => {
              const recDate = new Date(date);
              return recDate >= rangeStart && recDate <= rangeEnd;
            }),
            reasoning: validatedResult.recommendations.reasoning,
            riskLevel: validatedResult.recommendations.riskLevel,
          },
          researchMetadata: {
            query: prompt,
            timestamp: new Date().toISOString(),
            sourcesUsed: validatedResult.researchMetadata?.sourcesUsed || 0,
            confidence: this.calculateOverallConfidence({
              conflictingEvents: filteredEvents,
              touringArtists: filteredTouringArtists,
              localFestivals: filteredFestivals,
              holidaysAndCulturalEvents: filteredHolidays,
              recommendations: batchResults[rangeId].recommendations,
            }),
          },
        };
      }
      
      console.log(`✅ Perplexity Batch: Processed ${params.dateRanges.length} date ranges from single API call`);
      return batchResults;
    } catch (error) {
      console.error('Perplexity batch research failed:', error);
      // Return empty results for all date ranges instead of throwing
      const emptyResults: PerplexityBatchResearchResult = {};
      for (const dateRange of params.dateRanges) {
        const rangeId = dateRange.id || `${dateRange.start}_${dateRange.end}`;
        emptyResults[rangeId] = this.getDefaultResponse();
      }
      return emptyResults;
    }
  }

  /**
   * Generate batch prompt for multiple date ranges
   */
  private async generateBatchPrompt(params: PerplexityBatchResearchParams): Promise<string> {
    const { city, category, subcategory, expectedAttendees, dateRanges } = params;
    
    // Determine if this is a large event
    const isLargeEvent = expectedAttendees >= 1000;
    
    // Get nearby cities dynamically
    let nearbyCitiesList: string[] = [];
    if (isLargeEvent) {
      nearbyCitiesList = await this.getNearbyCitiesForPrompt(city);
    }
    
    const searchLocation = nearbyCitiesList.length > 0 
      ? `${city}, ${nearbyCitiesList.join(', ')}`
      : city;
    
    // Calculate overall date window (earliest start - 7 days to latest end + 7 days)
    const allDates = dateRanges.flatMap(range => [
      new Date(range.start),
      new Date(range.end)
    ]);
    const earliestDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const latestDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    const windowStart = new Date(earliestDate);
    windowStart.setDate(windowStart.getDate() - 7);
    const windowEnd = new Date(latestDate);
    windowEnd.setDate(windowEnd.getDate() + 7);
    
    const windowStartStr = windowStart.toISOString().split('T')[0];
    const windowEndStr = windowEnd.toISOString().split('T')[0];
    
    // Format date ranges for the prompt
    const dateRangesStr = dateRanges.map(range => 
      `${range.start} to ${range.end}`
    ).join(', ');
    
    const categoryEventTypes = this.getCategoryEventTypes(category, subcategory);
    
    const prompt = `Find ${category}${subcategory ? ` (${subcategory})` : ''} events in ${city} for multiple date ranges. The user is organizing an event expecting ${expectedAttendees} attendees.

TARGET DATE RANGES (primary focus):
${dateRanges.map((range, idx) => `- Range ${idx + 1}: ${range.start} to ${range.end}`).join('\n')}

SEARCH SCOPE:
- Primary focus: Events on the target date ranges listed above
- Extended window: Also search from ${windowStartStr} to ${windowEndStr} (7 days before/after each range) for events that could impact attendance
- Location: ${isLargeEvent 
      ? `Search in ${searchLocation} (user's event is large with ${expectedAttendees} expected attendees, so major events from nearby cities could compete)` 
      : `Search ONLY in ${city} (user's event is small with ${expectedAttendees} expected attendees, so only local events matter - do NOT search in remote cities)`}
- Category: Focus on ${categoryEventTypes}${subcategory ? `, specifically ${subcategory}` : ''}

WHAT TO INCLUDE:

1. Conflicting Events (${categoryEventTypes}):
   - Events on any of the target date ranges - mark as "onDate: true"
   - Events within 7 days before/after any target range - mark as "onDate: false" with "daysFromTarget" (negative = before, positive = after)
   ${isLargeEvent 
     ? `- IMPORTANT: User's event is large (${expectedAttendees} attendees), so include major events (1000+ attendees) from nearby cities - they can compete across regions`
     : `- IMPORTANT: User's event is small (${expectedAttendees} attendees), so ONLY include events in ${city} - do NOT include events from other cities, even if they're large`}
   - Include events that match ${category}${subcategory ? ` and ${subcategory}` : ''} category
   - Be inclusive: if unsure about category match, include it (we'll filter later)

2. Touring Artists:
   - Artists performing on any target date range or within 7 days before/after
   ${isLargeEvent 
     ? `- Include artists in ${searchLocation} (user's large event can compete with touring artists in nearby cities)`
     : `- Include artists ONLY in ${city} (user's small event only competes locally)`}
   - Focus on artists matching ${category}${subcategory ? ` / ${subcategory}` : ''} genre

3. Local Festivals:
   - Festivals on any target date range or major festivals (500+ attendees) within 7 days
   ${isLargeEvent 
     ? `- Include major festivals (1000+ attendees) from nearby cities - they can compete with user's large event`
     : `- Include festivals ONLY in ${city} - do NOT include festivals from other cities`}

4. Holidays & Cultural Events:
   - Holidays/events on any target date range or major ones within 3-5 days before/after
   - These affect travel and availability
   - Include regardless of location (holidays affect everyone)

CATEGORY FILTERING (be reasonable, not overly strict):
- Primary focus: ${category}${subcategory ? ` / ${subcategory}` : ''} events
- Include related events that might compete for the same audience
- Exclude clearly unrelated events (e.g., wine tours for music events, sports for business events)
- When in doubt, include rather than exclude - better to have more data

OUTPUT FORMAT (JSON only, no markdown):

{
  "conflictingEvents": [
    {
      "name": "Event name",
      "date": "YYYY-MM-DD",
      "location": "City name",
      "type": "concert|festival|cultural_event|other",
      "onDate": true/false,
      "daysFromTarget": number (only if onDate is false),
      "expectedAttendance": number (optional),
      "description": "Brief description (optional)",
      "source": "URL (optional)",
      "temporalImpact": "high|medium|low" (optional)
    }
  ],
  "touringArtists": [
    {
      "artistName": "Artist name",
      "tourDates": ["YYYY-MM-DD"],
      "locations": ["City name"],
      "genre": "Genre (optional)"
    }
  ],
  "localFestivals": [
    {
      "name": "Festival name",
      "dates": "Date range string",
      "location": "City name",
      "type": "Festival type",
      "description": "Description (optional)"
    }
  ],
  "holidaysAndCulturalEvents": [
    {
      "name": "Holiday/Event name",
      "date": "YYYY-MM-DD",
      "type": "holiday|cultural_event",
      "impact": "low|medium|high",
      "description": "Description (optional)"
    }
  ],
  "recommendations": {
    "shouldMoveDate": false,
    "recommendedDates": [],
    "reasoning": [
      "Write in simple, direct language. Provide recommendations for the date ranges above."
    ],
    "riskLevel": "low|medium|high"
  }
}

IMPORTANT GUIDELINES:
- Use YYYY-MM-DD format for all dates
- Be specific about dates, locations, and event names
- Include source URLs when available
- For recommendations: Use plain language, be specific, mention temporal proximity when relevant
- If no events found, return empty arrays but still provide recommendations
- Return ONLY valid JSON, no markdown code blocks or additional text`;

    return prompt;
  }

  /**
   * Generate dynamic prompt based on category and subcategory
   * Optimized for reliability: balances specificity with inclusivity
   * Uses dynamic city database to find nearby cities (scalable for any city)
   */
  private async generatePrompt(params: PerplexityResearchParams): Promise<string> {
    const { city, category, subcategory, date, expectedAttendees, dateRange } = params;
    
    // Determine if this is a large event that could compete across cities
    // Large events (1000+ attendees) can draw audiences from nearby cities
    // Small events only compete locally
    const isLargeEvent = expectedAttendees >= 1000;
    
    // Get nearby cities dynamically from database (with AI fallback)
    // Only include nearby cities for large events - small events only compete locally
    let nearbyCitiesList: string[] = [];
    if (isLargeEvent) {
      nearbyCitiesList = await this.getNearbyCitiesForPrompt(city);
    }
    
    const searchLocation = nearbyCitiesList.length > 0 
      ? `${city}, ${nearbyCitiesList.join(', ')}`
      : city;
    
    const dateRangeStr = dateRange 
      ? `${dateRange.start} to ${dateRange.end}`
      : date;
    
    // Calculate date window for temporal proximity analysis (±7 days)
    const rangeStart = dateRange ? new Date(dateRange.start) : new Date(date);
    const rangeEnd = dateRange ? new Date(dateRange.end) : new Date(date);
    const windowStart = new Date(rangeStart);
    windowStart.setDate(windowStart.getDate() - 7);
    const windowEnd = new Date(rangeEnd);
    windowEnd.setDate(windowEnd.getDate() + 7);
    const windowStartStr = windowStart.toISOString().split('T')[0];
    const windowEndStr = windowEnd.toISOString().split('T')[0];
    
    // Category-specific event types
    const categoryEventTypes = this.getCategoryEventTypes(category, subcategory);
    
    // Build the prompt with clear structure and progressive specificity
    const prompt = `Find ${category}${subcategory ? ` (${subcategory})` : ''} events in ${city}${dateRange ? ` from ${dateRange.start} to ${dateRange.end}` : ` on ${date}`}. The user is organizing an event expecting ${expectedAttendees} attendees.

SEARCH SCOPE:
- Primary focus: Events on ${dateRange ? `dates ${dateRange.start} to ${dateRange.end}` : `date ${date}`}
- Extended window: Also search from ${windowStartStr} to ${windowEndStr} (7 days before/after) for events that could impact attendance
- Location: ${isLargeEvent 
      ? `Search in ${searchLocation} (user's event is large with ${expectedAttendees} expected attendees, so major events from nearby cities could compete)` 
      : `Search ONLY in ${city} (user's event is small with ${expectedAttendees} expected attendees, so only local events matter - do NOT search in remote cities)`}
- Category: Focus on ${categoryEventTypes}${subcategory ? `, specifically ${subcategory}` : ''}

WHAT TO INCLUDE:

1. Conflicting Events (${categoryEventTypes}):
   - Events on the exact target date(s) - mark as "onDate: true"
   - Events within 7 days before/after - mark as "onDate: false" with "daysFromTarget" (negative = before, positive = after)
   ${isLargeEvent 
     ? `- IMPORTANT: User's event is large (${expectedAttendees} attendees), so include major events (1000+ attendees) from nearby cities - they can compete across regions`
     : `- IMPORTANT: User's event is small (${expectedAttendees} attendees), so ONLY include events in ${city} - do NOT include events from other cities, even if they're large`}
   - Include events that match ${category}${subcategory ? ` and ${subcategory}` : ''} category
   - Be inclusive: if unsure about category match, include it (we'll filter later)

2. Touring Artists:
   - Artists performing on target date(s) or within 7 days before/after
   ${isLargeEvent 
     ? `- Include artists in ${searchLocation} (user's large event can compete with touring artists in nearby cities)`
     : `- Include artists ONLY in ${city} (user's small event only competes locally)`}
   - Focus on artists matching ${category}${subcategory ? ` / ${subcategory}` : ''} genre

3. Local Festivals:
   - Festivals on target date(s) or major festivals (500+ attendees) within 7 days
   ${isLargeEvent 
     ? `- Include major festivals (1000+ attendees) from nearby cities - they can compete with user's large event`
     : `- Include festivals ONLY in ${city} - do NOT include festivals from other cities`}

4. Holidays & Cultural Events:
   - Holidays/events on target date(s) or major ones within 3-5 days before/after
   - These affect travel and availability
   - Include regardless of location (holidays affect everyone)

CATEGORY FILTERING (be reasonable, not overly strict):
- Primary focus: ${category}${subcategory ? ` / ${subcategory}` : ''} events
- Include related events that might compete for the same audience
- Exclude clearly unrelated events (e.g., wine tours for music events, sports for business events)
- When in doubt, include rather than exclude - better to have more data

OUTPUT FORMAT (JSON only, no markdown):

{
  "conflictingEvents": [
    {
      "name": "Event name",
      "date": "YYYY-MM-DD",
      "location": "City name",
      "type": "concert|festival|cultural_event|other",
      "onDate": true/false,
      "daysFromTarget": number (only if onDate is false),
      "expectedAttendance": number (optional),
      "description": "Brief description (optional)",
      "source": "URL (optional)",
      "temporalImpact": "high|medium|low" (optional)
    }
  ],
  "touringArtists": [
    {
      "artistName": "Artist name",
      "tourDates": ["YYYY-MM-DD"],
      "locations": ["City name"],
      "genre": "Genre (optional)"
    }
  ],
  "localFestivals": [
    {
      "name": "Festival name",
      "dates": "Date range string",
      "location": "City name",
      "type": "Festival type",
      "description": "Description (optional)"
    }
  ],
  "holidaysAndCulturalEvents": [
    {
      "name": "Holiday/Event name",
      "date": "YYYY-MM-DD",
      "type": "holiday|cultural_event",
      "impact": "low|medium|high",
      "description": "Description (optional)"
    }
  ],
  "recommendations": {
    "shouldMoveDate": false,
    "recommendedDates": [],
    "reasoning": [
      "Write in simple, direct language. Example: 'Rock for People festival (June 10-14) in Hradec Králové will attract 20,000+ fans. Even though your event is on June 16 (2 days after), many potential attendees will still be recovering or have already spent their budget. Consider moving to June 20-25.'"
    ],
    "riskLevel": "low|medium|high"
  }
}

IMPORTANT GUIDELINES:
- Use YYYY-MM-DD format for all dates
- Be specific about dates, locations, and event names
- Include source URLs when available
- For recommendations: Use plain language, be specific, mention temporal proximity when relevant
- If no events found, return empty arrays but still provide recommendations
- Return ONLY valid JSON, no markdown code blocks or additional text`;

    return prompt;
  }

  /**
   * Get nearby cities dynamically using CityDatabaseService
   * Falls back to hardcoded list if database lookup fails
   */
  private async getNearbyCitiesForPrompt(city: string): Promise<string[]> {
    try {
      // Use CityDatabaseService to get impact cities (nearby larger cities)
      // This uses database first, then calculates from coordinates, then AI fallback
      const impactCities = await cityDatabaseService.getImpactCities(
        city,
        50000, // minPopulation: cities with 50k+ population
        50     // maxDistance: within 50km
      );
      
      if (impactCities.length > 0) {
        // Return city names (use English name if available, otherwise Czech)
        return impactCities.map(c => c.name_en || c.name_cs || '');
      }
      
      // Fallback to hardcoded list if database lookup fails
      console.log(`⚠️ No nearby cities found in database for "${city}", using fallback`);
      return formatNearbyCities(city).split(', ').slice(1); // Remove the city itself
    } catch (error) {
      console.warn(`⚠️ Error getting nearby cities for "${city}", using fallback:`, error);
      // Fallback to hardcoded list on error
      const fallback = formatNearbyCities(city).split(', ');
      return fallback.length > 1 ? fallback.slice(1) : [];
    }
  }

  /**
   * Generate simplified prompt for fallback when comprehensive prompt finds no events
   * This uses a more direct, less restrictive approach similar to simple user queries
   */
  private async generateSimplifiedPrompt(params: PerplexityResearchParams): Promise<string> {
    const { city, category, subcategory, date, dateRange, expectedAttendees } = params;
    
    // Only include nearby cities for large events (same logic as main prompt)
    const isLargeEvent = expectedAttendees >= 1000;
    let nearbyCitiesList: string[] = [];
    if (isLargeEvent) {
      nearbyCitiesList = await this.getNearbyCitiesForPrompt(city);
    }
    
    const nearbyCitiesStr = nearbyCitiesList.length > 0 
      ? `${city}, ${nearbyCitiesList.join(', ')}`
      : city;
    const dateStr = dateRange ? `${dateRange.start} to ${dateRange.end}` : date;
    
    // Calculate date window (±7 days)
    const rangeStart = dateRange ? new Date(dateRange.start) : new Date(date);
    const rangeEnd = dateRange ? new Date(dateRange.end) : new Date(date);
    const windowStart = new Date(rangeStart);
    windowStart.setDate(windowStart.getDate() - 7);
    const windowEnd = new Date(rangeEnd);
    windowEnd.setDate(windowEnd.getDate() + 7);
    const windowStartStr = windowStart.toISOString().split('T')[0];
    const windowEndStr = windowEnd.toISOString().split('T')[0];
    
    // Simple, direct prompt - similar to what users would type
    const prompt = `Find ${category}${subcategory ? ` (${subcategory})` : ''} events in ${city} city${dateRange ? ` from ${dateRange.start} to ${dateRange.end}` : ` on ${date}`}.

Search for events from ${windowStartStr} to ${windowEndStr} (including 7 days before and after the target date).

Return a JSON object with this structure:
{
  "conflictingEvents": [
    {
      "name": "Event name",
      "date": "YYYY-MM-DD",
      "location": "City name",
      "type": "concert|festival|cultural_event|other",
      "expectedAttendance": number (optional),
      "description": "Event description (optional)",
      "source": "URL (optional)"
    }
  ],
  "touringArtists": [
    {
      "artistName": "Artist name",
      "tourDates": ["YYYY-MM-DD"],
      "locations": ["City name"],
      "genre": "Genre (optional)"
    }
  ],
  "localFestivals": [
    {
      "name": "Festival name",
      "dates": "Date range string",
      "location": "City name",
      "type": "Festival type",
      "description": "Description (optional)"
    }
  ],
  "holidaysAndCulturalEvents": [
    {
      "name": "Holiday/Event name",
      "date": "YYYY-MM-DD",
      "type": "holiday|cultural_event",
      "impact": "low|medium|high",
      "description": "Description (optional)"
    }
  ],
  "recommendations": {
    "shouldMoveDate": false,
    "recommendedDates": [],
    "reasoning": ["Simple explanation"],
    "riskLevel": "low|medium|high"
  }
}

IMPORTANT:
- Focus on finding events ${isLargeEvent ? `in ${nearbyCitiesStr}` : `ONLY in ${city} (do NOT search in remote cities)`} on or near ${dateStr}
- ${isLargeEvent 
    ? `User's event is large (${expectedAttendees} attendees), so include major events from nearby cities`
    : `User's event is small (${expectedAttendees} attendees), so ONLY include events in ${city} - do NOT include events from other cities`}
- Include events that match ${category}${subcategory ? ` and ${subcategory}` : ''} category
- Be inclusive - include events that might be relevant even if not perfectly matching
- Use YYYY-MM-DD format for all dates
- Return ONLY valid JSON, no markdown code blocks`;

    return prompt;
  }

  /**
   * Get category-specific event types for prompt
   */
  private getCategoryEventTypes(category: string, subcategory?: string): string {
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('entertainment') || categoryLower.includes('music')) {
      return 'concerts, music festivals, or entertainment events';
    } else if (categoryLower.includes('technology') || categoryLower.includes('tech')) {
      return 'tech conferences, hackathons, or meetups';
    } else if (categoryLower.includes('business')) {
      return 'business conferences or networking events';
    } else if (categoryLower.includes('sports')) {
      return 'sports events or tournaments';
    } else if (categoryLower.includes('arts') || categoryLower.includes('culture')) {
      return 'cultural festivals or art exhibitions';
    } else {
      return `${category} events`;
    }
  }

  /**
   * Call Perplexity API with structured output
   */
  private async callPerplexityAPI(prompt: string): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      // Define JSON schema for structured output
      const responseSchema = {
        type: 'object',
        properties: {
          conflictingEvents: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                date: { type: 'string' },
                location: { type: 'string' },
                type: { type: 'string', enum: ['concert', 'festival', 'cultural_event', 'other'] },
                expectedAttendance: { type: 'number' },
                description: { type: 'string' },
                source: { type: 'string' },
              },
              required: ['name', 'date', 'location', 'type'],
            },
          },
          touringArtists: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                artistName: { type: 'string' },
                tourDates: { type: 'array', items: { type: 'string' } },
                locations: { type: 'array', items: { type: 'string' } },
                genre: { type: 'string' },
              },
              required: ['artistName', 'tourDates', 'locations'],
            },
          },
          localFestivals: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                dates: { type: 'string' },
                location: { type: 'string' },
                type: { type: 'string' },
                description: { type: 'string' },
              },
              required: ['name', 'dates', 'location', 'type'],
            },
          },
          holidaysAndCulturalEvents: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                date: { type: 'string' },
                type: { type: 'string', enum: ['holiday', 'cultural_event'] },
                impact: { type: 'string', enum: ['low', 'medium', 'high'] },
                description: { type: 'string' },
              },
              required: ['name', 'date', 'type', 'impact'],
            },
          },
          recommendations: {
            type: 'object',
            properties: {
              shouldMoveDate: { type: 'boolean' },
              recommendedDates: { type: 'array', items: { type: 'string' } },
              reasoning: { type: 'array', items: { type: 'string' } },
              riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
            },
            required: ['shouldMoveDate', 'reasoning', 'riskLevel'],
          },
        },
        required: ['conflictingEvents', 'touringArtists', 'localFestivals', 'holidaysAndCulturalEvents', 'recommendations'],
      };

      const apiKey = this.getApiKey();
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert event conflict analyst. Provide accurate, structured JSON responses based on real-time web research.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          // Try structured output if supported, otherwise rely on prompt engineering
          ...(this.supportsStructuredOutputs() ? {
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'event_conflict_research',
                strict: true,
                schema: responseSchema,
              },
            },
          } : {}),
          temperature: 0.2, // Lower temperature for more consistent results
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in Perplexity API response');
      }

      // Parse JSON response with robust error handling
      let parsed;
      try {
        // Remove markdown code blocks if present
        let cleanContent = content.trim();
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Try parsing first
        parsed = JSON.parse(cleanContent);
      } catch (parseError) {
        console.warn('⚠️ Initial JSON parse failed, attempting repair...', parseError instanceof Error ? parseError.message : 'Unknown error');
        
        // Attempt to repair malformed JSON
        try {
          const repaired = this.repairMalformedJSON(content);
          parsed = JSON.parse(repaired);
          console.log('✅ Successfully repaired and parsed JSON response');
        } catch (repairError) {
          // If repair fails, try extracting partial JSON
          console.warn('⚠️ JSON repair failed, attempting to extract partial data...');
          try {
            parsed = this.extractPartialJSON(content);
            if (parsed) {
              console.log('✅ Successfully extracted partial JSON data');
            } else {
              throw new Error('Could not extract valid JSON from response');
            }
          } catch (extractError) {
            console.error('❌ Failed to parse Perplexity response after all attempts:', {
              parseError: parseError instanceof Error ? parseError.message : 'Unknown',
              repairError: repairError instanceof Error ? repairError.message : 'Unknown',
              extractError: extractError instanceof Error ? extractError.message : 'Unknown',
            });
            console.error('Raw response (first 1000 chars):', content.substring(0, 1000));
            throw new Error('Invalid JSON response from Perplexity API - all parsing attempts failed');
          }
        }
      }

      return parsed;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Perplexity API request timed out after 30 seconds');
      }
      throw error;
    }
  }

  /**
   * Validate and parse Perplexity response
   */
  private validateAndParseResponse(data: any): PerplexityConflictResearch {
    try {
      // Validate with Zod schema
      const validated = PerplexityConflictResearchSchema.parse(data);
      
      // Normalize dates and add confidence scores
      return {
        conflictingEvents: validated.conflictingEvents.map(event => ({
          ...event,
          date: this.normalizeDate(event.date),
          confidence: this.calculateEventConfidence(event),
        })),
        touringArtists: validated.touringArtists.map(artist => ({
          ...artist,
          tourDates: artist.tourDates.map(d => this.normalizeDate(d)),
          confidence: this.calculateArtistConfidence(artist),
        })),
        localFestivals: validated.localFestivals.map(festival => ({
          ...festival,
          confidence: this.calculateFestivalConfidence(festival),
        })),
        holidaysAndCulturalEvents: validated.holidaysAndCulturalEvents.map(holiday => ({
          ...holiday,
          date: this.normalizeDate(holiday.date),
          confidence: this.calculateHolidayConfidence(holiday),
        })),
        recommendations: this.transformRecommendationsForUser(validated.recommendations),
      };
    } catch (error) {
      console.error('Failed to validate Perplexity response:', error);
      // Return safe default
      return this.getDefaultResponse();
    }
  }

  /**
   * Transform recommendations into more user-friendly format
   * Simplifies language, removes jargon, makes it more actionable
   */
  private transformRecommendationsForUser(recommendations: {
    shouldMoveDate: boolean;
    recommendedDates?: string[];
    reasoning: string[];
    riskLevel: 'low' | 'medium' | 'high';
  }): {
    shouldMoveDate: boolean;
    recommendedDates?: string[];
    reasoning: string[];
    riskLevel: 'low' | 'medium' | 'high';
  } {
    // Transform each reasoning point to be more user-friendly
    const transformedReasoning = recommendations.reasoning.map(reason => {
      let transformed = reason;

      // Replace jargon with plain language
      const replacements: [RegExp, string][] = [
        [/saturate the (local )?market/gi, 'too many events competing for the same audience'],
        [/saturate the market/gi, 'too many events competing for the same audience'],
        [/drawing away your target attendees/gi, 'will reduce your event attendance'],
        [/drawing away attendees/gi, 'will reduce your event attendance'],
        [/attract attendees/gi, 'get people to come'],
        [/secure resources/gi, 'book venues and vendors'],
        [/overlapping genre and audience/gi, 'same type of music and same fans'],
        [/overlapping audience/gi, 'same target audience'],
        [/reduce competition/gi, 'avoid competing events'],
        [/will saturate/gi, 'will have too many'],
        [/making it difficult to/gi, 'this makes it harder to'],
        [/likely drawing away/gi, 'will likely reduce'],
      ];

      replacements.forEach(([pattern, replacement]) => {
        transformed = transformed.replace(pattern, replacement);
      });

      // Ensure each point starts with a clear problem/opportunity
      if (!transformed.match(/^(Major|Rock|Festival|International|No major|Consider|Move|Avoid)/i)) {
        // Try to extract the main event/festival name and make it the focus
        const eventMatch = transformed.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:is|will|festival|event)/);
        if (eventMatch) {
          const eventName = eventMatch[1];
          transformed = transformed.replace(new RegExp(`^.*?${eventName}`, 'i'), `${eventName}`);
        }
      }

      // Ensure actionable recommendations are clear
      if (transformed.includes('moving outside') || transformed.includes('moving to')) {
        transformed = transformed.replace(/moving (outside|to)/gi, 'Move your event');
      }

      // Add "What to do" if missing but shouldMoveDate is true
      if (recommendations.shouldMoveDate && !transformed.match(/(Consider|Move|Avoid|Try|Recommend)/i)) {
        if (recommendations.recommendedDates && recommendations.recommendedDates.length > 0) {
          const dates = recommendations.recommendedDates.slice(0, 2).join(' or ');
          transformed += ` Consider moving your event to ${dates} instead.`;
        } else {
          transformed += ' Consider choosing a different date to avoid this conflict.';
        }
      }

      return transformed;
    });

    return {
      ...recommendations,
      reasoning: transformedReasoning,
    };
  }

  /**
   * Normalize date to YYYY-MM-DD format
   * Handles various date formats consistently
   */
  private normalizeDate(dateStr: string): string {
    if (!dateStr || typeof dateStr !== 'string') {
      return dateStr;
    }
    
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
      return dateStr.trim();
    }
    
    try {
      // Handle DD.MM.YYYY format (common in Czech)
      const dotFormat = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (dotFormat) {
        const [, day, month, year] = dotFormat;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Handle DD/MM/YYYY format
      const slashFormat = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (slashFormat) {
        const [, day, month, year] = slashFormat;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Try standard Date parsing
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      // Return original if all parsing fails
      return dateStr;
    } catch {
      return dateStr;
    }
  }

  /**
   * Calculate confidence score for events
   */
  private calculateEventConfidence(event: any): 'high' | 'medium' | 'low' {
    let score = 0;
    if (event.source) score += 2;
    if (event.expectedAttendance) score += 1;
    if (event.description && event.description.length > 50) score += 1;
    if (event.date && event.date.match(/^\d{4}-\d{2}-\d{2}$/)) score += 1;
    
    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  /**
   * Calculate confidence score for touring artists
   */
  private calculateArtistConfidence(artist: any): 'high' | 'medium' | 'low' {
    if (artist.tourDates && artist.tourDates.length > 0 && artist.locations && artist.locations.length > 0) {
      return 'high';
    }
    if (artist.tourDates && artist.tourDates.length > 0) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Calculate confidence score for festivals
   */
  private calculateFestivalConfidence(festival: any): 'high' | 'medium' | 'low' {
    if (festival.description && festival.description.length > 50) {
      return 'high';
    }
    if (festival.dates && festival.location) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Calculate confidence score for holidays
   */
  private calculateHolidayConfidence(holiday: any): 'high' | 'medium' | 'low' {
    if (holiday.date && holiday.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return 'high';
    }
    return 'medium';
  }

  /**
   * Calculate overall confidence for research
   */
  private calculateOverallConfidence(research: PerplexityConflictResearch): 'high' | 'medium' | 'low' {
    const allConfidences = [
      ...research.conflictingEvents.map(e => e.confidence || 'low'),
      ...research.touringArtists.map(a => a.confidence || 'low'),
      ...research.localFestivals.map(f => f.confidence || 'low'),
      ...research.holidaysAndCulturalEvents.map(h => h.confidence || 'low'),
    ];
    
    const highCount = allConfidences.filter(c => c === 'high').length;
    const mediumCount = allConfidences.filter(c => c === 'medium').length;
    
    if (highCount > mediumCount && highCount > 0) return 'high';
    if (mediumCount > 0 || highCount > 0) return 'medium';
    return 'low';
  }

  /**
   * Extract source count from response (if available)
   */
  private extractSourceCount(response: any): number {
    // Perplexity may include citations in the response
    // This is a placeholder - actual implementation depends on Perplexity's response format
    return 0;
  }

  /**
   * Get cache key for request
   */
  private getCacheKey(params: PerplexityResearchParams): string {
    const dateRangeStr = params.dateRange 
      ? `${params.dateRange.start}-${params.dateRange.end}`
      : params.date;
    return `perplexity:${params.city}:${params.category}:${params.subcategory || ''}:${dateRangeStr}:${params.expectedAttendees}`;
  }

  /**
   * Check if Perplexity API supports structured outputs
   * This may vary by API version
   */
  private supportsStructuredOutputs(): boolean {
    // Perplexity may support structured outputs in newer versions
    // For now, we'll try it and fallback to text parsing if needed
    return true;
  }

  /**
   * Get default response when validation fails
   */
  private getDefaultResponse(): PerplexityConflictResearch {
    return {
      conflictingEvents: [],
      touringArtists: [],
      localFestivals: [],
      holidaysAndCulturalEvents: [],
      recommendations: {
        shouldMoveDate: false,
        reasoning: ['Unable to complete online research. Please verify dates manually.'],
        riskLevel: 'low',
      },
    };
  }

  /**
   * Repair malformed JSON by fixing common issues:
   * - Unterminated strings
   * - Unclosed brackets/braces
   * - Truncated content
   * - Corrupted patterns (repeated characters)
   */
  private repairMalformedJSON(content: string): string {
    let repaired = content.trim();
    
    // Remove markdown code blocks if present
    if (repaired.startsWith('```json')) {
      repaired = repaired.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (repaired.startsWith('```')) {
      repaired = repaired.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Detect and fix corrupted patterns (e.g., repeated characters like /6/6/6/6/...)
    // This often indicates truncation or corruption
    const corruptedPattern = /(\/[^\/"]{1,3}\/)\1{3,}/; // Pattern like /6/6/6/6/ repeated 3+ times
    if (corruptedPattern.test(repaired)) {
      // Find the start of the corruption and truncate there
      const match = repaired.match(corruptedPattern);
      if (match && match.index !== undefined) {
        // Truncate at the start of the corruption pattern
        repaired = repaired.substring(0, match.index);
        // Try to close any open strings/structures before the truncation point
        const lastQuote = repaired.lastIndexOf('"');
        if (lastQuote >= 0) {
          // Check if we're in a string
          const beforeQuote = repaired.substring(0, lastQuote);
          const quoteCount = (beforeQuote.match(/"/g) || []).length;
          if (quoteCount % 2 === 1) {
            // We're in a string, close it
            repaired = repaired.substring(0, lastQuote + 1) + '"' + repaired.substring(lastQuote + 1);
          }
        }
      }
    }
    
    // Fix unterminated strings by finding the last unclosed quote and closing it
    let inString = false;
    let escapeNext = false;
    let lastQuotePos = -1;
    let openBraces = 0;
    let openBrackets = 0;
    
    for (let i = 0; i < repaired.length; i++) {
      const char = repaired[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        if (inString) {
          inString = false;
          lastQuotePos = i;
        } else {
          inString = true;
          lastQuotePos = i;
        }
      } else if (!inString) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
        if (char === '[') openBrackets++;
        if (char === ']') openBrackets--;
      }
    }
    
    // If we're still in a string at the end, close it intelligently
    if (inString && lastQuotePos >= 0) {
      // Check if we're in the middle of a URL or other structured content
      const stringContent = repaired.substring(lastQuotePos + 1);
      
      // Look for patterns that suggest where the string should end
      // URLs often end with certain patterns or before certain characters
      const urlEndPatterns = [
        /\/[^\/\s"]*$/,  // Ends with a path segment
        /\?[^?"]*$/,     // Ends with query string
        /#[^#"]*$/,      // Ends with hash
      ];
      
      // Try to find a reasonable end point
      let insertPos = repaired.length;
      
      // Look for structural markers that indicate end of property value
      const nextComma = stringContent.search(/[^\\],/); // Comma not escaped
      const nextBrace = stringContent.search(/[^\\]}/);  // Closing brace not escaped
      const nextBracket = stringContent.search(/[^\\]]/); // Closing bracket not escaped
      const nextColon = stringContent.search(/[^\\]:/);   // Colon (might be start of next property)
      
      // Prefer closing before structural elements
      if (nextComma >= 0) insertPos = Math.min(insertPos, lastQuotePos + 1 + nextComma);
      if (nextBrace >= 0) insertPos = Math.min(insertPos, lastQuotePos + 1 + nextBrace);
      if (nextBracket >= 0) insertPos = Math.min(insertPos, lastQuotePos + 1 + nextBracket);
      
      // If we found a reasonable position, close the string there
      if (insertPos < repaired.length) {
        repaired = repaired.substring(0, insertPos) + '"' + repaired.substring(insertPos);
      } else {
        // For truncated URLs or long strings, try to find a clean break point
        // Look for the last complete word or path segment
        const lastSlash = stringContent.lastIndexOf('/');
        const lastSpace = stringContent.lastIndexOf(' ');
        const lastDot = stringContent.lastIndexOf('.');
        
        // Prefer closing after a complete path segment or word
        if (lastSlash > stringContent.length - 20) {
          // If slash is near the end, close after it
          insertPos = lastQuotePos + 1 + lastSlash + 1;
        } else if (lastDot > stringContent.length - 10 && stringContent.substring(lastDot).match(/\.(com|org|net|cz|eu|io)/i)) {
          // If it looks like a domain, close after the TLD
          insertPos = lastQuotePos + 1 + lastDot + 4; // .com = 4 chars
        } else {
          // Otherwise, just close at the end
          insertPos = repaired.length;
        }
        
        repaired = repaired.substring(0, insertPos) + '"' + repaired.substring(insertPos);
      }
    }
    
    // Close unclosed brackets and braces
    while (openBrackets > 0) {
      repaired += ']';
      openBrackets--;
    }
    
    while (openBraces > 0) {
      repaired += '}';
      openBraces--;
    }
    
    // Remove any trailing commas before closing brackets/braces
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
    
    return repaired;
  }

  /**
   * Extract partial JSON from malformed response by finding the largest valid JSON object
   */
  private extractPartialJSON(content: string): any | null {
    let cleaned = content.trim();
    
    // Remove markdown code blocks if present
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Try to find the largest valid JSON substring
    // Start from the beginning and try progressively shorter substrings
    for (let end = cleaned.length; end > 0; end--) {
      const candidate = cleaned.substring(0, end);
      
      // Try to close any unclosed structures
      let fixed = candidate;
      let openBraces = (fixed.match(/{/g) || []).length - (fixed.match(/}/g) || []).length;
      let openBrackets = (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length;
      
      // Close unclosed structures
      while (openBrackets > 0) {
        fixed += ']';
        openBrackets--;
      }
      while (openBraces > 0) {
        fixed += '}';
        openBraces--;
      }
      
      // Remove trailing commas
      fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
      
      // Try to parse
      try {
        const parsed = JSON.parse(fixed);
        // Validate it has the expected structure
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch {
        // Continue trying shorter substrings
        continue;
      }
    }
    
    // If we can't extract a valid object, try to build a minimal valid structure
    try {
      // Look for key patterns in the content
      const hasConflictingEvents = cleaned.includes('conflictingEvents') || cleaned.includes('"conflictingEvents"');
      const hasRecommendations = cleaned.includes('recommendations') || cleaned.includes('"recommendations"');
      
      // Build minimal valid structure
      const minimal: any = {
        conflictingEvents: [],
        touringArtists: [],
        localFestivals: [],
        holidaysAndCulturalEvents: [],
        recommendations: {
          shouldMoveDate: false,
          reasoning: ['Partial data extracted from response. Some information may be incomplete.'],
          riskLevel: 'low' as const,
        },
      };
      
      // Try to extract any valid arrays or objects we can find
      const conflictingEventsMatch = cleaned.match(/"conflictingEvents"\s*:\s*\[([^\]]*)\]/);
      if (conflictingEventsMatch) {
        try {
          const eventsStr = '[' + conflictingEventsMatch[1] + ']';
          const events = JSON.parse(eventsStr);
          if (Array.isArray(events)) {
            minimal.conflictingEvents = events;
          }
        } catch {
          // Ignore if we can't parse the events array
        }
      }
      
      return minimal;
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export const perplexityResearchService = new PerplexityResearchService();

