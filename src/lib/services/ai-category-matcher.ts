/**
 * AI-Powered Category Matching Service
 * 
 * This service uses AI to intelligently match events with categories,
 * especially for international events where category names might be
 * in different languages or formats.
 * 
 * @fileoverview AI-first category matching for enhanced event discovery
 */

import OpenAI from 'openai';

interface CategoryMatchRequest {
  eventCategory: string;
  targetCategory: string;
  eventTitle?: string;
  eventDescription?: string;
  eventLanguage?: string;
}

interface CategoryMatchResult {
  isMatch: boolean;
  confidence: number;
  reasoning: string;
  suggestedCategory?: string;
  languageDetected?: string;
}

interface SeasonalIntelligenceResult {
  hasSeasonalRisk: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  seasonalFactors: string[];
  recommendations: string[];
  confidence: number;
}

export class AICategoryMatcherService {
  private openai: OpenAI | null = null;
  private cache = new Map<string, CategoryMatchResult>();
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Match event category with target category using AI
   */
  async matchCategory(request: CategoryMatchRequest): Promise<CategoryMatchResult> {
    const cacheKey = `${request.eventCategory}_${request.targetCategory}_${request.eventTitle || ''}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - (cached as any).timestamp < this.cacheExpiry) {
      return cached;
    }

    if (!this.openai) {
      return this.fallbackMatch(request);
    }

    try {
      const prompt = this.buildCategoryMatchingPrompt(request);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert event categorization assistant. Your job is to determine if an event category matches a target category, even when they're in different languages or formats.

Key principles:
1. Consider semantic meaning, not just exact text matches
2. Recognize international category names (e.g., "Divadlo" = "Theater", "Hudba" = "Music")
3. Handle compound categories (e.g., "Divadlo, Hudba" = "Theater + Music")
4. Consider event context from title and description
5. Be conservative - only match when confident

Respond with a JSON object containing:
- isMatch: boolean
- confidence: number (0-1)
- reasoning: string explaining your decision
- suggestedCategory: string (if you suggest a better category)
- languageDetected: string (if you detect the language)`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const result = JSON.parse(content) as CategoryMatchResult;
      
      // Cache the result
      (result as any).timestamp = Date.now();
      this.cache.set(cacheKey, result);
      
      return result;

    } catch (error) {
      console.warn('AI category matching failed, using fallback:', error);
      return this.fallbackMatch(request);
    }
  }

  /**
   * Analyze seasonal intelligence when no events are found
   */
  async analyzeSeasonalIntelligence(
    category: string,
    subcategory: string | undefined,
    month: number,
    city: string,
    region: string = 'CZ'
  ): Promise<SeasonalIntelligenceResult> {
    if (!this.openai) {
      return this.fallbackSeasonalAnalysis(category, subcategory, month, city);
    }

    try {
      const prompt = this.buildSeasonalIntelligencePrompt(category, subcategory, month, city, region);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert event planning consultant with deep knowledge of seasonal patterns, cultural events, and regional characteristics. Your job is to analyze potential seasonal risks when no competing events are found in the data.

Consider:
1. Seasonal demand patterns for the event category
2. Cultural and regional events that might not be in databases
3. Weather and seasonal factors affecting attendance
4. Local traditions and holidays
5. Industry-specific seasonal patterns
6. Regional characteristics (Prague vs Brno vs other cities)

Respond with a JSON object containing:
- hasSeasonalRisk: boolean
- riskLevel: 'low' | 'medium' | 'high'
- seasonalFactors: string[] (list of seasonal factors)
- recommendations: string[] (actionable recommendations)
- confidence: number (0-1)`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 800
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(content) as SeasonalIntelligenceResult;

    } catch (error) {
      console.warn('AI seasonal intelligence failed, using fallback:', error);
      return this.fallbackSeasonalAnalysis(category, subcategory, month, city);
    }
  }

  /**
   * Build category matching prompt
   */
  private buildCategoryMatchingPrompt(request: CategoryMatchRequest): string {
    return `
Analyze if this event category matches the target category:

Event Category: "${request.eventCategory}"
Target Category: "${request.targetCategory}"
Event Title: "${request.eventTitle || 'N/A'}"
Event Description: "${request.eventDescription || 'N/A'}"
Event Language: "${request.eventLanguage || 'Unknown'}"

Consider:
- Semantic meaning and context
- International category names
- Compound categories
- Cultural variations
- Industry standards

Provide your analysis as JSON.`;
  }

  /**
   * Build seasonal intelligence prompt
   */
  private buildSeasonalIntelligencePrompt(
    category: string,
    subcategory: string | undefined,
    month: number,
    city: string,
    region: string
  ): string {
    const monthName = new Date(2024, month - 1, 1).toLocaleString('en', { month: 'long' });
    
    return `
Analyze seasonal intelligence for this event planning scenario:

Event Category: "${category}"
Subcategory: "${subcategory || 'N/A'}"
Target Month: ${monthName} (${month})
City: "${city}"
Region: "${region}"

The system found NO competing events in the database, but this could be due to:
1. Data coverage gaps
2. Events not yet published
3. Local/regional events not in major databases
4. Seasonal patterns affecting event scheduling

Consider:
- What seasonal factors might affect this category in ${monthName}?
- What cultural or regional events might occur in ${city} during ${monthName}?
- What industry patterns exist for ${category} events?
- What risks should the user be aware of?

Provide your analysis as JSON.`;
  }

  /**
   * Fallback category matching when AI is unavailable
   */
  private fallbackMatch(request: CategoryMatchRequest): CategoryMatchResult {
    const eventCategory = request.eventCategory.toLowerCase();
    const targetCategory = request.targetCategory.toLowerCase();

    // Basic language mappings
    const languageMappings: Record<string, Record<string, string>> = {
      'cs': { // Czech
        'divadlo': 'theater',
        'hudba': 'music',
        'kultura': 'culture',
        'sport': 'sports',
        'obchod': 'business',
        'vzdělání': 'education',
        'zdraví': 'healthcare'
      },
      'de': { // German
        'theater': 'theater',
        'musik': 'music',
        'kultur': 'culture',
        'sport': 'sports',
        'geschäft': 'business'
      },
      'fr': { // French
        'théâtre': 'theater',
        'musique': 'music',
        'culture': 'culture',
        'sport': 'sports',
        'affaires': 'business'
      }
    };

    // Try to detect language and map
    let mappedCategory = eventCategory;
    for (const [lang, mappings] of Object.entries(languageMappings)) {
      for (const [foreign, english] of Object.entries(mappings)) {
        if (eventCategory.includes(foreign)) {
          mappedCategory = english;
          break;
        }
      }
    }

    // Check if mapped category matches target
    const isMatch = mappedCategory.includes(targetCategory) || 
                   targetCategory.includes(mappedCategory) ||
                   this.areSemanticallyRelated(mappedCategory, targetCategory);

    return {
      isMatch,
      confidence: isMatch ? 0.7 : 0.3,
      reasoning: isMatch ? 
        `Mapped "${eventCategory}" to "${mappedCategory}" which matches "${targetCategory}"` :
        `Could not map "${eventCategory}" to match "${targetCategory}"`,
      suggestedCategory: mappedCategory,
      languageDetected: this.detectLanguage(eventCategory)
    };
  }

  /**
   * Fallback seasonal analysis when AI is unavailable
   */
  private fallbackSeasonalAnalysis(
    category: string,
    subcategory: string | undefined,
    month: number,
    city: string
  ): SeasonalIntelligenceResult {
    // Basic seasonal patterns
    const seasonalPatterns: Record<string, Record<number, { risk: string, factors: string[] }>> = {
      'Entertainment': {
        6: { risk: 'medium', factors: ['Summer festival season', 'Outdoor events competition', 'Tourist season'] },
        7: { risk: 'high', factors: ['Peak summer vacation', 'Major festivals', 'Tourist influx'] },
        8: { risk: 'high', factors: ['Summer vacation peak', 'Cultural festivals', 'Tourist season'] },
        12: { risk: 'high', factors: ['Holiday season', 'Christmas events', 'New Year celebrations'] }
      },
      'Business': {
        7: { risk: 'low', factors: ['Summer vacation period', 'Reduced business activity'] },
        8: { risk: 'low', factors: ['Summer vacation period', 'Reduced business activity'] },
        12: { risk: 'high', factors: ['Holiday season', 'Year-end business events', 'Christmas period'] }
      },
      'Technology': {
        3: { risk: 'medium', factors: ['Spring conference season', 'Tech events peak'] },
        4: { risk: 'medium', factors: ['Spring conference season', 'Tech events peak'] },
        7: { risk: 'low', factors: ['Summer vacation period', 'Reduced tech activity'] },
        8: { risk: 'low', factors: ['Summer vacation period', 'Reduced tech activity'] }
      }
    };

    const categoryPattern = seasonalPatterns[category] || {};
    const monthPattern = categoryPattern[month];

    if (monthPattern) {
      return {
        hasSeasonalRisk: true,
        riskLevel: monthPattern.risk as 'low' | 'medium' | 'high',
        seasonalFactors: monthPattern.factors,
        recommendations: [
          'Consider checking local event calendars manually',
          'Research regional cultural events',
          'Check with local venues for unlisted events',
          'Consider seasonal demand patterns'
        ],
        confidence: 0.6
      };
    }

    return {
      hasSeasonalRisk: false,
      riskLevel: 'low',
      seasonalFactors: [],
      recommendations: [
        'No significant seasonal risks identified',
        'Consider checking local event calendars manually',
        'Research regional cultural events'
      ],
      confidence: 0.4
    };
  }

  /**
   * Check if two categories are semantically related
   */
  private areSemanticallyRelated(cat1: string, cat2: string): boolean {
    const relatedGroups = [
      ['entertainment', 'music', 'theater', 'arts', 'culture'],
      ['business', 'conferences', 'networking', 'professional'],
      ['sports', 'fitness', 'recreation'],
      ['education', 'academic', 'learning', 'training']
    ];

    for (const group of relatedGroups) {
      if (group.some(cat => cat1.includes(cat)) && group.some(cat => cat2.includes(cat))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect language from category text
   */
  private detectLanguage(text: string): string {
    const languageIndicators: Record<string, string[]> = {
      'cs': ['divadlo', 'hudba', 'kultura', 'sport', 'obchod', 'vzdělání'],
      'de': ['theater', 'musik', 'kultur', 'sport', 'geschäft'],
      'fr': ['théâtre', 'musique', 'culture', 'sport', 'affaires'],
      'es': ['teatro', 'música', 'cultura', 'deporte', 'negocios']
    };

    for (const [lang, indicators] of Object.entries(languageIndicators)) {
      if (indicators.some(indicator => text.toLowerCase().includes(indicator))) {
        return lang;
      }
    }

    return 'en';
  }
}

export const aiCategoryMatcher = new AICategoryMatcherService();
