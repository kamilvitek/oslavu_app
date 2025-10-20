// src/lib/services/predicthq.ts
import { Event } from '@/types';
import { getCityCountryCode, validateCityCountryPair } from '@/lib/utils/city-country-mapping';
import { venueCityMappingService } from './venue-city-mapping';
import { eventStorageService } from './event-storage';
import { dataTransformer } from './data-transformer';
import { CreateEventData } from '@/lib/types/events';

interface PredictHQEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end?: string;
  category: string;
  subcategory?: string;
  labels?: string[];
  location?: {
    name?: string;
    address?: string;
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  place?: {
    name?: string;
    address?: string;
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  scope?: string;
  country?: string;
  state?: string;
  private?: boolean;
  phq_attendance?: number;
  phq_rank?: number;
  local_rank?: number;
  aviation_rank?: number;
  entities?: Array<{
    name: string;
    type: string;
    formatted_address?: string;
  }>;
  duration?: number;
  timezone?: string;
  created?: string;
  updated?: string;
}

interface PredictHQResponse {
  results: PredictHQEvent[];
  count: number;
  next?: string;
  previous?: string;
}

interface PredictHQSearchParams {
  q?: string;
  category?: string;
  subcategory?: string;
  country?: string;
  state?: string;
  city?: string;
  place?: string;
  'place.scope'?: string;
  within?: string;
  'start.gte'?: string;
  'start.lte'?: string;
  'end.gte'?: string;
  'end.lte'?: string;
  'phq_attendance.gte'?: number;
  'phq_attendance.lte'?: number;
  'phq_rank.gte'?: number;
  'phq_rank.lte'?: number;
  'local_rank.gte'?: number;
  'local_rank.lte'?: number;
  'aviation_rank.gte'?: number;
  'aviation_rank.lte'?: number;
  limit?: number;
  offset?: number;
  sort?: string;
}

export class PredictHQService {
  private apiKey: string | null = null;
  private readonly baseUrl = 'https://api.predicthq.com/v1';

  constructor() {
    // Don't throw error in constructor - check API key when actually used
  }

  private getApiKey(): string {
    if (!this.apiKey) {
      this.apiKey = process.env.PREDICTHQ_API_KEY || '';
    }
    if (!this.apiKey) {
      throw new Error('PREDICTHQ_API_KEY environment variable is required');
    }
    return this.apiKey;
  }

  /**
   * Fetch events from PredictHQ API
   */
  async getEvents(params: PredictHQSearchParams): Promise<{ events: Event[]; total: number }> {
    try {
      const searchParams = new URLSearchParams();
      
      // Add all non-undefined parameters
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });

      // Set default parameters
      if (!params.limit) searchParams.append('limit', '500'); // Increased from 200 to 500 for better event coverage
      if (!params.sort) searchParams.append('sort', 'start');

      const url = `${this.baseUrl}/events/?${searchParams.toString()}`;
      
      console.log(`🔮 PredictHQ: Making API request to: ${url}`);
      console.log(`🔮 PredictHQ: Request params:`, Object.fromEntries(searchParams.entries()));
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.getApiKey()}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PredictHQ API Error Response:', errorText);
        console.error('Request URL:', url);
        throw new Error(`PredictHQ API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: PredictHQResponse = await response.json();
      
      console.log(`🔮 PredictHQ: API Response - Status: ${response.status}, Count: ${data.count}, Results: ${data.results?.length || 0}`);
      
      const events = data.results?.map(event => this.transformEvent(event, params.city, params.category)) || [];
      const total = data.count;

      return { events, total };
    } catch (error) {
      console.error('Error fetching PredictHQ events:', error);
      throw error;
    }
  }

  /**
   * Get events for a specific city and date range with pagination support
   */
  async getEventsForCity(
    city: string,
    startDate: string,
    endDate: string,
    category?: string
  ): Promise<Event[]> {
    return this.getEventsForCityPaginated(city, startDate, endDate, category);
  }

  /**
   * Get events with radius-based search for better geographic coverage
   */
  async getEventsWithRadius(
    city: string,
    startDate: string,
    endDate: string,
    radius: string = '50km',
    category?: string
  ): Promise<Event[]> {
    // For Entertainment category, use multi-category search
    if (category === 'Entertainment') {
      return this.getEntertainmentEventsWithRadius(city, startDate, endDate, radius);
    }
    
    const locationParams = this.getCityLocationParams(city);
    
    console.log(`🔮 PredictHQ: Searching ${city} with radius ${radius}`);
    
    const allEvents: Event[] = [];
    let offset = 0;
    const limit = 500;
    let totalAvailable = 0;
    
    while (true) {
      console.log(`🔮 PredictHQ: Fetching offset ${offset} for ${city} (radius: ${radius})`);
      
      // Extract radius value and convert to PredictHQ within format
      const radiusValue = radius.replace('km', '');
      const within = locationParams.place ? `${radiusValue}km@${locationParams.place}` : undefined;
      
      console.log(`🔮 PredictHQ: Location params:`, locationParams);
      console.log(`🔮 PredictHQ: Within parameter: ${within}`);
      
      const { events, total } = await this.getEvents({
        ...locationParams,
        within, // Add proper radius constraint
        'start.gte': `${startDate}T00:00:00`,
        'start.lte': `${endDate}T23:59:59`,
        category: category ? this.mapCategoryToPredictHQ(category) : undefined,
        limit,
        offset,
      });

      allEvents.push(...events);
      totalAvailable = total;
      
      if (events.length < limit || allEvents.length >= total || offset >= 1500) {
        break;
      }
      
      offset += limit;
    }
    
    console.log(`🔮 PredictHQ: Retrieved ${allEvents.length} total events for ${city} with radius ${radius} (${totalAvailable} available)`);
    return allEvents;
  }

  /**
   * Get Entertainment events with radius search across multiple PredictHQ categories
   */
  private async getEntertainmentEventsWithRadius(
    city: string,
    startDate: string,
    endDate: string,
    radius: string = '50km'
  ): Promise<Event[]> {
    console.log(`🔮 PredictHQ: Searching Entertainment events for ${city} with radius ${radius} across multiple categories`);
    
    const entertainmentCategories = ['concerts', 'festivals', 'performing-arts', 'nightlife'];
    const allEvents: Event[] = [];
    
    // Search each category in parallel
    const searchPromises = entertainmentCategories.map(async (phqCategory) => {
      try {
        const locationParams = this.getCityLocationParams(city);
        const radiusValue = radius.replace('km', '');
        const within = locationParams.place ? `${radiusValue}km@${locationParams.place}` : undefined;
        
        console.log(`🔮 PredictHQ: Searching ${phqCategory} for ${city} with radius ${radius}`);
        
        const { events } = await this.getEvents({
          ...locationParams,
          within,
          'start.gte': `${startDate}T00:00:00`,
          'start.lte': `${endDate}T23:59:59`,
          category: phqCategory,
          limit: 200, // Reduced limit per category to avoid overwhelming
        });
        
        console.log(`🔮 PredictHQ: Found ${events.length} ${phqCategory} events`);
        return events;
      } catch (error) {
        console.error(`🔮 PredictHQ: Error searching ${phqCategory}:`, error);
        return [];
      }
    });
    
    const results = await Promise.allSettled(searchPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allEvents.push(...result.value);
      }
    });
    
    // Deduplicate events
    const uniqueEvents = this.deduplicateEvents(allEvents);
    
    console.log(`🔮 PredictHQ: Retrieved ${uniqueEvents.length} unique Entertainment events for ${city} with radius ${radius}`);
    return uniqueEvents;
  }

  /**
   * Get all events for a specific city and date range by paginating through all pages
   */
  private async getEventsForCityPaginated(
    city: string,
    startDate: string,
    endDate: string,
    category?: string
  ): Promise<Event[]> {
    const allEvents: Event[] = [];
    let offset = 0;
    const limit = 500; // PredictHQ's maximum limit
    const locationParams = this.getCityLocationParams(city);
    let totalAvailable = 0;
    
    while (true) {
      console.log(`🔮 PredictHQ: Fetching offset ${offset} for ${city}`);
      
      const { events, total } = await this.getEvents({
        ...locationParams,
        city: city, // Pass the city parameter for proper transformation
        'start.gte': `${startDate}T00:00:00`,
        'start.lte': `${endDate}T23:59:59`,
        category: category ? this.mapCategoryToPredictHQ(category) : undefined,
        limit,
        offset,
      });

      allEvents.push(...events);
      totalAvailable = total; // Store the total for logging
      
      // Check if we've fetched all available events or reached the safety limit (reduced for performance)
      if (events.length < limit || allEvents.length >= total || offset >= 1500) { // 3 pages * 500 limit
        break;
      }
      
      offset += limit;
    }
    
    console.log(`🔮 PredictHQ: Retrieved ${allEvents.length} total events for ${city} (${totalAvailable} available)`);
    return allEvents;
  }

  /**
   * Search events by keyword
   */
  async searchEvents(
    keyword: string,
    city?: string,
    startDate?: string,
    endDate?: string
  ): Promise<Event[]> {
    const { events } = await this.getEvents({
      q: keyword,
      city,
      'start.gte': startDate ? `${startDate}T00:00:00` : undefined,
      'start.lte': endDate ? `${endDate}T23:59:59` : undefined,
      limit: 500, // Increased from 200 to 500 for better event coverage
    });

    return events;
  }

  /**
   * Get high-impact events for a city (events with high attendance/rank)
   */
  async getHighImpactEvents(
    city: string,
    startDate: string,
    endDate: string,
    minAttendance: number = 1000
  ): Promise<Event[]> {
    const { events } = await this.getEvents({
      city,
      'start.gte': `${startDate}T00:00:00`,
      'start.lte': `${endDate}T23:59:59`,
      'phq_attendance.gte': minAttendance,
      limit: 500, // Increased from 200 to 500 for better event coverage
    });

    return events;
  }

  /**
   * Transform PredictHQ event to our Event interface
   */
  private transformEvent = (phqEvent: PredictHQEvent, requestedCity?: string, requestedCategory?: string): Event => {
    const location = phqEvent.location || phqEvent.place;
    const startDate = new Date(phqEvent.start);
    const endDate = phqEvent.end ? new Date(phqEvent.end) : undefined;
    
    // Extract city from various possible sources
    let actualEventCity = 'Unknown';
    
    // First priority: Try to extract city from venue name (most reliable)
    const venueName = location?.name || phqEvent.place?.name;
    if (venueName) {
      const cityFromVenue = venueCityMappingService.getCityForVenue(venueName);
      if (cityFromVenue) {
        actualEventCity = cityFromVenue;
        console.log(`🔮 PredictHQ: Extracted city "${cityFromVenue}" from venue name "${venueName}" for event "${phqEvent.title}"`);
      }
    }
    
    // Second priority: location.city (if venue mapping didn't work)
    if (actualEventCity === 'Unknown' && location?.city) {
      actualEventCity = location.city;
    } 
    // Third priority: place.city  
    else if (actualEventCity === 'Unknown' && phqEvent.place?.city) {
      actualEventCity = phqEvent.place.city;
    }
    // Fourth priority: extract from address
    else if (actualEventCity === 'Unknown' && location?.address) {
      const addressParts = location.address.split(',');
      if (addressParts.length > 1) {
        actualEventCity = addressParts[addressParts.length - 2]?.trim() || 'Unknown';
      }
    }
    // Fifth priority: check if this is a Czech Republic event without city info
    else if (actualEventCity === 'Unknown' && phqEvent.country === 'CZ') {
      // Try to extract city from event title for Czech events
      const extractedCity = this.extractCityFromTitle(phqEvent.title);
      if (extractedCity) {
        actualEventCity = extractedCity;
        console.log(`🇨🇿 PredictHQ: Extracted city "${extractedCity}" from Czech event title "${phqEvent.title}"`);
      } else {
        // ENHANCED: Check if this looks like an international conference
        const isInternationalConference = this.isInternationalConference(phqEvent.title, phqEvent.description);
        
        if (isInternationalConference) {
          // For international conferences, be more conservative - don't assume location
          actualEventCity = 'Czech Republic';
          console.log(`🌍 PredictHQ: International conference "${phqEvent.title}" detected - marking as Czech Republic (not assigning to requested city)`);
        } else if (requestedCity && this.isLikelyLocalEvent(phqEvent, requestedCity)) {
          // Only use requested city for events that are clearly local
          actualEventCity = requestedCity;
          console.log(`🇨🇿 PredictHQ: Using requested city "${requestedCity}" for local Czech event "${phqEvent.title}"`);
        } else {
          // Conservative fallback: mark as Czech Republic
          actualEventCity = 'Czech Republic';
          console.log(`🇨🇿 PredictHQ: Czech event "${phqEvent.title}" has no city info - marking as Czech Republic (not assigning to requested city)`);
        }
      }
    }
    // Sixth priority: mark foreign events
    else if (actualEventCity === 'Unknown' && phqEvent.country && phqEvent.country !== 'CZ') {
      actualEventCity = `${phqEvent.country}${phqEvent.state ? '-' + phqEvent.state : ''}`;
    }
    
    // CRITICAL: Always use the actual event city, never default to requested city
    // This ensures foreign events are properly identified and filtered out
    let city = actualEventCity;
    
    // Only if we truly have no location info, use requested city as fallback
    if (actualEventCity === 'Unknown' && requestedCity) {
      city = requestedCity;
      console.log(`⚠️ PredictHQ: No location info for "${phqEvent.title}", using requested city "${requestedCity}" as fallback`);
    }
    
    // Log foreign events for debugging
    if (requestedCity && actualEventCity !== 'Unknown') {
      const normalizedRequested = requestedCity.toLowerCase().trim();
      const normalizedActual = actualEventCity.toLowerCase().trim();
      
      if (!this.doesCityMatch(normalizedRequested, normalizedActual)) {
        console.log(`🌍 PredictHQ: Foreign event detected - "${phqEvent.title}" is from "${actualEventCity}" but user searched for "${requestedCity}"`);
      }
    }
    
    // Map category - if we did a broader search, use the requested category when appropriate
    let mappedCategory = this.mapPredictHQCategory(phqEvent.category, phqEvent.title, phqEvent.description);
    
    // If we did a broader search and the mapped category doesn't match the requested category,
    // but the content suggests it should match, use the requested category
    if (requestedCategory && mappedCategory !== requestedCategory) {
      const content = `${phqEvent.title || ''} ${phqEvent.description || ''}`.toLowerCase();
      
      // Check if the content matches the requested category
      if (this.doesContentMatchCategory(content, requestedCategory)) {
        console.log(`🔮 PredictHQ: Overriding category from "${mappedCategory}" to "${requestedCategory}" for "${phqEvent.title}" based on content`);
        mappedCategory = requestedCategory;
      }
    }

    return {
      id: `phq_${phqEvent.id}`,
      title: phqEvent.title,
      description: phqEvent.description,
      date: startDate.toISOString().split('T')[0],
      endDate: endDate?.toISOString().split('T')[0],
      city: city,
      venue: location?.name || phqEvent.place?.name,
      category: mappedCategory,
      subcategory: phqEvent.subcategory,
      expectedAttendees: phqEvent.phq_attendance,
      source: 'predicthq',
      sourceId: phqEvent.id,
      url: undefined, // PredictHQ doesn't provide event URLs
      imageUrl: undefined, // PredictHQ doesn't provide event images
      createdAt: phqEvent.created || new Date().toISOString(),
      updatedAt: phqEvent.updated || new Date().toISOString(),
    };
  };

  /**
   * Extract city name from event title for Czech events
   * Many Czech events include city names in their titles
   */
  private extractCityFromTitle(title: string): string | null {
    const czechCities = [
      // Major cities
      'Praha', 'Prague', 'Brno', 'Ostrava', 'Plzen', 'Pilsen', 'Liberec', 'Olomouc',
      'České Budějovice', 'Budweis', 'Hradec Králové', 'Pardubice', 'Zlín', 'Havířov',
      'Kladno', 'Most', 'Karlovy Vary', 'Karlsbad', 'Frýdek-Místek', 'Opava', 'Děčín',
      
      // Sports teams and locations that indicate cities
      'Sparta Praha', 'Slavia Praha', 'Viktoria Plzeň', 'Baník Ostrava', 'Sigma Olomouc',
      'Zbrojovka Brno', 'Kometa Brno', 'Basket Brno', 'Slavia Třebíč', 'Třebíč',
      'Dukla Jihlava', 'Jihlava', 'Dynamo Pardubice', 'Energie Karlovy Vary',
      'Bili Tygri Liberec', 'Rytiri Kladno', 'Nymburk', 'Písek', 'Kolín',
      'Litoměřice', 'Vsetín', 'Chomutov', 'Sokolov', 'Tábor', 'Poruba',
      'Ústí nad Labem', 'Trutnov', 'Mladá Boleslav', 'Příbram', 'Chrudim',
      'Kosmonosy', 'Neratovice', 'Byškovice', 'Jablonec', 'Jindřichův Hradec',
      'Nový Jičín', 'Lokomotiva Plzeň'
    ];

    // Create a mapping of team/location names to cities
    const cityMapping: Record<string, string> = {
      'Sparta Praha': 'Prague',
      'Slavia Praha': 'Prague', 
      'USK Praha': 'Prague',
      'Viktoria Plzeň': 'Plzen',
      'Lokomotiva Plzeň': 'Plzen',
      'Baník Ostrava': 'Ostrava',
      'NH Ostrava': 'Ostrava',
      'Basket Ostrava': 'Ostrava',
      'Sigma Olomouc': 'Olomouc',
      'Olomoucko': 'Olomouc',
      'Zbrojovka Brno': 'Brno',
      'Kometa Brno': 'Brno',
      'Basket Brno': 'Brno',
      'Slavia Třebíč': 'Třebíč',
      'Dukla Jihlava': 'Jihlava',
      'Dynamo Pardubice': 'Pardubice',
      'BK Pardubice': 'Pardubice',
      'Energie Karlovy Vary': 'Karlovy Vary',
      'Bili Tygri Liberec': 'Liberec',
      'Lynx Liberec': 'Liberec',
      'Rytiri Kladno': 'Kladno',
      'Nymburk': 'Nymburk',
      'Písek Sršni': 'Písek',
      'Písek': 'Písek',
      'Kolín': 'Kolín',
      'Stadion Litoměřice': 'Litoměřice',
      'Slavoj Litoměřice': 'Litoměřice',
      'Vsetín': 'Vsetín',
      'Piráti Chomutov': 'Chomutov',
      'Baník Sokolov': 'Sokolov',
      'Tábor': 'Tábor',
      'Poruba': 'Ostrava', // Poruba is part of Ostrava
      'Ústí nad Labem': 'Ústí nad Labem',
      'Loko Trutnov': 'Trutnov',
      'BK Mlada Boleslav': 'Mladá Boleslav',
      'Chrudim': 'Chrudim',
      'Kosmonosy': 'Mladá Boleslav', // Kosmonosy is near Mladá Boleslav
      'Jablonec': 'Jablonec nad Nisou',
      'Neratovice': 'Mělník', // Neratovice is near Mělník
      'Jindřichův Hradec': 'Jindřichův Hradec',
      'Nový Jičín': 'Nový Jičín',
      'Frýdek Místek': 'Frýdek-Místek',
      'Opava': 'Opava',
      'Hradec Králové': 'Hradec Králové',
      'Děčín': 'Děčín',
      'Zlín': 'Zlín',
      'Přerov': 'Přerov'
    };

    // Check for direct city mapping first
    for (const [teamName, cityName] of Object.entries(cityMapping)) {
      if (title.includes(teamName)) {
        return cityName;
      }
    }

    // Check for direct city names
    for (const city of czechCities) {
      if (title.includes(city)) {
        // Map some city name variations
        if (city === 'Praha') return 'Prague';
        if (city === 'Plzen') return 'Plzen';
        if (city === 'Pilsen') return 'Plzen';
        return city;
      }
    }

    return null;
  }

  /**
   * Check if an event is likely an international conference
   */
  private isInternationalConference(title: string, description?: string): boolean {
    const text = `${title} ${description || ''}`.toLowerCase();
    
    // International conference indicators
    const internationalKeywords = [
      'international', 'global', 'world', 'european', 'europe', 'euro',
      'conference', 'congress', 'summit', 'forum', 'symposium', 'workshop',
      'annual conference', 'annual meeting', 'scientific conference',
      'business forum', 'tech conference', 'industry conference'
    ];
    
    // Check for international keywords
    const hasInternationalKeywords = internationalKeywords.some(keyword => 
      text.includes(keyword)
    );
    
    // Check for specific patterns that indicate international events
    const hasInternationalPatterns = 
      /international.*conference/i.test(text) ||
      /global.*forum/i.test(text) ||
      /european.*summit/i.test(text) ||
      /world.*congress/i.test(text) ||
      /annual.*conference/i.test(text);
    
    return hasInternationalKeywords || hasInternationalPatterns;
  }

  /**
   * Check if an event is likely local to the requested city
   */
  private isLikelyLocalEvent(phqEvent: PredictHQEvent, requestedCity: string): boolean {
    const title = phqEvent.title.toLowerCase();
    const description = (phqEvent.description || '').toLowerCase();
    const venueName = (phqEvent.location?.name || phqEvent.place?.name || '').toLowerCase();
    const text = `${title} ${description} ${venueName}`;
    
    const normalizedRequestedCity = requestedCity.toLowerCase();
    
    // Check if the event title, description, or venue contains the requested city
    const containsRequestedCity = text.includes(normalizedRequestedCity) ||
                                 text.includes('brno') || text.includes('prague') || text.includes('ostrava');
    
    // Check for local event indicators
    const hasLocalIndicators = 
      text.includes('local') ||
      text.includes('community') ||
      text.includes('regional') ||
      text.includes('městský') || // Czech for "city"
      text.includes('brněnský') || // Czech for "Brno"
      text.includes('pražský'); // Czech for "Prague"
    
    // Check if venue name suggests it's in the requested city
    const venueSuggestsCity = Boolean(venueName && (
      venueName.includes(normalizedRequestedCity) ||
      venueName.includes('brno') ||
      venueName.includes('prague')
    ));
    
    return containsRequestedCity || hasLocalIndicators || venueSuggestsCity;
  }

  /**
   * Check if a city name is a Czech city
   */
  private isCzechCity(city: string): boolean {
    const czechCities = ['prague', 'praha', 'brno', 'ostrava', 'plzen', 'pilsen', 'liberec', 'olomouc', 'české budějovice', 'budweis', 'hradec králové', 'pardubice', 'zlín', 'havířov', 'kladno', 'most', 'karlovy vary', 'karlsbad', 'frýdek-místek', 'opava', 'děčín'];
    return czechCities.includes(city.toLowerCase().trim());
  }

  /**
   * Map our categories to PredictHQ category names
   * Returns undefined for broader searches when no specific mapping exists
   */
  private mapCategoryToPredictHQ(category: string): string | undefined {
    const categoryMap: Record<string, string | undefined> = {
      // Business and professional events - use broader search for better results
      'Technology': undefined, // Use broader search for tech events
      'Business': undefined, // Use broader search for business events
      'Marketing': undefined, // Use broader search for marketing events
      'Finance': undefined, // Use broader search for finance events
      'Professional Development': undefined, // Use broader search
      'Networking': undefined, // Use broader search
      
      // Conferences and trade shows
      'Conferences': 'conferences', // Direct mapping
      'Trade Shows': 'expos', // Trade shows and exhibitions
      'Expos': 'expos', // Direct mapping
      
      // Healthcare and education
      'Healthcare': undefined, // Use broader search for healthcare events
      'Education': 'academic', // Educational events and academic conferences
      'Academic': 'academic', // Direct mapping
      
      // Entertainment and culture
      'Entertainment': undefined, // Use broader search to include concerts, festivals, performing-arts, nightlife
      'Music': 'concerts', // Direct mapping
      'Arts & Culture': 'festivals', // Cultural festivals and events
      'Film': 'performing-arts', // Film events and screenings
      
      // Sports
      'Sports': 'sports', // Direct mapping
      
      // For categories that might benefit from broader search
      'Other': undefined, // Return undefined to search without category filter
    };

    const mappedCategory = categoryMap[category];
    
    // Log when we're using fallback (undefined) for debugging
    if (mappedCategory === undefined) {
      console.log(`🔮 PredictHQ: Using broader search for category "${category}" (no specific mapping)`);
    }
    
    return mappedCategory;
  }

  /**
   * Map PredictHQ categories to our standard categories
   */
  private mapPredictHQCategory(phqCategory: string, title?: string, description?: string): string {
    // First check for specific keywords in title/description for better categorization
    const content = `${title || ''} ${description || ''}`.toLowerCase();
    
    // Sports-specific keywords (check first to avoid false positives)
    if (this.hasSportsKeywords(content)) {
      console.log(`🔮 PredictHQ: Mapped "${title}" to Sports based on content keywords`);
      return 'Sports';
    }
    
    // Technology-specific keywords
    if (this.hasTechnologyKeywords(content)) {
      console.log(`🔮 PredictHQ: Mapped "${title}" to Technology based on content keywords`);
      return 'Technology';
    }
    
    // Healthcare-specific keywords
    if (this.hasHealthcareKeywords(content)) {
      console.log(`🔮 PredictHQ: Mapped "${title}" to Healthcare based on content keywords`);
      return 'Healthcare';
    }
    
    // Finance-specific keywords
    if (this.hasFinanceKeywords(content)) {
      console.log(`🔮 PredictHQ: Mapped "${title}" to Finance based on content keywords`);
      return 'Finance';
    }
    
    // Marketing-specific keywords (with improved matching)
    if (this.hasMarketingKeywords(content)) {
      console.log(`🔮 PredictHQ: Mapped "${title}" to Marketing based on content keywords`);
      return 'Marketing';
    }
    
    // Fall back to category-based mapping
    // CRITICAL FIX: Ensure bidirectional consistency with input mapping
    const categoryMap: Record<string, string> = {
      'conferences': 'Business', // Keep as Business for general conferences
      'concerts': 'Entertainment',
      'sports': 'Sports',
      'festivals': 'Arts & Culture',
      'community': 'Other',
      'expos': 'Business', // Keep as Business for general expos
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
   * Check if content has sports keywords with word boundary matching
   */
  private hasSportsKeywords(content: string): boolean {
    const sportsKeywords = [
      'sport', 'game', 'match', 'tournament', 'league', 'athletic', 'fitness',
      'football', 'soccer', 'basketball', 'tennis', 'hockey', 'baseball',
      'championship', 'cup', 'vs', 'versus', 'liga', 'division', 'team'
    ];
    
    return sportsKeywords.some(keyword => {
      // Use word boundary matching to avoid false positives
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(content);
    });
  }

  /**
   * Check if content has technology keywords with word boundary matching
   */
  private hasTechnologyKeywords(content: string): boolean {
    const techKeywords = [
      'tech', 'digital', 'software', 'ai', 'data', 'coding', 'programming', 
      'cyber', 'cloud', 'startup', 'innovation', 'computer', 'algorithm'
    ];
    
    return techKeywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(content);
    });
  }

  /**
   * Check if content has healthcare keywords with word boundary matching
   */
  private hasHealthcareKeywords(content: string): boolean {
    const healthKeywords = [
      'medical', 'health', 'clinical', 'doctor', 'nurse', 'patient', 
      'hospital', 'pharma', 'drug', 'surgery', 'anaesth', 'o&g', 'gems study'
    ];
    
    return healthKeywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(content);
    });
  }

  /**
   * Check if content has finance keywords with word boundary matching
   */
  private hasFinanceKeywords(content: string): boolean {
    const financeKeywords = [
      'finance', 'banking', 'investment', 'trading', 'fintech', 'crypto', 'financial'
    ];
    
    return financeKeywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(content);
    });
  }

  /**
   * Check if content has marketing keywords with improved matching to avoid false positives
   */
  private hasMarketingKeywords(content: string): boolean {
    // Use more specific marketing terms to avoid false positives
    const marketingKeywords = [
      'marketing', 'advertising', 'branding', 'social media', 'seo', 'digital marketing', 
      'promotion', 'campaign', 'brand awareness', 'marketing strategy'
    ];
    
    return marketingKeywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(content);
    });
  }

  /**
   * Check if content matches a specific category
   */
  private doesContentMatchCategory(content: string, category: string): boolean {
    const categoryKeywords: Record<string, string[]> = {
      'Technology': ['tech', 'digital', 'software', 'ai', 'data', 'coding', 'programming', 'cyber', 'cloud', 'startup', 'innovation'],
      'Marketing': ['marketing', 'advertising', 'brand', 'social media', 'seo', 'digital marketing', 'promotion', 'campaign'],
      'Business': ['business', 'conference', 'meeting', 'corporate', 'enterprise', 'strategy', 'management'],
      'Finance': ['finance', 'banking', 'investment', 'trading', 'fintech', 'crypto', 'financial'],
      'Healthcare': ['medical', 'health', 'clinical', 'doctor', 'nurse', 'patient', 'hospital', 'pharma', 'drug'],
      'Entertainment': ['concert', 'music', 'show', 'performance', 'entertainment', 'festival', 'party'],
      'Sports': ['sport', 'game', 'match', 'tournament', 'league', 'athletic', 'fitness'],
      'Arts & Culture': ['art', 'culture', 'museum', 'gallery', 'exhibition', 'theater', 'theatre', 'dance'],
      'Education': ['education', 'learning', 'training', 'course', 'workshop', 'seminar', 'academic', 'school']
    };
    
    const keywords = categoryKeywords[category] || [];
    return keywords.some(keyword => content.includes(keyword));
  }

  /**
   * Check if two cities match (exact match or known aliases)
   */
  private doesCityMatch(requestedCity: string, actualCity: string): boolean {
    // Exact match
    if (requestedCity === actualCity) {
      return true;
    }
    
    // Known city aliases
    const cityAliases: Record<string, string[]> = {
      'brno': ['brno', 'brünn'],
      'prague': ['prague', 'praha', 'prag'],
      'london': ['london', 'londres'],
      'berlin': ['berlin', 'berlín'],
      'paris': ['paris', 'parís'],
      'vienna': ['vienna', 'wien', 'vienne'],
      'warsaw': ['warsaw', 'warszawa'],
      'budapest': ['budapest'],
      'zurich': ['zurich', 'zürich'],
      'munich': ['munich', 'münchen'],
      'stockholm': ['stockholm'],
      'copenhagen': ['copenhagen', 'københavn'],
      'helsinki': ['helsinki', 'helsingfors'],
      'oslo': ['oslo'],
      'madrid': ['madrid'],
      'barcelona': ['barcelona'],
      'rome': ['rome', 'roma'],
      'milan': ['milan', 'milano'],
      'athens': ['athens', 'athina'],
      'lisbon': ['lisbon', 'lisboa'],
      'dublin': ['dublin'],
      'amsterdam': ['amsterdam'],
      'edinburgh': ['edinburgh'],
      'glasgow': ['glasgow'],
      'manchester': ['manchester'],
      'birmingham': ['birmingham'],
      'liverpool': ['liverpool'],
      'leeds': ['leeds'],
      'bristol': ['bristol'],
      'hamburg': ['hamburg'],
      'cologne': ['cologne', 'köln'],
      'frankfurt': ['frankfurt'],
      'stuttgart': ['stuttgart'],
      'düsseldorf': ['düsseldorf'],
      'dortmund': ['dortmund'],
      'leipzig': ['leipzig'],
      'dresden': ['dresden']
    };
    
    // Check if actual city is an alias of requested city
    const aliases = cityAliases[requestedCity] || [];
    return aliases.includes(actualCity);
  }

  /**
   * Get location parameters for a city
   */
  private getCityLocationParams(city: string): Partial<PredictHQSearchParams> {
    const cityCoordinates: Record<string, { lat: number; lon: number }> = {
      'Prague': { lat: 50.0755, lon: 14.4378 },
      'Brno': { lat: 49.1951, lon: 16.6068 },
      'Ostrava': { lat: 49.8209, lon: 18.2625 },
      'London': { lat: 51.5074, lon: -0.1278 },
      'Berlin': { lat: 52.5200, lon: 13.4050 },
      'Paris': { lat: 48.8566, lon: 2.3522 },
      'Amsterdam': { lat: 52.3676, lon: 4.9041 },
      'Vienna': { lat: 48.2082, lon: 16.3738 },
      'Warsaw': { lat: 52.2297, lon: 21.0122 },
      'Budapest': { lat: 47.4979, lon: 19.0402 },
      'Zurich': { lat: 47.3769, lon: 8.5417 },
      'Munich': { lat: 48.1351, lon: 11.5820 },
      'Stockholm': { lat: 59.3293, lon: 18.0686 },
      'Copenhagen': { lat: 55.6761, lon: 12.5683 },
      'Helsinki': { lat: 60.1699, lon: 24.9384 },
      'Oslo': { lat: 59.9139, lon: 10.7522 },
      'Madrid': { lat: 40.4168, lon: -3.7038 },
      'Barcelona': { lat: 41.3851, lon: 2.1734 },
      'Rome': { lat: 41.9028, lon: 12.4964 },
      'Milan': { lat: 45.4642, lon: 9.1900 },
      'Athens': { lat: 37.9755, lon: 23.7348 },
      'Lisbon': { lat: 38.7223, lon: -9.1393 },
      'Dublin': { lat: 53.3498, lon: -6.2603 },
      'Edinburgh': { lat: 55.9533, lon: -3.1883 },
      'Glasgow': { lat: 55.8642, lon: -4.2518 },
      'Manchester': { lat: 53.4808, lon: -2.2426 },
      'Birmingham': { lat: 52.4862, lon: -1.8904 },
      'Liverpool': { lat: 53.4084, lon: -2.9916 },
      'Leeds': { lat: 53.8008, lon: -1.5491 },
      'Sheffield': { lat: 53.3811, lon: -1.4701 },
      'Bristol': { lat: 51.4545, lon: -2.5879 },
      'Newcastle': { lat: 54.9783, lon: -1.6178 },
      'Nottingham': { lat: 52.9548, lon: -1.1581 },
      'Leicester': { lat: 52.6369, lon: -1.1398 },
      'Hamburg': { lat: 53.5511, lon: 9.9937 },
      'Cologne': { lat: 50.9375, lon: 6.9603 },
      'Frankfurt': { lat: 50.1109, lon: 8.6821 },
      'Stuttgart': { lat: 48.7758, lon: 9.1829 },
      'Düsseldorf': { lat: 51.2277, lon: 6.7735 },
      'Dortmund': { lat: 51.5136, lon: 7.4653 },
      'Essen': { lat: 51.4556, lon: 7.0116 },
      'Leipzig': { lat: 51.3397, lon: 12.3731 },
      'Bremen': { lat: 53.0793, lon: 8.8017 },
      'Dresden': { lat: 51.0504, lon: 13.7373 },
      'Hannover': { lat: 52.3759, lon: 9.7320 },
      'Nuremberg': { lat: 49.4521, lon: 11.0767 },
    };

    const cityData = cityCoordinates[city];
    if (cityData) {
      return {
        place: `${cityData.lat},${cityData.lon}`,
        country: getCityCountryCode(city), // Use centralized mapping
      };
    }

    // Fallback to city name
    return { city };
  }


  /**
   * Get available categories from PredictHQ
   */
  async getCategories(): Promise<string[]> {
    // PredictHQ has predefined categories, return them
    return [
      'conferences',
      'concerts',
      'sports',
      'festivals',
      'community',
      'expos',
      'performing-arts',
      'nightlife',
      'politics',
      'school-holidays',
      'observances',
      'public-holidays',
      'academic',
      'daylight-savings',
      'airport-delays',
      'severe-weather',
      'disasters',
      'terror',
      'shooting',
      'civil-unrest',
      'protests',
      'strikes',
      'transport',
      'health-warnings',
      'disease',
    ];
  }

  /**
   * Get event details by ID
   */
  async getEvent(eventId: string): Promise<PredictHQEvent> {
    try {
      const url = `${this.baseUrl}/events/${eventId}/`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.getApiKey()}`,
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch event: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching PredictHQ event:', error);
      throw error;
    }
  }

  /**
   * Get events with high attendance predictions
   */
  async getHighAttendanceEvents(
    city: string,
    startDate: string,
    endDate: string,
    minAttendance: number = 5000
  ): Promise<Event[]> {
    const { events } = await this.getEvents({
      city,
      'start.gte': `${startDate}T00:00:00`,
      'start.lte': `${endDate}T23:59:59`,
      'phq_attendance.gte': minAttendance,
      sort: '-phq_attendance',
      limit: 500, // Increased from 200 to 500 for better event coverage
    });

    return events;
  }

  /**
   * Get events by rank (local impact)
   */
  async getHighRankEvents(
    city: string,
    startDate: string,
    endDate: string,
    minRank: number = 50
  ): Promise<Event[]> {
    const { events } = await this.getEvents({
      city,
      'start.gte': `${startDate}T00:00:00`,
      'start.lte': `${endDate}T23:59:59`,
      'local_rank.gte': minRank,
      sort: '-local_rank',
      limit: 500, // Increased from 200 to 500 for better event coverage
    });

    return events;
  }

  /**
   * Test category effectiveness by comparing results with and without category filtering
   */
  async testCategoryEffectiveness(
    city: string,
    startDate: string,
    endDate: string,
    category: string
  ): Promise<{
    withCategory: number;
    withoutCategory: number;
    effectiveness: number;
    categoryUsed: string | undefined;
  }> {
    const locationParams = this.getCityLocationParams(city);
    const mappedCategory = this.mapCategoryToPredictHQ(category);
    
    // Get events with category filter
    const { total: withCategory } = await this.getEvents({
      ...locationParams,
      'start.gte': `${startDate}T00:00:00`,
      'start.lte': `${endDate}T23:59:59`,
      category: mappedCategory,
      limit: 500,
      offset: 0,
    });

    // Get events without category filter
    const { total: withoutCategory } = await this.getEvents({
      ...locationParams,
      'start.gte': `${startDate}T00:00:00`,
      'start.lte': `${endDate}T23:59:59`,
      limit: 500,
      offset: 0,
    });

    const effectiveness = withoutCategory > 0 ? (withCategory / withoutCategory) * 100 : 0;

    console.log(`🔮 PredictHQ Category Test for "${category}":`);
    console.log(`  - With category filter (${mappedCategory || 'none'}): ${withCategory} events`);
    console.log(`  - Without category filter: ${withoutCategory} events`);
    console.log(`  - Effectiveness: ${effectiveness.toFixed(1)}%`);

    return {
      withCategory,
      withoutCategory,
      effectiveness,
      categoryUsed: mappedCategory,
    };
  }

  /**
   * Get events with fallback strategy - tries specific category first, then broader search
   */
  async getEventsWithFallback(
    city: string,
    startDate: string,
    endDate: string,
    category?: string
  ): Promise<Event[]> {
    if (!category) {
      return this.getEventsForCity(city, startDate, endDate);
    }

    const mappedCategory = this.mapCategoryToPredictHQ(category);
    
    // If we have a specific mapping, try it first
    if (mappedCategory) {
      try {
        const events = await this.getEventsForCity(city, startDate, endDate, category);
        
        // If we got a reasonable number of events, return them
        if (events.length >= 5) {
          console.log(`🔮 PredictHQ: Found ${events.length} events for "${category}" using category "${mappedCategory}"`);
          return events;
        }
        
        console.log(`🔮 PredictHQ: Only ${events.length} events found for "${category}" with category "${mappedCategory}", trying broader search`);
      } catch (error) {
        console.log(`🔮 PredictHQ: Error with category "${category}": ${error}, trying broader search`);
      }
    }

    // Fallback to broader search without category filter
    console.log(`🔮 PredictHQ: Using broader search for "${category}"`);
    return this.getEventsForCity(city, startDate, endDate);
  }

  /**
   * Get events with comprehensive fallback strategy including radius search
   */
  async getEventsWithComprehensiveFallback(
    city: string,
    startDate: string,
    endDate: string,
    category?: string,
    radius: string = '50km'
  ): Promise<Event[]> {
    const allEvents: Event[] = [];
    const seenEvents = new Set<string>();

    // Strategy 1: Exact city match with category
    if (category) {
      try {
        console.log(`🔮 PredictHQ: Strategy 1 - Exact city match with category "${category}"`);
        const categoryEvents = await this.getEventsForCity(city, startDate, endDate, category);
        this.addUniqueEvents(allEvents, categoryEvents, seenEvents);
        
        if (allEvents.length >= 10) {
          console.log(`🔮 PredictHQ: Found ${allEvents.length} events with exact city match, returning early`);
          return allEvents;
        }
      } catch (error) {
        console.log(`🔮 PredictHQ: Strategy 1 failed: ${error}`);
      }
    }

    // Strategy 2: Exact city match without category
    try {
      console.log(`🔮 PredictHQ: Strategy 2 - Exact city match without category`);
      const cityEvents = await this.getEventsForCity(city, startDate, endDate);
      this.addUniqueEvents(allEvents, cityEvents, seenEvents);
      
      if (allEvents.length >= 15) {
        console.log(`🔮 PredictHQ: Found ${allEvents.length} events with exact city match, returning early`);
        return allEvents;
      }
    } catch (error) {
      console.log(`🔮 PredictHQ: Strategy 2 failed: ${error}`);
    }

    // Strategy 3: Radius search with category
    if (category) {
      try {
        console.log(`🔮 PredictHQ: Strategy 3 - Radius search (${radius}) with category "${category}"`);
        const radiusCategoryEvents = await this.getEventsWithRadius(city, startDate, endDate, radius, category);
        this.addUniqueEvents(allEvents, radiusCategoryEvents, seenEvents);
        
        if (allEvents.length >= 20) {
          console.log(`🔮 PredictHQ: Found ${allEvents.length} events with radius search, returning early`);
          return allEvents;
        }
      } catch (error) {
        console.log(`🔮 PredictHQ: Strategy 3 failed: ${error}`);
      }
    }

    // Strategy 4: Radius search without category
    try {
      console.log(`🔮 PredictHQ: Strategy 4 - Radius search (${radius}) without category`);
      const radiusEvents = await this.getEventsWithRadius(city, startDate, endDate, radius);
      this.addUniqueEvents(allEvents, radiusEvents, seenEvents);
    } catch (error) {
      console.log(`🔮 PredictHQ: Strategy 4 failed: ${error}`);
    }

    // Strategy 5: Extended radius search (100km) for broader coverage
    try {
      console.log(`🔮 PredictHQ: Strategy 5 - Extended radius search (100km)`);
      const extendedRadiusEvents = await this.getEventsWithRadius(city, startDate, endDate, '100km', category);
      this.addUniqueEvents(allEvents, extendedRadiusEvents, seenEvents);
    } catch (error) {
      console.log(`🔮 PredictHQ: Strategy 5 failed: ${error}`);
    }

    // Strategy 6: Country-wide search for high-impact events (DISABLED for Czech cities to prevent foreign TBA events)
    // Only enable for non-Czech cities to avoid returning foreign events when searching Czech cities
    const isCzechCity = ['prague', 'brno', 'ostrava', 'olomouc', 'plzen', 'liberec', 'ceske budejovice', 
                        'hradec kralove', 'pardubice', 'zlin', 'havirov', 'kladno', 'most', 'karlovy vary'].includes(city.toLowerCase());
    
    if (!isCzechCity) {
      try {
        console.log(`🔮 PredictHQ: Strategy 6 - Country-wide search for high-impact events (non-Czech city)`);
        const locationParams = this.getCityLocationParams(city);
        const { events: countryEvents } = await this.getEvents({
          country: locationParams.country,
          'start.gte': `${startDate}T00:00:00`,
          'start.lte': `${endDate}T23:59:59`,
          'phq_attendance.gte': 1000, // Only high-attendance events
          category: category ? this.mapCategoryToPredictHQ(category) : undefined,
          limit: 200,
        });
        this.addUniqueEvents(allEvents, countryEvents, seenEvents);
      } catch (error) {
        console.log(`🔮 PredictHQ: Strategy 6 failed: ${error}`);
      }
    } else {
      console.log(`🔮 PredictHQ: Strategy 6 - Country-wide search disabled for Czech city "${city}" to prevent foreign TBA events`);
    }

    console.log(`🔮 PredictHQ: Comprehensive fallback completed - found ${allEvents.length} unique events`);
    return allEvents;
  }

  /**
   * Optimized multi-strategy search approach with parallel execution and early termination
   */
  async getEventsComprehensive(
    city: string,
    startDate: string,
    endDate: string,
    category?: string
  ): Promise<Event[]> {
    const targetEventCount = 15; // Reduced from 25 for much faster responses
    const strategyResults: Array<{ strategy: string; events: number; time: number }> = [];
    
    console.log(`🔮 PredictHQ: Starting parallel comprehensive search for ${city} (${startDate} to ${endDate})`);
    
    // Run core strategies in parallel for faster results
    const parallelStrategies = [
      this.runStrategy('City-based search', () => this.getEventsForCityPaginated(city, startDate, endDate, category)),
      this.runStrategy('High attendance events (1000+ attendees)', () => this.getHighAttendanceEvents(city, startDate, endDate, 1000)),
      this.runStrategy('High local rank events (rank 50+)', () => this.getHighRankEvents(city, startDate, endDate, 50))
    ];
    
    // Add keyword search if category is provided
    if (category) {
      parallelStrategies.push(
        this.runStrategy(`Keyword search for "${category}"`, () => this.searchEvents(category, city, startDate, endDate))
      );
      
      // For Entertainment category, add specific PredictHQ category searches
      if (category === 'Entertainment') {
        parallelStrategies.push(
          this.runStrategy('Entertainment: Concerts search', () => this.getEventsForCityPaginated(city, startDate, endDate, 'concerts')),
          this.runStrategy('Entertainment: Festivals search', () => this.getEventsForCityPaginated(city, startDate, endDate, 'festivals')),
          this.runStrategy('Entertainment: Performing Arts search', () => this.getEventsForCityPaginated(city, startDate, endDate, 'performing-arts')),
          this.runStrategy('Entertainment: Nightlife search', () => this.getEventsForCityPaginated(city, startDate, endDate, 'nightlife'))
        );
      }
    }
    
    const results = await Promise.allSettled(parallelStrategies);
    const allEvents: Event[] = [];
    
    // Process results from parallel strategies
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { strategy, events, time } = result.value;
        allEvents.push(...events);
        strategyResults.push({ strategy, events: events.length, time });
        console.log(`🔮 PredictHQ: ${strategy} found ${events.length} events in ${time}ms`);
      } else {
        const strategyNames = category === 'Entertainment' 
          ? ['City-based search', 'High attendance events (1000+ attendees)', 'High local rank events (rank 50+)', `Keyword search for "${category}"`, 'Entertainment: Concerts search', 'Entertainment: Festivals search', 'Entertainment: Performing Arts search', 'Entertainment: Nightlife search']
          : ['City-based search', 'High attendance events (1000+ attendees)', 'High local rank events (rank 50+)', `Keyword search for "${category}"`];
        console.error(`🔮 PredictHQ: ${strategyNames[index]} failed:`, result.reason);
        strategyResults.push({ strategy: strategyNames[index], events: 0, time: 0 });
      }
    });
    
    // Early termination if we have enough events
    if (allEvents.length >= targetEventCount) {
      console.log(`🔮 PredictHQ: Early termination - found ${allEvents.length} events (target: ${targetEventCount})`);
      const uniqueEvents = this.deduplicateEvents(allEvents);
      this.logStrategyResults(strategyResults, allEvents.length, uniqueEvents.length);
      return uniqueEvents;
    }
    
    // Only run radius searches as fallback if we need more events
    if (allEvents.length < 15) {
      const fallbackStrategies = [
        this.runStrategy('Radius search (50km)', () => this.getEventsWithRadius(city, startDate, endDate, '50km', category))
      ];
      
      // Only use extended radius if we have very few events
      if (allEvents.length < 10) {
        fallbackStrategies.push(
          this.runStrategy('Extended radius search (100km)', () => this.getEventsWithRadius(city, startDate, endDate, '100km', category))
        );
      }
      
      const fallbackResults = await Promise.allSettled(fallbackStrategies);
      
      fallbackResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { strategy, events, time } = result.value;
          allEvents.push(...events);
          strategyResults.push({ strategy, events: events.length, time });
          console.log(`🔮 PredictHQ: ${strategy} found ${events.length} events in ${time}ms`);
        } else {
          const strategyNames = ['Radius search (50km)', 'Extended radius search (100km)'];
          console.error(`🔮 PredictHQ: ${strategyNames[index]} failed:`, result.reason);
          strategyResults.push({ strategy: strategyNames[index], events: 0, time: 0 });
        }
      });
    }
    
    // Deduplicate and log results
    const uniqueEvents = this.deduplicateEvents(allEvents);
    this.logStrategyResults(strategyResults, allEvents.length, uniqueEvents.length);
    
    return uniqueEvents;
  }

  /**
   * Helper method to run a strategy with timing
   */
  private async runStrategy(strategyName: string, strategyFn: () => Promise<Event[]>): Promise<{ strategy: string; events: Event[]; time: number }> {
    const startTime = Date.now();
    const events = await strategyFn();
    const time = Date.now() - startTime;
    return { strategy: strategyName, events, time };
  }

  /**
   * Helper method to log strategy results
   */
  private logStrategyResults(strategyResults: Array<{ strategy: string; events: number; time: number }>, totalEvents: number, uniqueEvents: number): void {
    console.log(`🔮 PredictHQ: Parallel comprehensive search completed`);
    console.log(`🔮 PredictHQ: Strategy Results:`);
    strategyResults.forEach(result => {
      console.log(`  - ${result.strategy}: ${result.events} events in ${result.time}ms`);
    });
    console.log(`🔮 PredictHQ: Total events before deduplication: ${totalEvents}`);
    console.log(`🔮 PredictHQ: Total unique events after deduplication: ${uniqueEvents}`);
    console.log(`🔮 PredictHQ: Performance optimized with parallel execution and early termination`);
  }

  /**
   * Deduplicate events based on title, date, and venue
   */
  private deduplicateEvents(events: Event[]): Event[] {
    const seen = new Set<string>();
    return events.filter(event => {
      // Create unique identifier from title, date, and venue
      const identifier = `${event.title.toLowerCase()}_${event.date}_${event.venue?.toLowerCase() || ''}`;
      if (seen.has(identifier)) {
        return false;
      }
      seen.add(identifier);
      return true;
    });
  }

  /**
   * Add unique events to the collection, avoiding duplicates
   */
  private addUniqueEvents(allEvents: Event[], newEvents: Event[], seenEvents: Set<string>): void {
    for (const event of newEvents) {
      const eventKey = `${event.title}-${event.date}-${event.venue || ''}`;
      if (!seenEvents.has(eventKey)) {
        allEvents.push(event);
        seenEvents.add(eventKey);
      }
    }
  }

  /**
   * Get events with storage integration - fetches from API and saves to database
   */
  async getEventsWithStorage(params: PredictHQSearchParams): Promise<{ events: Event[]; total: number; stored: number }> {
    try {
      // Fetch events from API
      const { events, total } = await this.getEvents(params);
      
      if (events.length === 0) {
        return { events, total, stored: 0 };
      }

      // Transform events to database format
      const eventsToStore: CreateEventData[] = [];
      for (const event of events) {
        try {
          // Convert Event to CreateEventData format
          const createEventData: CreateEventData = {
            title: event.title,
            description: event.description,
            date: event.date,
            end_date: event.endDate,
            city: event.city,
            venue: event.venue,
            category: event.category,
            subcategory: event.subcategory,
            expected_attendees: event.expectedAttendees,
            source: 'predicthq',
            source_id: event.sourceId,
            url: event.url,
            image_url: event.imageUrl,
          };

          // Validate the event data
          const validation = dataTransformer.validateEventData(createEventData);
          if (validation.isValid) {
            eventsToStore.push(validation.sanitizedData);
          } else {
            console.warn(`Skipping invalid PredictHQ event "${event.title}": ${validation.errors.join(', ')}`);
          }
        } catch (error) {
          console.warn(`Failed to transform PredictHQ event "${event.title}":`, error);
        }
      }

      // Save events to database
      let storedCount = 0;
      if (eventsToStore.length > 0) {
        try {
          const saveResult = await eventStorageService.saveEvents(eventsToStore);
          storedCount = saveResult.created + saveResult.updated;
          console.log(`Stored ${storedCount} PredictHQ events (${saveResult.created} created, ${saveResult.updated} updated, ${saveResult.skipped} skipped)`);
        } catch (error) {
          console.error('Failed to store PredictHQ events:', error);
        }
      }

      return { events, total, stored: storedCount };
    } catch (error) {
      console.error('Error in getEventsWithStorage:', error);
      throw error;
    }
  }

  /**
   * Get events for city with storage integration
   */
  async getEventsForCityWithStorage(
    city: string,
    startDate: string,
    endDate: string,
    category?: string
  ): Promise<{ events: Event[]; stored: number }> {
    try {
      const locationParams = this.getCityLocationParams(city);
      
      const { events, total, stored } = await this.getEventsWithStorage({
        ...locationParams,
        city: city,
        'start.gte': `${startDate}T00:00:00`,
        'start.lte': `${endDate}T23:59:59`,
        category: category ? this.mapCategoryToPredictHQ(category) : undefined,
        limit: 500,
        offset: 0,
      });

      return { events, stored };
    } catch (error) {
      console.error('Error in getEventsForCityWithStorage:', error);
      throw error;
    }
  }

  /**
   * Get events with radius and storage integration
   */
  async getEventsWithRadiusAndStorage(
    city: string,
    startDate: string,
    endDate: string,
    radius: string = '50km',
    category?: string
  ): Promise<{ events: Event[]; stored: number }> {
    try {
      const locationParams = this.getCityLocationParams(city);
      
      console.log(`🔮 PredictHQ: Searching ${city} with storage integration and radius ${radius}`);
      
      const allEvents: Event[] = [];
      let offset = 0;
      const limit = 500;
      let totalStored = 0;
      
      while (true) {
        const { events, total, stored } = await this.getEventsWithStorage({
          ...locationParams,
          city: city,
          'start.gte': `${startDate}T00:00:00`,
          'start.lte': `${endDate}T23:59:59`,
          category: category ? this.mapCategoryToPredictHQ(category) : undefined,
          limit,
          offset,
        });

        allEvents.push(...events);
        totalStored += stored;
        
        if (events.length < limit || allEvents.length >= total || offset >= 1500) {
          break;
        }
        
        offset += limit;
      }
      
      console.log(`🔮 PredictHQ: Retrieved ${allEvents.length} total events for ${city} with ${totalStored} stored in database`);
      return { events: allEvents, stored: totalStored };
    } catch (error) {
      console.error('Error in getEventsWithRadiusAndStorage:', error);
      throw error;
    }
  }

  /**
   * Get events from database (cached results)
   */
  async getEventsFromDatabase(
    city: string,
    startDate?: string,
    endDate?: string,
    category?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Event[]> {
    try {
      const dbEvents = await eventStorageService.getEventsByCity(
        city,
        startDate,
        endDate,
        category,
        limit,
        offset
      );

      // Convert database events to Event format
      return dbEvents.map(dbEvent => ({
        id: dbEvent.id,
        title: dbEvent.title,
        description: dbEvent.description,
        date: dbEvent.date,
        endDate: dbEvent.end_date,
        city: dbEvent.city,
        venue: dbEvent.venue,
        category: dbEvent.category,
        subcategory: dbEvent.subcategory,
        expectedAttendees: dbEvent.expected_attendees,
        source: dbEvent.source as 'ticketmaster' | 'meetup' | 'predicthq' | 'manual' | 'brno',
        sourceId: dbEvent.source_id,
        url: dbEvent.url,
        imageUrl: dbEvent.image_url,
        createdAt: dbEvent.created_at,
        updatedAt: dbEvent.updated_at,
      }));
    } catch (error) {
      console.error('Error fetching events from database:', error);
      throw error;
    }
  }

  /**
   * Sync events for a specific city and date range
   */
  async syncEventsForCity(
    city: string,
    startDate: string,
    endDate: string,
    category?: string
  ): Promise<{ events: Event[]; stored: number; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      console.log(`🔮 PredictHQ: Syncing events for ${city} from ${startDate} to ${endDate}`);
      
      const { events, stored } = await this.getEventsForCityWithStorage(
        city,
        startDate,
        endDate,
        category
      );

      console.log(`🔮 PredictHQ: Sync completed - ${events.length} events found, ${stored} stored`);
      
      return { events, stored, errors };
    } catch (error) {
      const errorMessage = `Failed to sync PredictHQ events for ${city}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMessage);
      errors.push(errorMessage);
      
      return { events: [], stored: 0, errors };
    }
  }
}

export const predicthqService = new PredictHQService();
