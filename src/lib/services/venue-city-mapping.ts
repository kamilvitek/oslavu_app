// src/lib/services/venue-city-mapping.ts
/**
 * Comprehensive venue-to-city mapping service
 * Maps venue names to their correct cities, especially useful when city is incorrectly set as country name
 */

export interface VenueCityMapping {
  venue: string;
  city: string;
  country: string;
  confidence: 'high' | 'medium' | 'low';
}

export class VenueCityMappingService {
  private readonly venueMappings: Record<string, VenueCityMapping> = {
    // Czech Republic - Prague venues
    'o2 arena': { venue: 'O2 Arena', city: 'Prague', country: 'Czech Republic', confidence: 'high' },
    'o2 arena prague': { venue: 'O2 Arena Prague', city: 'Prague', country: 'Czech Republic', confidence: 'high' },
    'prague o2 arena': { venue: 'Prague O2 Arena', city: 'Prague', country: 'Czech Republic', confidence: 'high' },
    'forum karlin': { venue: 'Forum Karlín', city: 'Prague', country: 'Czech Republic', confidence: 'high' },
    'forum karlín': { venue: 'Forum Karlín', city: 'Prague', country: 'Czech Republic', confidence: 'high' },
    'rudolfinum': { venue: 'Rudolfinum', city: 'Prague', country: 'Czech Republic', confidence: 'high' },
    'national theatre': { venue: 'National Theatre', city: 'Prague', country: 'Czech Republic', confidence: 'high' },
    'state opera': { venue: 'State Opera', city: 'Prague', country: 'Czech Republic', confidence: 'high' },
    'prague castle': { venue: 'Prague Castle', city: 'Prague', country: 'Czech Republic', confidence: 'high' },
    'charles university': { venue: 'Charles University', city: 'Prague', country: 'Czech Republic', confidence: 'high' },
    'czech technical university': { venue: 'Czech Technical University', city: 'Prague', country: 'Czech Republic', confidence: 'high' },
    'prague city hall': { venue: 'Prague City Hall', city: 'Prague', country: 'Czech Republic', confidence: 'high' },
    'prague conference centre': { venue: 'Prague Conference Centre', city: 'Prague', country: 'Czech Republic', confidence: 'high' },
    'prague conference center': { venue: 'Prague Conference Center', city: 'Prague', country: 'Czech Republic', confidence: 'high' },
    'prague congress centre': { venue: 'Prague Congress Centre', city: 'Prague', country: 'Czech Republic', confidence: 'high' },
    'prague exhibition grounds': { venue: 'Prague Exhibition Grounds', city: 'Prague', country: 'Czech Republic', confidence: 'high' },
    'prague marriott': { venue: 'Prague Marriott', city: 'Prague', country: 'Czech Republic', confidence: 'high' },
    'hilton prague': { venue: 'Hilton Prague', city: 'Prague', country: 'Czech Republic', confidence: 'high' },
    'intercontinental prague': { venue: 'InterContinental Prague', city: 'Prague', country: 'Czech Republic', confidence: 'high' },
    'prague hotel': { venue: 'Prague Hotel', city: 'Prague', country: 'Czech Republic', confidence: 'medium' },
    'prague university': { venue: 'Prague University', city: 'Prague', country: 'Czech Republic', confidence: 'medium' },

    // Czech Republic - Brno venues
    'brno exhibition centre': { venue: 'Brno Exhibition Centre', city: 'Brno', country: 'Czech Republic', confidence: 'high' },
    'brno congress centre': { venue: 'Brno Congress Centre', city: 'Brno', country: 'Czech Republic', confidence: 'high' },
    'brno university': { venue: 'Brno University', city: 'Brno', country: 'Czech Republic', confidence: 'high' },
    'masaryk university': { venue: 'Masaryk University', city: 'Brno', country: 'Czech Republic', confidence: 'high' },
    'brno marriott': { venue: 'Brno Marriott', city: 'Brno', country: 'Czech Republic', confidence: 'high' },
    'hilton brno': { venue: 'Hilton Brno', city: 'Brno', country: 'Czech Republic', confidence: 'high' },
    'brno hotel': { venue: 'Brno Hotel', city: 'Brno', country: 'Czech Republic', confidence: 'medium' },

    // Czech Republic - Ostrava venues
    'ostrava arena': { venue: 'Ostrava Arena', city: 'Ostrava', country: 'Czech Republic', confidence: 'high' },
    'cez arena': { venue: 'ČEZ Arena', city: 'Ostrava', country: 'Czech Republic', confidence: 'high' },
    'čez arena': { venue: 'ČEZ Arena', city: 'Ostrava', country: 'Czech Republic', confidence: 'high' },
    'ostrava exhibition centre': { venue: 'Ostrava Exhibition Centre', city: 'Ostrava', country: 'Czech Republic', confidence: 'high' },
    'ostrava university': { venue: 'Ostrava University', city: 'Ostrava', country: 'Czech Republic', confidence: 'high' },
    'ostrava marriott': { venue: 'Ostrava Marriott', city: 'Ostrava', country: 'Czech Republic', confidence: 'high' },
    'ostrava hotel': { venue: 'Ostrava Hotel', city: 'Ostrava', country: 'Czech Republic', confidence: 'medium' },

    // Czech Republic - Other cities
    'olomouc arena': { venue: 'Olomouc Arena', city: 'Olomouc', country: 'Czech Republic', confidence: 'high' },
    'olomouc university': { venue: 'Olomouc University', city: 'Olomouc', country: 'Czech Republic', confidence: 'high' },
    'plzen arena': { venue: 'Plzeň Arena', city: 'Plzen', country: 'Czech Republic', confidence: 'high' },
    'liberec arena': { venue: 'Liberec Arena', city: 'Liberec', country: 'Czech Republic', confidence: 'high' },
    'ceske budejovice arena': { venue: 'České Budějovice Arena', city: 'Ceske Budejovice', country: 'Czech Republic', confidence: 'high' },
    'hradec kralove arena': { venue: 'Hradec Králové Arena', city: 'Hradec Kralove', country: 'Czech Republic', confidence: 'high' },
    'hradec králové arena': { venue: 'Hradec Králové Arena', city: 'Hradec Kralove', country: 'Czech Republic', confidence: 'high' },
    'klicper theatre': { venue: 'Klicper Theatre', city: 'Hradec Kralove', country: 'Czech Republic', confidence: 'high' },
    'klicperovo divadlo': { venue: 'Klicperovo Divadlo', city: 'Hradec Kralove', country: 'Czech Republic', confidence: 'high' },
    'filharmonie hradec králové': { venue: 'Filharmonie Hradec Králové', city: 'Hradec Kralove', country: 'Czech Republic', confidence: 'high' },
    'university of hradec králové': { venue: 'University of Hradec Králové', city: 'Hradec Kralove', country: 'Czech Republic', confidence: 'high' },
    'uhk': { venue: 'University of Hradec Králové', city: 'Hradec Kralove', country: 'Czech Republic', confidence: 'high' },
    'galerie moderního umění': { venue: 'Galerie moderního umění', city: 'Hradec Kralove', country: 'Czech Republic', confidence: 'high' },
    'gmuhk': { venue: 'Galerie moderního umění', city: 'Hradec Kralove', country: 'Czech Republic', confidence: 'high' },
    'knihovna města hradce králové': { venue: 'Knihovna města Hradce Králové', city: 'Hradec Kralove', country: 'Czech Republic', confidence: 'high' },
    'kulturní centrum aldis': { venue: 'Kulturní centrum Aldis', city: 'Hradec Kralove', country: 'Czech Republic', confidence: 'high' },
    'aldis': { venue: 'Kulturní centrum Aldis', city: 'Hradec Kralove', country: 'Czech Republic', confidence: 'high' },
    'pardubice arena': { venue: 'Pardubice Arena', city: 'Pardubice', country: 'Czech Republic', confidence: 'high' },
    'zlin arena': { venue: 'Zlín Arena', city: 'Zlin', country: 'Czech Republic', confidence: 'high' },
    'karlovy vary arena': { venue: 'Karlovy Vary Arena', city: 'Karlovy Vary', country: 'Czech Republic', confidence: 'high' },

    // International venues - London
    'o2 arena london': { venue: 'O2 Arena London', city: 'London', country: 'United Kingdom', confidence: 'high' },
    'london o2': { venue: 'London O2', city: 'London', country: 'United Kingdom', confidence: 'high' },
    'excel london': { venue: 'Excel London', city: 'London', country: 'United Kingdom', confidence: 'high' },
    'olympia london': { venue: 'Olympia London', city: 'London', country: 'United Kingdom', confidence: 'high' },
    'barbican centre': { venue: 'Barbican Centre', city: 'London', country: 'United Kingdom', confidence: 'high' },
    'royal festival hall': { venue: 'Royal Festival Hall', city: 'London', country: 'United Kingdom', confidence: 'high' },
    'southbank centre': { venue: 'Southbank Centre', city: 'London', country: 'United Kingdom', confidence: 'high' },
    'london convention centre': { venue: 'London Convention Centre', city: 'London', country: 'United Kingdom', confidence: 'high' },
    'business design centre': { venue: 'Business Design Centre', city: 'London', country: 'United Kingdom', confidence: 'high' },
    'london marriott': { venue: 'London Marriott', city: 'London', country: 'United Kingdom', confidence: 'high' },
    'hilton london': { venue: 'Hilton London', city: 'London', country: 'United Kingdom', confidence: 'high' },
    'intercontinental london': { venue: 'InterContinental London', city: 'London', country: 'United Kingdom', confidence: 'high' },
    'london university': { venue: 'London University', city: 'London', country: 'United Kingdom', confidence: 'medium' },
    'imperial college': { venue: 'Imperial College', city: 'London', country: 'United Kingdom', confidence: 'high' },
    'lse': { venue: 'LSE', city: 'London', country: 'United Kingdom', confidence: 'high' },
    'ucl': { venue: 'UCL', city: 'London', country: 'United Kingdom', confidence: 'high' },

    // International venues - Berlin
    'messe berlin': { venue: 'Messe Berlin', city: 'Berlin', country: 'Germany', confidence: 'high' },
    'berlin congress centre': { venue: 'Berlin Congress Centre', city: 'Berlin', country: 'Germany', confidence: 'high' },
    'berlin exhibition grounds': { venue: 'Berlin Exhibition Grounds', city: 'Berlin', country: 'Germany', confidence: 'high' },
    'berlin university': { venue: 'Berlin University', city: 'Berlin', country: 'Germany', confidence: 'medium' },
    'humboldt university': { venue: 'Humboldt University', city: 'Berlin', country: 'Germany', confidence: 'high' },
    'free university berlin': { venue: 'Free University Berlin', city: 'Berlin', country: 'Germany', confidence: 'high' },
    'berlin marriott': { venue: 'Berlin Marriott', city: 'Berlin', country: 'Germany', confidence: 'high' },
    'hilton berlin': { venue: 'Hilton Berlin', city: 'Berlin', country: 'Germany', confidence: 'high' },
    'intercontinental berlin': { venue: 'InterContinental Berlin', city: 'Berlin', country: 'Germany', confidence: 'high' },

    // International venues - Paris
    'porte de versailles': { venue: 'Porte de Versailles', city: 'Paris', country: 'France', confidence: 'high' },
    'paris expo': { venue: 'Paris Expo', city: 'Paris', country: 'France', confidence: 'high' },
    'palais des congrès': { venue: 'Palais des Congrès', city: 'Paris', country: 'France', confidence: 'high' },
    'sorbonne': { venue: 'Sorbonne', city: 'Paris', country: 'France', confidence: 'high' },
    'paris university': { venue: 'Paris University', city: 'Paris', country: 'France', confidence: 'medium' },
    'paris marriott': { venue: 'Paris Marriott', city: 'Paris', country: 'France', confidence: 'high' },
    'hilton paris': { venue: 'Hilton Paris', city: 'Paris', country: 'France', confidence: 'high' },

    // International venues - Amsterdam
    'rai amsterdam': { venue: 'RAI Amsterdam', city: 'Amsterdam', country: 'Netherlands', confidence: 'high' },
    'amsterdam convention centre': { venue: 'Amsterdam Convention Centre', city: 'Amsterdam', country: 'Netherlands', confidence: 'high' },
    'amsterdam university': { venue: 'Amsterdam University', city: 'Amsterdam', country: 'Netherlands', confidence: 'medium' },
    'amsterdam marriott': { venue: 'Amsterdam Marriott', city: 'Amsterdam', country: 'Netherlands', confidence: 'high' },
    'hilton amsterdam': { venue: 'Hilton Amsterdam', city: 'Amsterdam', country: 'Netherlands', confidence: 'high' },

    // International venues - Vienna
    'vienna marriott': { venue: 'Vienna Marriott', city: 'Vienna', country: 'Austria', confidence: 'high' },
    'hilton vienna': { venue: 'Hilton Vienna', city: 'Vienna', country: 'Austria', confidence: 'high' },
    'vienna university': { venue: 'Vienna University', city: 'Vienna', country: 'Austria', confidence: 'medium' },

    // International venues - Munich
    'munich marriott': { venue: 'Munich Marriott', city: 'Munich', country: 'Germany', confidence: 'high' },
    'hilton munich': { venue: 'Hilton Munich', city: 'Munich', country: 'Germany', confidence: 'high' },
    'munich university': { venue: 'Munich University', city: 'Munich', country: 'Germany', confidence: 'medium' },
  };

  /**
   * Get city for a venue name, especially useful when city is incorrectly set as country name
   */
  getCityForVenue(venueName: string): string | null {
    if (!venueName) return null;

    const normalizedVenue = venueName.toLowerCase().trim();
    
    // Direct mapping lookup
    const mapping = this.venueMappings[normalizedVenue];
    if (mapping) {
      console.log(`🏟️ Venue mapping: "${venueName}" -> "${mapping.city}" (${mapping.confidence} confidence)`);
      return mapping.city;
    }

    // Pattern-based matching for partial matches
    for (const [key, mapping] of Object.entries(this.venueMappings)) {
      if (normalizedVenue.includes(key) || key.includes(normalizedVenue)) {
        console.log(`🏟️ Venue pattern match: "${venueName}" -> "${mapping.city}" (${mapping.confidence} confidence)`);
        return mapping.city;
      }
    }

    // City name extraction from venue name (fallback)
    const cityFromVenue = this.extractCityFromVenueName(venueName);
    if (cityFromVenue) {
      console.log(`🏟️ Venue city extraction: "${venueName}" -> "${cityFromVenue}"`);
      return cityFromVenue;
    }

    return null;
  }

  /**
   * Extract city name from venue name using patterns
   */
  private extractCityFromVenueName(venueName: string): string | null {
    const venueLower = venueName.toLowerCase();
    
    // Common venue patterns that contain city names
    const cityPatterns = [
      { pattern: /prague|praha/i, city: 'Prague' },
      { pattern: /brno/i, city: 'Brno' },
      { pattern: /ostrava/i, city: 'Ostrava' },
      { pattern: /olomouc/i, city: 'Olomouc' },
      { pattern: /plzen|pilsen/i, city: 'Plzen' },
      { pattern: /liberec/i, city: 'Liberec' },
      { pattern: /ceske budejovice|budweis/i, city: 'Ceske Budejovice' },
      { pattern: /hradec kralove/i, city: 'Hradec Kralove' },
      { pattern: /pardubice/i, city: 'Pardubice' },
      { pattern: /zlin|gottwaldov/i, city: 'Zlin' },
      { pattern: /karlovy vary|karlsbad/i, city: 'Karlovy Vary' },
      { pattern: /london/i, city: 'London' },
      { pattern: /berlin/i, city: 'Berlin' },
      { pattern: /paris/i, city: 'Paris' },
      { pattern: /amsterdam/i, city: 'Amsterdam' },
      { pattern: /vienna|wien/i, city: 'Vienna' },
      { pattern: /munich|münchen/i, city: 'Munich' },
    ];
    
    for (const { pattern, city } of cityPatterns) {
      if (pattern.test(venueLower)) {
        return city;
      }
    }
    
    return null;
  }

  /**
   * Check if a venue name is likely to be in a specific city
   */
  isVenueInCity(venueName: string, city: string): boolean {
    const venueCity = this.getCityForVenue(venueName);
    return venueCity?.toLowerCase() === city.toLowerCase();
  }

  /**
   * Get all venues for a specific city
   */
  getVenuesForCity(city: string): VenueCityMapping[] {
    const normalizedCity = city.toLowerCase();
    return Object.values(this.venueMappings).filter(mapping => 
      mapping.city.toLowerCase() === normalizedCity
    );
  }

  /**
   * Add a new venue mapping
   */
  addVenueMapping(venue: string, city: string, country: string, confidence: 'high' | 'medium' | 'low' = 'medium'): void {
    const normalizedVenue = venue.toLowerCase().trim();
    this.venueMappings[normalizedVenue] = {
      venue: venue,
      city: city,
      country: country,
      confidence: confidence
    };
  }

  /**
   * Get venue mapping statistics
   */
  getStats(): { totalVenues: number; byCity: Record<string, number>; byCountry: Record<string, number> } {
    const byCity: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    
    Object.values(this.venueMappings).forEach(mapping => {
      byCity[mapping.city] = (byCity[mapping.city] || 0) + 1;
      byCountry[mapping.country] = (byCountry[mapping.country] || 0) + 1;
    });

    return {
      totalVenues: Object.keys(this.venueMappings).length,
      byCity,
      byCountry
    };
  }
}

// Export singleton instance
export const venueCityMappingService = new VenueCityMappingService();
