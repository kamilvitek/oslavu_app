// src/lib/services/city-database.ts
import { serverDatabaseService } from '@/lib/supabase';
import { cityNormalizationService } from './city-normalization';
import { aiCityInfoService } from './ai-city-info';

export interface CityInfo {
  id: string;
  name_en: string;
  name_cs?: string;
  country_code: string;
  population?: number;
  latitude?: number;
  longitude?: number;
  nearby_cities?: Array<{
    city_id: string;
    distance_km: number;
    impact_factor: number;
  }>;
}

export interface NearbyCityInfo extends CityInfo {
  distance_km: number;
  impact_factor: number;
}

/**
 * Service for querying city database
 * Provides city information, population data, and nearby city relationships
 * Uses hybrid approach: database first, then AI fallback, then cache AI results
 */
export class CityDatabaseService {
  /**
   * Get city information by name (supports both English and Czech names)
   * HYBRID APPROACH: Database first, then AI fallback, then cache AI results
   */
  async getCityInfo(cityName: string): Promise<CityInfo | null> {
    try {
      // Step 1: Normalize city name
      const normalizedCity = await cityNormalizationService.getAPICityName(cityName);
      
      // Step 2: Try database first (by English name)
      let cityInfo = await this.getCityInfoFromDatabase(normalizedCity, 'name_en');
      if (cityInfo) {
        console.log(`✅ City info found in database: ${normalizedCity}`);
        return cityInfo;
      }
      
      // Step 3: Try database by Czech name (if original was Czech)
      if (cityName !== normalizedCity) {
        cityInfo = await this.getCityInfoFromDatabase(cityName, 'name_cs');
        if (cityInfo) {
          console.log(`✅ City info found in database (Czech name): ${cityName}`);
          return cityInfo;
        }
      }
      
      // Step 4: Database not found - use AI to get city info
      console.log(`🤖 City not in database, using AI: ${cityName}`);
      cityInfo = await this.getCityInfoFromAI(cityName, normalizedCity);
      
      // Step 5: Cache AI result in database for future use
      if (cityInfo) {
        const cachedCityInfo = await this.cacheCityInfoInDatabase(cityInfo);
        if (cachedCityInfo) {
          // Use the cached version with ID for future relationship caching
          cityInfo = cachedCityInfo;
          console.log(`💾 Cached city info in database: ${normalizedCity} (ID: ${cityInfo.id})`);
        } else {
          console.log(`ℹ️ City info retrieved from AI but not cached: ${normalizedCity}`);
        }
      }
      
      return cityInfo;
    } catch (error) {
      console.error('Error getting city info:', error);
      return null;
    }
  }

  /**
   * Get city info from database by name
   * @param name City name to search for
   * @param field Field to search in ('name_en' or 'name_cs')
   */
  private async getCityInfoFromDatabase(
    name: string,
    field: 'name_en' | 'name_cs' = 'name_en'
  ): Promise<CityInfo | null> {
    try {
      const query = serverDatabaseService.getClient()
        .from('cities')
        .select('*')
        .eq(field, name)
        .limit(1);

      const { data, error } = await serverDatabaseService.executeWithRetry(async () => {
        return await query;
      });

      if (error) {
        console.error(`Error querying city by ${field}:`, error);
        return null;
      }

      if (data && data.length > 0) {
        return this.mapToCityInfo(data[0]);
      }

      return null;
    } catch (error) {
      console.error(`Error getting city info from database (${field}):`, error);
      return null;
    }
  }

  /**
   * Get city info from AI service
   * @param originalName Original city name (may be Czech)
   * @param normalizedName Normalized English name
   */
  private async getCityInfoFromAI(
    originalName: string,
    normalizedName: string
  ): Promise<CityInfo | null> {
    try {
      return await aiCityInfoService.getCityInfoFromLLM(originalName, normalizedName);
    } catch (error) {
      console.error('Error getting city info from AI:', error);
      return null;
    }
  }

  /**
   * Cache city info in database for future use
   * Only caches if city has population and coordinates
   * Returns the cached city info with ID, or null if caching failed
   */
  private async cacheCityInfoInDatabase(cityInfo: CityInfo): Promise<CityInfo | null> {
    try {
      // Only cache if we have essential data
      if (!cityInfo.population || !cityInfo.latitude || !cityInfo.longitude) {
        console.warn(`⚠️ Skipping cache for city without essential data: ${cityInfo.name_en}`);
        return null;
      }

      const { data, error } = await serverDatabaseService.executeWithRetry(async () => {
        return await serverDatabaseService.getClient()
          .from('cities')
          .insert({
            name_en: cityInfo.name_en,
            name_cs: cityInfo.name_cs || null,
            country_code: cityInfo.country_code || 'CZ',
            population: cityInfo.population,
            latitude: cityInfo.latitude,
            longitude: cityInfo.longitude,
            nearby_cities: null
          })
          .select()
          .single();
      });

      if (error) {
        // Ignore duplicate key errors (city already exists)
        if (error.code === '23505') {
          console.log(`ℹ️ City already exists in database: ${cityInfo.name_en}`);
          // Try to fetch the existing city to get its ID
          const existingCity = await this.getCityInfoFromDatabase(cityInfo.name_en, 'name_en');
          return existingCity;
        } else {
          console.error('Error caching city info in database:', error);
          return null;
        }
      } else if (data) {
        console.log(`✅ Successfully cached city info: ${cityInfo.name_en}`);
        // Return the cached city info with ID
        return this.mapToCityInfo(data);
      }
      
      return null;
    } catch (error) {
      console.error('Error caching city info in database:', error);
      return null;
    }
  }

  /**
   * Find nearby cities that could impact attendance
   * Returns cities within maxDistance that have population >= minPopulation
   */
  async findNearbyCities(
    cityId: string,
    maxDistance: number = 50,
    minPopulation: number = 50000
  ): Promise<NearbyCityInfo[]> {
    try {
      // Get the source city
      const sourceCity = await this.getCityInfoById(cityId);
      if (!sourceCity || !sourceCity.latitude || !sourceCity.longitude) {
        return [];
      }

      // Query all cities within the country
      const { data: allCities, error } = await serverDatabaseService.executeWithRetry(async () => {
        return await serverDatabaseService.getClient()
          .from('cities')
          .select('*')
          .eq('country_code', sourceCity.country_code)
          .gte('population', minPopulation)
          .neq('id', cityId);
      });

      if (error) {
        console.error('Error finding nearby cities:', error);
        return [];
      }

      if (!allCities || allCities.length === 0) {
        return [];
      }

      // Calculate distances and filter by maxDistance
      const nearbyCities: NearbyCityInfo[] = [];
      for (const city of allCities) {
        if (!city.latitude || !city.longitude) continue;

        const distance = this.calculateDistance(
          sourceCity.latitude!,
          sourceCity.longitude!,
          city.latitude,
          city.longitude
        );

        if (distance <= maxDistance) {
          const cityInfo = this.mapToCityInfo(city);
          nearbyCities.push({
            ...cityInfo,
            distance_km: distance,
            impact_factor: this.calculateImpactFactor(distance, city.population || 0)
          });
        }
      }

      // Sort by distance (closest first)
      nearbyCities.sort((a, b) => a.distance_km - b.distance_km);

      return nearbyCities;
    } catch (error) {
      console.error('Error finding nearby cities:', error);
      return [];
    }
  }

  /**
   * Get impact cities for a small city
   * Returns nearby larger cities that could draw attendees away
   * HYBRID APPROACH: Database relationships first, then calculate, then AI fallback
   */
  async getImpactCities(
    cityName: string,
    minPopulation: number = 50000,
    maxDistance: number = 50
  ): Promise<NearbyCityInfo[]> {
    try {
      const cityInfo = await this.getCityInfo(cityName);
      if (!cityInfo) {
        console.warn(`⚠️ Cannot get impact cities: city info not found for "${cityName}"`);
        return [];
      }

      // Check if city is small (below threshold)
      const SMALL_CITY_THRESHOLD = 50000;
      if (cityInfo.population && cityInfo.population >= SMALL_CITY_THRESHOLD) {
        // City is not small, no need for impact cities
        return [];
      }

      // Step 1: Check database for pre-computed relationships
      if (cityInfo.nearby_cities && cityInfo.nearby_cities.length > 0) {
        console.log(`📋 Using pre-computed relationships from database for: ${cityName}`);
        return await this.getImpactCitiesFromDatabase(cityInfo, minPopulation);
      }

      // Step 2: Calculate from database (existing logic)
      if (cityInfo.id) {
        const calculated = await this.findNearbyCities(cityInfo.id, maxDistance, minPopulation);
        if (calculated.length > 0) {
          // Cache relationships for future use
          await this.cacheCityRelationships(cityInfo.id, calculated);
          console.log(`✅ Calculated and cached ${calculated.length} impact cities from database`);
          return calculated;
        }
      }

      // Step 3: Use AI to find nearby cities
      console.log(`🤖 Using AI to find impact cities for: ${cityName}`);
      const aiResult = await this.findImpactCitiesWithAI(cityInfo, minPopulation, maxDistance);
      
      // Step 4: Cache AI result in database
      if (aiResult.length > 0 && cityInfo.id) {
        await this.cacheCityRelationships(cityInfo.id, aiResult);
        console.log(`💾 Cached ${aiResult.length} AI-found impact cities in database`);
      }
      
      return aiResult;
    } catch (error) {
      console.error('Error getting impact cities:', error);
      return [];
    }
  }

  /**
   * Get impact cities from database relationships
   * @param cityInfo Source city info
   * @param minPopulation Minimum population threshold
   */
  private async getImpactCitiesFromDatabase(
    cityInfo: CityInfo,
    minPopulation: number
  ): Promise<NearbyCityInfo[]> {
    try {
      if (!cityInfo.nearby_cities || cityInfo.nearby_cities.length === 0) {
        return [];
      }

      const impactCities: NearbyCityInfo[] = [];
      for (const nearby of cityInfo.nearby_cities) {
        const nearbyCity = await this.getCityInfoById(nearby.city_id);
        if (nearbyCity && nearbyCity.population && nearbyCity.population >= minPopulation) {
          impactCities.push({
            ...nearbyCity,
            distance_km: nearby.distance_km,
            impact_factor: nearby.impact_factor
          });
        }
      }
      return impactCities;
    } catch (error) {
      console.error('Error getting impact cities from database:', error);
      return [];
    }
  }

  /**
   * Find impact cities using AI
   * @param cityInfo Source city info
   * @param minPopulation Minimum population threshold
   * @param maxDistance Maximum distance in km
   */
  private async findImpactCitiesWithAI(
    cityInfo: CityInfo,
    minPopulation: number,
    maxDistance: number
  ): Promise<NearbyCityInfo[]> {
    try {
      return await aiCityInfoService.findNearbyCitiesFromLLM(cityInfo, minPopulation, maxDistance);
    } catch (error) {
      console.error('Error finding impact cities with AI:', error);
      return [];
    }
  }

  /**
   * Cache city relationships in database
   * Updates the nearby_cities JSONB field
   */
  private async cacheCityRelationships(
    cityId: string,
    relationships: NearbyCityInfo[]
  ): Promise<void> {
    try {
      if (!cityId || relationships.length === 0) {
        return;
      }

      // First, ensure all related cities exist in database
      for (const relationship of relationships) {
        if (!relationship.id) {
          // City doesn't have ID yet, try to find it or insert it
          const existingCity = await this.getCityInfoFromDatabase(relationship.name_en, 'name_en');
          if (!existingCity && relationship.population && relationship.latitude && relationship.longitude) {
            // Insert the city first
            const { data: insertedCity, error: insertError } = await serverDatabaseService.executeWithRetry(async () => {
              return await serverDatabaseService.getClient()
                .from('cities')
                .insert({
                  name_en: relationship.name_en,
                  name_cs: relationship.name_cs || null,
                  country_code: relationship.country_code || 'CZ',
                  population: relationship.population,
                  latitude: relationship.latitude,
                  longitude: relationship.longitude,
                  nearby_cities: null
                })
                .select()
                .single();
            });

            if (!insertError && insertedCity) {
              relationship.id = insertedCity.id;
            }
          } else if (existingCity) {
            relationship.id = existingCity.id;
          }
        }
      }

      // Build relationships array with city IDs
      const relationshipsArray = relationships
        .filter(r => r.id) // Only include cities that have IDs
        .map(r => ({
          city_id: r.id!,
          distance_km: r.distance_km,
          impact_factor: r.impact_factor
        }));

      if (relationshipsArray.length === 0) {
        console.warn(`⚠️ No valid relationships to cache for city ID: ${cityId}`);
        return;
      }

      // Update the city's nearby_cities field
      const { error } = await serverDatabaseService.executeWithRetry(async () => {
        return await serverDatabaseService.getClient()
          .from('cities')
          .update({
            nearby_cities: relationshipsArray
          })
          .eq('id', cityId);
      });

      if (error) {
        console.error('Error caching city relationships:', error);
      } else {
        console.log(`✅ Successfully cached ${relationshipsArray.length} relationships for city ID: ${cityId}`);
      }
    } catch (error) {
      console.error('Error caching city relationships:', error);
    }
  }

  /**
   * Get city info by ID
   */
  private async getCityInfoById(cityId: string): Promise<CityInfo | null> {
    try {
      const { data, error } = await serverDatabaseService.executeWithRetry(async () => {
        return await serverDatabaseService.getClient()
          .from('cities')
          .select('*')
          .eq('id', cityId)
          .limit(1)
          .single();
      });

      if (error) {
        console.error('Error getting city by ID:', error);
        return null;
      }

      return data ? this.mapToCityInfo(data) : null;
    } catch (error) {
      console.error('Error getting city info by ID:', error);
      return null;
    }
  }

  /**
   * Map database row to CityInfo
   */
  private mapToCityInfo(row: any): CityInfo {
    return {
      id: row.id,
      name_en: row.name_en,
      name_cs: row.name_cs,
      country_code: row.country_code,
      population: row.population,
      latitude: row.latitude ? parseFloat(row.latitude) : undefined,
      longitude: row.longitude ? parseFloat(row.longitude) : undefined,
      nearby_cities: row.nearby_cities || []
    };
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate impact factor based on distance and population
   * Closer cities and larger cities have higher impact
   */
  private calculateImpactFactor(distanceKm: number, population: number): number {
    // Base impact factor from distance (closer = higher impact)
    const distanceFactor = Math.max(0, 1 - distanceKm / 100); // Linear decay to 0 at 100km

    // Population factor (larger cities have more impact)
    const populationFactor = Math.min(1, population / 500000); // Normalize to 500k population

    // Combined impact factor (weighted average)
    return (distanceFactor * 0.6 + populationFactor * 0.4);
  }
}

// Export singleton instance
export const cityDatabaseService = new CityDatabaseService();

