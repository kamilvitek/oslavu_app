// src/lib/services/ticketmaster.ts
import { Event } from '@/types';

interface TicketmasterEvent {
  id: string;
  name: string;
  description?: string;
  dates: {
    start: {
      localDate: string;
      localTime?: string;
    };
    end?: {
      localDate: string;
      localTime?: string;
    };
  };
  classifications: Array<{
    segment: { name: string };
    genre: { name: string };
    subGenre?: { name: string };
  }>;
  _embedded?: {
    venues: Array<{
      name: string;
      city: { name: string };
      country: { name: string };
    }>;
  };
  url?: string;
  images?: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  pleaseNote?: string;
  priceRanges?: Array<{
    min: number;
    max: number;
    currency: string;
  }>;
}

interface TicketmasterResponse {
  _embedded?: {
    events: TicketmasterEvent[];
  };
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

export class TicketmasterService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://app.ticketmaster.com/discovery/v2';
  
  // Rate limiting properties (5 requests per second as per Ticketmaster API docs)
  private lastRequestTime = 0;
  private readonly minRequestInterval = 200; // 200ms = 5 requests per second
  private requestCount = 0;
  private dailyRequestLimit = 5000; // Default daily limit

  constructor() {
    this.apiKey = process.env.TICKETMASTER_API_KEY || '';
    
    // Log API key status without exposing the key
    console.log('🔑 Ticketmaster API Key Status:', {
      present: !!this.apiKey,
      length: this.apiKey?.length || 0,
      firstChars: this.apiKey ? this.apiKey.substring(0, 8) + '...' : 'none',
      isPlaceholder: this.apiKey?.includes('your_') || this.apiKey?.includes('here') || false
    });
    
    // Don't throw error in constructor to allow service to be created
    // Error handling will be done at method level
  }

  /**
   * Check if API key is properly configured and valid
   */
  private isApiKeyValid(): boolean {
    const isValid = !!(this.apiKey && this.apiKey.length > 10 && !this.apiKey.includes('your_') && !this.apiKey.includes('here'));
    
    if (!isValid) {
      console.warn('🎟️ Ticketmaster API key validation failed:', {
        hasKey: !!this.apiKey,
        keyLength: this.apiKey?.length || 0,
        isPlaceholder: this.apiKey?.includes('your_') || this.apiKey?.includes('here') || false,
        setupUrl: 'https://developer.ticketmaster.com/'
      });
    }
    
    return isValid;
  }

  /**
   * Rate limiting wrapper for API requests
   * Ensures compliance with Ticketmaster's 5 requests/second limit
   */
  private async makeRateLimitedRequest(url: string, options?: RequestInit): Promise<Response> {
    // Check daily limit
    if (this.requestCount >= this.dailyRequestLimit) {
      throw new Error(`Daily API request limit of ${this.dailyRequestLimit} exceeded`);
    }

    // Implement rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      console.log(`🎟️ Ticketmaster: Rate limiting - waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
    
    // Log full request details (hide API key)
    const logUrl = url.replace(this.apiKey, 'API_KEY_HIDDEN');
    console.log(`🎟️ Ticketmaster: Making API request ${this.requestCount}/${this.dailyRequestLimit} to: ${logUrl}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...options?.headers,
      },
    });
    
    // Log response details
    console.log('📨 Ticketmaster Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      url: response.url.replace(this.apiKey, 'API_KEY_HIDDEN')
    });
    
    return response;
  }

  /**
   * Fetch events from Ticketmaster Discovery API
   */
  async getEvents(params: {
    // Location parameters
    city?: string;
    countryCode?: string;
    radius?: string;
    postalCode?: string;
    marketId?: string;
    
    // Date parameters
    startDateTime?: string;
    endDateTime?: string;
    onsaleStartDateTime?: string;
    onsaleEndDateTime?: string;
    
    // Classification parameters
    classificationName?: string;
    classificationId?: string;
    segmentId?: string;
    genreId?: string;
    subGenreId?: string;
    
    // Search parameters
    keyword?: string;
    attractionId?: string;
    venueId?: string;
    promoterId?: string;
    
    // Pagination and sorting
    size?: number;
    page?: number;
    sort?: string; // 'name,asc' | 'date,asc' | 'relevance,desc' | etc.
    
    // Additional filters
    source?: string; // 'ticketmaster' | 'universe' | 'frontgate' | 'tmr'
    locale?: string; // 'en-us', 'en-ca', etc.
    includeTBA?: boolean; // Include TBA events
    includeTBD?: boolean; // Include TBD events
    includeTest?: boolean; // Include test events (usually false)
  }): Promise<{ events: Event[]; total: number }> {
    // Check if API key is available and valid
    if (!this.isApiKeyValid()) {
      console.warn('🎟️ Ticketmaster API key is not properly configured - returning empty results');
      console.warn('🎟️ Please set TICKETMASTER_API_KEY in your .env.local file');
      console.warn('🎟️ Get your API key from: https://developer.ticketmaster.com/');
      return { events: [], total: 0 };
    }
    
    try {
      const searchParams = new URLSearchParams({
        apikey: this.apiKey,
        size: Math.min(params.size || 199, 199).toString(), // Ticketmaster's maximum page size is 199
        page: (params.page || 0).toString(),
      });

      // Add location parameters
      if (params.city) searchParams.append('city', params.city);
      if (params.countryCode) searchParams.append('countryCode', params.countryCode);
      if (params.radius) searchParams.append('radius', params.radius);
      if (params.postalCode) searchParams.append('postalCode', params.postalCode);
      if (params.marketId) searchParams.append('marketId', params.marketId);
      
      // Add date parameters
      if (params.startDateTime) searchParams.append('startDateTime', params.startDateTime);
      if (params.endDateTime) searchParams.append('endDateTime', params.endDateTime);
      if (params.onsaleStartDateTime) searchParams.append('onsaleStartDateTime', params.onsaleStartDateTime);
      if (params.onsaleEndDateTime) searchParams.append('onsaleEndDateTime', params.onsaleEndDateTime);
      
      // Add classification parameters
      if (params.classificationName) searchParams.append('classificationName', params.classificationName);
      if (params.classificationId) searchParams.append('classificationId', params.classificationId);
      if (params.segmentId) searchParams.append('segmentId', params.segmentId);
      if (params.genreId) searchParams.append('genreId', params.genreId);
      if (params.subGenreId) searchParams.append('subGenreId', params.subGenreId);
      
      // Add search parameters
      if (params.keyword) searchParams.append('keyword', params.keyword);
      if (params.attractionId) searchParams.append('attractionId', params.attractionId);
      if (params.venueId) searchParams.append('venueId', params.venueId);
      if (params.promoterId) searchParams.append('promoterId', params.promoterId);
      
      // Add sorting
      if (params.sort) searchParams.append('sort', params.sort);
      
      // Add additional filters
      if (params.source) searchParams.append('source', params.source);
      if (params.locale) searchParams.append('locale', params.locale);
      if (params.includeTBA !== undefined) searchParams.append('includeTBA', params.includeTBA.toString());
      if (params.includeTBD !== undefined) searchParams.append('includeTBD', params.includeTBD.toString());
      if (params.includeTest !== undefined) searchParams.append('includeTest', params.includeTest.toString());

      const url = `${this.baseUrl}/events.json?${searchParams.toString()}`;
      
      // Log full request details
      console.log('🌐 Ticketmaster Request:', {
        url: url.replace(this.apiKey, 'API_KEY_HIDDEN'),
        params: Object.fromEntries(searchParams),
        timestamp: new Date().toISOString()
      });
      
      const response = await this.makeRateLimitedRequest(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🚨 Ticketmaster API Error:', {
          status: response.status,
          statusText: response.statusText,
          url: url.replace(this.apiKey, 'API_KEY_HIDDEN'),
          body: errorText
        });
        
        // Parse Ticketmaster error format
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.fault) {
            throw new Error(`Ticketmaster API: ${errorData.fault.faultstring} (${errorData.fault.detail?.errorcode})`);
          }
        } catch (parseError) {
          // Not JSON, throw original error
        }
        
        throw new Error(`Ticketmaster API returned ${response.status}: ${errorText.substring(0, 200)}`);
      }

      // Log response body for debugging
      const responseText = await response.text();
      console.log('📄 Ticketmaster Response Body:', responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
      }
      
      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response structure from Ticketmaster API');
      }
      
      // Validate pagination info
      if (!data.page || typeof data.page.totalElements !== 'number') {
        console.warn('🎟️ Ticketmaster: Missing or invalid pagination info in response');
      }
      
      // Safe event extraction with validation
      const rawEvents = data._embedded?.events || [];
      if (!Array.isArray(rawEvents)) {
        console.warn('🎟️ Ticketmaster: Events data is not an array, using empty array');
        return { events: [], total: data.page?.totalElements || 0 };
      }
      
      // Transform events with error handling for individual events
      const events: Event[] = [];
      let transformErrors = 0;
      
      for (const rawEvent of rawEvents) {
        try {
          const transformedEvent = this.transformEvent(rawEvent);
          events.push(transformedEvent);
        } catch (error) {
          transformErrors++;
          console.warn(`🎟️ Ticketmaster: Failed to transform event ${rawEvent?.id || 'unknown'}:`, error);
          // Continue processing other events instead of failing completely
        }
      }
      
      if (transformErrors > 0) {
        console.warn(`🎟️ Ticketmaster: ${transformErrors} events failed transformation out of ${rawEvents.length} total events`);
      }
      
      const total = data.page?.totalElements || 0;
      console.log(`🎟️ Ticketmaster: Successfully transformed ${events.length}/${rawEvents.length} events (total available: ${total})`);

      return { events, total };
    } catch (error) {
      console.error('Error fetching Ticketmaster events:', error);
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
   * Now searches multiple city variations to handle district names like "Praha 9"
   */
  async getEventsWithRadius(
    city: string,
    startDate: string,
    endDate: string,
    radius: string = '50',
    category?: string
  ): Promise<Event[]> {
    const allEvents: Event[] = [];
    const seenEventIds = new Set<string>();
    const countryCode = this.getCityCountryCode(city);
    const postalCode = this.getCityPostalCode(city);
    const marketId = this.getCityMarketId(city);
    const cityVariations = this.mapCityForTicketmaster(city);
    
    // Validate and sanitize radius parameter
    const radiusValue = this.validateRadius(radius);
    
    console.log(`🎟️ Ticketmaster: Searching ${city} using variations: ${cityVariations.join(', ')} with radius ${radiusValue} miles`);
    
    // Search each city variation with radius
    for (const cityVariation of cityVariations) {
      let page = 0;
      const pageSize = 199;
      let totalAvailable = 0;
      
      console.log(`🎟️ Ticketmaster: Searching city variation "${cityVariation}" with radius ${radiusValue} miles`);
      
      while (true) {
        console.log(`🎟️ Ticketmaster: Fetching page ${page + 1} for ${cityVariation} (radius: ${radiusValue} miles)`);
        
        const { events, total } = await this.getEvents({
          city: cityVariation,
          countryCode,
          radius: radiusValue,
          postalCode,
          marketId,
          startDateTime: `${startDate}T00:00:00Z`,
          endDateTime: `${endDate}T23:59:59Z`,
          classificationName: category ? this.mapCategoryToTicketmaster(category) : undefined,
          size: pageSize,
          page,
        });

        // Add unique events only
        for (const event of events) {
          if (!seenEventIds.has(event.sourceId)) {
            allEvents.push(event);
            seenEventIds.add(event.sourceId);
          }
        }
        
        totalAvailable = total;
        
        if (events.length < pageSize || events.length >= total || page >= 9) {
          break;
        }
        
        page++;
      }
      
      console.log(`🎟️ Ticketmaster: Found ${totalAvailable} events for city variation "${cityVariation}" with radius ${radiusValue} miles`);
    }
    
    console.log(`🎟️ Ticketmaster: Retrieved ${allEvents.length} total unique events for ${city} across all variations with radius ${radiusValue} miles`);
    return allEvents;
  }

  /**
   * Get all events for a specific city and date range by paginating through all pages
   * Now searches multiple city variations to handle district names like "Praha 9"
   */
  private async getEventsForCityPaginated(
    city: string,
    startDate: string,
    endDate: string,
    category?: string
  ): Promise<Event[]> {
    const allEvents: Event[] = [];
    const seenEventIds = new Set<string>();
    const countryCode = this.getCityCountryCode(city);
    const cityVariations = this.mapCityForTicketmaster(city);
    
    console.log(`🎟️ Ticketmaster: Searching ${city} using variations: ${cityVariations.join(', ')}`);
    
    // Search each city variation
    for (const cityVariation of cityVariations) {
      let page = 0;
      const pageSize = 199;
      let totalAvailable = 0;
      
      console.log(`🎟️ Ticketmaster: Searching city variation "${cityVariation}"`);
      
      while (true) {
        console.log(`🎟️ Ticketmaster: Fetching page ${page + 1} for ${cityVariation}`);
        
        const { events, total } = await this.getEvents({
          city: cityVariation,
          countryCode,
          startDateTime: `${startDate}T00:00:00Z`,
          endDateTime: `${endDate}T23:59:59Z`,
          classificationName: category ? this.mapCategoryToTicketmaster(category) : undefined,
          size: pageSize,
          page,
        });

        // Add unique events only
        for (const event of events) {
          if (!seenEventIds.has(event.sourceId)) {
            allEvents.push(event);
            seenEventIds.add(event.sourceId);
          }
        }
        
        totalAvailable = total;
        
        // Check if we've fetched all available events or reached the safety limit
        if (events.length < pageSize || events.length >= total || page >= 9) {
          break;
        }
        
        page++;
      }
      
      console.log(`🎟️ Ticketmaster: Found ${totalAvailable} events for city variation "${cityVariation}"`);
    }
    
    console.log(`🎟️ Ticketmaster: Retrieved ${allEvents.length} total unique events for ${city} across all variations`);
    return allEvents;
  }

  /**
   * Search events by keyword with enhanced parameters
   */
  async searchEvents(
    keyword: string,
    city?: string,
    startDate?: string,
    endDate?: string,
    options?: {
      countryCode?: string;
      radius?: string;
      classificationName?: string;
    }
  ): Promise<Event[]> {
    const { events } = await this.getEvents({
      keyword,
      city,
      countryCode: options?.countryCode || (city ? this.getCityCountryCode(city) : undefined),
      radius: options?.radius,
      classificationName: options?.classificationName,
      startDateTime: startDate ? `${startDate}T00:00:00Z` : undefined,
      endDateTime: endDate ? `${endDate}T23:59:59Z` : undefined,
      size: 199, // Ticketmaster's maximum page size
    });

    return events;
  }

  /**
   * Transform Ticketmaster event to our Event interface with proper validation
   */
  private transformEvent = (tmEvent: TicketmasterEvent): Event => {
    // Validate required fields
    if (!tmEvent || !tmEvent.id || !tmEvent.name || !tmEvent.dates?.start?.localDate) {
      throw new Error(`Invalid Ticketmaster event data: missing required fields (id: ${tmEvent?.id}, name: ${tmEvent?.name}, date: ${tmEvent?.dates?.start?.localDate})`);
    }

    // Safe venue extraction with validation
    const venue = tmEvent._embedded?.venues?.[0];
    const venueCity = venue?.city?.name;
    const venueName = venue?.name;
    
    // Safe classification extraction
    const classification = tmEvent.classifications?.[0];
    const segment = classification?.segment?.name;
    const genre = classification?.genre?.name;
    const subGenre = classification?.subGenre?.name;
    
    // Improved image selection - prefer landscape images with good resolution
    const image = tmEvent.images?.find(img => 
      img.width >= 640 && img.height >= 480 && img.width >= img.height
    ) || tmEvent.images?.find(img => img.width >= 640) || tmEvent.images?.[0];
    
    // Create comprehensive description from available fields
    const description = tmEvent.description || tmEvent.pleaseNote || '';
    
    // Validate date format
    const eventDate = tmEvent.dates.start.localDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      console.warn(`🎟️ Ticketmaster: Invalid date format for event ${tmEvent.id}: ${eventDate}`);
    }

    return {
      id: `tm_${tmEvent.id}`,
      title: tmEvent.name,
      description: description,
      date: eventDate,
      endDate: tmEvent.dates.end?.localDate,
      city: venueCity || 'Unknown',
      venue: venueName,
      category: this.mapTicketmasterCategory(segment || 'Other'),
      subcategory: genre || subGenre,
      source: 'ticketmaster',
      sourceId: tmEvent.id,
      url: tmEvent.url,
      imageUrl: image?.url,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  /**
   * Map our categories to official Ticketmaster classification names
   * Based on official Ticketmaster segments: Music, Sports, Arts & Theatre, Film, Miscellaneous
   * Returns undefined for broader searches when no specific mapping exists
   */
  private mapCategoryToTicketmaster(category: string): string | undefined {
    const categoryMap: Record<string, string | undefined> = {
      // Official Ticketmaster segments - direct mappings
      'Music': 'Music',
      'Sports': 'Sports', 
      'Arts & Theatre': 'Arts & Theatre',
      'Film': 'Film',
      
      // Arts and culture variations
      'Arts & Culture': 'Arts & Theatre',
      'Arts and Culture': 'Arts & Theatre',
      'Theater': 'Arts & Theatre',
      'Theatre': 'Arts & Theatre',
      'Comedy': 'Arts & Theatre',
      'Dance': 'Arts & Theatre',
      'Opera': 'Arts & Theatre',
      
      // Entertainment - use broader search since it can span multiple categories
      'Entertainment': undefined, // Entertainment can be Music, Arts & Theatre, or other categories
      
      // Music variations
      'Concerts': 'Music',
      'Live Music': 'Music',
      
      // Film variations  
      'Movies': 'Film',
      'Cinema': 'Film',
      'Film Festival': 'Film',
      
      // Sports variations
      'Athletics': 'Sports',
      'Sporting Events': 'Sports',
      
      // Business and professional events - use Miscellaneous sparingly
      'Technology': undefined, // Broader search often better for tech events
      'Business': undefined, // Business events vary widely in classification
      'Conferences': undefined, // Conferences can be in any segment
      'Trade Shows': undefined, // Trade shows vary by industry
      'Professional Development': undefined,
      'Networking': undefined,
      'Marketing': undefined,
      'Finance': undefined,
      'Healthcare': undefined,
      'Education': undefined,
      'Academic': undefined,
      'Workshops': undefined,
      'Seminars': undefined,
      
      // Fallback
      'Other': undefined,
      'Miscellaneous': 'Miscellaneous',
    };

    const mappedCategory = categoryMap[category];
    
    // Log mapping decisions for debugging and optimization
    if (mappedCategory === undefined) {
      console.log(`🎟️ Ticketmaster: Using broader search for "${category}" (no specific segment mapping - will search all segments)`);
    } else {
      console.log(`🎟️ Ticketmaster: Mapping "${category}" to official segment "${mappedCategory}"`);
    }
    
    return mappedCategory;
  }

  /**
   * Map Ticketmaster categories to our standard categories
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
   * Validate and sanitize radius parameter for Ticketmaster API
   * Ticketmaster requires radius to be between 0 and 19,999
   * Converts km to miles if needed
   */
  private validateRadius(radius: string): string {
    if (!radius) return '50'; // Default radius
    
    // Extract numeric value
    const radiusMatch = radius.match(/(\d+)/);
    if (!radiusMatch) {
      console.warn(`🎟️ Ticketmaster: Invalid radius format "${radius}", using default 50`);
      return '50';
    }
    
    let radiusValue = parseInt(radiusMatch[1]);
    
    // Convert km to miles if needed
    if (radius.toLowerCase().includes('km')) {
      const miles = Math.round(radiusValue * 0.621371);
      console.log(`🎟️ Ticketmaster: Converting ${radiusValue}km to ${miles} miles`);
      radiusValue = miles;
    }
    
    // Validate range (0-19,999)
    if (radiusValue < 0) {
      console.warn(`🎟️ Ticketmaster: Radius ${radiusValue} is negative, using 0`);
      return '0';
    } else if (radiusValue > 19999) {
      console.warn(`🎟️ Ticketmaster: Radius ${radiusValue} exceeds maximum 19,999, using 19,999`);
      return '19999';
    }
    
    return radiusValue.toString();
  }

  /**
   * Map city names to Ticketmaster-compatible variations
   */
  private mapCityForTicketmaster(city: string): string[] {
    const cityVariations: Record<string, string[]> = {
      'Prague': ['Prague', 'Praha', 'Praha 1', 'Praha 2', 'Praha 3', 'Praha 4', 'Praha 5', 'Praha 6', 'Praha 7', 'Praha 8', 'Praha 9', 'Praha 10'],
      'Brno': ['Brno', 'Brno-město', 'Brno-střed'],
      'Ostrava': ['Ostrava', 'Ostrava-město'],
      'Olomouc': ['Olomouc'],
    };
    
    return cityVariations[city] || [city];
  }

  /**
   * Get country code for major cities
   */
  private getCityCountryCode(city: string): string {
    const cityCountryMap: Record<string, string> = {
      'Prague': 'CZ',
      'Brno': 'CZ',
      'Ostrava': 'CZ',
      'Olomouc': 'CZ',
      'London': 'GB',
      'Berlin': 'DE',
      'Paris': 'FR',
      'Amsterdam': 'NL',
      'Vienna': 'AT',
      'Warsaw': 'PL',
      'Budapest': 'HU',
      'Zurich': 'CH',
      'Munich': 'DE',
      'Stockholm': 'SE',
      'Copenhagen': 'DK',
      'Helsinki': 'FI',
      'Oslo': 'NO',
      'Madrid': 'ES',
      'Barcelona': 'ES',
      'Rome': 'IT',
      'Milan': 'IT',
      'Athens': 'GR',
      'Lisbon': 'PT',
      'Dublin': 'IE',
      'Edinburgh': 'GB',
      'Glasgow': 'GB',
      'Manchester': 'GB',
      'Birmingham': 'GB',
      'Liverpool': 'GB',
      'Leeds': 'GB',
      'Sheffield': 'GB',
      'Bristol': 'GB',
      'Newcastle': 'GB',
      'Nottingham': 'GB',
      'Leicester': 'GB',
      'Hamburg': 'DE',
      'Cologne': 'DE',
      'Frankfurt': 'DE',
      'Stuttgart': 'DE',
      'Düsseldorf': 'DE',
      'Dortmund': 'DE',
      'Essen': 'DE',
      'Leipzig': 'DE',
      'Bremen': 'DE',
      'Dresden': 'DE',
      'Hannover': 'DE',
      'Nuremberg': 'DE',
    };

    return cityCountryMap[city] || 'US';
  }

  /**
   * Get postal code for major cities (for more precise location targeting)
   */
  private getCityPostalCode(city: string): string | undefined {
    const cityPostalMap: Record<string, string> = {
      'Prague': '11000',
      'Brno': '60200',
      'Ostrava': '70030',
      'Olomouc': '77900',
      'London': 'SW1A 1AA', // Central London
      'Berlin': '10115', // Central Berlin
      'Paris': '75001', // Central Paris
      'Amsterdam': '1012', // Central Amsterdam
      'Vienna': '1010', // Central Vienna
      'Warsaw': '00-001', // Central Warsaw
      'Budapest': '1051', // Central Budapest
      'Zurich': '8001', // Central Zurich
      'Munich': '80331', // Central Munich
      'Stockholm': '11129', // Central Stockholm
      'Copenhagen': '1050', // Central Copenhagen
      'Helsinki': '00100', // Central Helsinki
      'Oslo': '0150', // Central Oslo
      'Madrid': '28001', // Central Madrid
      'Barcelona': '08001', // Central Barcelona
      'Rome': '00100', // Central Rome
      'Milan': '20100', // Central Milan
      'Athens': '10557', // Central Athens
      'Lisbon': '1100-001', // Central Lisbon
      'Dublin': 'D01', // Central Dublin
      'Edinburgh': 'EH1 1YZ', // Central Edinburgh
      'Glasgow': 'G1 1AA', // Central Glasgow
      'Manchester': 'M1 1AA', // Central Manchester
      'Birmingham': 'B1 1AA', // Central Birmingham
      'Liverpool': 'L1 1AA', // Central Liverpool
      'Leeds': 'LS1 1AA', // Central Leeds
      'Sheffield': 'S1 1AA', // Central Sheffield
      'Bristol': 'BS1 1AA', // Central Bristol
      'Newcastle': 'NE1 1AA', // Central Newcastle
      'Nottingham': 'NG1 1AA', // Central Nottingham
      'Leicester': 'LE1 1AA', // Central Leicester
      'Hamburg': '20095', // Central Hamburg
      'Cologne': '50667', // Central Cologne
      'Frankfurt': '60311', // Central Frankfurt
      'Stuttgart': '70173', // Central Stuttgart
      'Düsseldorf': '40213', // Central Düsseldorf
      'Dortmund': '44135', // Central Dortmund
      'Essen': '45127', // Central Essen
      'Leipzig': '04109', // Central Leipzig
      'Bremen': '28195', // Central Bremen
      'Dresden': '01067', // Central Dresden
      'Hannover': '30159', // Central Hannover
      'Nuremberg': '90402', // Central Nuremberg
    };

    return cityPostalMap[city];
  }

  /**
   * Get Ticketmaster market ID for major cities
   * Returns numeric market IDs for known cities
   */
  private getCityMarketId(city: string): string | undefined {
    const marketMap: Record<string, string> = {
      'Prague': '353',     // Numeric market ID for Prague
      'Berlin': '344',     // Numeric market ID for Berlin
      'London': '102',     // Numeric market ID for London
      'Paris': '75',       // Numeric market ID for Paris
      'Amsterdam': '73',   // Numeric market ID for Amsterdam
      'Vienna': '351',     // Numeric market ID for Vienna
      'Warsaw': '352',     // Numeric market ID for Warsaw
      'Budapest': '354',   // Numeric market ID for Budapest
      'Zurich': '355',     // Numeric market ID for Zurich
      'Munich': '345',     // Numeric market ID for Munich
      'Stockholm': '356',  // Numeric market ID for Stockholm
      'Copenhagen': '357', // Numeric market ID for Copenhagen
      'Helsinki': '358',   // Numeric market ID for Helsinki
      'Oslo': '359',       // Numeric market ID for Oslo
      'Madrid': '360',     // Numeric market ID for Madrid
      'Barcelona': '361',  // Numeric market ID for Barcelona
      'Rome': '362',       // Numeric market ID for Rome
      'Milan': '363',      // Numeric market ID for Milan
      'Athens': '364',     // Numeric market ID for Athens
      'Lisbon': '365',     // Numeric market ID for Lisbon
      'Dublin': '366',     // Numeric market ID for Dublin
    };
    
    const marketId = marketMap[city];
    if (marketId) {
      console.log(`🎟️ Ticketmaster: Using market ID ${marketId} for ${city}`);
    } else {
      console.log(`🎟️ Ticketmaster: No market ID found for ${city} - using geographic parameters instead`);
    }
    
    return marketId;
  }

  /**
   * Get venue details by ID
   */
  async getVenue(venueId: string) {
    try {
      const url = `${this.baseUrl}/venues/${venueId}.json?apikey=${this.apiKey}`;
      const response = await this.makeRateLimitedRequest(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch venue: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching venue:', error);
      throw error;
    }
  }

  /**
   * Test basic connection to Ticketmaster API
   */
  async testBasicConnection(city: string = 'New York'): Promise<any> {
    if (!this.isApiKeyValid()) {
      throw new Error('Ticketmaster API key is not properly configured');
    }
    
    const url = `${this.baseUrl}/events.json?apikey=${this.apiKey}&city=${city}&size=5`;
    
    console.log('🧪 Testing basic Ticketmaster connection:', url.replace(this.apiKey, 'API_KEY_HIDDEN'));
    
    try {
      const response = await this.makeRateLimitedRequest(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🧪 Test connection failed:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Test connection failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log('🧪 Test connection successful:', {
        status: response.status,
        eventsFound: data._embedded?.events?.length || 0,
        totalElements: data.page?.totalElements || 0,
        hasEmbedded: !!data._embedded,
        hasPage: !!data.page
      });
      
      return data;
    } catch (error) {
      console.error('🧪 Test connection error:', error);
      throw error;
    }
  }

  /**
   * Get event classifications (categories)
   */
  async getClassifications() {
    try {
      const url = `${this.baseUrl}/classifications.json?apikey=${this.apiKey}`;
      const response = await this.makeRateLimitedRequest(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch classifications: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching classifications:', error);
      throw error;
    }
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
    const countryCode = this.getCityCountryCode(city);
    const mappedCategory = this.mapCategoryToTicketmaster(category);
    
    // Get events with category filter
    const { total: withCategory } = await this.getEvents({
      city,
      countryCode,
      startDateTime: `${startDate}T00:00:00Z`,
      endDateTime: `${endDate}T23:59:59Z`,
      classificationName: mappedCategory,
      size: 200,
      page: 0,
    });

    // Get events without category filter
    const { total: withoutCategory } = await this.getEvents({
      city,
      countryCode,
      startDateTime: `${startDate}T00:00:00Z`,
      endDateTime: `${endDate}T23:59:59Z`,
      size: 200,
      page: 0,
    });

    const effectiveness = withoutCategory > 0 ? (withCategory / withoutCategory) * 100 : 0;

    console.log(`🎟️ Ticketmaster Category Test for "${category}":`);
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

    const mappedCategory = this.mapCategoryToTicketmaster(category);
    
    // If we have a specific mapping, try it first
    if (mappedCategory) {
      try {
        const events = await this.getEventsForCity(city, startDate, endDate, category);
        
        // If we got a reasonable number of events, return them
        if (events.length >= 5) {
          console.log(`🎟️ Ticketmaster: Found ${events.length} events for "${category}" using classification "${mappedCategory}"`);
          return events;
        }
        
        console.log(`🎟️ Ticketmaster: Only ${events.length} events found for "${category}" with classification "${mappedCategory}", trying broader search`);
      } catch (error) {
        console.log(`🎟️ Ticketmaster: Error with category "${category}": ${error}, trying broader search`);
      }
    }

    // Fallback to broader search without category filter
    console.log(`🎟️ Ticketmaster: Using broader search for "${category}"`);
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
    radius: string = '50'
  ): Promise<Event[]> {
    const allEvents: Event[] = [];
    const seenEvents = new Set<string>();

    // Strategy 1: Exact city match with category
    if (category) {
      try {
        console.log(`🎟️ Ticketmaster: Strategy 1 - Exact city match with category "${category}"`);
        const categoryEvents = await this.getEventsForCity(city, startDate, endDate, category);
        this.addUniqueEvents(allEvents, categoryEvents, seenEvents);
        
        if (allEvents.length >= 10) {
          console.log(`🎟️ Ticketmaster: Found ${allEvents.length} events with exact city match, returning early`);
          return allEvents;
        }
      } catch (error) {
        console.log(`🎟️ Ticketmaster: Strategy 1 failed: ${error}`);
      }
    }

    // Strategy 2: Exact city match without category
    try {
      console.log(`🎟️ Ticketmaster: Strategy 2 - Exact city match without category`);
      const cityEvents = await this.getEventsForCity(city, startDate, endDate);
      this.addUniqueEvents(allEvents, cityEvents, seenEvents);
      
      if (allEvents.length >= 15) {
        console.log(`🎟️ Ticketmaster: Found ${allEvents.length} events with exact city match, returning early`);
        return allEvents;
      }
    } catch (error) {
      console.log(`🎟️ Ticketmaster: Strategy 2 failed: ${error}`);
    }

    // Strategy 3: Radius search with category
    if (category) {
      try {
        console.log(`🎟️ Ticketmaster: Strategy 3 - Radius search (${radius} miles) with category "${category}"`);
        const radiusCategoryEvents = await this.getEventsWithRadius(city, startDate, endDate, radius, category);
        this.addUniqueEvents(allEvents, radiusCategoryEvents, seenEvents);
        
        if (allEvents.length >= 20) {
          console.log(`🎟️ Ticketmaster: Found ${allEvents.length} events with radius search, returning early`);
          return allEvents;
        }
      } catch (error) {
        console.log(`🎟️ Ticketmaster: Strategy 3 failed: ${error}`);
      }
    }

    // Strategy 4: Radius search without category
    try {
      console.log(`🎟️ Ticketmaster: Strategy 4 - Radius search (${radius} miles) without category`);
      const radiusEvents = await this.getEventsWithRadius(city, startDate, endDate, radius);
      this.addUniqueEvents(allEvents, radiusEvents, seenEvents);
    } catch (error) {
      console.log(`🎟️ Ticketmaster: Strategy 4 failed: ${error}`);
    }

    // Strategy 5: Market-based search (if market ID is available)
    const marketId = this.getCityMarketId(city);
    if (marketId) {
      try {
        console.log(`🎟️ Ticketmaster: Strategy 5 - Market-based search (${marketId})`);
        const marketEvents = await this.getEvents({
          marketId,
          startDateTime: `${startDate}T00:00:00Z`,
          endDateTime: `${endDate}T23:59:59Z`,
          classificationName: category ? this.mapCategoryToTicketmaster(category) : undefined,
          size: 200,
        });
        this.addUniqueEvents(allEvents, marketEvents.events, seenEvents);
      } catch (error) {
        console.log(`🎟️ Ticketmaster: Strategy 5 failed: ${error}`);
      }
    }

    console.log(`🎟️ Ticketmaster: Comprehensive fallback completed - found ${allEvents.length} unique events`);
    return allEvents;
  }

  /**
   * Optimized multi-strategy search approach to maximize event discovery while minimizing API calls
   * Uses intelligent fallbacks based on results from each strategy
   */
  async getEventsComprehensive(
    city: string,
    startDate: string,
    endDate: string,
    category?: string
  ): Promise<Event[]> {
    const allEvents: Event[] = [];
    const strategyResults: Array<{ strategy: string; events: number; time: number }> = [];
    const targetEventCount = 50; // Stop early if we have enough events
    
    console.log(`🎟️ Ticketmaster: Starting optimized comprehensive search for ${city} (${startDate} to ${endDate})`);
    
    // Strategy 1: Direct city search with category (most specific)
    try {
      const startTime = Date.now();
      console.log(`🎟️ Ticketmaster: Strategy 1 - Direct city search with category`);
      const cityEvents = await this.getEventsForCityPaginated(city, startDate, endDate, category);
      allEvents.push(...cityEvents);
      const time = Date.now() - startTime;
      strategyResults.push({ strategy: 'Direct city search', events: cityEvents.length, time });
      console.log(`🎟️ Ticketmaster: Strategy 1 found ${cityEvents.length} events in ${time}ms`);
      
      // If we have enough events, skip more expensive searches
      if (allEvents.length >= targetEventCount) {
        console.log(`🎟️ Ticketmaster: Early exit - found ${allEvents.length} events (target: ${targetEventCount})`);
        return this.deduplicateEvents(allEvents);
      }
    } catch (error) {
      console.error(`🎟️ Ticketmaster: Strategy 1 failed:`, error);
      strategyResults.push({ strategy: 'Direct city search', events: 0, time: 0 });
    }
    
    // Strategy 2: Radius search (only if needed)
    if (allEvents.length < targetEventCount / 2) {
      try {
        const startTime = Date.now();
        console.log(`🎟️ Ticketmaster: Strategy 2 - Radius search (50 miles)`);
        const radiusEvents = await this.getEventsWithRadius(city, startDate, endDate, '50', category);
        allEvents.push(...radiusEvents);
        const time = Date.now() - startTime;
        strategyResults.push({ strategy: 'Radius search (50 miles)', events: radiusEvents.length, time });
        console.log(`🎟️ Ticketmaster: Strategy 2 found ${radiusEvents.length} events in ${time}ms`);
        
        // Check if we have enough events now
        if (allEvents.length >= targetEventCount) {
          console.log(`🎟️ Ticketmaster: Sufficient events found - skipping remaining strategies`);
          return this.deduplicateEvents(allEvents);
        }
      } catch (error) {
        console.error(`🎟️ Ticketmaster: Strategy 2 failed:`, error);
        strategyResults.push({ strategy: 'Radius search (50 miles)', events: 0, time: 0 });
      }
    }
    
    // Strategy 3: Keyword-based search (only if category is provided and we need more events)
    if (category && allEvents.length < targetEventCount / 3) {
      try {
        const startTime = Date.now();
        console.log(`🎟️ Ticketmaster: Strategy 3 - Keyword search for "${category}"`);
        const keywordEvents = await this.searchEvents(category, city, startDate, endDate);
        allEvents.push(...keywordEvents);
        const time = Date.now() - startTime;
        strategyResults.push({ strategy: `Keyword search for "${category}"`, events: keywordEvents.length, time });
        console.log(`🎟️ Ticketmaster: Strategy 3 found ${keywordEvents.length} events in ${time}ms`);
      } catch (error) {
        console.error(`🎟️ Ticketmaster: Strategy 3 failed:`, error);
        strategyResults.push({ strategy: `Keyword search for "${category}"`, events: 0, time: 0 });
      }
    }
    
    // Strategy 4: Extended radius search (only as last resort)
    if (allEvents.length < 10) {
      try {
        const startTime = Date.now();
        console.log(`🎟️ Ticketmaster: Strategy 4 - Extended radius search (100 miles) - last resort`);
        const extendedRadiusEvents = await this.getEventsWithRadius(city, startDate, endDate, '100', category);
        allEvents.push(...extendedRadiusEvents);
        const time = Date.now() - startTime;
        strategyResults.push({ strategy: 'Extended radius search (100 miles)', events: extendedRadiusEvents.length, time });
        console.log(`🎟️ Ticketmaster: Strategy 4 found ${extendedRadiusEvents.length} events in ${time}ms`);
      } catch (error) {
        console.error(`🎟️ Ticketmaster: Strategy 4 failed:`, error);
        strategyResults.push({ strategy: 'Extended radius search (100 miles)', events: 0, time: 0 });
      }
    }
    
    // Deduplicate and log results
    const uniqueEvents = this.deduplicateEvents(allEvents);
    
    // Log strategy effectiveness
    console.log(`🎟️ Ticketmaster: Optimized comprehensive search completed`);
    console.log(`🎟️ Ticketmaster: Strategy Results:`);
    strategyResults.forEach(result => {
      console.log(`  - ${result.strategy}: ${result.events} events in ${result.time}ms`);
    });
    console.log(`🎟️ Ticketmaster: Total events before deduplication: ${allEvents.length}`);
    console.log(`🎟️ Ticketmaster: Total unique events after deduplication: ${uniqueEvents.length}`);
    console.log(`🎟️ Ticketmaster: API calls saved by early termination and intelligent fallbacks`);
    
    return uniqueEvents;
  }

  /**
   * Get events for a specific market ID
   */
  private async getEventsForMarket(
    marketId: string,
    startDate: string,
    endDate: string,
    category?: string
  ): Promise<Event[]> {
    const allEvents: Event[] = [];
    let page = 0;
    const pageSize = 199;
    let totalAvailable = 0;
    
    while (true) {
      console.log(`🎟️ Ticketmaster: Fetching market page ${page + 1} for ${marketId}`);
      
      const { events, total } = await this.getEvents({
        marketId,
        startDateTime: `${startDate}T00:00:00Z`,
        endDateTime: `${endDate}T23:59:59Z`,
        classificationName: category ? this.mapCategoryToTicketmaster(category) : undefined,
        size: pageSize,
        page,
      });

      allEvents.push(...events);
      totalAvailable = total;
      
      if (events.length < pageSize || allEvents.length >= total || page >= 9) {
        break;
      }
      
      page++;
    }
    
    console.log(`🎟️ Ticketmaster: Retrieved ${allEvents.length} total events for market ${marketId} (${totalAvailable} available)`);
    return allEvents;
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
}

export const ticketmasterService = new TicketmasterService();