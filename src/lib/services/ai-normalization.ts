// AI-first event normalization service
import { UNIFIED_TAXONOMY, normalizeCategory, getProviderCategories } from '@/lib/constants/taxonomy';

interface RawEvent {
  id?: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  city?: string;
  venue?: string;
  category?: string;
  subcategory?: string;
  source: string;
  sourceId?: string;
  url?: string;
  imageUrl?: string;
  expectedAttendees?: number;
}

interface NormalizedEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  city: string;
  venue?: string;
  category: string;
  subcategory?: string;
  source: string;
  sourceId?: string;
  url?: string;
  imageUrl?: string;
  expectedAttendees?: number;
  confidence: number;
  rawData: RawEvent;
}

interface CityNormalizationResult {
  normalizedCity: string;
  confidence: number;
  method: 'dictionary' | 'geocoding' | 'llm' | 'fallback';
}

interface CategoryNormalizationResult {
  normalizedCategory: string;
  confidence: number;
  method: 'taxonomy' | 'embedding' | 'llm' | 'fallback';
}

export class AINormalizationService {
  private venueCityDictionary: Map<string, string> = new Map();
  private cityAliases: Map<string, string> = new Map();
  
  constructor() {
    this.initializeCityMappings();
  }

  private initializeCityMappings() {
    // Czech city mappings
    this.cityAliases.set('praha', 'Prague');
    this.cityAliases.set('prag', 'Prague');
    this.cityAliases.set('brno', 'Brno');
    this.cityAliases.set('ostrava', 'Ostrava');
    this.cityAliases.set('plzen', 'Plzen');
    this.cityAliases.set('pilsen', 'Plzen');
    this.cityAliases.set('liberec', 'Liberec');
    this.cityAliases.set('olomouc', 'Olomouc');
    
    // Venue to city mappings (will be populated from extractions)
    this.venueCityDictionary.set('letiště praha letňany', 'Prague');
    this.venueCityDictionary.set('o2 arena', 'Prague');
    this.venueCityDictionary.set('prague congress centre', 'Prague');
    this.venueCityDictionary.set('brno exhibition centre', 'Brno');
    this.venueCityDictionary.set('ostrava arena', 'Ostrava');
  }

  /**
   * Normalize a single event using AI-first approach
   */
  async normalizeEvent(rawEvent: RawEvent): Promise<NormalizedEvent> {
    const startTime = Date.now();
    
    // Normalize city
    const cityResult = await this.normalizeCity(rawEvent);
    
    // Normalize category
    const categoryResult = await this.normalizeCategory(rawEvent);
    
    // Calculate overall confidence
    const confidence = (cityResult.confidence + categoryResult.confidence) / 2;
    
    const normalizedEvent: NormalizedEvent = {
      id: rawEvent.id || `${rawEvent.source}_${rawEvent.sourceId || Date.now()}`,
      title: this.cleanTitle(rawEvent.title),
      description: rawEvent.description,
      date: rawEvent.date,
      endDate: rawEvent.endDate,
      city: cityResult.normalizedCity,
      venue: rawEvent.venue,
      category: categoryResult.normalizedCategory,
      subcategory: rawEvent.subcategory,
      source: rawEvent.source,
      sourceId: rawEvent.sourceId,
      url: rawEvent.url,
      imageUrl: rawEvent.imageUrl,
      expectedAttendees: rawEvent.expectedAttendees,
      confidence,
      rawData: rawEvent
    };

    const processingTime = Date.now() - startTime;
    console.log(`🤖 AI Normalization: ${rawEvent.title} -> ${normalizedEvent.city}/${normalizedEvent.category} (${confidence.toFixed(2)}, ${processingTime}ms)`);
    
    return normalizedEvent;
  }

  /**
   * Normalize multiple events in batch
   */
  async normalizeEvents(rawEvents: RawEvent[]): Promise<NormalizedEvent[]> {
    console.log(`🤖 AI Normalization: Processing ${rawEvents.length} events`);
    
    const results = await Promise.all(
      rawEvents.map(event => this.normalizeEvent(event))
    );
    
    const avgConfidence = results.reduce((sum, event) => sum + event.confidence, 0) / results.length;
    console.log(`🤖 AI Normalization: Completed ${results.length} events, avg confidence: ${avgConfidence.toFixed(2)}`);
    
    return results;
  }

  /**
   * Normalize city using multiple strategies
   */
  private async normalizeCity(rawEvent: RawEvent): Promise<CityNormalizationResult> {
    const cityInput = rawEvent.city || '';
    const venueInput = rawEvent.venue || '';
    const titleInput = rawEvent.title || '';
    
    // Strategy 1: Dictionary lookup (fastest, highest confidence)
    const dictionaryResult = this.normalizeCityByDictionary(cityInput, venueInput, titleInput);
    if (dictionaryResult.confidence > 0.8) {
      return dictionaryResult;
    }
    
    // Strategy 2: Geocoding (medium speed, good confidence)
    const geocodingResult = await this.normalizeCityByGeocoding(cityInput);
    if (geocodingResult.confidence > 0.7) {
      return geocodingResult;
    }
    
    // Strategy 3: LLM disambiguation (slowest, fallback)
    if (dictionaryResult.confidence < 0.5 && geocodingResult.confidence < 0.5) {
      return await this.normalizeCityByLLM(cityInput, venueInput, titleInput);
    }
    
    // Return best result
    return dictionaryResult.confidence > geocodingResult.confidence ? dictionaryResult : geocodingResult;
  }

  /**
   * Dictionary-based city normalization
   */
  private normalizeCityByDictionary(city: string, venue: string, title: string): CityNormalizationResult {
    const input = `${city} ${venue} ${title}`.toLowerCase();
    
    // Check venue dictionary first (highest confidence)
    for (const [venueKey, cityValue] of this.venueCityDictionary.entries()) {
      if (input.includes(venueKey)) {
        return {
          normalizedCity: cityValue,
          confidence: 0.95,
          method: 'dictionary'
        };
      }
    }
    
    // Check city aliases
    for (const [alias, normalized] of this.cityAliases.entries()) {
      if (input.includes(alias)) {
        return {
          normalizedCity: normalized,
          confidence: 0.9,
          method: 'dictionary'
        };
      }
    }
    
    // Check for known patterns
    if (input.includes('prague') || input.includes('praha')) {
      return {
        normalizedCity: 'Prague',
        confidence: 0.85,
        method: 'dictionary'
      };
    }
    
    if (input.includes('brno')) {
      return {
        normalizedCity: 'Brno',
        confidence: 0.85,
        method: 'dictionary'
      };
    }
    
    return {
      normalizedCity: city || 'Unknown',
      confidence: 0.3,
      method: 'dictionary'
    };
  }

  /**
   * Geocoding-based city normalization (placeholder for future implementation)
   */
  private async normalizeCityByGeocoding(city: string): Promise<CityNormalizationResult> {
    // TODO: Implement geocoding service
    // For now, return low confidence
    return {
      normalizedCity: city || 'Unknown',
      confidence: 0.4,
      method: 'geocoding'
    };
  }

  /**
   * LLM-based city normalization (placeholder for future implementation)
   */
  private async normalizeCityByLLM(city: string, venue: string, title: string): Promise<CityNormalizationResult> {
    // TODO: Implement LLM-based city extraction
    // For now, return fallback
    return {
      normalizedCity: city || 'Unknown',
      confidence: 0.2,
      method: 'llm'
    };
  }

  /**
   * Normalize category using multiple strategies
   */
  private async normalizeCategory(rawEvent: RawEvent): Promise<CategoryNormalizationResult> {
    const categoryInput = rawEvent.category || '';
    const titleInput = rawEvent.title || '';
    const descriptionInput = rawEvent.description || '';
    
    // Strategy 1: Taxonomy lookup (fastest, highest confidence)
    const taxonomyResult = this.normalizeCategoryByTaxonomy(categoryInput);
    if (taxonomyResult.confidence > 0.8) {
      return taxonomyResult;
    }
    
    // Strategy 2: Content-based classification (medium speed, good confidence)
    const contentResult = this.normalizeCategoryByContent(titleInput, descriptionInput);
    if (contentResult.confidence > 0.7) {
      return contentResult;
    }
    
    // Strategy 3: LLM classification (slowest, fallback)
    if (taxonomyResult.confidence < 0.5 && contentResult.confidence < 0.5) {
      return await this.normalizeCategoryByLLM(titleInput, descriptionInput);
    }
    
    // Return best result
    return taxonomyResult.confidence > contentResult.confidence ? taxonomyResult : contentResult;
  }

  /**
   * Taxonomy-based category normalization
   */
  private normalizeCategoryByTaxonomy(category: string): CategoryNormalizationResult {
    const normalized = normalizeCategory(category);
    
    if (normalized !== category) {
      return {
        normalizedCategory: normalized,
        confidence: 0.9,
        method: 'taxonomy'
      };
    }
    
    return {
      normalizedCategory: category || 'Other',
      confidence: 0.3,
      method: 'taxonomy'
    };
  }

  /**
   * Content-based category classification
   */
  private normalizeCategoryByContent(title: string, description: string): CategoryNormalizationResult {
    const content = `${title} ${description}`.toLowerCase();
    
    // Entertainment keywords
    if (this.hasEntertainmentKeywords(content)) {
      return {
        normalizedCategory: 'Entertainment',
        confidence: 0.8,
        method: 'embedding'
      };
    }
    
    // Sports keywords
    if (this.hasSportsKeywords(content)) {
      return {
        normalizedCategory: 'Sports',
        confidence: 0.8,
        method: 'embedding'
      };
    }
    
    // Business keywords
    if (this.hasBusinessKeywords(content)) {
      return {
        normalizedCategory: 'Business',
        confidence: 0.8,
        method: 'embedding'
      };
    }
    
    return {
      normalizedCategory: 'Other',
      confidence: 0.3,
      method: 'embedding'
    };
  }

  /**
   * LLM-based category classification (placeholder)
   */
  private async normalizeCategoryByLLM(title: string, description: string): Promise<CategoryNormalizationResult> {
    // TODO: Implement LLM-based category classification
    return {
      normalizedCategory: 'Other',
      confidence: 0.2,
      method: 'llm'
    };
  }

  /**
   * Check for entertainment keywords
   */
  private hasEntertainmentKeywords(content: string): boolean {
    const keywords = [
      'concert', 'music', 'festival', 'party', 'entertainment', 'show', 'performance',
      'koncert', 'hudba', 'festival', 'párty', 'zábava', 'představení',
      'theatre', 'theater', 'drama', 'comedy', 'film', 'cinema'
    ];
    
    return keywords.some(keyword => content.includes(keyword));
  }

  /**
   * Check for sports keywords
   */
  private hasSportsKeywords(content: string): boolean {
    const keywords = [
      'sport', 'game', 'match', 'tournament', 'league', 'championship',
      'sportovní', 'zápas', 'turnaj', 'liga', 'mistrovství',
      'football', 'soccer', 'basketball', 'tennis', 'hockey'
    ];
    
    return keywords.some(keyword => content.includes(keyword));
  }

  /**
   * Check for business keywords
   */
  private hasBusinessKeywords(content: string): boolean {
    const keywords = [
      'conference', 'meeting', 'seminar', 'workshop', 'business', 'professional',
      'konference', 'setkání', 'seminář', 'workshop', 'obchodní', 'profesionální',
      'networking', 'training', 'development'
    ];
    
    return keywords.some(keyword => content.includes(keyword));
  }

  /**
   * Clean and normalize title
   */
  private cleanTitle(title: string): string {
    return title
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\-.,!?]/g, '') // Remove special characters except common ones
      .substring(0, 200); // Limit length
  }

  /**
   * Update venue-city dictionary from successful extractions
   */
  updateVenueCityMapping(venue: string, city: string, confidence: number = 0.8) {
    if (confidence > 0.7) {
      this.venueCityDictionary.set(venue.toLowerCase(), city);
      console.log(`🤖 Updated venue-city mapping: ${venue} -> ${city}`);
    }
  }

  /**
   * Get normalized events for a specific category
   */
  getEventsByCategory(events: NormalizedEvent[], category: string): NormalizedEvent[] {
    const normalizedCategory = normalizeCategory(category);
    return events.filter(event => event.category === normalizedCategory);
  }

  /**
   * Get events by city with fuzzy matching
   */
  getEventsByCity(events: NormalizedEvent[], city: string): NormalizedEvent[] {
    const normalizedCity = this.normalizeCityByDictionary(city, '', '').normalizedCity;
    return events.filter(event => 
      event.city.toLowerCase().includes(normalizedCity.toLowerCase()) ||
      normalizedCity.toLowerCase().includes(event.city.toLowerCase())
    );
  }
}

export const aiNormalizationService = new AINormalizationService();
