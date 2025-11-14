// Audience overlap caching system with database storage
import { createClient } from '@/lib/supabase';

export interface CachedOverlapResult {
  id: string;
  category1: string;
  subcategory1: string | null;
  category2: string;
  subcategory2: string | null;
  overlapScore: number;
  confidence: number;
  reasoning: string[];
  calculationMethod: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface OverlapCacheKey {
  category1: string;
  subcategory1: string | null;
  category2: string;
  subcategory2: string | null;
}

export class AudienceOverlapCacheService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  private memoryCache = new Map<string, CachedOverlapResult>();
  private readonly memoryCacheExpiry = 60 * 60 * 1000; // 1 hour

  /**
   * Get cached overlap result
   */
  async getCachedOverlap(key: OverlapCacheKey): Promise<CachedOverlapResult | null> {
    const cacheKey = this.generateCacheKey(key);
    
    // Check memory cache first
    const memoryCached = this.memoryCache.get(cacheKey);
    if (memoryCached && this.isMemoryCacheValid(memoryCached)) {
      return memoryCached;
    }

    // Check database cache
    try {
      const { data, error } = await this.supabase
        .from('audience_overlap_cache')
        .select('*')
        .eq('category1', key.category1)
        .eq('subcategory1', key.subcategory1 || '')
        .eq('category2', key.category2)
        .eq('subcategory2', key.subcategory2 || '')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching cached overlap:', error);
        return null;
      }

      if (data) {
        const result: CachedOverlapResult = {
          id: data.id,
          category1: data.category1,
          subcategory1: data.subcategory1,
          category2: data.category2,
          subcategory2: data.subcategory2,
          overlapScore: data.overlap_score,
          confidence: data.confidence,
          reasoning: data.reasoning || [],
          calculationMethod: data.calculation_method,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          expiresAt: data.expires_at
        };

        // Store in memory cache
        this.memoryCache.set(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.error('Error accessing overlap cache:', error);
    }

    return null;
  }

  /**
   * Store overlap result in cache
   */
  async cacheOverlapResult(
    key: OverlapCacheKey,
    overlapScore: number,
    confidence: number,
    reasoning: string[],
    calculationMethod: string,
    ttlDays: number = 30
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(key);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    const result: CachedOverlapResult = {
      id: '', // Will be set by database
      category1: key.category1,
      subcategory1: key.subcategory1,
      category2: key.category2,
      subcategory2: key.subcategory2,
      overlapScore,
      confidence,
      reasoning,
      calculationMethod,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    try {
      // Store in database
      const { data, error } = await this.supabase
        .from('audience_overlap_cache')
        .upsert({
          category1: key.category1,
          subcategory1: key.subcategory1 || null,
          category2: key.category2,
          subcategory2: key.subcategory2 || null,
          overlap_score: overlapScore,
          confidence,
          reasoning,
          calculation_method: calculationMethod,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'category1,subcategory1,category2,subcategory2'
        })
        .select()
        .single();

      if (error) {
        console.error('Error caching overlap result:', error);
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
      console.error('Error storing overlap cache:', error);
    }
  }

  /**
   * Batch cache multiple overlap results
   */
  async batchCacheOverlapResults(
    results: Array<{
      key: OverlapCacheKey;
      overlapScore: number;
      confidence: number;
      reasoning: string[];
      calculationMethod: string;
    }>,
    ttlDays: number = 30
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    const cacheEntries = results.map(result => ({
      category1: result.key.category1,
      subcategory1: result.key.subcategory1 || null,
      category2: result.key.category2,
      subcategory2: result.key.subcategory2 || null,
      overlap_score: result.overlapScore,
      confidence: result.confidence,
      reasoning: result.reasoning,
      calculation_method: result.calculationMethod,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString()
    }));

    try {
      const { error } = await this.supabase
        .from('audience_overlap_cache')
        .upsert(cacheEntries, {
          onConflict: 'category1,subcategory1,category2,subcategory2'
        });

      if (error) {
        console.error('Error batch caching overlap results:', error);
        return;
      }

      // Store in memory cache
      for (const result of results) {
        const cacheKey = this.generateCacheKey(result.key);
        const cachedResult: CachedOverlapResult = {
          id: '',
          category1: result.key.category1,
          subcategory1: result.key.subcategory1,
          category2: result.key.category2,
          subcategory2: result.key.subcategory2,
          overlapScore: result.overlapScore,
          confidence: result.confidence,
          reasoning: result.reasoning,
          calculationMethod: result.calculationMethod,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString()
        };
        this.memoryCache.set(cacheKey, cachedResult);
      }
    } catch (error) {
      console.error('Error batch storing overlap cache:', error);
    }
  }

  /**
   * Precompute common overlap pairs
   */
  async precomputeCommonPairs(): Promise<void> {
    const commonPairs = [
      // Entertainment subcategories
      { category1: 'Entertainment', subcategory1: 'Rock', category2: 'Entertainment', subcategory2: 'Metal' },
      { category1: 'Entertainment', subcategory1: 'Pop', category2: 'Entertainment', subcategory2: 'Electronic' },
      { category1: 'Entertainment', subcategory1: 'Jazz', category2: 'Entertainment', subcategory2: 'Blues' },
      
      // Technology subcategories
      { category1: 'Technology', subcategory1: 'AI/ML', category2: 'Technology', subcategory2: 'Data Science' },
      { category1: 'Technology', subcategory1: 'Web Development', category2: 'Technology', subcategory2: 'Mobile' },
      
      // Business subcategories
      { category1: 'Business', subcategory1: 'Marketing', category2: 'Business', subcategory2: 'Sales' },
      { category1: 'Business', subcategory1: 'Finance', category2: 'Business', subcategory2: 'Investment' },
      
      // Cross-category overlaps
      { category1: 'Entertainment', subcategory1: 'Rock', category2: 'Sports', subcategory2: 'Extreme Sports' },
      { category1: 'Technology', subcategory1: 'AI/ML', category2: 'Business', subcategory2: 'Leadership' }
    ];

    console.log(`Precomputing ${commonPairs.length} common overlap pairs...`);
    
    // This would integrate with the actual overlap calculation service
    // For now, we'll just log the pairs that should be precomputed
    for (const pair of commonPairs) {
      console.log(`Precomputing: ${pair.category1}:${pair.subcategory1} vs ${pair.category2}:${pair.subcategory2}`);
    }
  }

  /**
   * Clean expired cache entries
   */
  async cleanExpiredEntries(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('audience_overlap_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        console.error('Error cleaning expired cache entries:', error);
        return 0;
      }

      const deletedCount = data?.length || 0;
      console.log(`Cleaned ${deletedCount} expired cache entries`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning cache:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    memoryCacheSize: number;
    expiredEntries: number;
    hitRate?: number;
  }> {
    try {
      const { data: totalData, error: totalError } = await this.supabase
        .from('audience_overlap_cache')
        .select('id', { count: 'exact' });

      const { data: expiredData, error: expiredError } = await this.supabase
        .from('audience_overlap_cache')
        .select('id', { count: 'exact' })
        .lt('expires_at', new Date().toISOString());

      if (totalError || expiredError) {
        console.error('Error getting cache stats:', totalError || expiredError);
        return {
          totalEntries: 0,
          memoryCacheSize: this.memoryCache.size,
          expiredEntries: 0
        };
      }

      return {
        totalEntries: totalData?.length || 0,
        memoryCacheSize: this.memoryCache.size,
        expiredEntries: expiredData?.length || 0
      };
    } catch (error) {
      console.error('Error getting cache statistics:', error);
      return {
        totalEntries: 0,
        memoryCacheSize: this.memoryCache.size,
        expiredEntries: 0
      };
    }
  }

  /**
   * Clear all cache entries
   */
  async clearAllCache(): Promise<void> {
    try {
      await this.supabase
        .from('audience_overlap_cache')
        .delete()
        .neq('id', ''); // Delete all entries

      this.memoryCache.clear();
      console.log('Cleared all overlap cache entries');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Generate cache key from overlap key
   */
  private generateCacheKey(key: OverlapCacheKey): string {
    return `${key.category1}:${key.subcategory1 || 'null'}|${key.category2}:${key.subcategory2 || 'null'}`;
  }

  /**
   * Check if memory cache entry is still valid
   */
  private isMemoryCacheValid(result: CachedOverlapResult): boolean {
    const now = new Date();
    const expiresAt = new Date(result.expiresAt);
    return now < expiresAt;
  }
}

export const audienceOverlapCacheService = new AudienceOverlapCacheService();
