// src/lib/services/openai-audience-overlap.ts
import { Event } from '@/types';
import { AudienceOverlapPrediction } from '@/types/audience';
import { audienceOverlapCacheService, OverlapCacheKey } from './audience-overlap-cache';

export class OpenAIAudienceOverlapService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OpenAI API key not found. Falling back to rule-based analysis.');
    }
  }

  /**
   * AI-powered audience overlap prediction with subcategory awareness and caching
   */
  async predictAudienceOverlap(event1: Event, event2: Event): Promise<AudienceOverlapPrediction> {
    if (!this.apiKey) {
      // Fallback to rule-based system
      const { audienceOverlapService } = await import('./audience-overlap');
      return audienceOverlapService.predictAudienceOverlap(event1, event2);
    }

    try {
      // Check cache first
      const cacheKey: OverlapCacheKey = {
        category1: event1.category,
        subcategory1: event1.subcategory || null,
        category2: event2.category,
        subcategory2: event2.subcategory || null
      };

      const cachedResult = await audienceOverlapCacheService.getCachedOverlap(cacheKey);
      if (cachedResult) {
        // IMPORTANT: Apply temporal proximity adjustments to cached results
        // Cache doesn't include date proximity, so we need to adjust even cached results
        const baseOverlap = cachedResult.overlapScore;
        const adjustedOverlap = this.applyTemporalProximityAdjustment(
          event1,
          event2,
          baseOverlap
        );
        
        // Enhance reasoning with temporal proximity if relevant
        const enhancedReasoning = this.enhanceReasoningWithTemporalProximity(
          cachedResult.reasoning,
          event1,
          event2
        );
        
        return {
          overlapScore: Math.min(0.95, adjustedOverlap), // Cap at 95%
          confidence: cachedResult.confidence,
          factors: {
            demographicSimilarity: cachedResult.overlapScore * 0.3,
            interestAlignment: cachedResult.overlapScore * 0.4,
            behaviorPatterns: cachedResult.overlapScore * 0.2,
            historicalPreference: cachedResult.overlapScore * 0.1
          },
          reasoning: enhancedReasoning
        };
      }

      // Step 1: Analyze events with OpenAI (enhanced with subcategory context)
      const eventAnalysis = await this.analyzeEventsWithAI(event1, event2);
      
      // Step 2: Predict audience overlap with subcategory awareness
      let overlapPrediction = await this.predictOverlapWithAI(event1, event2, eventAnalysis);
      
      // Step 3: Apply temporal proximity and event significance adjustments
      const adjustedOverlap = this.applyTemporalProximityAdjustment(
        event1,
        event2,
        overlapPrediction.overlapScore
      );
      
      // Update overlap score with adjusted value (capped at 0.95)
      overlapPrediction = {
        ...overlapPrediction,
        overlapScore: Math.min(0.95, adjustedOverlap)
      };
      
      // Step 4: Generate reasoning with subcategory insights
      const reasoning = await this.generateReasoningWithAI(event1, event2, overlapPrediction);

      const result = {
        overlapScore: overlapPrediction.overlapScore,
        confidence: overlapPrediction.confidence,
        factors: overlapPrediction.factors,
        reasoning
      };

      // Cache the result
      await audienceOverlapCacheService.cacheOverlapResult(
        cacheKey,
        overlapPrediction.overlapScore,
        overlapPrediction.confidence,
        reasoning,
        'ai_powered'
      );

      return result;
    } catch (error) {
      console.error('OpenAI analysis failed, falling back to rule-based:', error);
      // Fallback to rule-based system
      const { audienceOverlapService } = await import('./audience-overlap');
      return audienceOverlapService.predictAudienceOverlap(event1, event2);
    }
  }

  /**
   * Analyze events using OpenAI to extract semantic features
   */
  private async analyzeEventsWithAI(event1: Event, event2: Event): Promise<any> {
    // Calculate date proximity
    const event1Date = new Date(event1.date);
    const event1EndDate = event1.endDate ? new Date(event1.endDate) : event1Date;
    const event2Date = new Date(event2.date);
    const event2EndDate = event2.endDate ? new Date(event2.endDate) : event2Date;
    
    const daysBefore = Math.max(0, Math.floor((event1Date.getTime() - event2EndDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysAfter = Math.max(0, Math.floor((event2Date.getTime() - event1EndDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysBetween = Math.min(daysBefore, daysAfter);
    
    let proximityLevel = 'distant';
    if (daysBetween === 0) {
      proximityLevel = 'same day';
    } else if (daysBetween <= 3) {
      proximityLevel = '1-3 days apart';
    } else if (daysBetween <= 7) {
      proximityLevel = '4-7 days apart';
    } else if (daysBetween <= 30) {
      proximityLevel = '8-30 days apart';
    } else if (daysBetween <= 90) {
      proximityLevel = '31-90 days apart';
    }
    
    const prompt = `
    Analyze these two events for audience overlap prediction, considering their subcategories, genres, and temporal proximity:

    Event 1: "${event1.title}"
    Category: ${event1.category}
    Subcategory: ${event1.subcategory || 'None'}
    Description: ${event1.description || 'No description'}
    Venue: ${event1.venue || 'Not specified'}
    Expected Attendees: ${event1.expectedAttendees || 'Not specified'}
    Date: ${event1.date}${event1.endDate ? ` to ${event1.endDate}` : ''}

    Event 2: "${event2.title}"
    Category: ${event2.category}
    Subcategory: ${event2.subcategory || 'None'}
    Description: ${event2.description || 'No description'}
    Venue: ${event2.venue || 'Not specified'}
    Expected Attendees: ${event2.expectedAttendees || 'Not specified'}
    Date: ${event2.date}${event2.endDate ? ` to ${event2.endDate}` : ''}

    TEMPORAL PROXIMITY: ${daysBetween} days between events (${proximityLevel})
    - Same day (0 days): +15-20% overlap boost (people can't attend both)
    - Immediate (1-3 days): +10-15% overlap boost (very high competition)
    - Within week (4-7 days): +5-10% overlap boost (high competition)
    - Within month (8-30 days): +2-5% overlap boost (moderate competition)
    - Within quarter (31-90 days): +0-2% overlap boost (some competition)
    - Distant (90+ days): No boost (minimal temporal competition)

    EVENT SIGNIFICANCE: 
    - Major events (10,000+ attendees): +10-15% overlap boost
    - Large events (1,000-10,000 attendees): +5-10% overlap boost
    - Medium events (100-1,000 attendees): +0-5% overlap boost
    - Small events (<100 attendees): No boost

    Consider subcategory relationships:
    - Same subcategory: Very high overlap (80-95%)
    - Related subcategories (e.g., Rock/Metal): High overlap (60-75%)
    - Different subcategories in same category (e.g., Rock/Jazz): Moderate overlap (20-40%)
    - Different categories: Low overlap (5-15%)

    Please analyze and return a JSON object with:
    1. targetAudience1: Who would attend event 1 (demographics, interests, profession, subcategory traits)
    2. targetAudience2: Who would attend event 2 (demographics, interests, profession, subcategory traits)
    3. subcategoryOverlap: overlap based on subcategory relationship (0-1)
    4. eventType1: What type of event is this (conference, workshop, networking, etc.)
    5. eventType2: What type of event is this (conference, workshop, networking, etc.)
    6. keyTopics1: Main topics/themes of event 1
    7. keyTopics2: Main topics/themes of event 2
    8. audienceMotivation1: Why would people attend event 1
    9. audienceMotivation2: Why would people attend event 2
    10. subcategoryReasoning: explanation of subcategory-based overlap
    9. eventFormat1: Format and style of event 1
    10. eventFormat2: Format and style of event 2

    Return only valid JSON, no additional text.
    `;

    const response = await this.callOpenAI(prompt, 'gpt-3.5-turbo');
    
    try {
      // Clean the response by removing markdown code blocks if present
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      return this.getDefaultEventAnalysis(event1, event2);
    }
  }

  /**
   * Predict audience overlap using OpenAI
   */
  private async predictOverlapWithAI(event1: Event, event2: Event, analysis: any): Promise<any> {
    // Calculate date proximity for context
    const event1Date = new Date(event1.date);
    const event1EndDate = event1.endDate ? new Date(event1.endDate) : event1Date;
    const event2Date = new Date(event2.date);
    const event2EndDate = event2.endDate ? new Date(event2.endDate) : event2Date;
    
    const daysBefore = Math.max(0, Math.floor((event1Date.getTime() - event2EndDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysAfter = Math.max(0, Math.floor((event2Date.getTime() - event1EndDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysBetween = Math.min(daysBefore, daysAfter);
    
    const prompt = `
    Based on this event analysis, predict the audience overlap between these two events:

    Event 1 Analysis:
    - Target Audience: ${JSON.stringify(analysis.targetAudience1)}
    - Event Type: ${analysis.eventType1}
    - Key Topics: ${JSON.stringify(analysis.keyTopics1)}
    - Audience Motivation: ${analysis.audienceMotivation1}
    - Event Format: ${analysis.eventFormat1}
    - Expected Attendees: ${event1.expectedAttendees || 'Not specified'}

    Event 2 Analysis:
    - Target Audience: ${JSON.stringify(analysis.targetAudience2)}
    - Event Type: ${analysis.eventType2}
    - Key Topics: ${JSON.stringify(analysis.keyTopics2)}
    - Audience Motivation: ${analysis.audienceMotivation2}
    - Event Format: ${analysis.eventFormat2}
    - Expected Attendees: ${event2.expectedAttendees || 'Not specified'}

    TEMPORAL PROXIMITY: ${daysBetween} days between events
    Apply temporal proximity boost to your base overlap calculation:
    - Same day (0 days): +15-20% overlap boost
    - Immediate (1-3 days): +10-15% overlap boost
    - Within week (4-7 days): +5-10% overlap boost
    - Within month (8-30 days): +2-5% overlap boost
    - Within quarter (31-90 days): +0-2% overlap boost
    - Distant (90+ days): No boost

    EVENT SIGNIFICANCE: Apply boost based on event size
    - Major events (10,000+ attendees): +10-15% overlap boost
    - Large events (1,000-10,000 attendees): +5-10% overlap boost
    - Medium events (100-1,000 attendees): +0-5% overlap boost

    Predict the audience overlap and return a JSON object with:
    1. overlapScore: Number between 0 and 0.95 (0 = no overlap, 0.95 = very high overlap - cap at 95%)
    2. confidence: Number between 0 and 1 (how confident you are in this prediction)
    3. factors: Object with:
       - demographicSimilarity: 0-1 score
       - interestAlignment: 0-1 score
       - behaviorPatterns: 0-1 score
       - historicalPreference: 0-1 score
    4. keyOverlapFactors: Array of the top 3 reasons for overlap (include temporal proximity if relevant)
    5. keyDifferentiators: Array of the top 3 reasons they don't overlap

    Consider:
    - Demographics (age, profession, income level)
    - Interests and expertise areas
    - Event format preferences
    - Motivation for attending
    - Geographic and scheduling constraints
    - Industry/domain overlap
    - TEMPORAL PROXIMITY: Events close in time create higher competition
    - EVENT SIZE: Major events draw larger, overlapping audiences

    IMPORTANT: Apply temporal proximity and event significance boosts to your base overlap score.
    Final overlap should be: base_overlap + temporal_boost + significance_boost (capped at 0.95)

    Return only valid JSON, no additional text.
    `;

    const response = await this.callOpenAI(prompt, 'gpt-3.5-turbo');
    
    try {
      // Clean the response by removing markdown code blocks if present
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.error('Failed to parse overlap prediction:', error);
      return this.getDefaultOverlapPrediction();
    }
  }

  /**
   * Generate human-readable reasoning using OpenAI
   */
  private async generateReasoningWithAI(event1: Event, event2: Event, prediction: any): Promise<string[]> {
    const prompt = `
    Explain why the audience overlap between these events is ${(prediction.overlapScore * 100).toFixed(1)}%:

    Event 1: "${event1.title}" (${event1.category})
    Event 2: "${event2.title}" (${event2.category})

    Key Overlap Factors: ${JSON.stringify(prediction.keyOverlapFactors || [])}
    Key Differentiators: ${JSON.stringify(prediction.keyDifferentiators || [])}

    Provide 3 concise, specific reasons for this overlap prediction. Each reason should be 1-2 sentences and explain a specific aspect of why these audiences would or wouldn't overlap.

    IMPORTANT: Return ONLY the 3 reasons as plain text, one per line. Do NOT use JSON format or any other formatting.
    `;

    const response = await this.callOpenAI(prompt, 'gpt-3.5-turbo');
    
    // Parse the response into an array of reasons
    const reasons = response
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0 && !line.startsWith('{') && !line.startsWith('"'))
      .slice(0, 3);

    return reasons.length > 0 ? reasons : [
      'Both events target technology professionals with similar interests',
      'The events share overlapping demographics and professional backgrounds',
      'Attendees likely have similar learning and networking motivations'
    ];
  }

  /**
   * Call OpenAI API with timeout
   */
  private async callOpenAI(prompt: string, model: string = 'gpt-4o-mini'): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

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
              content: 'You are an expert event analyst specializing in audience overlap prediction. Provide accurate, data-driven analysis in JSON format when requested.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.3, // Lower temperature for more consistent results
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
        throw new Error('OpenAI API request timed out after 10 seconds');
      }
      throw error;
    }
  }

  /**
   * Get default event analysis when OpenAI fails
   */
  private getDefaultEventAnalysis(event1: Event, event2: Event): any {
    return {
      targetAudience1: { profession: 'professionals', interests: [event1.category.toLowerCase()] },
      targetAudience2: { profession: 'professionals', interests: [event2.category.toLowerCase()] },
      eventType1: 'conference',
      eventType2: 'conference',
      keyTopics1: [event1.category],
      keyTopics2: [event2.category],
      audienceMotivation1: 'learning and networking',
      audienceMotivation2: 'learning and networking',
      eventFormat1: 'presentation',
      eventFormat2: 'presentation'
    };
  }

  /**
   * Apply temporal proximity and event significance adjustments to overlap score
   */
  private applyTemporalProximityAdjustment(
    event1: Event,
    event2: Event,
    baseOverlap: number
  ): number {
    // Calculate days between events
    const event1Date = new Date(event1.date);
    const event1EndDate = event1.endDate ? new Date(event1.endDate) : event1Date;
    const event2Date = new Date(event2.date);
    const event2EndDate = event2.endDate ? new Date(event2.endDate) : event2Date;
    
    const daysBefore = Math.max(0, Math.floor((event1Date.getTime() - event2EndDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysAfter = Math.max(0, Math.floor((event2Date.getTime() - event1EndDate.getTime()) / (1000 * 60 * 60 * 24)));
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
    
    // Calculate event significance boost (use the larger event)
    const event1Attendees = event1.expectedAttendees || 0;
    const event2Attendees = event2.expectedAttendees || 0;
    const maxAttendees = Math.max(event1Attendees, event2Attendees);
    
    let significanceBoost = 0;
    if (maxAttendees >= 10000) {
      significanceBoost = 0.13; // Major events: +13%
    } else if (maxAttendees >= 1000) {
      significanceBoost = 0.08; // Large events: +8%
    } else if (maxAttendees >= 100) {
      significanceBoost = 0.03; // Medium events: +3%
    }
    // Small events: no boost
    
    // Apply boosts to base overlap
    const adjustedOverlap = baseOverlap + temporalBoost + significanceBoost;
    
    // Log adjustment for debugging
    if (temporalBoost > 0 || significanceBoost > 0) {
      console.log(`  📅 Temporal adjustment: ${daysBetween} days apart (+${(temporalBoost * 100).toFixed(1)}%)`);
      if (significanceBoost > 0) {
        console.log(`  🎯 Significance adjustment: ${maxAttendees} attendees (+${(significanceBoost * 100).toFixed(1)}%)`);
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
    event1: Event,
    event2: Event
  ): string[] {
    const event1Date = new Date(event1.date);
    const event1EndDate = event1.endDate ? new Date(event1.endDate) : event1Date;
    const event2Date = new Date(event2.date);
    const event2EndDate = event2.endDate ? new Date(event2.endDate) : event2Date;
    
    const daysBefore = Math.max(0, Math.floor((event1Date.getTime() - event2EndDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysAfter = Math.max(0, Math.floor((event2Date.getTime() - event1EndDate.getTime()) / (1000 * 60 * 60 * 24)));
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
   * Get default overlap prediction when OpenAI fails
   */
  private getDefaultOverlapPrediction(): any {
    return {
      overlapScore: 0.5,
      confidence: 0.3,
      factors: {
        demographicSimilarity: 0.5,
        interestAlignment: 0.5,
        behaviorPatterns: 0.5,
        historicalPreference: 0.5
      },
      keyOverlapFactors: ['Similar event categories'],
      keyDifferentiators: ['Different event details']
    };
  }

  /**
   * Check if OpenAI is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get cost estimate for OpenAI calls
   */
  getCostEstimate(numEvents: number): number {
    // Rough estimate: $0.002 per 1K tokens for gpt-3.5-turbo
    // Each analysis uses ~500-1000 tokens
    const tokensPerAnalysis = 750;
    const costPer1KTokens = 0.002;
    return (numEvents * tokensPerAnalysis / 1000) * costPer1KTokens;
  }
}

export const openaiAudienceOverlapService = new OpenAIAudienceOverlapService();
