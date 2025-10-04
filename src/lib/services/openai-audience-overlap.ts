// src/lib/services/openai-audience-overlap.ts
import { Event } from '@/types';
import { AudienceOverlapPrediction } from '@/types/audience';

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
   * AI-powered audience overlap prediction using OpenAI
   */
  async predictAudienceOverlap(event1: Event, event2: Event): Promise<AudienceOverlapPrediction> {
    if (!this.apiKey) {
      // Fallback to rule-based system
      const { audienceOverlapService } = await import('./audience-overlap');
      return audienceOverlapService.predictAudienceOverlap(event1, event2);
    }

    try {
      // Step 1: Analyze events with OpenAI
      const eventAnalysis = await this.analyzeEventsWithAI(event1, event2);
      
      // Step 2: Predict audience overlap
      const overlapPrediction = await this.predictOverlapWithAI(event1, event2, eventAnalysis);
      
      // Step 3: Generate reasoning
      const reasoning = await this.generateReasoningWithAI(event1, event2, overlapPrediction);

      return {
        overlapScore: overlapPrediction.overlapScore,
        confidence: overlapPrediction.confidence,
        factors: overlapPrediction.factors,
        reasoning
      };
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
    const prompt = `
    Analyze these two events and extract key features for audience overlap prediction:

    Event 1: "${event1.title}"
    Category: ${event1.category}
    Subcategory: ${event1.subcategory || 'None'}
    Description: ${event1.description || 'No description'}
    Venue: ${event1.venue || 'Not specified'}
    Expected Attendees: ${event1.expectedAttendees || 'Not specified'}

    Event 2: "${event2.title}"
    Category: ${event2.category}
    Subcategory: ${event2.subcategory || 'None'}
    Description: ${event2.description || 'No description'}
    Venue: ${event2.venue || 'Not specified'}
    Expected Attendees: ${event2.expectedAttendees || 'Not specified'}

    Please analyze and return a JSON object with:
    1. targetAudience1: Who would attend event 1 (demographics, interests, profession)
    2. targetAudience2: Who would attend event 2 (demographics, interests, profession)
    3. eventType1: What type of event is this (conference, workshop, networking, etc.)
    4. eventType2: What type of event is this (conference, workshop, networking, etc.)
    5. keyTopics1: Main topics/themes of event 1
    6. keyTopics2: Main topics/themes of event 2
    7. audienceMotivation1: Why would people attend event 1
    8. audienceMotivation2: Why would people attend event 2
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
    const prompt = `
    Based on this event analysis, predict the audience overlap between these two events:

    Event 1 Analysis:
    - Target Audience: ${JSON.stringify(analysis.targetAudience1)}
    - Event Type: ${analysis.eventType1}
    - Key Topics: ${JSON.stringify(analysis.keyTopics1)}
    - Audience Motivation: ${analysis.audienceMotivation1}
    - Event Format: ${analysis.eventFormat1}

    Event 2 Analysis:
    - Target Audience: ${JSON.stringify(analysis.targetAudience2)}
    - Event Type: ${analysis.eventType2}
    - Key Topics: ${JSON.stringify(analysis.keyTopics2)}
    - Audience Motivation: ${analysis.audienceMotivation2}
    - Event Format: ${analysis.eventFormat2}

    Predict the audience overlap and return a JSON object with:
    1. overlapScore: Number between 0 and 1 (0 = no overlap, 1 = complete overlap)
    2. confidence: Number between 0 and 1 (how confident you are in this prediction)
    3. factors: Object with:
       - demographicSimilarity: 0-1 score
       - interestAlignment: 0-1 score
       - behaviorPatterns: 0-1 score
       - historicalPreference: 0-1 score
    4. keyOverlapFactors: Array of the top 3 reasons for overlap
    5. keyDifferentiators: Array of the top 3 reasons they don't overlap

    Consider:
    - Demographics (age, profession, income level)
    - Interests and expertise areas
    - Event format preferences
    - Motivation for attending
    - Geographic and scheduling constraints
    - Industry/domain overlap

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
