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
          // IMPORTANT: Apply temporal proximity adjustments to cached results
          // Cache doesn't include date proximity, so we need to adjust even cached results
          const baseOverlap = cachedResult.overlapScore;
          const adjustedOverlap = this.applyTemporalProximityAdjustment(
            plannedEvent,
            event,
            baseOverlap
          );
          
          // Enhance reasoning with temporal proximity if relevant
          const enhancedReasoning = this.enhanceReasoningWithTemporalProximity(
            cachedResult.reasoning,
            plannedEvent,
            event
          );
          
          cachedResults.set(event.id, {
            overlapScore: Math.min(0.95, adjustedOverlap), // Cap at 95%
            confidence: cachedResult.confidence,
            factors: {
              demographicSimilarity: cachedResult.overlapScore * 0.3,
              interestAlignment: cachedResult.overlapScore * 0.4,
              behaviorPatterns: cachedResult.overlapScore * 0.2,
              historicalPreference: cachedResult.overlapScore * 0.1
            },
            reasoning: enhancedReasoning
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
    // Calculate date proximity for each event
    const plannedEventDate = new Date(plannedEvent.date);
    const plannedEventEndDate = plannedEvent.endDate ? new Date(plannedEvent.endDate) : plannedEventDate;
    
    const eventDetailsWithProximity = competingEvents.map((event) => {
      const eventDate = new Date(event.date);
      const eventEndDate = event.endDate ? new Date(event.endDate) : eventDate;
      
      // Calculate minimum days between events
      const daysBefore = Math.max(0, Math.floor((plannedEventDate.getTime() - eventEndDate.getTime()) / (1000 * 60 * 60 * 24)));
      const daysAfter = Math.max(0, Math.floor((eventDate.getTime() - plannedEventEndDate.getTime()) / (1000 * 60 * 60 * 24)));
      const daysBetween = Math.min(daysBefore, daysAfter);
      
      // Determine proximity level
      let proximityLevel = 'distant';
      if (daysBetween === 0) {
        proximityLevel = 'same_day';
      } else if (daysBetween <= 3) {
        proximityLevel = 'immediate';
      } else if (daysBetween <= 7) {
        proximityLevel = 'week';
      } else if (daysBetween <= 30) {
        proximityLevel = 'month';
      } else if (daysBetween <= 90) {
        proximityLevel = 'quarter';
      }
      
      return {
        event,
        daysBetween,
        proximityLevel
      };
    });

    const prompt = `
    Analyze audience overlap between a planned event and ${competingEvents.length} competing events. 
    Consider subcategory relationships, temporal proximity, and event significance. Return a JSON object with overlap predictions.

    PLANNED EVENT:
    Title: "${plannedEvent.title}"
    Category: ${plannedEvent.category}
    Subcategory: ${plannedEvent.subcategory || 'None'}
    Description: ${plannedEvent.description || 'No description'}
    Venue: ${plannedEvent.venue || 'Not specified'}
    Expected Attendees: ${plannedEvent.expectedAttendees || 'Not specified'}
    Date: ${plannedEvent.date}${plannedEvent.endDate ? ` to ${plannedEvent.endDate}` : ''}

    COMPETING EVENTS:
    ${eventDetailsWithProximity.map(({ event, daysBetween, proximityLevel }, index) => `
    Event ${index + 1}:
    - ID: ${event.id}
    - Title: "${event.title}"
    - Category: ${event.category}
    - Subcategory: ${event.subcategory || 'None'}
    - Description: ${event.description || 'No description'}
    - Venue: ${event.venue || 'Not specified'}
    - Expected Attendees: ${event.expectedAttendees || 'Not specified'}
    - Date: ${event.date}${event.endDate ? ` to ${event.endDate}` : ''}
    - Days from planned event: ${daysBetween} days (${proximityLevel})
    `).join('\n')}

    TEMPORAL PROXIMITY IMPACT (CRITICAL - adjust overlap based on date proximity):
    - Same day (0 days): +15-20% overlap boost (people can't attend both)
    - Immediate (1-3 days): +10-15% overlap boost (very high competition)
    - Within week (4-7 days): +5-10% overlap boost (high competition)
    - Within month (8-30 days): +2-5% overlap boost (moderate competition)
    - Within quarter (31-90 days): +0-2% overlap boost (some competition)
    - Distant (90+ days): No boost (minimal temporal competition)

    EVENT SIGNIFICANCE IMPACT (adjust overlap based on event size/prominence):
    - Major events (10,000+ attendees): +10-15% overlap boost (draws large, overlapping audiences)
    - Large events (1,000-10,000 attendees): +5-10% overlap boost
    - Medium events (100-1,000 attendees): +0-5% overlap boost
    - Small events (<100 attendees): No boost

    SUBCATEGORY RELATIONSHIPS (base overlap scoring):
    - Same subcategory: 80-95% base overlap
    - Related subcategories (e.g., Rock/Metal, AI/ML): 60-75% base overlap  
    - Different subcategories in same category: 20-40% base overlap
    - Different categories: 5-15% base overlap

    OVERLAP CALCULATION FORMULA:
    Final overlap = Base subcategory overlap + Temporal proximity boost + Event significance boost
    - Cap final overlap at 95% maximum (always some unique attendees)
    - For same subcategory + same day + major event: expect 90-95% overlap
    - For same subcategory + immediate (1-3 days) + major event: expect 85-90% overlap
    - For same subcategory + week proximity + major event: expect 80-85% overlap

    Return a JSON object with this structure:
    {
      "results": {
        "${competingEvents[0]?.id}": {
          "overlapScore": 0.85,
          "confidence": 0.90,
          "factors": {
            "demographicSimilarity": 0.8,
            "interestAlignment": 0.7,
            "behaviorPatterns": 0.6,
            "historicalPreference": 0.5
          },
          "reasoning": [
            "Both events target Rock music fans in the same region",
            "Events occur within 1-3 days, creating high temporal competition",
            "Major festival (20k+ attendees) draws overlapping audience pool"
          ]
        }
        // ... repeat for each competing event
      }
    }

    IMPORTANT: 
    - Return ONLY valid JSON
    - Include ALL competing event IDs in results
    - Apply temporal proximity and event significance boosts to base overlap
    - Cap overlap at 95% maximum
    - Provide specific, actionable reasoning that mentions temporal proximity and event significance
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

      // Process each result and apply temporal proximity adjustments
      for (const [eventId, prediction] of Object.entries(parsedResponse.results || {})) {
        const event = competingEvents.find(e => e.id === eventId);
        if (event && prediction) {
          let overlapPrediction = prediction as AudienceOverlapPrediction;
          
          // Apply temporal proximity and event significance adjustments
          const adjustedOverlap = this.applyTemporalProximityAdjustment(
            plannedEvent,
            event,
            overlapPrediction.overlapScore
          );
          
          // Update overlap score with adjusted value (capped at 0.95)
          overlapPrediction = {
            ...overlapPrediction,
            overlapScore: Math.min(0.95, adjustedOverlap),
            // Add temporal proximity to reasoning if not already present
            reasoning: this.enhanceReasoningWithTemporalProximity(
              overlapPrediction.reasoning,
              plannedEvent,
              event
            )
          };
          
          results.set(eventId, overlapPrediction);

          // Cache the result (note: cache key doesn't include dates, so this will be approximate)
          // TODO: Consider adding date proximity to cache key in future update
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
   * Apply temporal proximity and event significance adjustments to overlap score
   */
  private applyTemporalProximityAdjustment(
    plannedEvent: Event,
    competingEvent: Event,
    baseOverlap: number
  ): number {
    // Calculate days between events
    const plannedEventDate = new Date(plannedEvent.date);
    const plannedEventEndDate = plannedEvent.endDate ? new Date(plannedEvent.endDate) : plannedEventDate;
    const eventDate = new Date(competingEvent.date);
    const eventEndDate = competingEvent.endDate ? new Date(competingEvent.endDate) : eventDate;
    
    const daysBefore = Math.max(0, Math.floor((plannedEventDate.getTime() - eventEndDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysAfter = Math.max(0, Math.floor((eventDate.getTime() - plannedEventEndDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysBetween = Math.min(daysBefore, daysAfter);
    
    // Calculate temporal proximity boost
    let temporalBoost = 0;
    if (daysBetween === 0) {
      temporalBoost = 0.18; // Same day: +18%
    } else if (daysBetween <= 3) {
      temporalBoost = 0.13; // Immediate (1-3 days): +13%
    } else if (daysBetween <= 7) {
      temporalBoost = 0.08; // Within week (4-7 days): +8%
    } else if (daysBetween <= 30) {
      temporalBoost = 0.04; // Within month (8-30 days): +4%
    } else if (daysBetween <= 90) {
      temporalBoost = 0.01; // Within quarter (31-90 days): +1%
    }
    // 90+ days: no boost
    
    // Calculate event significance boost
    const competingAttendees = competingEvent.expectedAttendees || 0;
    let significanceBoost = 0;
    if (competingAttendees >= 10000) {
      significanceBoost = 0.13; // Major events: +13%
    } else if (competingAttendees >= 1000) {
      significanceBoost = 0.08; // Large events: +8%
    } else if (competingAttendees >= 100) {
      significanceBoost = 0.03; // Medium events: +3%
    }
    // Small events: no boost
    
    // Apply boosts to base overlap
    const adjustedOverlap = baseOverlap + temporalBoost + significanceBoost;
    
    // Log adjustment for debugging
    if (temporalBoost > 0 || significanceBoost > 0) {
      console.log(`  📅 Temporal adjustment: ${daysBetween} days apart (+${(temporalBoost * 100).toFixed(1)}%)`);
      if (significanceBoost > 0) {
        console.log(`  🎯 Significance adjustment: ${competingAttendees} attendees (+${(significanceBoost * 100).toFixed(1)}%)`);
      }
      console.log(`  📊 Overlap: ${(baseOverlap * 100).toFixed(1)}% → ${(adjustedOverlap * 100).toFixed(1)}%`);
    }
    
    return adjustedOverlap;
  }

  /**
   * Enhance reasoning with temporal proximity information if not already present
   */
  private enhanceReasoningWithTemporalProximity(
    existingReasoning: string[],
    plannedEvent: Event,
    competingEvent: Event
  ): string[] {
    const plannedEventDate = new Date(plannedEvent.date);
    const plannedEventEndDate = plannedEvent.endDate ? new Date(plannedEvent.endDate) : plannedEventDate;
    const eventDate = new Date(competingEvent.date);
    const eventEndDate = competingEvent.endDate ? new Date(competingEvent.endDate) : eventDate;
    
    const daysBefore = Math.max(0, Math.floor((plannedEventDate.getTime() - eventEndDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysAfter = Math.max(0, Math.floor((eventDate.getTime() - plannedEventEndDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysBetween = Math.min(daysBefore, daysAfter);
    
    // Check if reasoning already mentions temporal proximity
    const hasTemporalMention = existingReasoning.some(reason => 
      reason.toLowerCase().includes('day') || 
      reason.toLowerCase().includes('week') || 
      reason.toLowerCase().includes('temporal') ||
      reason.toLowerCase().includes('proximity') ||
      reason.toLowerCase().includes('close')
    );
    
    if (!hasTemporalMention && daysBetween <= 7) {
      let temporalNote = '';
      if (daysBetween === 0) {
        temporalNote = 'Events occur on the same day, creating maximum competition for the same audience.';
      } else if (daysBetween <= 3) {
        temporalNote = `Events occur within ${daysBetween} day(s), creating very high competition for the same audience.`;
      } else {
        temporalNote = `Events occur within ${daysBetween} days, creating high competition for the same audience.`;
      }
      
      // Add temporal note to reasoning, but limit to 3 reasons
      const enhancedReasoning = [...existingReasoning];
      if (enhancedReasoning.length < 3) {
        enhancedReasoning.push(temporalNote);
      } else {
        // Replace last reason if we have 3 already
        enhancedReasoning[2] = temporalNote;
      }
      return enhancedReasoning;
    }
    
    return existingReasoning;
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
