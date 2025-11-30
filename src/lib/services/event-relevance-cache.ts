// Event relevance caching system with database storage
import { createClient } from '@/lib/supabase';

export interface CachedRelevanceResult {
  id: string;
  plannedCategory: string;
  plannedSubcategory: string | null;
  competingCategory: string;
  competingSubcategory: string | null;
  isRelevant: boolean;
  confidence: number;
  reasoning: string[];
  evaluationMethod: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface RelevanceCacheKey {
  plannedCategory: string;
  plannedSubcategory: string | null;
  competingCategory: string;
  competingSubcategory: string | null;
}

export class EventRelevanceCacheService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  private memoryCache = new Map<string, CachedRelevanceResult>();
  private readonly memoryCacheExpiry = 60 * 60 * 1000; // 1 hour

  /**
   * Get cached relevance result
   */
  async getCachedRelevance(key: RelevanceCacheKey): Promise<CachedRelevanceResult | null> {
    const cacheKey = this.generateCacheKey(key);
    
    // Check memory cache first
    const memoryCached = this.memoryCache.get(cacheKey);
    if (memoryCached && this.isMemoryCacheValid(memoryCached)) {
      return memoryCached;
    }

    // Check database cache
    try {
      // Build query with proper NULL handling (SQL NULL != empty string)
      let query = this.supabase
        .from('event_relevance_cache')
        .select('*')
        .eq('planned_category', key.plannedCategory)
        .eq('competing_category', key.competingCategory)
        .gt('expires_at', new Date().toISOString());
      
      // Handle null subcategories properly - use .is() for NULL, .eq() for values
      if (key.plannedSubcategory === null || key.plannedSubcategory === undefined) {
        query = query.is('planned_subcategory', null);
      } else {
        query = query.eq('planned_subcategory', key.plannedSubcategory);
      }
      
      if (key.competingSubcategory === null || key.competingSubcategory === undefined) {
        query = query.is('competing_subcategory', null);
      } else {
        query = query.eq('competing_subcategory', key.competingSubcategory);
      }
      
      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching cached relevance:', error);
        return null;
      }

      if (data) {
        const result: CachedRelevanceResult = {
          id: data.id,
          plannedCategory: data.planned_category,
          plannedSubcategory: data.planned_subcategory,
          competingCategory: data.competing_category,
          competingSubcategory: data.competing_subcategory,
          isRelevant: data.is_relevant,
          confidence: data.confidence,
          reasoning: data.reasoning || [],
          evaluationMethod: data.evaluation_method,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          expiresAt: data.expires_at
        };

        // Store in memory cache
        this.memoryCache.set(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.error('Error accessing relevance cache:', error);
    }

    return null;
  }

  /**
   * Store relevance result in cache
   */
  async cacheRelevanceResult(
    key: RelevanceCacheKey,
    isRelevant: boolean,
    confidence: number,
    reasoning: string[],
    evaluationMethod: string,
    ttlDays: number = 30
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(key);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    const result: CachedRelevanceResult = {
      id: '', // Will be set by database
      plannedCategory: key.plannedCategory,
      plannedSubcategory: key.plannedSubcategory,
      competingCategory: key.competingCategory,
      competingSubcategory: key.competingSubcategory,
      isRelevant,
      confidence,
      reasoning,
      evaluationMethod,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    try {
      // Store in database
      const { data, error } = await this.supabase
        .from('event_relevance_cache')
        .upsert({
          planned_category: key.plannedCategory,
          planned_subcategory: key.plannedSubcategory || null,
          competing_category: key.competingCategory,
          competing_subcategory: key.competingSubcategory || null,
          is_relevant: isRelevant,
          confidence,
          reasoning,
          evaluation_method: evaluationMethod,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'planned_category,planned_subcategory,competing_category,competing_subcategory'
        })
        .select()
        .single();

      if (error) {
        console.error('Error caching relevance result:', error);
        return;
      }

      if (data) {
        result.id = data.id;
        result.createdAt = data.created_at;
        result.updatedAt = data.updated_at;
      }

      // Store in memory cache
      this.memoryCache.set(cacheKey, result);
    } catch (error) {
      console.error('Error storing relevance cache:', error);
    }
  }

  /**
   * Batch cache multiple relevance results
   */
  async batchCacheRelevanceResults(
    results: Array<{
      key: RelevanceCacheKey;
      isRelevant: boolean;
      confidence: number;
      reasoning: string[];
      evaluationMethod: string;
    }>,
    ttlDays: number = 30
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    // Deduplicate results by cache key to avoid "ON CONFLICT DO UPDATE cannot affect row a second time" error
    const uniqueResults = Array.from(
      new Map(
        results.map(result => {
          const cacheKey = this.generateCacheKey(result.key);
          return [cacheKey, result];
        })
      ).values()
    );

    const cacheEntries = uniqueResults.map(result => ({
      planned_category: result.key.plannedCategory,
      planned_subcategory: result.key.plannedSubcategory || null,
      competing_category: result.key.competingCategory,
      competing_subcategory: result.key.competingSubcategory || null,
      is_relevant: result.isRelevant,
      confidence: result.confidence,
      reasoning: result.reasoning,
      evaluation_method: result.evaluationMethod,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString()
    }));

    try {
      const { error } = await this.supabase
        .from('event_relevance_cache')
        .upsert(cacheEntries, {
          onConflict: 'planned_category,planned_subcategory,competing_category,competing_subcategory'
        });

      if (error) {
        console.error('Error batch caching relevance results:', error);
        return;
      }

      // Store in memory cache (use uniqueResults to avoid duplicates)
      for (const result of uniqueResults) {
        const cacheKey = this.generateCacheKey(result.key);
        const cachedResult: CachedRelevanceResult = {
          id: '',
          plannedCategory: result.key.plannedCategory,
          plannedSubcategory: result.key.plannedSubcategory,
          competingCategory: result.key.competingCategory,
          competingSubcategory: result.key.competingSubcategory,
          isRelevant: result.isRelevant,
          confidence: result.confidence,
          reasoning: result.reasoning,
          evaluationMethod: result.evaluationMethod,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString()
        };
        this.memoryCache.set(cacheKey, cachedResult);
      }
    } catch (error) {
      console.error('Error batch storing relevance cache:', error);
    }
  }

  /**
   * Generate cache key from relevance key
   */
  private generateCacheKey(key: RelevanceCacheKey): string {
    return `${key.plannedCategory}:${key.plannedSubcategory || 'null'}|${key.competingCategory}:${key.competingSubcategory || 'null'}`;
  }

  /**
   * Check if memory cache entry is still valid
   */
  private isMemoryCacheValid(result: CachedRelevanceResult): boolean {
    const now = new Date();
    const expiresAt = new Date(result.expiresAt);
    return now < expiresAt;
  }
}

export const eventRelevanceCacheService = new EventRelevanceCacheService();

