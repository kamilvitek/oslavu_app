// AI-powered event relevance evaluation service
import { Event } from '@/types';
import { eventRelevanceCacheService, RelevanceCacheKey } from './event-relevance-cache';

export interface RelevanceResult {
  isRelevant: boolean;
  confidence: number; // 0-1
  reasoning: string[];
  evaluationMethod: 'llm' | 'rule_based_fallback';
}

export class AIEventRelevanceService {
  private readonly apiKey = process.env.OPENAI_API_KEY;
  private readonly baseUrl = 'https://api.openai.com/v1';
  private lastRequestTime = 0;
  private readonly minRequestInterval = 1000; // 1 second between requests

  constructor() {
    if (!this.apiKey) {
      console.warn('⚠️ OpenAI API key not found. LLM relevance filtering will be disabled.');
    }
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Evaluate relevance of a single competing event
   */
  async evaluateRelevance(
    plannedEvent: Event,
    competingEvent: Event
  ): Promise<RelevanceResult> {
    if (!this.apiKey) {
      return this.fallbackToRuleBased(plannedEvent, competingEvent);
    }

    // Check cache first
    const cacheKey: RelevanceCacheKey = {
      plannedCategory: plannedEvent.category,
      plannedSubcategory: plannedEvent.subcategory || null,
      competingCategory: competingEvent.category,
      competingSubcategory: competingEvent.subcategory || null
    };

    const cachedResult = await eventRelevanceCacheService.getCachedRelevance(cacheKey);
    if (cachedResult) {
      return {
        isRelevant: cachedResult.isRelevant,
        confidence: cachedResult.confidence,
        reasoning: cachedResult.reasoning,
        evaluationMethod: cachedResult.evaluationMethod as 'llm' | 'rule_based_fallback'
      };
    }

    try {
      // Enforce rate limiting
      await this.enforceRateLimit();

      const prompt = this.buildRelevancePrompt(plannedEvent, [competingEvent]);
      const response = await this.callOpenAI(prompt);
      const result = this.parseRelevanceResponse(response, competingEvent.id);

      // Cache the result
      await eventRelevanceCacheService.cacheRelevanceResult(
        cacheKey,
        result.isRelevant,
        result.confidence,
        result.reasoning,
        'llm'
      );

      return result;
    } catch (error) {
      console.error(`❌ LLM relevance evaluation failed for event "${competingEvent.title}":`, error);
      const fallbackResult = this.fallbackToRuleBased(plannedEvent, competingEvent);
      
      // Cache fallback result
      await eventRelevanceCacheService.cacheRelevanceResult(
        cacheKey,
        fallbackResult.isRelevant,
        fallbackResult.confidence,
        fallbackResult.reasoning,
        'rule_based_fallback'
      );

      return fallbackResult;
    }
  }

  /**
   * Evaluate relevance of multiple competing events in batch
   */
  async evaluateBatchRelevance(
    plannedEvent: Event,
    competingEvents: Event[]
  ): Promise<Map<string, RelevanceResult>> {
    if (!this.apiKey || competingEvents.length === 0) {
      const results = new Map<string, RelevanceResult>();
      for (const event of competingEvents) {
        results.set(event.id, this.fallbackToRuleBased(plannedEvent, event));
      }
      return results;
    }

    const results = new Map<string, RelevanceResult>();
    const uncachedEvents: Event[] = [];
    const cacheKeys = new Map<string, RelevanceCacheKey>();

    // Check cache for all events first
    for (const event of competingEvents) {
      const cacheKey: RelevanceCacheKey = {
        plannedCategory: plannedEvent.category,
        plannedSubcategory: plannedEvent.subcategory || null,
        competingCategory: event.category,
        competingSubcategory: event.subcategory || null
      };

      cacheKeys.set(event.id, cacheKey);
      const cachedResult = await eventRelevanceCacheService.getCachedRelevance(cacheKey);
      
      if (cachedResult) {
        results.set(event.id, {
          isRelevant: cachedResult.isRelevant,
          confidence: cachedResult.confidence,
          reasoning: cachedResult.reasoning,
          evaluationMethod: cachedResult.evaluationMethod as 'llm' | 'rule_based_fallback'
        });
      } else {
        uncachedEvents.push(event);
      }
    }

    // If all events are cached, return immediately
    if (uncachedEvents.length === 0) {
      return results;
    }

    // Process uncached events in batches
    const BATCH_SIZE = 15;
    for (let i = 0; i < uncachedEvents.length; i += BATCH_SIZE) {
      const batch = uncachedEvents.slice(i, i + BATCH_SIZE);
      
      try {
        // Enforce rate limiting
        await this.enforceRateLimit();

        const prompt = this.buildRelevancePrompt(plannedEvent, batch);
        // Use longer timeout for batch operations (45 seconds instead of 15)
        const response = await this.callOpenAI(prompt, 'gpt-4o-mini', 45000);
        const batchResults = this.parseBatchRelevanceResponse(response, batch);

        // Cache results and add to results map
        const cacheEntries: Array<{
          key: RelevanceCacheKey;
          isRelevant: boolean;
          confidence: number;
          reasoning: string[];
          evaluationMethod: string;
        }> = [];

        for (const [eventId, result] of batchResults) {
          results.set(eventId, result);
          const cacheKey = cacheKeys.get(eventId);
          if (cacheKey) {
            cacheEntries.push({
              key: cacheKey,
              isRelevant: result.isRelevant,
              confidence: result.confidence,
              reasoning: result.reasoning,
              evaluationMethod: result.evaluationMethod
            });
          }
        }

        // Batch cache results
        if (cacheEntries.length > 0) {
          await eventRelevanceCacheService.batchCacheRelevanceResults(cacheEntries);
        }
      } catch (error) {
        console.error(`❌ Batch LLM relevance evaluation failed for batch:`, error);
        // Fallback to rule-based for failed batch
        for (const event of batch) {
          const fallbackResult = this.fallbackToRuleBased(plannedEvent, event);
          results.set(event.id, fallbackResult);
          
          // Cache fallback result
          const cacheKey = cacheKeys.get(event.id);
          if (cacheKey) {
            await eventRelevanceCacheService.cacheRelevanceResult(
              cacheKey,
              fallbackResult.isRelevant,
              fallbackResult.confidence,
              fallbackResult.reasoning,
              'rule_based_fallback'
            );
          }
        }
      }
    }

    return results;
  }

  /**
   * Build relevance evaluation prompt
   * Simplified and focused on semantic meaning for better accuracy
   */
  private buildRelevancePrompt(plannedEvent: Event, competingEvents: Event[]): string {
    const eventsList = competingEvents.map((event, index) => `
Event ${index + 1}:
- ID: ${event.id}
- Title: "${event.title}"
- Category: ${event.category}
- Subcategory: ${event.subcategory || 'None'}
- Description: ${event.description || 'No description'}
- Venue: ${event.venue || 'Not specified'}
- Expected Attendees: ${event.expectedAttendees || 'Not specified'}
- Date: ${event.date}${event.endDate ? ` to ${event.endDate}` : ''}
`).join('\n');

    return `Evaluate if competing events would compete for the same audience as the planned event.

Planned Event:
- Title/Type: ${plannedEvent.title || `${plannedEvent.category}${plannedEvent.subcategory ? ` (${plannedEvent.subcategory})` : ''}`}
- Category: ${plannedEvent.category}
- Subcategory: ${plannedEvent.subcategory || 'None'}
- Expected Attendees: ${plannedEvent.expectedAttendees || 'Not specified'}
- Date: ${plannedEvent.date}${plannedEvent.endDate ? ` to ${plannedEvent.endDate}` : ''}

Competing Events:
${eventsList}

CRITICAL: Analyze the EVENT TYPE from the title and description, not just category/subcategory.

✅ RELEVANT (mark isRelevant: true):
- Same event type (e.g., both are concerts, both are conferences, both are festivals)
- Would attract the same audience (e.g., Pop concert vs Rock concert, Marketing conference vs Startup conference)
- Similar format and purpose

❌ NOT RELEVANT (mark isRelevant: false):
- Different event types even if same category (e.g., Pop concert vs Forest trail, Conference vs Exhibition)
- Different audiences (e.g., Family outdoor activity vs Adult music event, Business event vs Cultural festival)
- Completely different purposes (e.g., Educational workshop vs Entertainment show)

Examples:
- Pop Concert vs Rock Concert → RELEVANT (both music concerts, similar audience)
- Pop Concert vs Forest Trail → NOT RELEVANT (completely different event types)
- Tech Conference vs Startup Meetup → RELEVANT (both tech events, similar audience)
- Tech Conference vs Art Exhibition → NOT RELEVANT (different purposes, different audiences)

When subcategory is "None", rely heavily on title/description to understand the actual event type.

Return JSON array:
[
  {"eventId": "id1", "isRelevant": boolean, "confidence": 0-1, "reasoning": ["brief reason"]},
  {"eventId": "id2", "isRelevant": boolean, "confidence": 0-1, "reasoning": ["brief reason"]}
]`;
  }

  /**
   * Call OpenAI API
   * @param prompt - The prompt to send to OpenAI
   * @param model - The model to use (default: gpt-4o-mini)
   * @param timeoutMs - Timeout in milliseconds (default: 15000 for single, 45000 for batch)
   */
  private async callOpenAI(prompt: string, model: string = 'gpt-4o-mini', timeoutMs: number = 15000): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
              content: 'You are an expert event analyst specializing in relevance evaluation. Analyze events efficiently and return accurate JSON results.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.2, // Lower temperature for more consistent results
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`OpenAI API request timed out after ${timeoutMs / 1000} seconds`);
      }
      throw error;
    }
  }

  /**
   * Parse relevance response for single event
   */
  private parseRelevanceResponse(response: string, eventId: string): RelevanceResult {
    try {
      // Clean response (remove markdown code blocks if present)
      const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Try to parse as array first (batch format)
      let parsed: any;
      try {
        parsed = JSON.parse(cleanedResponse);
      } catch {
        throw new Error('Invalid JSON response');
      }

      // If array, find the matching event
      if (Array.isArray(parsed)) {
        const eventResult = parsed.find((r: any) => r.eventId === eventId);
        if (eventResult) {
          return {
            isRelevant: Boolean(eventResult.isRelevant),
            confidence: Math.max(0, Math.min(1, Number(eventResult.confidence) || 0.5)),
            reasoning: Array.isArray(eventResult.reasoning) ? eventResult.reasoning : [String(eventResult.reasoning || 'No reasoning provided')],
            evaluationMethod: 'llm'
          };
        }
      }

      // If single object, use it directly
      if (parsed.eventId === eventId || !parsed.eventId) {
        return {
          isRelevant: Boolean(parsed.isRelevant),
          confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
          reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : [String(parsed.reasoning || 'No reasoning provided')],
          evaluationMethod: 'llm'
        };
      }

      throw new Error('Event ID not found in response');
    } catch (error) {
      console.error('Error parsing relevance response:', error);
      throw new Error(`Failed to parse relevance response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse batch relevance response
   */
  private parseBatchRelevanceResponse(
    response: string,
    events: Event[]
  ): Map<string, RelevanceResult> {
    const results = new Map<string, RelevanceResult>();

    try {
      // Clean response (remove markdown code blocks if present)
      const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanedResponse);

      if (!Array.isArray(parsed)) {
        throw new Error('Expected array response');
      }

      const eventIdMap = new Map(events.map(e => [e.id, e]));

      for (const item of parsed) {
        if (!item.eventId || !eventIdMap.has(item.eventId)) {
          continue;
        }

        results.set(item.eventId, {
          isRelevant: Boolean(item.isRelevant),
          confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0.5)),
          reasoning: Array.isArray(item.reasoning) ? item.reasoning : [String(item.reasoning || 'No reasoning provided')],
          evaluationMethod: 'llm'
        });
      }

      // If some events are missing from response, use fallback
      for (const event of events) {
        if (!results.has(event.id)) {
          console.warn(`⚠️ Event ${event.id} missing from LLM response, using fallback`);
          // Will be handled by caller
        }
      }
    } catch (error) {
      console.error('Error parsing batch relevance response:', error);
      throw new Error(`Failed to parse batch relevance response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return results;
  }

  /**
   * Fallback to rule-based relevance evaluation
   */
  private fallbackToRuleBased(plannedEvent: Event, competingEvent: Event): RelevanceResult {
    // Simple rule-based logic: same category/subcategory = relevant
    const sameCategory = plannedEvent.category === competingEvent.category;
    const sameSubcategory = (plannedEvent.subcategory || '') === (competingEvent.subcategory || '');
    
    const isRelevant = sameCategory && (sameSubcategory || !plannedEvent.subcategory || !competingEvent.subcategory);
    
    return {
      isRelevant,
      confidence: isRelevant ? 0.7 : 0.3,
      reasoning: [
        isRelevant 
          ? `Rule-based: Same category (${plannedEvent.category})${sameSubcategory ? ` and subcategory (${plannedEvent.subcategory})` : ''}`
          : `Rule-based: Different category/subcategory combination`
      ],
      evaluationMethod: 'rule_based_fallback'
    };
  }

  /**
   * Enforce rate limiting (1 second between requests)
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }
}

export const aiEventRelevanceService = new AIEventRelevanceService();

