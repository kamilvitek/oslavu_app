// src/lib/services/predicthq.ts
import { Event } from '@/types';

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
      
      const events = data.results?.map(this.transformEvent) || [];
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
    const locationParams = this.getCityLocationParams(city);
    
    console.log(`🔮 PredictHQ: Searching ${city} with radius ${radius}`);
    
    const allEvents: Event[] = [];
    let offset = 0;
    const limit = 500;
    let totalAvailable = 0;
    
    while (true) {
      console.log(`🔮 PredictHQ: Fetching offset ${offset} for ${city} (radius: ${radius})`);
      
      const { events, total } = await this.getEvents({
        ...locationParams,
        'start.gte': `${startDate}T00:00:00`,
        'start.lte': `${endDate}T23:59:59`,
        category: category ? this.mapCategoryToPredictHQ(category) : undefined,
        limit,
        offset,
      });

      allEvents.push(...events);
      totalAvailable = total;
      
      if (events.length < limit || allEvents.length >= total || offset >= 4500) {
        break;
      }
      
      offset += limit;
    }
    
    console.log(`🔮 PredictHQ: Retrieved ${allEvents.length} total events for ${city} with radius ${radius} (${totalAvailable} available)`);
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
    let offset = 0;
    const limit = 500; // PredictHQ's maximum limit
    const locationParams = this.getCityLocationParams(city);
    let totalAvailable = 0;
    
    while (true) {
      console.log(`🔮 PredictHQ: Fetching offset ${offset} for ${city}`);
      
      const { events, total } = await this.getEvents({
        ...locationParams,
        'start.gte': `${startDate}T00:00:00`,
        'start.lte': `${endDate}T23:59:59`,
        category: category ? this.mapCategoryToPredictHQ(category) : undefined,
        limit,
        offset,
      });

      allEvents.push(...events);
      totalAvailable = total; // Store the total for logging
      
      // Check if we've fetched all available events or reached the safety limit
      if (events.length < limit || allEvents.length >= total || offset >= 4500) { // 10 pages * 500 limit
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
  private transformEvent = (phqEvent: PredictHQEvent): Event => {
    const location = phqEvent.location || phqEvent.place;
    const startDate = new Date(phqEvent.start);
    const endDate = phqEvent.end ? new Date(phqEvent.end) : undefined;
    
    return {
      id: `phq_${phqEvent.id}`,
      title: phqEvent.title,
      description: phqEvent.description,
      date: startDate.toISOString().split('T')[0],
      endDate: endDate?.toISOString().split('T')[0],
      city: location?.city || 'Unknown',
      venue: location?.name || phqEvent.place?.name,
      category: this.mapPredictHQCategory(phqEvent.category),
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
   * Map our categories to PredictHQ category names
   * Returns undefined for broader searches when no specific mapping exists
   */
  private mapCategoryToPredictHQ(category: string): string | undefined {
    const categoryMap: Record<string, string | undefined> = {
      // Business and professional events - use conferences for most business events
      'Technology': 'conferences', // Tech conferences and events
      'Business': 'conferences', // Business conferences and meetings
      'Marketing': 'conferences', // Marketing conferences and events
      'Finance': 'conferences', // Financial conferences and events
      'Professional Development': 'conferences', // Professional development events
      'Networking': 'conferences', // Networking events and meetups
      
      // Conferences and trade shows
      'Conferences': 'conferences', // Direct mapping
      'Trade Shows': 'expos', // Trade shows and exhibitions
      'Expos': 'expos', // Direct mapping
      
      // Healthcare and education
      'Healthcare': 'conferences', // Healthcare conferences and events
      'Education': 'academic', // Educational events and academic conferences
      'Academic': 'academic', // Direct mapping
      
      // Entertainment and culture
      'Entertainment': 'concerts', // Music and entertainment events
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
  private mapPredictHQCategory(phqCategory: string): string {
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
   * Get location parameters for a city
   */
  private getCityLocationParams(city: string): Partial<PredictHQSearchParams> {
    const cityCoordinates: Record<string, { lat: number; lon: number; country: string }> = {
      'Prague': { lat: 50.0755, lon: 14.4378, country: 'CZ' },
      'Brno': { lat: 49.1951, lon: 16.6068, country: 'CZ' },
      'Ostrava': { lat: 49.8209, lon: 18.2625, country: 'CZ' },
      'London': { lat: 51.5074, lon: -0.1278, country: 'GB' },
      'Berlin': { lat: 52.5200, lon: 13.4050, country: 'DE' },
      'Paris': { lat: 48.8566, lon: 2.3522, country: 'FR' },
      'Amsterdam': { lat: 52.3676, lon: 4.9041, country: 'NL' },
      'Vienna': { lat: 48.2082, lon: 16.3738, country: 'AT' },
      'Warsaw': { lat: 52.2297, lon: 21.0122, country: 'PL' },
      'Budapest': { lat: 47.4979, lon: 19.0402, country: 'HU' },
      'Zurich': { lat: 47.3769, lon: 8.5417, country: 'CH' },
      'Munich': { lat: 48.1351, lon: 11.5820, country: 'DE' },
      'Stockholm': { lat: 59.3293, lon: 18.0686, country: 'SE' },
      'Copenhagen': { lat: 55.6761, lon: 12.5683, country: 'DK' },
      'Helsinki': { lat: 60.1699, lon: 24.9384, country: 'FI' },
      'Oslo': { lat: 59.9139, lon: 10.7522, country: 'NO' },
      'Madrid': { lat: 40.4168, lon: -3.7038, country: 'ES' },
      'Barcelona': { lat: 41.3851, lon: 2.1734, country: 'ES' },
      'Rome': { lat: 41.9028, lon: 12.4964, country: 'IT' },
      'Milan': { lat: 45.4642, lon: 9.1900, country: 'IT' },
      'Athens': { lat: 37.9755, lon: 23.7348, country: 'GR' },
      'Lisbon': { lat: 38.7223, lon: -9.1393, country: 'PT' },
      'Dublin': { lat: 53.3498, lon: -6.2603, country: 'IE' },
      'Edinburgh': { lat: 55.9533, lon: -3.1883, country: 'GB' },
      'Glasgow': { lat: 55.8642, lon: -4.2518, country: 'GB' },
      'Manchester': { lat: 53.4808, lon: -2.2426, country: 'GB' },
      'Birmingham': { lat: 52.4862, lon: -1.8904, country: 'GB' },
      'Liverpool': { lat: 53.4084, lon: -2.9916, country: 'GB' },
      'Leeds': { lat: 53.8008, lon: -1.5491, country: 'GB' },
      'Sheffield': { lat: 53.3811, lon: -1.4701, country: 'GB' },
      'Bristol': { lat: 51.4545, lon: -2.5879, country: 'GB' },
      'Newcastle': { lat: 54.9783, lon: -1.6178, country: 'GB' },
      'Nottingham': { lat: 52.9548, lon: -1.1581, country: 'GB' },
      'Leicester': { lat: 52.6369, lon: -1.1398, country: 'GB' },
      'Hamburg': { lat: 53.5511, lon: 9.9937, country: 'DE' },
      'Cologne': { lat: 50.9375, lon: 6.9603, country: 'DE' },
      'Frankfurt': { lat: 50.1109, lon: 8.6821, country: 'DE' },
      'Stuttgart': { lat: 48.7758, lon: 9.1829, country: 'DE' },
      'Düsseldorf': { lat: 51.2277, lon: 6.7735, country: 'DE' },
      'Dortmund': { lat: 51.5136, lon: 7.4653, country: 'DE' },
      'Essen': { lat: 51.4556, lon: 7.0116, country: 'DE' },
      'Leipzig': { lat: 51.3397, lon: 12.3731, country: 'DE' },
      'Bremen': { lat: 53.0793, lon: 8.8017, country: 'DE' },
      'Dresden': { lat: 51.0504, lon: 13.7373, country: 'DE' },
      'Hannover': { lat: 52.3759, lon: 9.7320, country: 'DE' },
      'Nuremberg': { lat: 49.4521, lon: 11.0767, country: 'DE' },
    };

    const cityData = cityCoordinates[city];
    if (cityData) {
      return {
        place: `${cityData.lat},${cityData.lon}`,
        country: cityData.country,
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

    // Strategy 6: Country-wide search for high-impact events
    try {
      console.log(`🔮 PredictHQ: Strategy 6 - Country-wide search for high-impact events`);
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

    console.log(`🔮 PredictHQ: Comprehensive fallback completed - found ${allEvents.length} unique events`);
    return allEvents;
  }

  /**
   * Comprehensive multi-strategy search approach to maximize event discovery coverage
   */
  async getEventsComprehensive(
    city: string,
    startDate: string,
    endDate: string,
    category?: string
  ): Promise<Event[]> {
    const allEvents: Event[] = [];
    const strategyResults: Array<{ strategy: string; events: number; time: number }> = [];
    
    console.log(`🔮 PredictHQ: Starting comprehensive search for ${city} (${startDate} to ${endDate})`);
    
    // Strategy 1: City-based search
    try {
      const startTime = Date.now();
      console.log(`🔮 PredictHQ: Strategy 1 - City-based search`);
      const cityEvents = await this.getEventsForCityPaginated(city, startDate, endDate, category);
      allEvents.push(...cityEvents);
      const time = Date.now() - startTime;
      strategyResults.push({ strategy: 'City-based search', events: cityEvents.length, time });
      console.log(`🔮 PredictHQ: Strategy 1 found ${cityEvents.length} events in ${time}ms`);
    } catch (error) {
      console.error(`🔮 PredictHQ: Strategy 1 failed:`, error);
      strategyResults.push({ strategy: 'City-based search', events: 0, time: 0 });
    }
    
    // Strategy 2: Keyword search
    if (category) {
      try {
        const startTime = Date.now();
        console.log(`🔮 PredictHQ: Strategy 2 - Keyword search for "${category}"`);
        const keywordEvents = await this.searchEvents(category, city, startDate, endDate);
        allEvents.push(...keywordEvents);
        const time = Date.now() - startTime;
        strategyResults.push({ strategy: `Keyword search for "${category}"`, events: keywordEvents.length, time });
        console.log(`🔮 PredictHQ: Strategy 2 found ${keywordEvents.length} events in ${time}ms`);
      } catch (error) {
        console.error(`🔮 PredictHQ: Strategy 2 failed:`, error);
        strategyResults.push({ strategy: `Keyword search for "${category}"`, events: 0, time: 0 });
      }
    }
    
    // Strategy 3: High attendance events filter
    try {
      const startTime = Date.now();
      console.log(`🔮 PredictHQ: Strategy 3 - High attendance events (1000+ attendees)`);
      const highAttendanceEvents = await this.getHighAttendanceEvents(city, startDate, endDate, 1000);
      allEvents.push(...highAttendanceEvents);
      const time = Date.now() - startTime;
      strategyResults.push({ strategy: 'High attendance events (1000+ attendees)', events: highAttendanceEvents.length, time });
      console.log(`🔮 PredictHQ: Strategy 3 found ${highAttendanceEvents.length} events in ${time}ms`);
    } catch (error) {
      console.error(`🔮 PredictHQ: Strategy 3 failed:`, error);
      strategyResults.push({ strategy: 'High attendance events (1000+ attendees)', events: 0, time: 0 });
    }
    
    // Strategy 4: High local rank events filter
    try {
      const startTime = Date.now();
      console.log(`🔮 PredictHQ: Strategy 4 - High local rank events (rank 50+)`);
      const highRankEvents = await this.getHighRankEvents(city, startDate, endDate, 50);
      allEvents.push(...highRankEvents);
      const time = Date.now() - startTime;
      strategyResults.push({ strategy: 'High local rank events (rank 50+)', events: highRankEvents.length, time });
      console.log(`🔮 PredictHQ: Strategy 4 found ${highRankEvents.length} events in ${time}ms`);
    } catch (error) {
      console.error(`🔮 PredictHQ: Strategy 4 failed:`, error);
      strategyResults.push({ strategy: 'High local rank events (rank 50+)', events: 0, time: 0 });
    }
    
    // Strategy 5: Radius search with category
    if (category) {
      try {
        const startTime = Date.now();
        console.log(`🔮 PredictHQ: Strategy 5 - Radius search (50km) with category`);
        const radiusCategoryEvents = await this.getEventsWithRadius(city, startDate, endDate, '50km', category);
        allEvents.push(...radiusCategoryEvents);
        const time = Date.now() - startTime;
        strategyResults.push({ strategy: 'Radius search (50km) with category', events: radiusCategoryEvents.length, time });
        console.log(`🔮 PredictHQ: Strategy 5 found ${radiusCategoryEvents.length} events in ${time}ms`);
      } catch (error) {
        console.error(`🔮 PredictHQ: Strategy 5 failed:`, error);
        strategyResults.push({ strategy: 'Radius search (50km) with category', events: 0, time: 0 });
      }
    }
    
    // Strategy 6: Extended radius search (100km)
    try {
      const startTime = Date.now();
      console.log(`🔮 PredictHQ: Strategy 6 - Extended radius search (100km)`);
      const extendedRadiusEvents = await this.getEventsWithRadius(city, startDate, endDate, '100km', category);
      allEvents.push(...extendedRadiusEvents);
      const time = Date.now() - startTime;
      strategyResults.push({ strategy: 'Extended radius search (100km)', events: extendedRadiusEvents.length, time });
      console.log(`🔮 PredictHQ: Strategy 6 found ${extendedRadiusEvents.length} events in ${time}ms`);
    } catch (error) {
      console.error(`🔮 PredictHQ: Strategy 6 failed:`, error);
      strategyResults.push({ strategy: 'Extended radius search (100km)', events: 0, time: 0 });
    }
    
    // Deduplicate and log results
    const uniqueEvents = this.deduplicateEvents(allEvents);
    
    // Log strategy effectiveness
    console.log(`🔮 PredictHQ: Comprehensive search completed`);
    console.log(`🔮 PredictHQ: Strategy Results:`);
    strategyResults.forEach(result => {
      console.log(`  - ${result.strategy}: ${result.events} events in ${result.time}ms`);
    });
    console.log(`🔮 PredictHQ: Total events before deduplication: ${allEvents.length}`);
    console.log(`🔮 PredictHQ: Total unique events after deduplication: ${uniqueEvents.length}`);
    
    return uniqueEvents;
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

export const predicthqService = new PredictHQService();
