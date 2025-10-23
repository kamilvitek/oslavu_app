// Hybrid subcategory extraction service (rule-based + AI verification)
import { SUBCATEGORY_TAXONOMY, getSubcategoryDefinition, getAllSubcategoriesForCategory } from '@/lib/constants/subcategory-taxonomy';

export interface SubcategoryExtractionResult {
  subcategory: string | null;
  confidence: number;
  method: 'rule_based' | 'ai_verified' | 'fallback';
  reasoning: string[];
  genreTags: string[];
}

export class SubcategoryExtractionService {
  private readonly openaiApiKey = process.env.OPENAI_API_KEY;
  private readonly cache = new Map<string, SubcategoryExtractionResult>();
  private readonly cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Extract subcategory using hybrid approach
   */
  async extractSubcategory(
    title: string,
    description: string | null,
    category: string
  ): Promise<SubcategoryExtractionResult> {
    const cacheKey = `${category}:${title}:${description || ''}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    // Phase 1: Rule-based matching
    const ruleBasedResult = this.ruleBasedExtraction(title, description, category);
    
    // If confidence is high enough, use rule-based result
    if (ruleBasedResult.confidence >= 0.7) {
      this.cache.set(cacheKey, ruleBasedResult);
      return ruleBasedResult;
    }

    // Phase 2: AI verification for low confidence cases
    if (this.openaiApiKey && ruleBasedResult.confidence < 0.7) {
      try {
        const aiResult = await this.aiVerification(title, description, category, ruleBasedResult);
        this.cache.set(cacheKey, aiResult);
        return aiResult;
      } catch (error) {
        console.error('AI verification failed, using rule-based result:', error);
      }
    }

    // Phase 3: Fallback
    const fallbackResult = this.fallbackExtraction(category);
    this.cache.set(cacheKey, fallbackResult);
    return fallbackResult;
  }

  /**
   * Rule-based extraction using keyword matching
   */
  private ruleBasedExtraction(
    title: string,
    description: string | null,
    category: string
  ): SubcategoryExtractionResult {
    const text = `${title} ${description || ''}`.toLowerCase();
    const categoryData = SUBCATEGORY_TAXONOMY[category];
    
    if (!categoryData) {
      return this.fallbackExtraction(category);
    }

    let bestMatch = '';
    let bestScore = 0;
    const matchedKeywords: string[] = [];
    const reasoning: string[] = [];

    // Score each subcategory based on keyword matches
    for (const [subcategoryName, definition] of Object.entries(categoryData.subcategories)) {
      let score = 0;
      const matchedSubcategoryKeywords: string[] = [];

      for (const keyword of definition.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          score += 1;
          matchedSubcategoryKeywords.push(keyword);
        }
      }

      // Normalize score by number of keywords
      const normalizedScore = score / definition.keywords.length;
      
      if (normalizedScore > bestScore) {
        bestScore = normalizedScore;
        bestMatch = subcategoryName;
        matchedKeywords.length = 0;
        matchedKeywords.push(...matchedSubcategoryKeywords);
      }
    }

    // Calculate confidence based on score and keyword density
    const confidence = Math.min(bestScore * 1.5, 1.0);
    
    if (bestMatch && confidence > 0.3) {
      reasoning.push(`Matched keywords: ${matchedKeywords.join(', ')}`);
      reasoning.push(`Confidence: ${(confidence * 100).toFixed(1)}%`);
      
      return {
        subcategory: bestMatch,
        confidence,
        method: 'rule_based',
        reasoning,
        genreTags: matchedKeywords
      };
    }

    return this.fallbackExtraction(category);
  }

  /**
   * AI verification using OpenAI
   */
  private async aiVerification(
    title: string,
    description: string | null,
    category: string,
    ruleBasedResult: SubcategoryExtractionResult
  ): Promise<SubcategoryExtractionResult> {
    const subcategories = getAllSubcategoriesForCategory(category);
    
    if (subcategories.length === 0) {
      return this.fallbackExtraction(category);
    }

    const prompt = `Classify this event into one of these subcategories: ${subcategories.join(', ')}.

Event Title: "${title}"
Event Description: "${description || 'No description provided'}"
Event Category: "${category}"

Rule-based suggestion: ${ruleBasedResult.subcategory || 'None'} (confidence: ${(ruleBasedResult.confidence * 100).toFixed(1)}%)

Please respond with ONLY the subcategory name that best fits this event. If none fit well, respond with "Other".`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 50,
          temperature: 0.3
        })
      });

      const data = await response.json();
      const aiSubcategory = data.choices[0].message.content.trim();

      // Validate AI response
      if (subcategories.includes(aiSubcategory)) {
        return {
          subcategory: aiSubcategory,
          confidence: 0.85, // High confidence for AI verification
          method: 'ai_verified',
          reasoning: [
            `AI classified as: ${aiSubcategory}`,
            `Original rule-based: ${ruleBasedResult.subcategory || 'None'}`,
            'AI verification provided higher confidence'
          ],
          genreTags: ruleBasedResult.genreTags
        };
      } else if (aiSubcategory === 'Other') {
        return this.fallbackExtraction(category);
      } else {
        // AI returned invalid subcategory, use rule-based result
        return {
          ...ruleBasedResult,
          method: 'ai_verified',
          reasoning: [
            ...ruleBasedResult.reasoning,
            `AI returned invalid subcategory: ${aiSubcategory}`,
            'Using rule-based result instead'
          ]
        };
      }
    } catch (error) {
      console.error('AI verification failed:', error);
      return ruleBasedResult;
    }
  }

  /**
   * Fallback extraction when both rule-based and AI fail
   */
  private fallbackExtraction(category: string): SubcategoryExtractionResult {
    const categoryData = SUBCATEGORY_TAXONOMY[category];
    
    if (!categoryData) {
      return {
        subcategory: null,
        confidence: 0.1,
        method: 'fallback',
        reasoning: ['No subcategory taxonomy available for this category'],
        genreTags: []
      };
    }

    // Use the first subcategory as default
    const defaultSubcategory = Object.keys(categoryData.subcategories)[0];
    
    return {
      subcategory: defaultSubcategory,
      confidence: 0.1,
      method: 'fallback',
      reasoning: ['Using default subcategory due to low confidence in classification'],
      genreTags: []
    };
  }

  /**
   * Check if cached result is still valid
   */
  private isCacheValid(result: SubcategoryExtractionResult): boolean {
    // For now, always consider cache valid within expiry time
    // In production, you might want to add timestamp checking
    return true;
  }

  /**
   * Batch extract subcategories for multiple events
   */
  async batchExtractSubcategories(
    events: Array<{ title: string; description: string | null; category: string }>
  ): Promise<SubcategoryExtractionResult[]> {
    const results: SubcategoryExtractionResult[] = [];
    
    // Process in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(event => this.extractSubcategory(event.title, event.description, event.category))
      );
      results.push(...batchResults);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < events.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  /**
   * Get extraction statistics
   */
  getExtractionStats(): {
    cacheSize: number;
    methodsUsed: Record<string, number>;
  } {
    const methodsUsed: Record<string, number> = {};
    
    for (const result of this.cache.values()) {
      methodsUsed[result.method] = (methodsUsed[result.method] || 0) + 1;
    }
    
    return {
      cacheSize: this.cache.size,
      methodsUsed
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const subcategoryExtractionService = new SubcategoryExtractionService();
