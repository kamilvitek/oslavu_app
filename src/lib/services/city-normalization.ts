// src/lib/services/city-normalization.ts
import { cityRecognitionService } from './city-recognition';

export interface CityNormalizationResult {
  normalized: string;
  original: string;
  aliases: string[];
  confidence: number;
  isRecognized: boolean;
}

/**
 * Centralized city normalization service
 * Normalizes city names before API calls and database queries
 * Caches results to avoid repeated LLM calls
 */
export class CityNormalizationService {
  private cache: Map<string, CityNormalizationResult> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private cacheTimestamps: Map<string, number> = new Map();

  /**
   * Normalize city name for API calls (returns English name)
   * Caches results to avoid repeated LLM calls
   */
  async normalizeCityForAPI(city: string): Promise<CityNormalizationResult> {
    const cacheKey = city.toLowerCase().trim();
    
    // Check cache
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      console.log(`📦 Using cached city normalization: "${city}" -> "${cached.normalized}"`);
      return cached;
    }

    // Normalize using city recognition service
    const recognition = await cityRecognitionService.recognizeCity(city);
    const aliases = cityRecognitionService.getCityAliases(recognition.normalizedCity);

    const result: CityNormalizationResult = {
      normalized: recognition.normalizedCity,
      original: city,
      aliases,
      confidence: recognition.confidence,
      isRecognized: recognition.isRecognized
    };

    // Cache the result
    this.cache.set(cacheKey, result);
    this.cacheTimestamps.set(cacheKey, Date.now());

    console.log(`✅ City normalized for API: "${city}" -> "${result.normalized}" (confidence: ${result.confidence})`);

    return result;
  }

  /**
   * Get normalized city name for API calls (English name)
   * Returns the normalized English name that APIs expect
   */
  async getAPICityName(city: string): Promise<string> {
    const result = await this.normalizeCityForAPI(city);
    return result.normalized;
  }

  /**
   * Get normalized city name for database queries
   * Returns the normalized name for consistent database lookups
   */
  async getDatabaseCityName(city: string): Promise<string> {
    const result = await this.normalizeCityForAPI(city);
    return result.normalized;
  }

  /**
   * Get all aliases for a city (for fuzzy matching)
   */
  async getCityAliases(city: string): Promise<string[]> {
    const result = await this.normalizeCityForAPI(city);
    return result.aliases;
  }

  /**
   * Batch normalize multiple cities
   */
  async normalizeCitiesForAPI(cities: string[]): Promise<Map<string, CityNormalizationResult>> {
    const results = new Map<string, CityNormalizationResult>();
    
    // Process cities in parallel (cached ones will be fast)
    const promises = cities.map(async (city) => {
      const normalized = await this.normalizeCityForAPI(city);
      results.set(city, normalized);
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Get cached result if available and not expired
   */
  private getCachedResult(cacheKey: string): CityNormalizationResult | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return null;
    }

    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() - timestamp > this.CACHE_TTL) {
      this.cache.delete(cacheKey);
      this.cacheTimestamps.delete(cacheKey);
      return null;
    }

    return cached;
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const cityNormalizationService = new CityNormalizationService();

