// src/lib/services/perplexity-research.ts
import { PerplexityConflictResearch, PerplexityResearchParams } from '@/types/perplexity';
import { formatNearbyCities } from '@/lib/utils/city-proximity';
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
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
    
    // Debug logging
    console.log('🔍 Perplexity API Key Check:', {
      hasKey: !!apiKey,
      keyLength: apiKey.length,
      keyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : 'none',
      envVar: process.env.PERPLEXITY_API_KEY ? 'SET' : 'NOT SET',
    });
    
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

      // Generate prompt based on category
      const prompt = this.generatePrompt(params);
      
      // Call Perplexity API
      const result = await this.callPerplexityAPI(prompt);
      
      // Validate and parse response
      const validatedResult = this.validateAndParseResponse(result);
      
      // Add metadata
      validatedResult.researchMetadata = {
        query: prompt,
        timestamp: new Date().toISOString(),
        sourcesUsed: this.extractSourceCount(result),
        confidence: this.calculateOverallConfidence(validatedResult),
      };
      
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
   * Generate dynamic prompt based on category and subcategory
   */
  private generatePrompt(params: PerplexityResearchParams): string {
    const { city, category, subcategory, date, expectedAttendees, dateRange } = params;
    const nearbyCities = formatNearbyCities(city);
    const dateRangeStr = dateRange 
      ? `${dateRange.start} to ${dateRange.end}`
      : date;
    
    // Category-specific event types
    const categoryEventTypes = this.getCategoryEventTypes(category, subcategory);
    
    const prompt = `You are an event conflict analyst. A user is organizing a ${category} event${subcategory ? ` (${subcategory})` : ''} in ${city} on ${date}. They expect ${expectedAttendees} attendees.

Search for:
1. Other ${categoryEventTypes} in ${nearbyCities} during ${dateRangeStr}
2. Major ${category} artists/events touring Czech Republic that week
3. Local festivals or cultural events targeting similar audiences
4. Holidays or special events in Czech Republic during that period

Provide structured JSON with:
- conflictingEvents: Array of competing events with name, date (YYYY-MM-DD format), location, type (concert/festival/cultural_event/other), expectedAttendance (if known), description, source URL if available
- touringArtists: Array of major artists touring with artistName, tourDates (array of YYYY-MM-DD), locations (array), genre
- localFestivals: Array of local festivals with name, dates (date range string), location, type, description
- holidaysAndCulturalEvents: Array with name, date (YYYY-MM-DD), type (holiday/cultural_event), impact (low/medium/high), description
- recommendations: Object with shouldMoveDate (boolean), recommendedDates (array of YYYY-MM-DD if shouldMoveDate is true), reasoning (array of strings), riskLevel (low/medium/high)

IMPORTANT: 
- Use YYYY-MM-DD format for all dates
- Be specific about dates and locations
- Include source URLs when available
- Provide actionable recommendations based on findings
- If no conflicts found, return empty arrays but still provide recommendations

Return ONLY valid JSON, no markdown code blocks or additional text.`;

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

      // Parse JSON response
      let parsed;
      try {
        // Remove markdown code blocks if present
        let cleanContent = content.trim();
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        parsed = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error('Failed to parse Perplexity response:', parseError);
        console.error('Raw response:', content);
        throw new Error('Invalid JSON response from Perplexity API');
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
        recommendations: validated.recommendations,
      };
    } catch (error) {
      console.error('Failed to validate Perplexity response:', error);
      // Return safe default
      return this.getDefaultResponse();
    }
  }

  /**
   * Normalize date to YYYY-MM-DD format
   */
  private normalizeDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr; // Return original if invalid
      }
      return date.toISOString().split('T')[0];
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
}

// Export singleton instance
export const perplexityResearchService = new PerplexityResearchService();

