// src/lib/services/ai-city-info.ts
import OpenAI from 'openai';
import { CityInfo, NearbyCityInfo } from './city-database';

/**
 * AI-powered city information service
 * Uses LLM to get city data when not available in database
 */
export class AICityInfoService {
  private openai: OpenAI;

  constructor() {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.openai = new OpenAI({
      apiKey: openaiApiKey
    });
  }

  /**
   * Get city information from LLM
   * Returns city population, coordinates, and country code
   */
  async getCityInfoFromLLM(
    cityName: string,
    normalizedName: string
  ): Promise<CityInfo | null> {
    try {
      console.log(`🤖 AI: Getting city info for "${cityName}" (normalized: "${normalizedName}")`);
      
      const prompt = `You are a geographic data expert. For the city "${cityName}" (normalized name: "${normalizedName}"), provide accurate, up-to-date information.

Return a JSON object with this exact structure:
{
  "name_en": "English city name (e.g., 'Prague', 'Brno')",
  "name_cs": "Czech city name if applicable (e.g., 'Praha', 'Brno'), or null",
  "country_code": "CZ",
  "population": 24538,
  "latitude": 48.7590,
  "longitude": 16.8820
}

Requirements:
- Use accurate, current population data (as of 2024-2025)
- Provide precise coordinates (latitude, longitude) in decimal degrees
- For Czech cities, include both English and Czech names
- If city is not found or unclear, return null
- Return only valid JSON, no additional text

Examples:
- "Břeclav" -> {"name_en": "Breclav", "name_cs": "Břeclav", "country_code": "CZ", "population": 24538, "latitude": 48.7590, "longitude": 16.8820}
- "Velké Meziříčí" -> {"name_en": "Velke Mezirici", "name_cs": "Velké Meziříčí", "country_code": "CZ", "population": 11800, "latitude": 49.3550, "longitude": 16.0125}

Return only the JSON object.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at providing accurate geographic and demographic data. Always return valid JSON objects with no additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      const responseContent = response.choices[0]?.message?.content;
      if (!responseContent) {
        console.error(`❌ AI: No response from OpenAI for city info: "${cityName}"`);
        return null;
      }

      // Clean response (remove markdown code blocks if present)
      const cleanedContent = responseContent.trim().replace(/^```json\s*|\s*```$/g, '').trim();

      try {
        const result = JSON.parse(cleanedContent);
        
        // Validate required fields
        if (!result.name_en || !result.country_code) {
          console.warn(`⚠️ AI: Invalid city info response (missing required fields): "${cityName}"`);
          return null;
        }

        // Validate numeric fields
        if (result.population && (typeof result.population !== 'number' || result.population < 0)) {
          console.warn(`⚠️ AI: Invalid population value: "${cityName}"`);
          result.population = null;
        }

        if (result.latitude && (typeof result.latitude !== 'number' || result.latitude < -90 || result.latitude > 90)) {
          console.warn(`⚠️ AI: Invalid latitude value: "${cityName}"`);
          result.latitude = null;
        }

        if (result.longitude && (typeof result.longitude !== 'number' || result.longitude < -180 || result.longitude > 180)) {
          console.warn(`⚠️ AI: Invalid longitude value: "${cityName}"`);
          result.longitude = null;
        }

        // Only return if we have at least population or coordinates
        if (!result.population && (!result.latitude || !result.longitude)) {
          console.warn(`⚠️ AI: City info missing critical data (population and coordinates): "${cityName}"`);
          return null;
        }

        const cityInfo: CityInfo = {
          id: '', // Will be set when cached in database
          name_en: result.name_en,
          name_cs: result.name_cs || null,
          country_code: result.country_code || 'CZ',
          population: result.population || null,
          latitude: result.latitude || null,
          longitude: result.longitude || null,
          nearby_cities: null
        };

        console.log(`✅ AI: Got city info for "${cityName}": population=${cityInfo.population}, coords=(${cityInfo.latitude}, ${cityInfo.longitude})`);
        return cityInfo;

      } catch (parseError) {
        console.error(`❌ AI: Failed to parse city info response for "${cityName}":`, parseError);
        console.error(`❌ AI: Raw response:`, cleanedContent);
        return null;
      }

    } catch (error) {
      console.error(`❌ AI: Error getting city info for "${cityName}":`, error);
      return null;
    }
  }

  /**
   * Find nearby larger cities using LLM
   * Returns cities with distance and impact factor
   */
  async findNearbyCitiesFromLLM(
    cityInfo: CityInfo,
    minPopulation: number = 50000,
    maxDistance: number = 50
  ): Promise<NearbyCityInfo[]> {
    try {
      if (!cityInfo.latitude || !cityInfo.longitude) {
        console.warn(`⚠️ AI: Cannot find nearby cities without coordinates for: ${cityInfo.name_en}`);
        return [];
      }

      console.log(`🤖 AI: Finding nearby cities for "${cityInfo.name_en}" (population: ${cityInfo.population}, coords: ${cityInfo.latitude}, ${cityInfo.longitude})`);

      const prompt = `You are a geographic expert. For the Czech city "${cityInfo.name_en}" (population: ${cityInfo.population}, coordinates: ${cityInfo.latitude}, ${cityInfo.longitude}), find nearby larger cities that could impact event attendance.

Find cities that:
- Have population >= ${minPopulation}
- Are within ${maxDistance}km distance
- Could draw attendees away from "${cityInfo.name_en}"

Return a JSON array of cities with this structure:
[
  {
    "name_en": "Brno",
    "name_cs": "Brno",
    "country_code": "CZ",
    "population": 402739,
    "latitude": 49.1951,
    "longitude": 16.6068,
    "distance_km": 50.2,
    "impact_factor": 0.65
  }
]

Requirements:
- Provide accurate distance in kilometers (calculate from coordinates)
- Calculate impact_factor (0.0-1.0) based on distance and population:
  * Closer cities and larger cities have higher impact
  * Formula: impact_factor = (distance_factor * 0.6) + (population_factor * 0.4)
  * distance_factor = max(0, 1 - distance_km / 100)
  * population_factor = min(1, population / 500000)
- Include only cities that are actually nearby and relevant
- Return empty array if no suitable cities found
- Return only valid JSON array, no additional text

Return only the JSON array.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at geographic analysis and calculating city relationships. Always return valid JSON arrays with accurate distances and impact factors.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      const responseContent = response.choices[0]?.message?.content;
      if (!responseContent) {
        console.error(`❌ AI: No response from OpenAI for nearby cities: "${cityInfo.name_en}"`);
        return [];
      }

      // Clean response
      const cleanedContent = responseContent.trim().replace(/^```json\s*|\s*```$/g, '').trim();

      try {
        const result = JSON.parse(cleanedContent);
        
        if (!Array.isArray(result)) {
          console.warn(`⚠️ AI: Invalid response format (not an array): "${cityInfo.name_en}"`);
          return [];
        }

        // Validate and filter results
        const validCities: NearbyCityInfo[] = [];
        for (const city of result) {
          // Validate required fields
          if (!city.name_en || !city.country_code) {
            console.warn(`⚠️ AI: Skipping invalid city (missing name or country):`, city);
            continue;
          }

          // Validate numeric fields
          if (typeof city.distance_km !== 'number' || city.distance_km < 0 || city.distance_km > maxDistance) {
            console.warn(`⚠️ AI: Skipping city with invalid distance: ${city.name_en}`);
            continue;
          }

          if (typeof city.impact_factor !== 'number' || city.impact_factor < 0 || city.impact_factor > 1) {
            console.warn(`⚠️ AI: Skipping city with invalid impact_factor: ${city.name_en}`);
            continue;
          }

          if (city.population && (typeof city.population !== 'number' || city.population < minPopulation)) {
            console.warn(`⚠️ AI: Skipping city with population below threshold: ${city.name_en}`);
            continue;
          }

          // Recalculate distance and impact factor to ensure accuracy
          if (city.latitude && city.longitude) {
            const calculatedDistance = this.calculateDistance(
              cityInfo.latitude!,
              cityInfo.longitude!,
              city.latitude,
              city.longitude
            );

            if (calculatedDistance > maxDistance) {
              console.warn(`⚠️ AI: Skipping city beyond max distance: ${city.name_en} (${calculatedDistance}km)`);
              continue;
            }

            const calculatedImpactFactor = this.calculateImpactFactor(
              calculatedDistance,
              city.population || 0
            );

            validCities.push({
              id: '', // Will be set when cached
              name_en: city.name_en,
              name_cs: city.name_cs || null,
              country_code: city.country_code,
              population: city.population || null,
              latitude: city.latitude || null,
              longitude: city.longitude || null,
              nearby_cities: null,
              distance_km: calculatedDistance,
              impact_factor: calculatedImpactFactor
            });
          }
        }

        // Sort by distance (closest first)
        validCities.sort((a, b) => a.distance_km - b.distance_km);

        console.log(`✅ AI: Found ${validCities.length} nearby cities for "${cityInfo.name_en}"`);
        return validCities;

      } catch (parseError) {
        console.error(`❌ AI: Failed to parse nearby cities response for "${cityInfo.name_en}":`, parseError);
        console.error(`❌ AI: Raw response:`, cleanedContent);
        return [];
      }

    } catch (error) {
      console.error(`❌ AI: Error finding nearby cities for "${cityInfo.name_en}":`, error);
      return [];
    }
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
export const aiCityInfoService = new AICityInfoService();

