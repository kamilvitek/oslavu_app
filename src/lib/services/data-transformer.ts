import { CreateEventData, DataValidationResult, EventTransformer } from '@/lib/types/events';
import { CreateEventSchema } from '@/lib/types/events';
import { z } from 'zod';

/**
 * Data transformation service for converting API responses to standardized event format
 */
export class DataTransformer {
  private transformers: Map<string, EventTransformer> = new Map();

  constructor() {
    this.initializeTransformers();
  }

  /**
   * Initialize built-in transformers for different API sources
   */
  private initializeTransformers(): void {
    // Ticketmaster transformer
    this.transformers.set('ticketmaster', {
      source: 'ticketmaster',
      transform: this.transformTicketmasterEvent.bind(this),
      validate: this.validateEvent.bind(this)
    });

    // PredictHQ transformer
    this.transformers.set('predicthq', {
      source: 'predicthq',
      transform: this.transformPredictHQEvent.bind(this),
      validate: this.validateEvent.bind(this)
    });

    // Manual event transformer
    this.transformers.set('manual', {
      source: 'manual',
      transform: this.transformManualEvent.bind(this),
      validate: this.validateEvent.bind(this)
    });

    // Scraper event transformer
    this.transformers.set('scraper', {
      source: 'scraper',
      transform: this.transformScrapedEvent.bind(this),
      validate: this.validateEvent.bind(this)
    });
  }

  /**
   * Transform a raw event from any source to standardized format
   */
  transformEvent(source: string, rawEvent: any): CreateEventData {
    const transformer = this.transformers.get(source);
    if (!transformer) {
      throw new Error(`No transformer found for source: ${source}`);
    }

    return transformer.transform(rawEvent);
  }

  /**
   * Validate and sanitize event data
   */
  validateEventData(event: CreateEventData): DataValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedData = { ...event };

    try {
      // Use Zod schema for validation
      const validatedData = CreateEventSchema.parse(event);
      sanitizedData = validatedData;
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          errors.push(`${err.path.join('.')}: ${err.message}`);
        });
      }
    }

    // Additional business logic validation
    this.validateBusinessRules(sanitizedData, errors, warnings, sanitizedData);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData
    };
  }

  /**
   * Validate business rules beyond schema validation
   */
  private validateBusinessRules(
    event: CreateEventData,
    errors: string[],
    warnings: string[],
    sanitizedData: CreateEventData
  ): void {
    // Date validation
    if (event.end_date && event.end_date < event.date) {
      errors.push('End date cannot be before start date');
    }

    // Future date validation
    const eventDate = new Date(event.date);
    const now = new Date();
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

    if (eventDate < now) {
      warnings.push('Event date is in the past');
    }

    if (eventDate > oneYearFromNow) {
      warnings.push('Event date is more than one year in the future');
    }

    // Attendance validation
    if (event.expected_attendees && event.expected_attendees > 1000000) {
      warnings.push('Expected attendees seems unusually high');
    }

    // URL validation
    if (event.url && !this.isValidUrl(event.url)) {
      errors.push('Invalid URL format');
    }

    if (event.image_url && !this.isValidUrl(event.image_url)) {
      errors.push('Invalid image URL format');
    }

    // City name normalization
    if (event.city) {
      const normalizedCity = this.normalizeCityName(event.city);
      if (normalizedCity !== event.city) {
        sanitizedData.city = normalizedCity;
        warnings.push(`City name normalized from "${event.city}" to "${normalizedCity}"`);
      }
    }

    // Category normalization
    if (event.category) {
      const normalizedCategory = this.normalizeCategory(event.category);
      if (normalizedCategory !== event.category) {
        sanitizedData.category = normalizedCategory;
        warnings.push(`Category normalized from "${event.category}" to "${normalizedCategory}"`);
      }
    }
  }

  /**
   * Transform Ticketmaster event to standardized format
   */
  private transformTicketmasterEvent(tmEvent: any): CreateEventData {
    // Extract venue information
    const venue = tmEvent._embedded?.venues?.[0];
    const venueName = venue?.name;
    const venueCity = venue?.city?.name;

    // Extract classification
    const classification = tmEvent.classifications?.[0];
    const segment = classification?.segment?.name;
    const genre = classification?.genre?.name;

    // Extract image
    const image = tmEvent.images?.find((img: any) => 
      img.width >= 640 && img.height >= 480
    ) || tmEvent.images?.[0];

    // Extract city with fallback logic
    let city = venueCity || 'Unknown';
    
    // Try to extract city from venue name
    if (city === 'Unknown' && venueName) {
      const extractedCity = this.extractCityFromVenueName(venueName);
      if (extractedCity) {
        city = extractedCity;
      }
    }

    // Extract city from event title if still unknown
    if (city === 'Unknown') {
      const extractedCity = this.extractCityFromEventTitle(tmEvent.name);
      if (extractedCity) {
        city = extractedCity;
      }
    }

    return {
      title: tmEvent.name,
      description: tmEvent.description || tmEvent.pleaseNote || '',
      date: tmEvent.dates.start.localDate,
      end_date: tmEvent.dates.end?.localDate,
      city: city,
      venue: venueName,
      category: this.mapTicketmasterCategory(segment || 'Other'),
      subcategory: genre,
      expected_attendees: undefined, // Ticketmaster doesn't provide attendance data
      source: 'ticketmaster',
      source_id: tmEvent.id,
      url: tmEvent.url,
      image_url: image?.url,
    };
  }

  /**
   * Transform PredictHQ event to standardized format
   */
  private transformPredictHQEvent(phqEvent: any): CreateEventData {
    const location = phqEvent.location || phqEvent.place;
    const startDate = new Date(phqEvent.start);
    const endDate = phqEvent.end ? new Date(phqEvent.end) : undefined;

    // Extract city from various sources
    let city = 'Unknown';
    
    if (location?.city) {
      city = location.city;
    } else if (phqEvent.place?.city) {
      city = phqEvent.place.city;
    } else if (location?.address) {
      const addressParts = location.address.split(',');
      if (addressParts.length > 1) {
        city = addressParts[addressParts.length - 2]?.trim() || 'Unknown';
      }
    }

    // Try to extract city from venue name
    if (city === 'Unknown' && location?.name) {
      const extractedCity = this.extractCityFromVenueName(location.name);
      if (extractedCity) {
        city = extractedCity;
      }
    }

    // Try to extract city from event title
    if (city === 'Unknown') {
      const extractedCity = this.extractCityFromEventTitle(phqEvent.title);
      if (extractedCity) {
        city = extractedCity;
      }
    }

    return {
      title: phqEvent.title,
      description: phqEvent.description,
      date: startDate.toISOString().split('T')[0],
      end_date: endDate?.toISOString().split('T')[0],
      city: city,
      venue: location?.name || phqEvent.place?.name,
      category: this.mapPredictHQCategory(phqEvent.category, phqEvent.title, phqEvent.description),
      subcategory: phqEvent.subcategory,
      expected_attendees: phqEvent.phq_attendance,
      source: 'predicthq',
      source_id: phqEvent.id,
      url: undefined, // PredictHQ doesn't provide URLs
      image_url: undefined, // PredictHQ doesn't provide images
    };
  }

  /**
   * Transform manual event to standardized format
   */
  private transformManualEvent(manualEvent: any): CreateEventData {
    return {
      title: manualEvent.title,
      description: manualEvent.description,
      date: manualEvent.date,
      end_date: manualEvent.end_date,
      city: manualEvent.city,
      venue: manualEvent.venue,
      category: manualEvent.category,
      subcategory: manualEvent.subcategory,
      expected_attendees: manualEvent.expected_attendees,
      source: 'manual',
      source_id: manualEvent.id,
      url: manualEvent.url,
      image_url: manualEvent.image_url,
    };
  }

  /**
   * Transform scraped event to standardized format
   */
  private transformScrapedEvent(scrapedEvent: any): CreateEventData {
    return {
      title: scrapedEvent.title,
      description: scrapedEvent.description || '',
      date: scrapedEvent.date,
      end_date: scrapedEvent.endDate || scrapedEvent.end_date,
      city: this.normalizeCityName(scrapedEvent.city),
      venue: scrapedEvent.venue,
      category: this.normalizeCategory(scrapedEvent.category || 'Other'),
      subcategory: scrapedEvent.subcategory,
      expected_attendees: scrapedEvent.expectedAttendees || scrapedEvent.expected_attendees,
      source: 'scraper',
      source_id: scrapedEvent.source_id,
      url: scrapedEvent.url,
      image_url: scrapedEvent.imageUrl || scrapedEvent.image_url,
    };
  }

  /**
   * Map Ticketmaster categories to standardized categories
   */
  private mapTicketmasterCategory(tmCategory: string): string {
    const categoryMap: Record<string, string> = {
      'Sports': 'Sports',
      'Music': 'Entertainment',
      'Arts & Theatre': 'Arts & Culture',
      'Film': 'Entertainment',
      'Miscellaneous': 'Other',
    };

    return categoryMap[tmCategory] || 'Other';
  }

  /**
   * Map PredictHQ categories to standardized categories
   */
  private mapPredictHQCategory(phqCategory: string, title?: string, description?: string): string {
    const content = `${title || ''} ${description || ''}`.toLowerCase();
    
    // Check for specific keywords first
    if (this.hasTechnologyKeywords(content)) return 'Technology';
    if (this.hasBusinessKeywords(content)) return 'Business';
    if (this.hasHealthcareKeywords(content)) return 'Healthcare';
    if (this.hasFinanceKeywords(content)) return 'Finance';
    if (this.hasMarketingKeywords(content)) return 'Marketing';
    if (this.hasSportsKeywords(content)) return 'Sports';

    // Fall back to category mapping
    const categoryMap: Record<string, string> = {
      'conferences': 'Business',
      'concerts': 'Entertainment',
      'sports': 'Sports',
      'festivals': 'Arts & Culture',
      'community': 'Other',
      'expos': 'Business',
      'performing-arts': 'Arts & Culture',
      'nightlife': 'Entertainment',
      'politics': 'Other',
      'school-holidays': 'Education',
      'observances': 'Other',
      'public-holidays': 'Other',
      'academic': 'Education',
      'daylight-savings': 'Other',
      'airport-delays': 'Other',
      'severe-weather': 'Other',
      'disasters': 'Other',
      'terror': 'Other',
      'shooting': 'Other',
      'civil-unrest': 'Other',
      'protests': 'Other',
      'strikes': 'Other',
      'transport': 'Other',
      'health-warnings': 'Healthcare',
      'disease': 'Healthcare',
    };

    return categoryMap[phqCategory] || 'Other';
  }

  /**
   * Extract city name from venue name
   */
  private extractCityFromVenueName(venueName: string): string | null {
    const venueLower = venueName.toLowerCase();
    
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
    ];
    
    for (const { pattern, city } of cityPatterns) {
      if (pattern.test(venueLower)) {
        return city;
      }
    }
    
    return null;
  }

  /**
   * Extract city name from event title
   */
  private extractCityFromEventTitle(eventTitle: string): string | null {
    const titleLower = eventTitle.toLowerCase();
    
    const cityPatterns = [
      { pattern: /in prague|at prague|prague/i, city: 'Prague' },
      { pattern: /in brno|at brno|brno/i, city: 'Brno' },
      { pattern: /in ostrava|at ostrava|ostrava/i, city: 'Ostrava' },
      { pattern: /in olomouc|at olomouc|olomouc/i, city: 'Olomouc' },
      { pattern: /in plzen|at plzen|plzen|pilsen/i, city: 'Plzen' },
    ];
    
    for (const { pattern, city } of cityPatterns) {
      if (pattern.test(titleLower)) {
        return city;
      }
    }
    
    return null;
  }

  /**
   * Normalize city name with enhanced Czech support
   */
  private normalizeCityName(city: string): string {
    const cityMap: Record<string, string> = {
      // Czech cities with multiple variations
      'praha': 'Prague',
      'prague': 'Prague',
      'brno': 'Brno',
      'ostrava': 'Ostrava',
      'olomouc': 'Olomouc',
      'plzen': 'Plzen',
      'pilsen': 'Plzen',
      'liberec': 'Liberec',
      'ceske budejovice': 'Ceske Budejovice',
      'budweis': 'Ceske Budejovice',
      'hradec kralove': 'Hradec Kralove',
      'pardubice': 'Pardubice',
      'zlin': 'Zlin',
      'gottwaldov': 'Zlin',
      'karlovy vary': 'Karlovy Vary',
      'karlsbad': 'Karlovy Vary',
      'jihlava': 'Jihlava',
      'kladno': 'Kladno',
      'most': 'Most',
      'havirov': 'Havirov',
      'karvina': 'Karvina',
      'frydek-mistek': 'Frydek-Mistek',
      'opava': 'Opava',
      'decín': 'Decin',
      'chomutov': 'Chomutov',
      'teplice': 'Teplice',
      'jablonec nad nisou': 'Jablonec nad Nisou',
      'prostejov': 'Prostejov',
      'prerov': 'Prerov',
      'melnik': 'Melnik',
      'trutnov': 'Trutnov',
      'pribram': 'Pribram',
      'cheb': 'Cheb',
      'modrany': 'Modrany',
      'kromeriz': 'Kromeriz',
      'sumperk': 'Sumperk',
      'vsetin': 'Vsetin',
      'uherske hradiste': 'Uherske Hradiste',
      'novy jicin': 'Novy Jicin',
      'chrudim': 'Chrudim',
      'ceska trebova': 'Ceska Trebova',
      'trebic': 'Trebic',
      'zdar nad sazavou': 'Zdar nad Sazavou',
      'sokolov': 'Sokolov',
      'havlickuv brod': 'Havlickuv Brod',
      'kutna hora': 'Kutna Hora',
      'steti': 'Steti',
      'louny': 'Louny',
      'kralupy nad vltavou': 'Kralupy nad Vltavou',
      'kadan': 'Kadan',
      'ceska lipa': 'Ceska Lipa',
      'litomerice': 'Litomerice',
      'nove mesto nad metuji': 'Nove Mesto nad Metuji',
      'jicin': 'Jicin',
      'dvor kralove nad labem': 'Dvor Kralove nad Labem',
      'semily': 'Semily',
      'turnov': 'Turnov',
      'cesky krumlov': 'Cesky Krumlov',
      'pisek': 'Pisek',
      'strakonice': 'Strakonice',
      'prachatice': 'Prachatice',
      'tabor': 'Tabor',
      'pelhrimov': 'Pelhrimov',
      'benesov': 'Benesov',
      'beroun': 'Beroun',
      'rakovnik': 'Rakovnik',
      'slany': 'Slany',
      'neratovice': 'Neratovice',
      'brandys nad labem': 'Brandys nad Labem',
      'cesky brod': 'Cesky Brod',
      'kolin': 'Kolin',
      'poděbrady': 'Podebrady',
      'nymburk': 'Nymburk',
      'benatky nad jizerou': 'Benatky nad Jizerou',
      'mlada boleslav': 'Mlada Boleslav',
      'usti nad labem': 'Usti nad Labem'
    };

    const normalized = city.toLowerCase().trim();
    return cityMap[normalized] || city;
  }

  /**
   * Normalize category name with Czech language support
   */
  private normalizeCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      // English categories
      'technology': 'Technology',
      'tech': 'Technology',
      'business': 'Business',
      'marketing': 'Marketing',
      'healthcare': 'Healthcare',
      'health': 'Healthcare',
      'education': 'Education',
      'finance': 'Finance',
      'entertainment': 'Entertainment',
      'sports': 'Sports',
      'arts & culture': 'Arts & Culture',
      'arts and culture': 'Arts & Culture',
      'culture': 'Arts & Culture',
      'other': 'Other',
      
      // Czech categories
      'technologie': 'Technology',
      'technika': 'Technology',
      'it': 'Technology',
      'podnikání': 'Business',
      'obchod': 'Business',
      'konference': 'Business',
      'zdravotnictví': 'Healthcare',
      'zdraví': 'Healthcare',
      'lékařství': 'Healthcare',
      'vzdělávání': 'Education',
      'škola': 'Education',
      'univerzita': 'Education',
      'bankovnictví': 'Finance',
      'zábava': 'Entertainment',
      'koncert': 'Entertainment',
      'hudba': 'Entertainment',
      'sport': 'Sports',
      'sportovní': 'Sports',
      'kultura': 'Arts & Culture',
      'umění': 'Arts & Culture',
      'divadlo': 'Arts & Culture',
      'galerie': 'Arts & Culture',
      'festival': 'Arts & Culture',
      'festivaly': 'Arts & Culture',
      'akce': 'Other',
      'událost': 'Other',
      'další': 'Other',
      'ostatní': 'Other'
    };

    const normalized = category.toLowerCase().trim();
    return categoryMap[normalized] || category;
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check for technology keywords
   */
  private hasTechnologyKeywords(content: string): boolean {
    const keywords = [
      'tech', 'digital', 'software', 'ai', 'data', 'coding', 'programming',
      'cyber', 'cloud', 'startup', 'innovation', 'computer', 'algorithm'
    ];
    
    return keywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(content);
    });
  }

  /**
   * Check for business keywords
   */
  private hasBusinessKeywords(content: string): boolean {
    const keywords = [
      'business', 'conference', 'meeting', 'corporate', 'enterprise',
      'strategy', 'management', 'networking'
    ];
    
    return keywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(content);
    });
  }

  /**
   * Check for healthcare keywords
   */
  private hasHealthcareKeywords(content: string): boolean {
    const keywords = [
      'medical', 'health', 'clinical', 'doctor', 'nurse', 'patient',
      'hospital', 'pharma', 'drug', 'surgery', 'healthcare'
    ];
    
    return keywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(content);
    });
  }

  /**
   * Check for finance keywords
   */
  private hasFinanceKeywords(content: string): boolean {
    const keywords = [
      'finance', 'banking', 'investment', 'trading', 'fintech',
      'crypto', 'financial', 'money'
    ];
    
    return keywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(content);
    });
  }

  /**
   * Check for marketing keywords
   */
  private hasMarketingKeywords(content: string): boolean {
    const keywords = [
      'marketing', 'advertising', 'branding', 'social media', 'seo',
      'digital marketing', 'promotion', 'campaign', 'brand awareness'
    ];
    
    return keywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(content);
    });
  }

  /**
   * Check for sports keywords
   */
  private hasSportsKeywords(content: string): boolean {
    const keywords = [
      'sport', 'game', 'match', 'tournament', 'league', 'athletic',
      'fitness', 'football', 'soccer', 'basketball', 'tennis', 'hockey'
    ];
    
    return keywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(content);
    });
  }

  /**
   * Validate event data using the built-in validator
   */
  private validateEvent(event: CreateEventData): boolean {
    const result = this.validateEventData(event);
    return result.isValid;
  }

  /**
   * Get transformer for a specific source
   */
  getTransformer(source: string): EventTransformer | undefined {
    return this.transformers.get(source);
  }

  /**
   * Add a custom transformer
   */
  addTransformer(transformer: EventTransformer): void {
    this.transformers.set(transformer.source, transformer);
  }

  /**
   * Remove a transformer
   */
  removeTransformer(source: string): boolean {
    return this.transformers.delete(source);
  }

  /**
   * Get all available transformers
   */
  getAvailableTransformers(): string[] {
    return Array.from(this.transformers.keys());
  }
}

// Export singleton instance
export const dataTransformer = new DataTransformer();
