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

  constructor() {
    this.apiKey = process.env.TICKETMASTER_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('TICKETMASTER_API_KEY environment variable is required');
    }
  }

  /**
   * Fetch events from Ticketmaster Discovery API
   */
  async getEvents(params: {
    city?: string;
    countryCode?: string;
    radius?: string;
    postalCode?: string;
    marketId?: string;
    startDateTime?: string;
    endDateTime?: string;
    classificationName?: string;
    keyword?: string;
    size?: number;
    page?: number;
  }): Promise<{ events: Event[]; total: number }> {
    try {
      const searchParams = new URLSearchParams({
        apikey: this.apiKey,
        size: (params.size || 200).toString(), // Ticketmaster's maximum page size
        page: (params.page || 0).toString(),
      });

      // Add optional parameters
      if (params.city) searchParams.append('city', params.city);
      if (params.countryCode) searchParams.append('countryCode', params.countryCode);
      if (params.radius) searchParams.append('radius', params.radius);
      if (params.postalCode) searchParams.append('postalCode', params.postalCode);
      if (params.marketId) searchParams.append('marketId', params.marketId);
      if (params.startDateTime) searchParams.append('startDateTime', params.startDateTime);
      if (params.endDateTime) searchParams.append('endDateTime', params.endDateTime);
      if (params.classificationName) searchParams.append('classificationName', params.classificationName);
      if (params.keyword) searchParams.append('keyword', params.keyword);

      const url = `${this.baseUrl}/events.json?${searchParams.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ticketmaster API Error Response:', errorText);
        console.error('Request URL:', url);
        throw new Error(`Ticketmaster API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: TicketmasterResponse = await response.json();
      
      const events = data._embedded?.events?.map(this.transformEvent) || [];
      const total = data.page.totalElements;

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
   */
  async getEventsWithRadius(
    city: string,
    startDate: string,
    endDate: string,
    radius: string = '50',
    category?: string
  ): Promise<Event[]> {
    const countryCode = this.getCityCountryCode(city);
    const postalCode = this.getCityPostalCode(city);
    const marketId = this.getCityMarketId(city);
    
    console.log(`🎟️ Ticketmaster: Searching ${city} with radius ${radius} miles`);
    
    const allEvents: Event[] = [];
    let page = 0;
    const pageSize = 200;
    let totalAvailable = 0;
    
    while (true) {
      console.log(`🎟️ Ticketmaster: Fetching page ${page + 1} for ${city} (radius: ${radius} miles)`);
      
      const { events, total } = await this.getEvents({
        city,
        countryCode,
        radius,
        postalCode,
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
    
    console.log(`🎟️ Ticketmaster: Retrieved ${allEvents.length} total events for ${city} with radius ${radius} miles (${totalAvailable} available)`);
    return allEvents;
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
    let page = 0;
    const pageSize = 200; // Ticketmaster's maximum page size
    const countryCode = this.getCityCountryCode(city);
    let totalAvailable = 0;
    
    while (true) {
      console.log(`🎟️ Ticketmaster: Fetching page ${page + 1} for ${city}`);
      
      const { events, total } = await this.getEvents({
        city,
        countryCode,
        startDateTime: `${startDate}T00:00:00Z`,
        endDateTime: `${endDate}T23:59:59Z`,
        classificationName: category ? this.mapCategoryToTicketmaster(category) : undefined,
        size: pageSize,
        page,
      });

      allEvents.push(...events);
      totalAvailable = total; // Store the total for logging
      
      // Check if we've fetched all available events or reached the safety limit
      if (events.length < pageSize || allEvents.length >= total || page >= 9) {
        break;
      }
      
      page++;
    }
    
    console.log(`🎟️ Ticketmaster: Retrieved ${allEvents.length} total events for ${city} (${totalAvailable} available)`);
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
      keyword,
      city,
      startDateTime: startDate ? `${startDate}T00:00:00Z` : undefined,
      endDateTime: endDate ? `${endDate}T23:59:59Z` : undefined,
      size: 200, // Ticketmaster's maximum page size
    });

    return events;
  }

  /**
   * Transform Ticketmaster event to our Event interface
   */
  private transformEvent = (tmEvent: TicketmasterEvent): Event => {
    const venue = tmEvent._embedded?.venues?.[0];
    const classification = tmEvent.classifications?.[0];
    const image = tmEvent.images?.find(img => img.width >= 640) || tmEvent.images?.[0];

    return {
      id: `tm_${tmEvent.id}`,
      title: tmEvent.name,
      description: tmEvent.description || tmEvent.pleaseNote,
      date: tmEvent.dates.start.localDate,
      endDate: tmEvent.dates.end?.localDate,
      city: venue?.city?.name || 'Unknown',
      venue: venue?.name,
      category: this.mapTicketmasterCategory(classification?.segment?.name || 'Other'),
      subcategory: classification?.genre?.name || classification?.subGenre?.name,
      source: 'ticketmaster',
      sourceId: tmEvent.id,
      url: tmEvent.url,
      imageUrl: image?.url,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  /**
   * Map our categories to Ticketmaster classification names
   * Returns undefined for broader searches when no specific mapping exists
   */
  private mapCategoryToTicketmaster(category: string): string | undefined {
    const categoryMap: Record<string, string | undefined> = {
      // Business and professional events
      'Technology': 'Miscellaneous', // Ticketmaster doesn't have specific tech category
      'Business': 'Miscellaneous', // Business events often fall under Miscellaneous
      'Marketing': 'Miscellaneous',
      'Finance': 'Miscellaneous',
      'Professional Development': 'Miscellaneous',
      'Networking': 'Miscellaneous',
      
      // Conferences and trade shows
      'Conferences': 'Miscellaneous', // Most conferences are in Miscellaneous
      'Trade Shows': 'Miscellaneous', // Trade shows typically in Miscellaneous
      'Expos': 'Miscellaneous',
      
      // Healthcare and education
      'Healthcare': 'Miscellaneous',
      'Education': 'Miscellaneous',
      'Academic': 'Miscellaneous',
      
      // Entertainment and culture
      'Entertainment': 'Arts & Theatre',
      'Arts & Culture': 'Arts & Theatre',
      'Music': 'Music',
      'Film': 'Film',
      
      // Sports
      'Sports': 'Sports',
      
      // For categories that might benefit from broader search
      'Other': undefined, // Return undefined to search without category filter
    };

    const mappedCategory = categoryMap[category];
    
    // Log when we're using fallback (undefined) for debugging
    if (mappedCategory === undefined) {
      console.log(`🎟️ Ticketmaster: Using broader search for category "${category}" (no specific mapping)`);
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
   */
  private getCityMarketId(city: string): string | undefined {
    const cityMarketMap: Record<string, string> = {
      'Prague': 'CZ-PR', // Czech Republic - Prague
      'Brno': 'CZ-BR', // Czech Republic - Brno
      'Ostrava': 'CZ-OS', // Czech Republic - Ostrava
      'Olomouc': 'CZ-OL', // Czech Republic - Olomouc
      'London': 'GB-LON', // United Kingdom - London
      'Berlin': 'DE-BER', // Germany - Berlin
      'Paris': 'FR-PAR', // France - Paris
      'Amsterdam': 'NL-AMS', // Netherlands - Amsterdam
      'Vienna': 'AT-VIE', // Austria - Vienna
      'Warsaw': 'PL-WAW', // Poland - Warsaw
      'Budapest': 'HU-BUD', // Hungary - Budapest
      'Zurich': 'CH-ZUR', // Switzerland - Zurich
      'Munich': 'DE-MUN', // Germany - Munich
      'Stockholm': 'SE-STO', // Sweden - Stockholm
      'Copenhagen': 'DK-COP', // Denmark - Copenhagen
      'Helsinki': 'FI-HEL', // Finland - Helsinki
      'Oslo': 'NO-OSL', // Norway - Oslo
      'Madrid': 'ES-MAD', // Spain - Madrid
      'Barcelona': 'ES-BAR', // Spain - Barcelona
      'Rome': 'IT-ROM', // Italy - Rome
      'Milan': 'IT-MIL', // Italy - Milan
      'Athens': 'GR-ATH', // Greece - Athens
      'Lisbon': 'PT-LIS', // Portugal - Lisbon
      'Dublin': 'IE-DUB', // Ireland - Dublin
      'Edinburgh': 'GB-EDI', // United Kingdom - Edinburgh
      'Glasgow': 'GB-GLA', // United Kingdom - Glasgow
      'Manchester': 'GB-MAN', // United Kingdom - Manchester
      'Birmingham': 'GB-BIR', // United Kingdom - Birmingham
      'Liverpool': 'GB-LIV', // United Kingdom - Liverpool
      'Leeds': 'GB-LEE', // United Kingdom - Leeds
      'Sheffield': 'GB-SHE', // United Kingdom - Sheffield
      'Bristol': 'GB-BRI', // United Kingdom - Bristol
      'Newcastle': 'GB-NEW', // United Kingdom - Newcastle
      'Nottingham': 'GB-NOT', // United Kingdom - Nottingham
      'Leicester': 'GB-LEI', // United Kingdom - Leicester
      'Hamburg': 'DE-HAM', // Germany - Hamburg
      'Cologne': 'DE-COL', // Germany - Cologne
      'Frankfurt': 'DE-FRA', // Germany - Frankfurt
      'Stuttgart': 'DE-STU', // Germany - Stuttgart
      'Düsseldorf': 'DE-DUS', // Germany - Düsseldorf
      'Dortmund': 'DE-DOR', // Germany - Dortmund
      'Essen': 'DE-ESS', // Germany - Essen
      'Leipzig': 'DE-LEI', // Germany - Leipzig
      'Bremen': 'DE-BRE', // Germany - Bremen
      'Dresden': 'DE-DRE', // Germany - Dresden
      'Hannover': 'DE-HAN', // Germany - Hannover
      'Nuremberg': 'DE-NUR', // Germany - Nuremberg
    };

    return cityMarketMap[city];
  }

  /**
   * Get venue details by ID
   */
  async getVenue(venueId: string) {
    try {
      const url = `${this.baseUrl}/venues/${venueId}.json?apikey=${this.apiKey}`;
      const response = await fetch(url);
      
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
   * Get event classifications (categories)
   */
  async getClassifications() {
    try {
      const url = `${this.baseUrl}/classifications.json?apikey=${this.apiKey}`;
      const response = await fetch(url);
      
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