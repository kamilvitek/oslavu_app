// src/lib/services/city-database.ts
import { serverDatabaseService } from '@/lib/supabase';
import { cityNormalizationService } from './city-normalization';

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
 */
export class CityDatabaseService {
  /**
   * Get city information by name (supports both English and Czech names)
   */
  async getCityInfo(cityName: string): Promise<CityInfo | null> {
    try {
      // Normalize city name to English
      const normalizedCity = await cityNormalizationService.getAPICityName(cityName);
      
      // Try to find by English name first
      let query = serverDatabaseService.getClient()
        .from('cities')
        .select('*')
        .eq('name_en', normalizedCity)
        .limit(1);

      const { data: englishMatch, error: englishError } = await serverDatabaseService.executeWithRetry(async () => {
        return await query;
      });

      if (englishError) {
        console.error('Error querying city by English name:', englishError);
      }

      if (englishMatch && englishMatch.length > 0) {
        return this.mapToCityInfo(englishMatch[0]);
      }

      // Try to find by Czech name
      query = serverDatabaseService.getClient()
        .from('cities')
        .select('*')
        .eq('name_cs', cityName)
        .limit(1);

      const { data: czechMatch, error: czechError } = await serverDatabaseService.executeWithRetry(async () => {
        return await query;
      });

      if (czechError) {
        console.error('Error querying city by Czech name:', czechError);
      }

      if (czechMatch && czechMatch.length > 0) {
        return this.mapToCityInfo(czechMatch[0]);
      }

      return null;
    } catch (error) {
      console.error('Error getting city info:', error);
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
   */
  async getImpactCities(
    cityName: string,
    minPopulation: number = 50000,
    maxDistance: number = 50
  ): Promise<NearbyCityInfo[]> {
    try {
      const cityInfo = await this.getCityInfo(cityName);
      if (!cityInfo) {
        return [];
      }

      // Check if city is small (below threshold)
      const SMALL_CITY_THRESHOLD = 50000;
      if (cityInfo.population && cityInfo.population >= SMALL_CITY_THRESHOLD) {
        // City is not small, no need for impact cities
        return [];
      }

      // Check if city has nearby_cities stored in database
      if (cityInfo.nearby_cities && cityInfo.nearby_cities.length > 0) {
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
      }

      // Fallback: calculate nearby cities dynamically
      return await this.findNearbyCities(cityInfo.id, maxDistance, minPopulation);
    } catch (error) {
      console.error('Error getting impact cities:', error);
      return [];
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

