// src/lib/services/venue-capacity.ts
import { venueCityMappingService } from './venue-city-mapping';

export interface VenueCapacityEstimate {
  capacity: number;
  confidence: number; // 0.0 to 1.0
  source: 'explicit' | 'venue_capacity' | 'category_default';
  method: 'pattern_match' | 'category_default' | 'venue_database' | 'fallback';
  reasoning: string[];
}

export class VenueCapacityService {
  private readonly capacityPatterns: Map<string, number> = new Map([
    // Stadiums and Arenas
    ['stadium', 15000],
    ['arena', 12000],
    ['field', 8000],
    ['ground', 6000],
    ['pitch', 5000],
    
    // Large Venues
    ['convention center', 2000],
    ['convention centre', 2000],
    ['exhibition center', 1500],
    ['exhibition centre', 1500],
    ['conference center', 800],
    ['conference centre', 800],
    ['expo center', 1000],
    ['expo centre', 1000],
    
    // Hotels and Conference Facilities
    ['hotel', 400],
    ['resort', 600],
    ['spa', 200],
    ['grand hotel', 800],
    ['palace hotel', 1000],
    
    // Theaters and Performance Venues
    ['theater', 500],
    ['theatre', 500],
    ['opera house', 1200],
    ['concert hall', 800],
    ['auditorium', 600],
    ['amphitheater', 2000],
    ['amphitheatre', 2000],
    ['philharmonic', 1000],
    
    // Clubs and Entertainment
    ['club', 300],
    ['nightclub', 400],
    ['bar', 150],
    ['pub', 100],
    ['restaurant', 80],
    ['cafe', 50],
    ['lounge', 120],
    
    // Educational and Cultural
    ['university', 300],
    ['college', 200],
    ['school', 150],
    ['library', 100],
    ['museum', 200],
    ['gallery', 80],
    ['cultural center', 400],
    ['cultural centre', 400],
    
    // Sports Facilities
    ['gym', 200],
    ['fitness center', 150],
    ['sports center', 300],
    ['sports centre', 300],
    ['swimming pool', 100],
    ['tennis court', 50],
    ['basketball court', 200],
    
    // Czech-specific venues
    ['hrad', 200], // castle
    ['zámek', 300], // chateau
    ['kostel', 150], // church
    ['klášter', 100], // monastery
    ['radnice', 200], // town hall
    ['divadlo', 400], // theater
    ['kino', 200], // cinema
    ['hospoda', 80], // pub
    ['restaurace', 60], // restaurant
  ]);

  private readonly categoryDefaults: Map<string, number> = new Map([
    ['Sports', 5000],
    ['Entertainment', 2000],
    ['Arts & Culture', 800],
    ['Business', 300],
    ['Technology', 400],
    ['Education', 200],
    ['Health & Wellness', 150],
    ['Food & Drink', 100],
    ['Other', 200],
  ]);

  private readonly capacityMultipliers: Map<string, number> = new Map([
    ['Sports', 0.9], // Sports events typically use 90% of venue capacity
    ['Entertainment', 0.8], // Concerts use 80% capacity
    ['Arts & Culture', 0.7], // Cultural events use 70% capacity
    ['Business', 0.6], // Business events use 60% capacity
    ['Technology', 0.75], // Tech events use 75% capacity
    ['Education', 0.6], // Educational events use 60% capacity
    ['Health & Wellness', 0.5], // Wellness events use 50% capacity
    ['Food & Drink', 0.8], // Food events use 80% capacity
    ['Other', 0.7], // Default 70% capacity
  ]);

  /**
   * Estimate venue capacity based on venue name, city, and event category
   */
  estimateCapacity(
    venueName: string, 
    city?: string, 
    category?: string
  ): VenueCapacityEstimate {
    if (!venueName || venueName.trim() === '') {
      return this.getCategoryDefault(category, ['No venue name provided']);
    }

    const normalizedName = venueName.toLowerCase().trim();
    const reasoning: string[] = [];

    // Try pattern matching first
    const patternMatch = this.findPatternMatch(normalizedName);
    if (patternMatch) {
      const baseCapacity = patternMatch.capacity;
      const adjustedCapacity = this.applyCategoryScaling(baseCapacity, category);
      
      reasoning.push(`Pattern match: "${patternMatch.pattern}" → ${baseCapacity} capacity`);
      if (category) {
        reasoning.push(`Category scaling (${category}): ${baseCapacity} × ${this.getCategoryMultiplier(category)} = ${adjustedCapacity}`);
      }

      return {
        capacity: adjustedCapacity,
        confidence: 0.7, // Pattern match confidence
        source: 'venue_capacity',
        method: 'pattern_match',
        reasoning
      };
    }

    // Try venue database lookup
    const venueCity = venueCityMappingService.getCityForVenue(venueName);
    if (venueCity) {
      const databaseEstimate = this.estimateFromDatabase(venueName, venueCity);
      if (databaseEstimate) {
        reasoning.push(`Database lookup for ${venueName} in ${venueCity}`);
        return {
          ...databaseEstimate,
          reasoning: [...reasoning, ...databaseEstimate.reasoning]
        };
      }
    }

    // Try city-specific estimation
    if (city) {
      const cityEstimate = this.estimateFromCityContext(venueName, city, category);
      if (cityEstimate) {
        reasoning.push(`City-specific estimation for ${city}`);
        return {
          ...cityEstimate,
          reasoning: [...reasoning, ...cityEstimate.reasoning]
        };
      }
    }

    // Fall back to category defaults
    return this.getCategoryDefault(category, [
      `No pattern match found for "${venueName}"`,
      'Using category-based default'
    ]);
  }

  /**
   * Estimate expected attendees based on venue capacity and event category
   */
  estimateAttendees(
    venueName: string, 
    category?: string, 
    city?: string
  ): VenueCapacityEstimate {
    return this.estimateCapacity(venueName, city, category);
  }

  /**
   * Find pattern match for venue name
   */
  private findPatternMatch(venueName: string): { pattern: string; capacity: number } | null {
    for (const [pattern, capacity] of this.capacityPatterns) {
      if (venueName.includes(pattern)) {
        return { pattern, capacity };
      }
    }
    return null;
  }

  /**
   * Apply category-based scaling to capacity
   */
  private applyCategoryScaling(capacity: number, category?: string): number {
    if (!category) return capacity;
    
    const multiplier = this.getCategoryMultiplier(category);
    return Math.round(capacity * multiplier);
  }

  /**
   * Get category multiplier for capacity scaling
   */
  private getCategoryMultiplier(category: string): number {
    return this.capacityMultipliers.get(category) || 0.7;
  }

  /**
   * Get category-based default capacity
   */
  private getCategoryDefault(category?: string, baseReasoning: string[] = []): VenueCapacityEstimate {
    const defaultCapacity = category ? 
      this.categoryDefaults.get(category) || 200 : 
      200;

    return {
      capacity: defaultCapacity,
      confidence: 0.3, // Category default confidence
      source: 'category_default',
      method: 'category_default',
      reasoning: [...baseReasoning, `Using default capacity for ${category || 'unknown'} category`]
    };
  }

  /**
   * Estimate from venue database (placeholder for future enhancement)
   */
  private estimateFromDatabase(venueName: string, city: string): VenueCapacityEstimate | null {
    // This could be enhanced to query a venues database
    // For now, return null to use other methods
    return null;
  }

  /**
   * Estimate based on city context
   */
  private estimateFromCityContext(
    venueName: string, 
    city: string, 
    category?: string
  ): VenueCapacityEstimate | null {
    const cityLower = city.toLowerCase();
    
    // Major cities tend to have larger venues
    if (['prague', 'praha', 'brno', 'ostrava'].includes(cityLower)) {
      const baseCapacity = this.getBaseCapacityForMajorCity(venueName);
      if (baseCapacity) {
        const adjustedCapacity = this.applyCategoryScaling(baseCapacity, category);
        return {
          capacity: adjustedCapacity,
          confidence: 0.6, // City context confidence
          source: 'venue_capacity',
          method: 'venue_database',
          reasoning: [`Major city (${city}) context: ${baseCapacity} base capacity`]
        };
      }
    }

    return null;
  }

  /**
   * Get base capacity for major cities
   */
  private getBaseCapacityForMajorCity(venueName: string): number | null {
    const name = venueName.toLowerCase();
    
    // Conference centers in major cities are typically larger
    if (name.includes('conference') || name.includes('convention')) {
      return 1000;
    }
    
    // Hotels in major cities are typically larger
    if (name.includes('hotel')) {
      return 600;
    }
    
    // Theaters in major cities are typically larger
    if (name.includes('theater') || name.includes('theatre')) {
      return 800;
    }
    
    return null;
  }

  /**
   * Get capacity statistics for a venue type
   */
  getCapacityStats(venueType: string): { min: number; max: number; avg: number } {
    const matchingPatterns = Array.from(this.capacityPatterns.entries())
      .filter(([pattern]) => pattern.includes(venueType.toLowerCase()));
    
    if (matchingPatterns.length === 0) {
      return { min: 100, max: 500, avg: 250 };
    }
    
    const capacities = matchingPatterns.map(([, capacity]) => capacity);
    return {
      min: Math.min(...capacities),
      max: Math.max(...capacities),
      avg: Math.round(capacities.reduce((sum, cap) => sum + cap, 0) / capacities.length)
    };
  }

  /**
   * Validate capacity estimate
   */
  validateCapacity(estimate: VenueCapacityEstimate, venueName: string, category?: string): boolean {
    // Basic sanity checks
    if (estimate.capacity < 10) return false; // Too small
    if (estimate.capacity > 100000) return false; // Too large
    
    // Category-specific validation
    if (category === 'Sports' && estimate.capacity < 100) return false;
    if (category === 'Business' && estimate.capacity > 5000) return false;
    
    return true;
  }
}

// Export singleton instance
export const venueCapacityService = new VenueCapacityService();
