// src/lib/services/ticketmaster.ts
import { Event } from '@/types';
import { getCityCountryCode, validateCityCountryPair } from '@/lib/utils/city-country-mapping';
import { sanitizeApiParameters, logSanitizationResults } from '@/lib/utils/input-sanitization';
import { venueCityMappingService } from './venue-city-mapping';
import { eventStorageService } from './event-storage';
import { dataTransformer } from './data-transformer';
import { CreateEventData } from '@/lib/types/events';

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
  private readonly minRequestInterval = 300; // 300ms = ~3.3 requests per second for safety
  private requestCount = 0;
  private dailyRequestLimit = 5000; // Default daily limit
  private targetCityForFiltering: string | null = null; // Store target city for post-processing

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
    
    // Validate and sanitize parameters using comprehensive input sanitization
    const sanitizationResult = sanitizeApiParameters(params);
    logSanitizationResults(params, sanitizationResult, 'Ticketmaster API Parameters');
    
    if (!sanitizationResult.isValid) {
      console.warn('🎟️ Ticketmaster: Parameter sanitization errors:', sanitizationResult.errors);
    }
    if (sanitizationResult.warnings.length > 0) {
      console.warn('🎟️ Ticketmaster: Parameter sanitization warnings:', sanitizationResult.warnings);
    }
    
    const sanitizedParams = sanitizationResult.sanitizedParams;
    
    // DEBUG: Log the sanitized parameters to see what we're working with
    console.log('🎟️ Ticketmaster: Sanitized parameters:', {
      city: sanitizedParams.city,
      countryCode: sanitizedParams.countryCode,
      postalCode: sanitizedParams.postalCode,
      allParams: sanitizedParams
    });
    
    try {
      // FIXED: Validate API key before making request
      if (!this.apiKey || this.apiKey.length < 10) {
        throw new Error('Ticketmaster API key is not properly configured');
      }
      
      const searchParams = new URLSearchParams({
        apikey: this.apiKey,
        size: Math.min(sanitizedParams.size || 199, 199).toString(), // Ticketmaster's maximum page size is 199
        page: (sanitizedParams.page || 0).toString(),
      });

      // FIXED: Add location parameters - avoid conflicting location filters
      if (sanitizedParams.postalCode) {
        // If postal code is provided, use ONLY postal code (don't mix with city/countryCode)
        searchParams.append('postalCode', sanitizedParams.postalCode);
        console.log('🎟️ Ticketmaster: Using postal code search (excluding city/countryCode to avoid conflicts)');
      } else {
        // Use city and countryCode only when no postal code
        if (sanitizedParams.city) searchParams.append('city', sanitizedParams.city);
        if (sanitizedParams.countryCode) searchParams.append('countryCode', sanitizedParams.countryCode);
        if (sanitizedParams.radius) searchParams.append('radius', sanitizedParams.radius);
      }
      
      // NEW APPROACH: For Prague, use pure country-based search (no city parameters)
      if (sanitizedParams.city && sanitizedParams.city.toLowerCase() === 'prague' && !sanitizedParams.postalCode) {
        console.log(`🎟️ Ticketmaster: Using pure country-based search for Prague (no city parameters)`);
        
        // Remove ALL city-related parameters for pure country search
        searchParams.delete('city');
        searchParams.delete('radius');
        
        // Store target city for post-processing (not sent to API)
        this.targetCityForFiltering = sanitizedParams.city;
      }
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
      
      // FIXED: Add important missing parameters for better results
      if (sanitizedParams.source) searchParams.append('source', sanitizedParams.source);
      if (sanitizedParams.locale) searchParams.append('locale', sanitizedParams.locale);
      
      // FIXED: Add recommended parameters for better event discovery
      if (!sanitizedParams.locale) {
        searchParams.append('locale', 'en-us'); // Default locale for better results
      }
      if (!sanitizedParams.sort) {
        searchParams.append('sort', 'date,asc'); // Sort by date for better relevance
      }
      // Include all sources for maximum coverage
      if (!sanitizedParams.source) {
        searchParams.append('source', 'ticketmaster,universe,frontgate,tmr');
      }
      // FIXED: Handle TBA and TBD events - be less restrictive for better results
      const businessCategories = ['Technology', 'Business', 'Marketing', 'Finance', 'Healthcare', 'Education', 'Academic', 'Professional Development', 'Networking', 'Conferences', 'Trade Shows', 'Workshops', 'Seminars'];
      const isBusinessCategory = businessCategories.includes(sanitizedParams.classificationName || '');
      const isCzechCity = sanitizedParams.countryCode === 'CZ';
      
      // FIXED: Include TBA for business categories and Czech cities (for better coverage)
      const shouldIncludeTBA = isBusinessCategory || isCzechCity;
      const shouldIncludeTBD = isBusinessCategory || isCzechCity;
      
      searchParams.append('includeTBA', shouldIncludeTBA ? 'yes' : 'no');
      searchParams.append('includeTBD', shouldIncludeTBD ? 'yes' : 'no');
      
      console.log(`🎫 Ticketmaster: ${shouldIncludeTBA ? 'Including' : 'Excluding'} TBA/TBD events for category "${sanitizedParams.classificationName}"`);
    
      if (sanitizedParams.includeTest !== undefined) searchParams.append('includeTest', sanitizedParams.includeTest.toString());

      const url = `${this.baseUrl}/events.json?${searchParams.toString()}`;
      
      // FIXED: Add debugging for API key validation
      console.log('🔑 API Key Debug:', {
        hasApiKey: !!this.apiKey,
        keyLength: this.apiKey?.length || 0,
        keyStart: this.apiKey?.substring(0, 4) || 'none',
        keyEnd: this.apiKey?.substring(this.apiKey.length - 4) || 'none',
        isPlaceholder: this.apiKey?.includes('your_') || this.apiKey?.includes('here') || false
      });
      
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
      const allEvents: Event[] = [];
      let transformErrors = 0;
      
      for (const rawEvent of rawEvents) {
        try {
          const transformedEvent = this.transformEvent(rawEvent, sanitizedParams.city);
          allEvents.push(transformedEvent);
        } catch (error) {
          transformErrors++;
          console.warn(`🎟️ Ticketmaster: Failed to transform event ${rawEvent?.id || 'unknown'}:`, error);
          // Continue processing other events instead of failing completely
        }
      }
      
      // NEW APPROACH: Filter events by target city after fetching (for Czech cities)
      let events: Event[] = allEvents;
      if (this.targetCityForFiltering && this.targetCityForFiltering.toLowerCase() === 'prague') {
        console.log(`🎟️ Ticketmaster: Filtering ${allEvents.length} events for target city: ${this.targetCityForFiltering}`);
        
        const filteredEvents = await this.filterEventsByCityWithAI(
          allEvents,
          this.targetCityForFiltering
        );
        
        events = filteredEvents;
        console.log(`🎟️ Ticketmaster: AI filtering found ${filteredEvents.length} events in ${this.targetCityForFiltering}`);
        
        // Reset the target city after filtering
        this.targetCityForFiltering = null;
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
    const countryCode = getCityCountryCode(city);
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
    const countryCode = getCityCountryCode(city);
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
      countryCode: options?.countryCode || (city ? getCityCountryCode(city) : undefined),
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
  private transformEvent = (tmEvent: TicketmasterEvent, requestedCity?: string): Event => {
    // Validate required fields
    if (!tmEvent || !tmEvent.id || !tmEvent.name || !tmEvent.dates?.start?.localDate) {
      throw new Error(`Invalid Ticketmaster event data: missing required fields (id: ${tmEvent?.id}, name: ${tmEvent?.name}, date: ${tmEvent?.dates?.start?.localDate})`);
    }

    // Safe venue extraction with validation
    const venue = tmEvent._embedded?.venues?.[0];
    const venueCity = venue?.city?.name;
    const venueName = venue?.name;
    const venueCountry = venue?.country?.name;
    
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

    // ENHANCED CITY EXTRACTION: Handle cases where Ticketmaster returns country name instead of city name
    let extractedCity = venueCity || 'Unknown';
    
    // Always try to extract city from venue name first (most reliable)
    const cityFromVenue = this.extractCityFromVenueName(venueName);
    if (cityFromVenue) {
      extractedCity = cityFromVenue;
      console.log(`🎟️ Ticketmaster: Extracted city "${cityFromVenue}" from venue name for event "${tmEvent.name}"`);
    }
    // If venue city is a country name, try additional extraction methods
    else if (venueCity && this.isCountryName(venueCity)) {
      // Try to extract city from event title
      const cityFromTitle = this.extractCityFromEventTitle(tmEvent.name);
      
      if (cityFromTitle) {
        extractedCity = cityFromTitle;
        console.log(`🎟️ Ticketmaster: Extracted city "${cityFromTitle}" from event title for event "${tmEvent.name}"`);
      } else if (requestedCity && venueCountry === 'Czech Republic') {
        // If we're searching for a Czech city and the event is in Czech Republic, use the requested city
        extractedCity = requestedCity;
        console.log(`🎟️ Ticketmaster: Using requested city "${requestedCity}" for Czech event "${tmEvent.name}" (venue city was "${venueCity}")`);
      } else {
        // Keep the country name but log it for debugging
        console.log(`🎟️ Ticketmaster: Could not extract city for event "${tmEvent.name}" - venue city: "${venueCity}", venue: "${venueName}"`);
      }
    }

    return {
      id: `tm_${tmEvent.id}`,
      title: tmEvent.name,
      description: description,
      date: eventDate,
      endDate: tmEvent.dates.end?.localDate,
      city: extractedCity,
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
   * Check if a string is a country name
   */
  private isCountryName(cityName: string): boolean {
    const countryNames = [
      'Czech Republic', 'Czechia', 'Germany', 'France', 'United Kingdom', 'UK',
      'United States', 'USA', 'US', 'Austria', 'Poland', 'Hungary', 'Switzerland',
      'Netherlands', 'Belgium', 'Italy', 'Spain', 'Sweden', 'Denmark', 'Norway',
      'Finland', 'Portugal', 'Ireland', 'Slovakia', 'Slovenia', 'Croatia'
    ];
    
    return countryNames.some(country => 
      cityName.toLowerCase().includes(country.toLowerCase())
    );
  }

  /**
   * Extract city name from venue name using comprehensive venue-city mapping
   */
  private extractCityFromVenueName(venueName?: string): string | null {
    if (!venueName) return null;
    
    // First try the comprehensive venue-city mapping service
    const mappedCity = venueCityMappingService.getCityForVenue(venueName);
    if (mappedCity) {
      return mappedCity;
    }
    
    // Fallback to pattern-based extraction for venues not in the mapping
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
    
    // Common patterns in event titles that contain city names
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
   * Map our categories to official Ticketmaster classification names
   * Based on official Ticketmaster segments: Music, Sports, Arts & Theatre, Film, Miscellaneous
   * FIXED: Now uses correct Ticketmaster classification names
   */
  public mapCategoryToTicketmaster(category: string): string | undefined {
    const categoryMap: Record<string, string | undefined> = {
      // Official Ticketmaster segments - direct mappings
      'Music': 'Music',
      'Sports': 'Sports', 
      'Arts & Theatre': 'Arts & Theatre',
      'Film': 'Film',
      'Miscellaneous': 'Miscellaneous',
      
      // FIXED: Arts and culture variations - use correct Ticketmaster classification
      'Arts & Culture': 'Arts & Theatre', // FIXED: Was 'Arts & Culture' (invalid)
      'Arts and Culture': 'Arts & Theatre',
      'Theater': 'Arts & Theatre',
      'Theatre': 'Arts & Theatre',
      'Comedy': 'Arts & Theatre',
      'Dance': 'Arts & Theatre',
      'Opera': 'Arts & Theatre',
      
      // FIXED: Entertainment - map to Music (most entertainment events are music)
      'Entertainment': 'Music', // FIXED: Was undefined, now maps to Music
      
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
      
      // FIXED: Business and professional events - use Miscellaneous instead of undefined
      'Technology': 'Miscellaneous', // FIXED: Was undefined, now uses Miscellaneous
      'Business': 'Miscellaneous', // FIXED: Was undefined, now uses Miscellaneous
      'Conferences': 'Miscellaneous', // FIXED: Was undefined, now uses Miscellaneous
      'Trade Shows': 'Miscellaneous', // FIXED: Was undefined, now uses Miscellaneous
      'Professional Development': 'Miscellaneous', // FIXED: Was undefined
      'Networking': 'Miscellaneous', // FIXED: Was undefined
      'Marketing': 'Miscellaneous', // FIXED: Was undefined
      'Finance': 'Miscellaneous', // FIXED: Was undefined
      'Healthcare': 'Miscellaneous', // FIXED: Was undefined
      'Education': 'Miscellaneous', // FIXED: Was undefined
      'Academic': 'Miscellaneous', // FIXED: Was undefined
      'Workshops': 'Miscellaneous', // FIXED: Was undefined
      'Seminars': 'Miscellaneous', // FIXED: Was undefined
      
      // FIXED: Fallback - use Miscellaneous instead of undefined
      'Other': 'Miscellaneous', // FIXED: Was undefined, now uses Miscellaneous
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
   * Get expanded categories specifically for Ticketmaster API
   * FIXED: Uses correct Ticketmaster classification names
   */
  getTicketmasterExpandedCategories(primaryCategory: string): string[] {
    const ticketmasterExpansions: Record<string, string[]> = {
      // FIXED: Entertainment - use correct Ticketmaster classifications
      'Entertainment': ['Music', 'Arts & Theatre', 'Film'], // FIXED: Was ['Entertainment', 'Music', 'Arts & Culture', ...]
      'Music': ['Music'],
      'Arts & Culture': ['Arts & Theatre'], // FIXED: Map to correct classification
      'Sports': ['Sports'],
      'Film': ['Film'],
      'Theater': ['Arts & Theatre'],
      'Comedy': ['Arts & Theatre'],
      'Dance': ['Arts & Theatre'],
      'Opera': ['Arts & Theatre'],
      
      // FIXED: Business categories - use Miscellaneous
      'Business': ['Miscellaneous'], // FIXED: Was ['Business', 'Marketing', ...]
      'Technology': ['Miscellaneous'], // FIXED: Was ['Technology', 'Business', ...]
      'Marketing': ['Miscellaneous'], // FIXED: Was ['Marketing', 'Business', ...]
      'Finance': ['Miscellaneous'], // FIXED: Was ['Finance', 'Business']
      'Healthcare': ['Miscellaneous'], // FIXED: Was ['Healthcare']
      'Education': ['Miscellaneous'], // FIXED: Was ['Education', 'Academic', ...]
      'Academic': ['Miscellaneous'], // FIXED: Was ['Academic']
      'Professional Development': ['Miscellaneous'], // FIXED: Was ['Professional Development']
      'Networking': ['Miscellaneous'], // FIXED: Was ['Networking', 'Business', ...]
      'Conferences': ['Miscellaneous'], // FIXED: Was ['Conferences', 'Business', ...]
      'Trade Shows': ['Miscellaneous'], // FIXED: Was ['Trade Shows', 'Business', ...]
      'Workshops': ['Miscellaneous'], // FIXED: Was ['Workshops']
      'Seminars': ['Miscellaneous'], // FIXED: Was ['Seminars']
    };

    const expandedCategories = ticketmasterExpansions[primaryCategory] || [this.mapCategoryToTicketmaster(primaryCategory)].filter(Boolean);
    
    console.log(`🎟️ Ticketmaster expanded categories for "${primaryCategory}":`, expandedCategories);
    return expandedCategories;
  }

  /**
   * Try alternative search strategies for Prague when primary search fails
   * FIXED: Uses different parameter combinations for better coverage
   */
  async tryAlternativePragueSearch(
    startDate: string, 
    endDate: string, 
    category?: string
  ): Promise<{ events: Event[]; total: number }> {
    console.log('🎟️ Ticketmaster: Trying alternative Prague search strategies...');
    
    // FIXED: Validate API key before alternative search
    if (!this.apiKey || this.apiKey.length < 10) {
      console.error('🎟️ Ticketmaster: API key not properly configured for alternative search');
      return { events: [], total: 0 };
    }
    
    const strategies = [
      // Strategy 1: Postal code only (no city/countryCode)
      {
        name: 'Postal Code Only',
        params: {
          postalCode: '11000',
          startDateTime: `${startDate}T00:00:00Z`,
          endDateTime: `${endDate}T23:59:59Z`,
          classificationName: this.mapCategoryToTicketmaster(category || 'Entertainment'),
          size: 50,
          locale: 'en-us',
          sort: 'date,asc',
          source: 'ticketmaster,universe,frontgate,tmr',
          includeTBA: 'yes',
          includeTBD: 'yes'
        }
      },
      // Strategy 2: Broader search without classification
      {
        name: 'No Classification',
        params: {
          postalCode: '11000',
          startDateTime: `${startDate}T00:00:00Z`,
          endDateTime: `${endDate}T23:59:59Z`,
          size: 50,
          locale: 'en-us',
          sort: 'date,asc',
          source: 'ticketmaster,universe,frontgate,tmr',
          includeTBA: 'yes',
          includeTBD: 'yes'
        }
      },
      // Strategy 3: Use city with country code (no postal code)
      {
        name: 'City + Country',
        params: {
          city: 'Prague',
          countryCode: 'CZ',
          startDateTime: `${startDate}T00:00:00Z`,
          endDateTime: `${endDate}T23:59:59Z`,
          classificationName: this.mapCategoryToTicketmaster(category || 'Entertainment'),
          size: 50,
          locale: 'en-us',
          sort: 'date,asc',
          source: 'ticketmaster,universe,frontgate,tmr',
          includeTBA: 'yes',
          includeTBD: 'yes'
        }
      }
    ];

    for (const strategy of strategies) {
      try {
        console.log(`🎟️ Ticketmaster: Trying strategy "${strategy.name}"...`);
        
        const searchParams = new URLSearchParams();
        searchParams.append('apikey', this.apiKey);
        
        // FIXED: Add API key debugging for alternative search
        console.log('🔑 Alternative Search API Key Debug:', {
          hasApiKey: !!this.apiKey,
          keyLength: this.apiKey?.length || 0,
          keyStart: this.apiKey?.substring(0, 4) || 'none',
          isPlaceholder: this.apiKey?.includes('your_') || this.apiKey?.includes('here') || false
        });
        
        // Add strategy parameters
        Object.entries(strategy.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, value.toString());
          }
        });

        const url = `${this.baseUrl}/events.json?${searchParams.toString()}`;
        const response = await this.makeRateLimitedRequest(url);

        if (response.ok) {
          const data = await response.json();
          const events = data._embedded?.events || [];
          
          if (events.length > 0) {
            console.log(`🎟️ Ticketmaster: Strategy "${strategy.name}" found ${events.length} events`);
            
            // Transform events
            const transformedEvents: Event[] = [];
            for (const rawEvent of events) {
              try {
                const transformedEvent = this.transformEvent(rawEvent, 'Prague');
                transformedEvents.push(transformedEvent);
              } catch (error) {
                console.warn(`🎟️ Ticketmaster: Failed to transform event:`, error);
              }
            }
            
            return { events: transformedEvents, total: data.page?.totalElements || 0 };
          }
        }
      } catch (error) {
        console.warn(`🎟️ Ticketmaster: Strategy "${strategy.name}" failed:`, error);
      }
    }

    console.log('🎟️ Ticketmaster: All alternative strategies failed');
    return { events: [], total: 0 };
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
    const countryCode = getCityCountryCode(city);
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
          countryCode: getCityCountryCode(city),
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

  /**
   * Get events with storage integration - fetches from API and saves to database
   */
  async getEventsWithStorage(params: {
    city?: string;
    countryCode?: string;
    radius?: string;
    postalCode?: string;
    marketId?: string;
    startDateTime?: string;
    endDateTime?: string;
    onsaleStartDateTime?: string;
    onsaleEndDateTime?: string;
    classificationName?: string;
    classificationId?: string;
    segmentId?: string;
    genreId?: string;
    subGenreId?: string;
    keyword?: string;
    attractionId?: string;
    venueId?: string;
    promoterId?: string;
    size?: number;
    page?: number;
    sort?: string;
    source?: string;
    locale?: string;
    includeTBA?: boolean;
    includeTBD?: boolean;
    includeTest?: boolean;
  }): Promise<{ events: Event[]; total: number; stored: number }> {
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
            source: 'ticketmaster',
            source_id: event.sourceId,
            url: event.url,
            image_url: event.imageUrl,
          };

          // Validate the event data
          const validation = dataTransformer.validateEventData(createEventData);
          if (validation.isValid) {
            eventsToStore.push(validation.sanitizedData);
          } else {
            console.warn(`Skipping invalid Ticketmaster event "${event.title}": ${validation.errors.join(', ')}`);
          }
        } catch (error) {
          console.warn(`Failed to transform Ticketmaster event "${event.title}":`, error);
        }
      }

      // Save events to database
      let storedCount = 0;
      if (eventsToStore.length > 0) {
        try {
          const saveResult = await eventStorageService.saveEvents(eventsToStore);
          storedCount = saveResult.created + saveResult.updated;
          console.log(`Stored ${storedCount} Ticketmaster events (${saveResult.created} created, ${saveResult.updated} updated, ${saveResult.skipped} skipped)`);
        } catch (error) {
          console.error('Failed to store Ticketmaster events:', error);
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
      const { events, total, stored } = await this.getEventsWithStorage({
        city,
        countryCode: getCityCountryCode(city),
        startDateTime: `${startDate}T00:00:00Z`,
        endDateTime: `${endDate}T23:59:59Z`,
        classificationName: category ? this.mapCategoryToTicketmaster(category) : undefined,
        size: 199,
        page: 0,
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
    radius: string = '50',
    category?: string
  ): Promise<{ events: Event[]; stored: number }> {
    try {
      const allEvents: Event[] = [];
      const seenEventIds = new Set<string>();
      const countryCode = getCityCountryCode(city);
      const postalCode = this.getCityPostalCode(city);
      const cityVariations = this.mapCityForTicketmaster(city);
      const radiusValue = this.validateRadius(radius);
      
      let totalStored = 0;

      console.log(`🎟️ Ticketmaster: Searching ${city} with storage integration using variations: ${cityVariations.join(', ')} with radius ${radiusValue} miles`);
      
      // Search each city variation with radius
      for (const cityVariation of cityVariations) {
        let page = 0;
        const pageSize = 199;
        let totalAvailable = 0;
        
        while (true) {
          const { events, total, stored } = await this.getEventsWithStorage({
            city: cityVariation,
            countryCode,
            radius: radiusValue,
            postalCode,
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
              allEvents.push(event);
            }
          }
          
          totalStored += stored;
          totalAvailable = total;
          
          if (events.length < pageSize || events.length >= total || page >= 3) {
            break;
          }
          
          page++;
        }
      }
      
      console.log(`🎟️ Ticketmaster: Retrieved ${allEvents.length} total unique events for ${city} with ${totalStored} stored in database`);
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
      console.log(`🎟️ Ticketmaster: Syncing events for ${city} from ${startDate} to ${endDate}`);
      
      const { events, stored } = await this.getEventsForCityWithStorage(
        city,
        startDate,
        endDate,
        category
      );

      console.log(`🎟️ Ticketmaster: Sync completed - ${events.length} events found, ${stored} stored`);
      
      return { events, stored, errors };
    } catch (error) {
      const errorMessage = `Failed to sync Ticketmaster events for ${city}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMessage);
      errors.push(errorMessage);
      
      return { events: [], stored: 0, errors };
    }
  }

  /**
   * NEW APPROACH: Search by country and use AI to determine city from venue information
   * This solves the Prague coverage issue by searching at country level
   */
  async getEventsByCountryWithAICityDetection(
    targetCity: string,
    countryCode: string,
    startDate: string,
    endDate: string,
    category?: string
  ): Promise<{ events: Event[]; total: number }> {
    console.log(`🎟️ Ticketmaster: Using country-based search with AI city detection for ${targetCity}, ${countryCode}`);
    
    try {
      // Step 1: Make direct API call exactly like your example
      const apiUrl = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${this.apiKey}&countryCode=${countryCode}&startDateTime=${startDate}T00:00:00Z&endDateTime=${endDate}T23:59:59Z&includeTBA=yes&page=0&size=199&locale=*`;
      
      console.log(`🎟️ Ticketmaster: Making direct API call: ${apiUrl.replace(this.apiKey, 'API_KEY_HIDDEN')}`);
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      // Step 2: Extract events from response
      const rawEvents = data._embedded?.events || [];
      console.log(`🎟️ Ticketmaster: Found ${rawEvents.length} events in ${countryCode}`);
      
      if (rawEvents.length === 0) {
        return { events: [], total: 0 };
      }
      
      // Step 3: Transform events to our format
      const events: Event[] = [];
      for (const rawEvent of rawEvents) {
        try {
          const transformedEvent = this.transformEvent(rawEvent, targetCity);
          events.push(transformedEvent);
        } catch (error) {
          console.warn(`🎟️ Ticketmaster: Failed to transform event ${rawEvent?.id || 'unknown'}:`, error);
        }
      }
      
      const countryResult = { events, total: events.length };
      
      console.log(`🎟️ Ticketmaster: Found ${countryResult.events.length} events in ${countryCode}`);
      
      if (countryResult.events.length === 0) {
        return { events: [], total: 0 };
      }
      
      // Step 2: Use AI to determine which events are in the target city
      const filteredEvents = await this.filterEventsByCityWithAI(
        countryResult.events,
        targetCity
      );
      
      console.log(`🎟️ Ticketmaster: AI filtering found ${filteredEvents.length} events in ${targetCity}`);
      
      return {
        events: filteredEvents,
        total: filteredEvents.length
      };
      
    } catch (error) {
      console.error(`🎟️ Ticketmaster: Country-based search failed:`, error);
      return { events: [], total: 0 };
    }
  }
  
  /**
   * Use AI to filter events by city based on venue information
   */
  private async filterEventsByCityWithAI(
    events: Event[],
    targetCity: string
  ): Promise<Event[]> {
    console.log(`🎟️ Ticketmaster: Using AI to filter ${events.length} events for city ${targetCity}`);
    
    const filteredEvents: Event[] = [];
    
    for (const event of events) {
      try {
        // Extract venue information
        const venueName = event.venue;
        const eventTitle = event.title;
        const eventDescription = event.description;
        
        // Use AI to determine if this event is in the target city
        const isInTargetCity = await this.isEventInCityWithAI(
          eventTitle,
          venueName,
          eventDescription || '',
          targetCity
        );
        
        if (isInTargetCity) {
          // Update the event's city to the target city for consistency
          const updatedEvent = {
            ...event,
            city: targetCity
          };
          filteredEvents.push(updatedEvent);
          console.log(`🎟️ Ticketmaster: AI confirmed event "${eventTitle}" is in ${targetCity}`);
        }
        
      } catch (error) {
        console.warn(`🎟️ Ticketmaster: AI filtering failed for event "${event.title}":`, error);
        // Fallback: use the existing city extraction logic
        if (event.city?.toLowerCase().includes(targetCity.toLowerCase())) {
          filteredEvents.push(event);
        }
      }
    }
    
    return filteredEvents;
  }
  
  /**
   * Use AI to determine if an event is in a specific city
   */
  private async isEventInCityWithAI(
    eventTitle: string,
    venueName: string | undefined,
    eventDescription: string,
    targetCity: string
  ): Promise<boolean> {
    try {
      // This would use OpenAI API to analyze the venue information
      // For now, implement a smart heuristic approach
      
      const searchText = `${eventTitle} ${venueName || ''} ${eventDescription}`.toLowerCase();
      const targetCityLower = targetCity.toLowerCase();
      
      // Check if the target city appears in the event information
      if (searchText.includes(targetCityLower)) {
        return true;
      }
      
      // Check for common venue patterns that indicate the city
      const cityIndicators = [
        `${targetCityLower} `,
        ` ${targetCityLower}`,
        `${targetCityLower},`,
        `, ${targetCityLower}`,
        `${targetCityLower}-`,
        `-${targetCityLower}`,
        `${targetCityLower}.`,
        `.${targetCityLower}`,
      ];
      
      for (const indicator of cityIndicators) {
        if (searchText.includes(indicator)) {
          return true;
        }
      }
      
      // Check for Prague-specific venue patterns
      if (targetCityLower === 'prague') {
        const praguePatterns = [
          'praha',
          'o2 arena',
          'forum karlín',
          'lucerna',
          'roxy',
          'cross club',
          'palác akropolis',
          'meetfactory'
        ];
        
        for (const pattern of praguePatterns) {
          if (searchText.includes(pattern)) {
            return true;
          }
        }
      }
      
      return false;
      
    } catch (error) {
      console.warn(`🎟️ Ticketmaster: AI city detection failed:`, error);
      return false;
    }
  }
}

export const ticketmasterService = new TicketmasterService();