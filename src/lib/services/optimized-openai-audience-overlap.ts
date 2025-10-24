// src/lib/services/optimized-openai-audience-overlap.ts
import { Event } from '@/types';
import { AudienceOverlapPrediction } from '@/types/audience';
import { audienceOverlapCacheService, OverlapCacheKey } from './audience-overlap-cache';

export class OptimizedOpenAIAudienceOverlapService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OpenAI API key not found. Falling back to rule-based analysis.');
    }
  }

  /**
   * OPTIMIZED: Single API call for multiple event overlap analysis
   */
  async predictBatchAudienceOverlap(
    plannedEvent: Event, 
    competingEvents: Event[]
  ): Promise<Map<string, AudienceOverlapPrediction>> {
    if (!this.apiKey || competingEvents.length === 0) {
      // Fallback to individual rule-based analysis
      const { audienceOverlapService } = await import('./audience-overlap');
      const results = new Map<string, AudienceOverlapPrediction>();
      
      for (const event of competingEvents) {
        const prediction = await audienceOverlapService.predictAudienceOverlap(plannedEvent, event);
        results.set(event.id, prediction);
      }
      return results;
    }

    try {
      console.log(`🚀 Starting optimized batch analysis for ${competingEvents.length} events`);

      // Check cache for all events first
      const cachedResults = new Map<string, AudienceOverlapPrediction>();
      const uncachedEvents: Event[] = [];
      let cacheHits = 0;

      for (const event of competingEvents) {
        const cacheKey: OverlapCacheKey = {
          category1: plannedEvent.category,
          subcategory1: plannedEvent.subcategory || null,
          category2: event.category,
          subcategory2: event.subcategory || null
        };

        const cachedResult = await audienceOverlapCacheService.getCachedOverlap(cacheKey);
        if (cachedResult) {
          cachedResults.set(event.id, {
            overlapScore: cachedResult.overlapScore,
            confidence: cachedResult.confidence,
            factors: {
              demographicSimilarity: cachedResult.overlapScore * 0.3,
              interestAlignment: cachedResult.overlapScore * 0.4,
              behaviorPatterns: cachedResult.overlapScore * 0.2,
              historicalPreference: cachedResult.overlapScore * 0.1
            },
            reasoning: cachedResult.reasoning
          });
          cacheHits++;
        } else {
          uncachedEvents.push(event);
        }
      }

      console.log(`📊 Cache hits: ${cacheHits}/${competingEvents.length} events`);

      // If all events are cached, return immediately
      if (uncachedEvents.length === 0) {
        console.log(`✅ All events served from cache`);
        return cachedResults;
      }

      // Process uncached events with single optimized API call
      const uncachedResults = await this.analyzeBatchWithSingleAPICall(plannedEvent, uncachedEvents);

      // Combine cached and uncached results
      const allResults = new Map([...cachedResults, ...uncachedResults]);

      console.log(`✅ Batch analysis completed: ${allResults.size} total results`);
      return allResults;

    } catch (error) {
      console.error('Optimized batch analysis failed, falling back to individual analysis:', error);
      // Fallback to individual rule-based analysis
      const { audienceOverlapService } = await import('./audience-overlap');
      const results = new Map<string, AudienceOverlapPrediction>();
      
      for (const event of competingEvents) {
        try {
          const prediction = await audienceOverlapService.predictAudienceOverlap(plannedEvent, event);
          results.set(event.id, prediction);
        } catch (fallbackError) {
          console.error(`Fallback analysis failed for event ${event.id}:`, fallbackError);
          results.set(event.id, this.getDefaultPrediction());
        }
      }
      return results;
    }
  }

  /**
   * OPTIMIZED: Single API call to analyze multiple events at once
   */
  private async analyzeBatchWithSingleAPICall(
    plannedEvent: Event, 
    competingEvents: Event[]
  ): Promise<Map<string, AudienceOverlapPrediction>> {
    const prompt = `
    Analyze audience overlap between a planned event and ${competingEvents.length} competing events. 
    Consider subcategory relationships and return a JSON object with overlap predictions.

    PLANNED EVENT:
    Title: "${plannedEvent.title}"
    Category: ${plannedEvent.category}
    Subcategory: ${plannedEvent.subcategory || 'None'}
    Description: ${plannedEvent.description || 'No description'}
    Venue: ${plannedEvent.venue || 'Not specified'}
    Expected Attendees: ${plannedEvent.expectedAttendees || 'Not specified'}

    COMPETING EVENTS:
    ${competingEvents.map((event, index) => `
    Event ${index + 1}:
    - ID: ${event.id}
    - Title: "${event.title}"
    - Category: ${event.category}
    - Subcategory: ${event.subcategory || 'None'}
    - Description: ${event.description || 'No description'}
    - Venue: ${event.venue || 'Not specified'}
    - Expected Attendees: ${event.expectedAttendees || 'Not specified'}
    `).join('\n')}

    SUBCATEGORY RELATIONSHIPS (use these for overlap scoring):
    - Same subcategory: 80-95% overlap
    - Related subcategories (e.g., Rock/Metal, AI/ML): 60-75% overlap  
    - Different subcategories in same category: 20-40% overlap
    - Different categories: 5-15% overlap

    Return a JSON object with this structure:
    {
      "results": {
        "${competingEvents[0]?.id}": {
          "overlapScore": 0.75,
          "confidence": 0.85,
          "factors": {
            "demographicSimilarity": 0.8,
            "interestAlignment": 0.7,
            "behaviorPatterns": 0.6,
            "historicalPreference": 0.5
          },
          "reasoning": [
            "Both events target technology professionals",
            "Similar age demographics and interests",
            "Overlapping professional networks"
          ]
        }
        // ... repeat for each competing event
      }
    }

    IMPORTANT: 
    - Return ONLY valid JSON
    - Include ALL competing event IDs in results
    - Use subcategory relationships for accurate scoring
    - Provide specific, actionable reasoning
    `;

    const response = await this.callOpenAI(prompt, 'gpt-4o-mini');
    
    try {
      // Clean and parse response
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsedResponse = JSON.parse(cleanResponse);
      const results = new Map<string, AudienceOverlapPrediction>();

      // Process each result and cache it
      for (const [eventId, prediction] of Object.entries(parsedResponse.results || {})) {
        const event = competingEvents.find(e => e.id === eventId);
        if (event && prediction) {
          const overlapPrediction = prediction as AudienceOverlapPrediction;
          results.set(eventId, overlapPrediction);

          // Cache the result
          const cacheKey: OverlapCacheKey = {
            category1: plannedEvent.category,
            subcategory1: plannedEvent.subcategory || null,
            category2: event.category,
            subcategory2: event.subcategory || null
          };

          await audienceOverlapCacheService.cacheOverlapResult(
            cacheKey,
            overlapPrediction.overlapScore,
            overlapPrediction.confidence,
            overlapPrediction.reasoning,
            'ai_powered'
          );
        }
      }

      return results;

    } catch (error) {
      console.error('Failed to parse batch analysis response:', error);
      // Return default predictions for all events
      const results = new Map<string, AudienceOverlapPrediction>();
      for (const event of competingEvents) {
        results.set(event.id, this.getDefaultPrediction());
      }
      return results;
    }
  }

  /**
   * Call OpenAI API with optimized settings
   */
  private async callOpenAI(prompt: string, model: string = 'gpt-4o-mini'): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for batch processing

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert event analyst specializing in audience overlap prediction. Analyze multiple events efficiently and return accurate JSON results.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000, // Increased for batch processing
          temperature: 0.2, // Lower temperature for more consistent batch results
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('OpenAI API request timed out after 15 seconds');
      }
      throw error;
    }
  }

  /**
   * Get default prediction for failed analyses
   */
  private getDefaultPrediction(): AudienceOverlapPrediction {
    return {
      overlapScore: 0.1,
      confidence: 0.1,
      factors: {
        demographicSimilarity: 0.1,
        interestAlignment: 0.1,
        behaviorPatterns: 0.1,
        historicalPreference: 0.1
      },
      reasoning: ['Analysis failed - using default low overlap']
    };
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get cost estimate for batch processing
   */
  getBatchCostEstimate(numEvents: number): number {
    // Batch processing is much more cost-effective
    // Single API call handles multiple events
    const baseTokens = 2000; // Base prompt tokens
    const tokensPerEvent = 100; // Additional tokens per event
    const totalTokens = baseTokens + (numEvents * tokensPerEvent);
    const costPer1KTokens = 0.002; // gpt-4o-mini pricing
    return (totalTokens / 1000) * costPer1KTokens;
  }
}

export const optimizedOpenAIAudienceOverlapService = new OptimizedOpenAIAudienceOverlapService();
