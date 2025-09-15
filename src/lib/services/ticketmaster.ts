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
    
    // Validate and sanitize parameters
    const validation = this.validateApiParameters(params);
    if (!validation.isValid) {
      console.warn('🎟️ Ticketmaster: Parameter validation warnings:', validation.errors);
    }
    const sanitizedParams = validation.sanitizedParams;
    
    try {
      const searchParams = new URLSearchParams({
        apikey: this.apiKey,
        size: Math.min(sanitizedParams.size || 199, 199).toString(), // Ticketmaster's maximum page size is 199
        page: (sanitizedParams.page || 0).toString(),
      });

      // Add location parameters (using sanitized values)
      if (sanitizedParams.city) searchParams.append('city', sanitizedParams.city);
      if (sanitizedParams.countryCode) searchParams.append('countryCode', sanitizedParams.countryCode);
      if (sanitizedParams.radius) searchParams.append('radius', sanitizedParams.radius);
      if (sanitizedParams.postalCode) searchParams.append('postalCode', sanitizedParams.postalCode);
      // marketId removed - using geographic parameters instead
      
      // Add date parameters (using sanitized values)
      if (sanitizedParams.startDateTime) searchParams.append('startDateTime', sanitizedParams.startDateTime);
      if (sanitizedParams.endDateTime) searchParams.append('endDateTime', sanitizedParams.endDateTime);
      if (sanitizedParams.onsaleStartDateTime) searchParams.append('onsaleStartDateTime', sanitizedParams.onsaleStartDateTime);
      if (sanitizedParams.onsaleEndDateTime) searchParams.append('onsaleEndDateTime', sanitizedParams.onsaleEndDateTime);
      
      // Add classification parameters (using sanitized values)
      if (sanitizedParams.classificationName) searchParams.append('classificationName', sanitizedParams.classificationName);
      if (sanitizedParams.classificationId) searchParams.append('classificationId', sanitizedParams.classificationId);
      if (sanitizedParams.segmentId) searchParams.append('segmentId', sanitizedParams.segmentId);
      if (sanitizedParams.genreId) searchParams.append('genreId', sanitizedParams.genreId);
      if (sanitizedParams.subGenreId) searchParams.append('subGenreId', sanitizedParams.subGenreId);
      
      // Add search parameters (using sanitized values)
      if (sanitizedParams.keyword) searchParams.append('keyword', sanitizedParams.keyword);
      if (sanitizedParams.attractionId) searchParams.append('attractionId', sanitizedParams.attractionId);
      if (sanitizedParams.venueId) searchParams.append('venueId', sanitizedParams.venueId);
      if (sanitizedParams.promoterId) searchParams.append('promoterId', sanitizedParams.promoterId);
      
      // Add sorting (using sanitized values)
      if (sanitizedParams.sort) searchParams.append('sort', sanitizedParams.sort);
      
      // Add additional filters (using sanitized values)
      if (sanitizedParams.source) searchParams.append('source', sanitizedParams.source);
      if (sanitizedParams.locale) searchParams.append('locale', sanitizedParams.locale);
      if (sanitizedParams.includeTBA !== undefined) searchParams.append('includeTBA', sanitizedParams.includeTBA.toString());
      if (sanitizedParams.includeTBD !== undefined) searchParams.append('includeTBD', sanitizedParams.includeTBD.toString());
      if (sanitizedParams.includeTest !== undefined) searchParams.append('includeTest', sanitizedParams.includeTest.toString());

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
      
      // Handle specific error types gracefully
      if (error instanceof Error) {
        // Rate limit errors
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          console.warn('🎟️ Ticketmaster: Rate limit exceeded, returning empty results');
          return { events: [], total: 0 };
        }
        
        // API key errors
        if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('403')) {
          console.warn('🎟️ Ticketmaster: API key issue, returning empty results');
          return { events: [], total: 0 };
        }
        
        // Network errors
        if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('timeout')) {
          console.warn('🎟️ Ticketmaster: Network error, returning empty results');
          return { events: [], total: 0 };
        }
      }
      
      // For other errors, still throw to maintain error visibility
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
    // Validate input parameters
    if (!city || !startDate || !endDate) {
      console.warn('🎟️ Ticketmaster: Missing required parameters for getEventsForCity');
      return [];
    }
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      console.warn('🎟️ Ticketmaster: Invalid date format for getEventsForCity');
      return [];
    }
    
    try {
      return this.getEventsForCityPaginated(city, startDate, endDate, category);
    } catch (error) {
      console.error('🎟️ Ticketmaster: Error in getEventsForCity:', error);
      return [];
    }
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
    // Validate input parameters
    if (!city || !startDate || !endDate) {
      console.warn('🎟️ Ticketmaster: Missing required parameters for getEventsWithRadius');
      return [];
    }
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      console.warn('🎟️ Ticketmaster: Invalid date format for getEventsWithRadius');
      return [];
    }
    
    const allEvents: Event[] = [];
    const seenEventIds = new Set<string>();
    const countryCode = this.getCityCountryCode(city);
    const postalCode = this.getCityPostalCode(city);
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
          // marketId removed - using geographic parameters instead
          startDateTime: `${startDate}T00:00:00Z`,
          endDateTime: `${endDate}T23:59:59Z`,
          classificationName: category ? this.mapCategoryToTicketmaster(category) : undefined,
          size: pageSize,
          page,
        });

        // Add unique events only
        for (const event of events) {
          if (event.sourceId && !seenEventIds.has(event.sourceId)) {
            allEvents.push(event);
            seenEventIds.add(event.sourceId);
          } else if (!event.sourceId) {
            // If no sourceId, add the event anyway (can't deduplicate)
            allEvents.push(event);
          }
        }
        
        totalAvailable = total;
        
        if (events.length < pageSize || events.length >= total || page >= 3) {
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
          if (event.sourceId && !seenEventIds.has(event.sourceId)) {
            allEvents.push(event);
            seenEventIds.add(event.sourceId);
          } else if (!event.sourceId) {
            // If no sourceId, add the event anyway (can't deduplicate)
            allEvents.push(event);
          }
        }
        
        totalAvailable = total;
        
        // Check if we've fetched all available events or reached the safety limit (reduced for performance)
        if (events.length < pageSize || events.length >= total || page >= 3) {
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
   * Validate Ticketmaster API parameters according to official specification
   */
  private validateApiParameters(params: {
    city?: string;
    countryCode?: string;
    radius?: string;
    postalCode?: string;
    startDateTime?: string;
    endDateTime?: string;
    classificationName?: string;
    keyword?: string;
    size?: number;
    page?: number;
  }): { isValid: boolean; errors: string[]; sanitizedParams: any } {
    const errors: string[] = [];
    const sanitizedParams = { ...params };

    // Validate radius
    if (params.radius) {
      const radiusValue = this.validateRadius(params.radius);
      sanitizedParams.radius = radiusValue;
    }

    // Validate size (max 199 per Ticketmaster API)
    if (params.size !== undefined) {
      if (params.size < 1 || params.size > 199) {
        errors.push(`Size must be between 1 and 199, got ${params.size}`);
        sanitizedParams.size = Math.min(Math.max(params.size, 1), 199);
      }
    }

    // Validate page (must be non-negative)
    if (params.page !== undefined) {
      if (params.page < 0) {
        errors.push(`Page must be non-negative, got ${params.page}`);
        sanitizedParams.page = 0;
      }
    }

    // Validate date format (ISO 8601)
    if (params.startDateTime) {
      if (!this.isValidISODateTime(params.startDateTime)) {
        errors.push(`Invalid startDateTime format: ${params.startDateTime}. Expected ISO 8601 format.`);
      }
    }

    if (params.endDateTime) {
      if (!this.isValidISODateTime(params.endDateTime)) {
        errors.push(`Invalid endDateTime format: ${params.endDateTime}. Expected ISO 8601 format.`);
      }
    }

    // Validate country code (2-letter ISO code)
    if (params.countryCode) {
      if (!/^[A-Z]{2}$/.test(params.countryCode)) {
        errors.push(`Invalid countryCode format: ${params.countryCode}. Expected 2-letter ISO code.`);
      }
    }

    // Validate postal code (basic format check)
    if (params.postalCode) {
      if (!/^[A-Z0-9\s-]{3,10}$/i.test(params.postalCode)) {
        errors.push(`Invalid postalCode format: ${params.postalCode}. Expected alphanumeric format.`);
      }
    }

    // Validate city name (basic format check)
    if (params.city) {
      if (params.city.length < 2 || params.city.length > 100) {
        errors.push(`City name must be between 2 and 100 characters, got ${params.city.length}`);
      }
    }

    // Validate keyword (basic format check)
    if (params.keyword) {
      if (params.keyword.length < 2 || params.keyword.length > 100) {
        errors.push(`Keyword must be between 2 and 100 characters, got ${params.keyword.length}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedParams
    };
  }

  /**
   * Validate ISO 8601 date time format
   */
  private isValidISODateTime(dateTime: string): boolean {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return iso8601Regex.test(dateTime) && !isNaN(Date.parse(dateTime));
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
   * DISABLED: Market ID functionality removed due to fake IDs causing zero results
   * Using geographic parameters (city + countryCode + radius) instead for better reliability
   */
  private getCityMarketId(city: string): string | undefined {
    // Market ID functionality disabled - use city + countryCode + radius for geographic targeting
    console.log(`🎟️ Ticketmaster: Market ID lookup disabled for ${city} - using geographic parameters instead`);
    return undefined;
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
      size: 199, // Ticketmaster's maximum page size
      page: 0,
    });

    // Get events without category filter
    const { total: withoutCategory } = await this.getEvents({
      city,
      countryCode,
      startDateTime: `${startDate}T00:00:00Z`,
      endDateTime: `${endDate}T23:59:59Z`,
      size: 199, // Ticketmaster's maximum page size
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
   * Get events with comprehensive fallback strategy including radius search and date flexibility
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

    // Check if the date range is too far in the future (more than 6 months)
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const now = new Date();
    const sixMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
    
    const isFarFuture = startDateObj > sixMonthsFromNow;
    
    if (isFarFuture) {
      console.log(`🎟️ Ticketmaster: Date range ${startDate} to ${endDate} is more than 6 months in the future`);
      console.log(`🎟️ Ticketmaster: Ticketmaster typically doesn't have events scheduled this far in advance`);
      console.log(`🎟️ Ticketmaster: Will search for available events and apply temporal fallback strategies`);
    }

    // Strategy 1: Exact city match with category (original date range)
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

    // Strategy 2: Exact city match without category (original date range)
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

    // Strategy 3: Temporal fallback - search nearer dates if original range is far future
    if (isFarFuture && allEvents.length < 5) {
      try {
        console.log(`🎟️ Ticketmaster: Strategy 3 - Temporal fallback to nearer dates`);
        
        // Search the next 6 months for similar events
        const nearStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const nearEndDate = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
        
        const nearStartStr = nearStartDate.toISOString().split('T')[0];
        const nearEndStr = nearEndDate.toISOString().split('T')[0];
        
        console.log(`🎟️ Ticketmaster: Searching ${nearStartStr} to ${nearEndStr} for reference events`);
        
        const nearEvents = category 
          ? await this.getEventsForCity(city, nearStartStr, nearEndStr, category)
          : await this.getEventsForCity(city, nearStartStr, nearEndStr);
        
        // Mark these as reference events for the far future
        const referenceEvents = nearEvents.map(event => ({
          ...event,
          id: `ref_${event.id}`,
          title: `${event.title} (Reference Event - Similar events may occur in ${startDate.substring(0, 7)})`,
          date: startDate, // Project to the requested date
          description: `${event.description}\n\nNote: This is a reference event. Similar events typically occur around this time of year. The actual ${endDate.substring(0, 7)} schedule may not be available yet.`
        }));
        
        this.addUniqueEvents(allEvents, referenceEvents, seenEvents);
        
        if (allEvents.length >= 10) {
          console.log(`🎟️ Ticketmaster: Found ${allEvents.length} events with temporal fallback, returning`);
          return allEvents;
        }
      } catch (error) {
        console.log(`🎟️ Ticketmaster: Strategy 3 (temporal fallback) failed: ${error}`);
      }
    }

    // Strategy 4: Radius search with category
    if (category) {
      try {
        console.log(`🎟️ Ticketmaster: Strategy 4 - Radius search (${radius} miles) with category "${category}"`);
        const radiusCategoryEvents = await this.getEventsWithRadius(city, startDate, endDate, radius, category);
        this.addUniqueEvents(allEvents, radiusCategoryEvents, seenEvents);
        
        if (allEvents.length >= 20) {
          console.log(`🎟️ Ticketmaster: Found ${allEvents.length} events with radius search, returning early`);
          return allEvents;
        }
      } catch (error) {
        console.log(`🎟️ Ticketmaster: Strategy 4 failed: ${error}`);
      }
    }

    // Strategy 5: Radius search without category
    try {
      console.log(`🎟️ Ticketmaster: Strategy 5 - Radius search (${radius} miles) without category`);
      const radiusEvents = await this.getEventsWithRadius(city, startDate, endDate, radius);
      this.addUniqueEvents(allEvents, radiusEvents, seenEvents);
    } catch (error) {
      console.log(`🎟️ Ticketmaster: Strategy 5 failed: ${error}`);
    }

    // Strategy 6: Broader temporal search if still no results and far future
    if (allEvents.length === 0 && isFarFuture) {
      try {
        console.log(`🎟️ Ticketmaster: Strategy 6 - Broader temporal search for any events in the city`);
        
        // Search any available events in the city (no date restriction)
        const { events: anyEvents } = await this.getEvents({
          city,
          countryCode: this.getCityCountryCode(city),
          classificationName: category ? this.mapCategoryToTicketmaster(category) : undefined,
          size: 10,
          page: 0,
        });
        
        if (anyEvents.length > 0) {
          // Project these events as "similar events may occur"
          const projectedEvents = anyEvents.map(event => ({
            ...event,
            id: `proj_${event.id}`,
            title: `${event.title} (Similar Event - Check for ${startDate.substring(0, 7)} Schedule)`,
            date: startDate, // Project to the requested date
            description: `${event.description}\n\nNote: This type of event occurs in ${city}. Check the venue's official schedule for ${endDate.substring(0, 7)} availability.`
          }));
          
          this.addUniqueEvents(allEvents, projectedEvents, seenEvents);
        }
      } catch (error) {
        console.log(`🎟️ Ticketmaster: Strategy 6 (broader temporal) failed: ${error}`);
      }
    }

    console.log(`🎟️ Ticketmaster: Comprehensive fallback completed - found ${allEvents.length} unique events`);
    
    if (allEvents.length === 0 && isFarFuture) {
      console.log(`🎟️ Ticketmaster: No events found for ${city} in ${startDate.substring(0, 7)}`);
      console.log(`🎟️ Ticketmaster: This is likely because Ticketmaster doesn't have events scheduled that far in advance`);
      console.log(`🎟️ Ticketmaster: Consider checking back closer to the date or contacting venues directly`);
    }
    
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
    const targetEventCount = 15; // Reduced from 25 for much faster responses
    const strategyResults: Array<{ strategy: string; events: number; time: number }> = [];
    
    console.log(`🎟️ Ticketmaster: Starting parallel comprehensive search for ${city} (${startDate} to ${endDate})`);
    
    // Run first two strategies in parallel for faster results
    const parallelStrategies = [
      this.runStrategy('Direct city search', () => this.getEventsForCityPaginated(city, startDate, endDate, category)),
      this.runStrategy('Radius search (50 miles)', () => this.getEventsWithRadius(city, startDate, endDate, '50', category))
    ];
    
    // Add keyword search if category is provided
    if (category) {
      parallelStrategies.push(
        this.runStrategy(`Keyword search for "${category}"`, () => this.searchEvents(category, city, startDate, endDate))
      );
    }
    
    const results = await Promise.allSettled(parallelStrategies);
    const allEvents: Event[] = [];
    
    // Process results from parallel strategies
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { strategy, events, time } = result.value;
        allEvents.push(...events);
        strategyResults.push({ strategy, events: events.length, time });
        console.log(`🎟️ Ticketmaster: ${strategy} found ${events.length} events in ${time}ms`);
      } else {
        const strategyNames = ['Direct city search', 'Radius search (50 miles)', `Keyword search for "${category}"`];
        console.error(`🎟️ Ticketmaster: ${strategyNames[index]} failed:`, result.reason);
        strategyResults.push({ strategy: strategyNames[index], events: 0, time: 0 });
      }
    });
    
    // Early termination if we have enough events
    if (allEvents.length >= targetEventCount) {
      console.log(`🎟️ Ticketmaster: Early termination - found ${allEvents.length} events (target: ${targetEventCount})`);
      const uniqueEvents = this.deduplicateEvents(allEvents);
      this.logStrategyResults(strategyResults, allEvents.length, uniqueEvents.length);
      return uniqueEvents;
    }
    
    // Only run extended radius search as last resort if we have very few events
    if (allEvents.length < 10) {
      try {
        const startTime = Date.now();
        console.log(`🎟️ Ticketmaster: Last resort - Extended radius search (100 miles)`);
        const extendedRadiusEvents = await this.getEventsWithRadius(city, startDate, endDate, '100', category);
        allEvents.push(...extendedRadiusEvents);
        const time = Date.now() - startTime;
        strategyResults.push({ strategy: 'Extended radius search (100 miles)', events: extendedRadiusEvents.length, time });
        console.log(`🎟️ Ticketmaster: Extended radius found ${extendedRadiusEvents.length} events in ${time}ms`);
      } catch (error) {
        console.error(`🎟️ Ticketmaster: Extended radius search failed:`, error);
        strategyResults.push({ strategy: 'Extended radius search (100 miles)', events: 0, time: 0 });
      }
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
    console.log(`🎟️ Ticketmaster: Parallel comprehensive search completed`);
    console.log(`🎟️ Ticketmaster: Strategy Results:`);
    strategyResults.forEach(result => {
      console.log(`  - ${result.strategy}: ${result.events} events in ${result.time}ms`);
    });
    console.log(`🎟️ Ticketmaster: Total events before deduplication: ${totalEvents}`);
    console.log(`🎟️ Ticketmaster: Total unique events after deduplication: ${uniqueEvents}`);
    console.log(`🎟️ Ticketmaster: Performance optimized with parallel execution and early termination`);
  }

  /**
   * Get events for a specific market ID
   * DISABLED: Market ID functionality removed due to fake IDs causing zero results
   */
  private async getEventsForMarket(
    marketId: string,
    startDate: string,
    endDate: string,
    category?: string
  ): Promise<Event[]> {
    console.log(`🎟️ Ticketmaster: Market-based search disabled for market ${marketId} - using geographic parameters instead`);
    return [];
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