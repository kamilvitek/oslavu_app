// src/lib/services/eventbrite.ts
import { Event } from '@/types';

interface EventbriteEvent {
  id: string;
  name: {
    text: string;
    html?: string;
  };
  description?: {
    text: string;
    html?: string;
  };
  start: {
    utc: string;
    local: string;
    timezone: string;
  };
  end?: {
    utc: string;
    local: string;
    timezone: string;
  };
  category_id?: string;
  subcategory_id?: string;
  format_id?: string;
  venue_id?: string;
  online_event?: boolean;
  status: string;
  currency?: string;
  listed?: boolean;
  shareable?: boolean;
  invite_only?: boolean;
  show_remaining?: boolean;
  url?: string;
  logo?: {
    url: string;
    aspect_ratio?: string;
    edge_color?: string;
    edge_color_set?: boolean;
  };
  organizer_id?: string;
  organizer?: {
    id: string;
    name: string;
    description?: string;
    url?: string;
  };
  venue?: {
    id: string;
    name: string;
    address?: {
      address_1?: string;
      address_2?: string;
      city?: string;
      region?: string;
      postal_code?: string;
      country?: string;
      localized_area_display?: string;
    };
    latitude?: string;
    longitude?: string;
  };
  capacity?: number;
  capacity_is_custom?: boolean;
  is_free?: boolean;
  is_reserved_seating?: boolean;
  has_available_tickets?: boolean;
  is_series?: boolean;
  is_series_parent?: boolean;
  series_id?: string;
  ticket_availability?: {
    has_available_tickets: boolean;
    minimum_ticket_price?: {
      currency: string;
      value: number;
      major_value: string;
      display: string;
    };
    maximum_ticket_price?: {
      currency: string;
      value: number;
      major_value: string;
      display: string;
    };
    is_sold_out: boolean;
    start_sales_date?: string;
    end_sales_date?: string;
  };
}

interface EventbriteResponse {
  events: EventbriteEvent[];
  pagination: {
    object_count: number;
    page_number: number;
    page_size: number;
    page_count: number;
    has_more_items: boolean;
  };
}

interface EventbriteCategory {
  id: string;
  name: string;
  name_localized?: string;
  short_name?: string;
  short_name_localized?: string;
  subcategories?: EventbriteCategory[];
}

export class EventbriteService {
  private readonly privateToken: string;
  private readonly baseUrl = 'https://www.eventbriteapi.com/v3';

  constructor() {
    this.privateToken = process.env.EVENTBRITE_PRIVATE_TOKEN || '';
    if (!this.privateToken) {
      throw new Error('EVENTBRITE_PRIVATE_TOKEN environment variable is required');
    }
  }

  /**
   * Fetch events from Eventbrite API
   */
  async getEvents(params: {
    location?: string;
    location_radius?: string;
    start_date?: string;
    end_date?: string;
    categories?: string;
    subcategories?: string;
    q?: string;
    page_size?: number;
    page?: number;
    sort_by?: string;
    time_filter?: string;
  }): Promise<{ events: Event[]; total: number }> {
    try {
      const searchParams = new URLSearchParams({
        page_size: (params.page_size || 200).toString(), // Increased from 50 to 200 (Eventbrite's max) for better event coverage
        page: (params.page || 1).toString(),
        sort_by: params.sort_by || 'date',
        time_filter: params.time_filter || 'current_future',
      });

      // Add optional parameters
      if (params.location) searchParams.append('location.address', params.location);
      if (params.location_radius) searchParams.append('location.within', params.location_radius);
      if (params.start_date) searchParams.append('start_date.range_start', params.start_date);
      if (params.end_date) searchParams.append('start_date.range_end', params.end_date);
      if (params.categories) searchParams.append('categories', params.categories);
      if (params.subcategories) searchParams.append('subcategories', params.subcategories);
      if (params.q) searchParams.append('q', params.q);

      const url = `${this.baseUrl}/events/search/?${searchParams.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.privateToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Eventbrite API Error Response:', errorText);
        console.error('Request URL:', url);
        throw new Error(`Eventbrite API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: EventbriteResponse = await response.json();
      
      const events = data.events?.map(this.transformEvent) || [];
      const total = data.pagination.object_count;

      return { events, total };
    } catch (error) {
      console.error('Error fetching Eventbrite events:', error);
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
   * Get events with configurable radius for better geographic coverage
   */
  async getEventsWithRadius(
    city: string,
    startDate: string,
    endDate: string,
    radius: string = '50km',
    category?: string
  ): Promise<Event[]> {
    console.log(`🎫 Eventbrite: Searching ${city} with radius ${radius}`);
    
    const allEvents: Event[] = [];
    let page = 1;
    const pageSize = 200;
    let totalAvailable = 0;
    
    while (true) {
      console.log(`🎫 Eventbrite: Fetching page ${page} for ${city} (radius: ${radius})`);
      
      const { events, total } = await this.getEvents({
        location: city,
        location_radius: radius,
        start_date: `${startDate}T00:00:00`,
        end_date: `${endDate}T23:59:59`,
        categories: category ? this.mapCategoryToEventbrite(category) : undefined,
        page_size: pageSize,
        page,
      });

      allEvents.push(...events);
      totalAvailable = total;
      
      if (events.length < pageSize || allEvents.length >= total || page >= 10) {
        break;
      }
      
      page++;
    }
    
    console.log(`🎫 Eventbrite: Retrieved ${allEvents.length} total events for ${city} with radius ${radius} (${totalAvailable} available)`);
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
    let page = 1; // Eventbrite uses 1-based pagination
    const pageSize = 200; // Eventbrite's maximum page size
    let totalAvailable = 0;
    
    while (true) {
      console.log(`🎫 Eventbrite: Fetching page ${page} for ${city}`);
      
      const { events, total } = await this.getEvents({
        location: city,
        location_radius: '50km',
        start_date: `${startDate}T00:00:00`,
        end_date: `${endDate}T23:59:59`,
        categories: category ? this.mapCategoryToEventbrite(category) : undefined,
        page_size: pageSize,
        page,
      });

      allEvents.push(...events);
      totalAvailable = total; // Store the total for logging
      
      // Check if we've fetched all available events or reached the safety limit
      if (events.length < pageSize || allEvents.length >= total || page >= 10) {
        break;
      }
      
      page++;
    }
    
    console.log(`🎫 Eventbrite: Retrieved ${allEvents.length} total events for ${city} (${totalAvailable} available)`);
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
      location: city,
      location_radius: city ? '50km' : undefined,
      start_date: startDate ? `${startDate}T00:00:00` : undefined,
      end_date: endDate ? `${endDate}T23:59:59` : undefined,
      page_size: 200, // Using Eventbrite's maximum page size for better event coverage
    });

    return events;
  }

  /**
   * Transform Eventbrite event to our Event interface
   */
  private transformEvent = (ebEvent: EventbriteEvent): Event => {
    const startDate = new Date(ebEvent.start.local);
    const endDate = ebEvent.end ? new Date(ebEvent.end.local) : undefined;
    
    return {
      id: `eb_${ebEvent.id}`,
      title: ebEvent.name.text,
      description: ebEvent.description?.text,
      date: startDate.toISOString().split('T')[0],
      endDate: endDate?.toISOString().split('T')[0],
      city: ebEvent.venue?.address?.city || 'Unknown',
      venue: ebEvent.venue?.name,
      category: this.mapEventbriteCategory(ebEvent.category_id),
      subcategory: ebEvent.subcategory_id,
      expectedAttendees: ebEvent.capacity,
      source: 'eventbrite',
      sourceId: ebEvent.id,
      url: ebEvent.url,
      imageUrl: ebEvent.logo?.url,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  /**
   * Map our categories to Eventbrite category IDs
   * Returns undefined for broader searches when no specific mapping exists
   */
  private mapCategoryToEventbrite(category: string): string | undefined {
    const categoryMap: Record<string, string | undefined> = {
      // Business and professional events
      'Technology': '102', // Science & Technology
      'Business': '101', // Business & Professional
      'Marketing': '101', // Business & Professional
      'Finance': '101', // Business & Professional
      'Professional Development': '101', // Business & Professional
      'Networking': '101', // Business & Professional
      
      // Conferences and trade shows
      'Conferences': '101', // Business & Professional (most conferences are business events)
      'Trade Shows': '101', // Business & Professional
      'Expos': '101', // Business & Professional
      
      // Healthcare and education
      'Healthcare': '108', // Health & Wellness
      'Education': '110', // Education
      'Academic': '110', // Education
      
      // Entertainment and culture
      'Entertainment': '103', // Music
      'Arts & Culture': '105', // Arts
      'Music': '103', // Music
      'Film': '104', // Film & Media
      
      // Sports and fitness
      'Sports': '108', // Health & Wellness (closest to sports)
      
      // For categories that might benefit from broader search
      'Other': undefined, // Return undefined to search without category filter
    };

    const mappedCategory = categoryMap[category];
    
    // Log when we're using fallback (undefined) for debugging
    if (mappedCategory === undefined) {
      console.log(`🎫 Eventbrite: Using broader search for category "${category}" (no specific mapping)`);
    }
    
    return mappedCategory;
  }

  /**
   * Map Eventbrite category IDs to our standard categories
   */
  private mapEventbriteCategory(categoryId?: string): string {
    if (!categoryId) return 'Other';

    const categoryMap: Record<string, string> = {
      '101': 'Business', // Business & Professional
      '102': 'Technology', // Science & Technology
      '103': 'Entertainment', // Music
      '104': 'Entertainment', // Film & Media
      '105': 'Arts & Culture', // Arts
      '106': 'Entertainment', // Fashion & Beauty
      '107': 'Entertainment', // Food & Drink
      '108': 'Healthcare', // Health & Wellness
      '109': 'Entertainment', // Home & Lifestyle
      '110': 'Education', // Education
      '111': 'Other', // Government & Politics
      '112': 'Other', // Community & Culture
      '113': 'Other', // Spirituality & Religion
      '114': 'Other', // Travel & Outdoor
      '115': 'Other', // Charity & Causes
      '116': 'Other', // Family & Education
      '117': 'Other', // Holiday
      '118': 'Other', // Government
      '119': 'Other', // Fashion
      '120': 'Other', // Home & Lifestyle
      '121': 'Other', // Auto, Boat & Air
      '122': 'Other', // Hobbies & Special Interest
      '123': 'Other', // School Activities
      '124': 'Other', // Other
      '199': 'Other', // Other
    };

    return categoryMap[categoryId] || 'Other';
  }

  /**
   * Get event categories
   */
  async getCategories(): Promise<EventbriteCategory[]> {
    try {
      const url = `${this.baseUrl}/categories/?token=${this.privateToken}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.privateToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`);
      }

      const data = await response.json();
      return data.categories || [];
    } catch (error) {
      console.error('Error fetching Eventbrite categories:', error);
      throw error;
    }
  }

  /**
   * Get event details by ID
   */
  async getEvent(eventId: string): Promise<EventbriteEvent> {
    try {
      const url = `${this.baseUrl}/events/${eventId}/?token=${this.privateToken}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.privateToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch event: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Eventbrite event:', error);
      throw error;
    }
  }

  /**
   * Get venue details by ID
   */
  async getVenue(venueId: string) {
    try {
      const url = `${this.baseUrl}/venues/${venueId}/?token=${this.privateToken}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.privateToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch venue: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Eventbrite venue:', error);
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
    const mappedCategory = this.mapCategoryToEventbrite(category);
    
    // Get events with category filter
    const { total: withCategory } = await this.getEvents({
      location: city,
      location_radius: '50km',
      start_date: `${startDate}T00:00:00`,
      end_date: `${endDate}T23:59:59`,
      categories: mappedCategory,
      page_size: 200,
      page: 1,
    });

    // Get events without category filter
    const { total: withoutCategory } = await this.getEvents({
      location: city,
      location_radius: '50km',
      start_date: `${startDate}T00:00:00`,
      end_date: `${endDate}T23:59:59`,
      page_size: 200,
      page: 1,
    });

    const effectiveness = withoutCategory > 0 ? (withCategory / withoutCategory) * 100 : 0;

    console.log(`🎫 Eventbrite Category Test for "${category}":`);
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

    const mappedCategory = this.mapCategoryToEventbrite(category);
    
    // If we have a specific mapping, try it first
    if (mappedCategory) {
      try {
        const events = await this.getEventsForCity(city, startDate, endDate, category);
        
        // If we got a reasonable number of events, return them
        if (events.length >= 5) {
          console.log(`🎫 Eventbrite: Found ${events.length} events for "${category}" using category ID "${mappedCategory}"`);
          return events;
        }
        
        console.log(`🎫 Eventbrite: Only ${events.length} events found for "${category}" with category ID "${mappedCategory}", trying broader search`);
      } catch (error) {
        console.log(`🎫 Eventbrite: Error with category "${category}": ${error}, trying broader search`);
      }
    }

    // Fallback to broader search without category filter
    console.log(`🎫 Eventbrite: Using broader search for "${category}"`);
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
        console.log(`🎫 Eventbrite: Strategy 1 - Exact city match with category "${category}"`);
        const categoryEvents = await this.getEventsForCity(city, startDate, endDate, category);
        this.addUniqueEvents(allEvents, categoryEvents, seenEvents);
        
        if (allEvents.length >= 10) {
          console.log(`🎫 Eventbrite: Found ${allEvents.length} events with exact city match, returning early`);
          return allEvents;
        }
      } catch (error) {
        console.log(`🎫 Eventbrite: Strategy 1 failed: ${error}`);
      }
    }

    // Strategy 2: Exact city match without category
    try {
      console.log(`🎫 Eventbrite: Strategy 2 - Exact city match without category`);
      const cityEvents = await this.getEventsForCity(city, startDate, endDate);
      this.addUniqueEvents(allEvents, cityEvents, seenEvents);
      
      if (allEvents.length >= 15) {
        console.log(`🎫 Eventbrite: Found ${allEvents.length} events with exact city match, returning early`);
        return allEvents;
      }
    } catch (error) {
      console.log(`🎫 Eventbrite: Strategy 2 failed: ${error}`);
    }

    // Strategy 3: Radius search with category
    if (category) {
      try {
        console.log(`🎫 Eventbrite: Strategy 3 - Radius search (${radius}) with category "${category}"`);
        const radiusCategoryEvents = await this.getEventsWithRadius(city, startDate, endDate, radius, category);
        this.addUniqueEvents(allEvents, radiusCategoryEvents, seenEvents);
        
        if (allEvents.length >= 20) {
          console.log(`🎫 Eventbrite: Found ${allEvents.length} events with radius search, returning early`);
          return allEvents;
        }
      } catch (error) {
        console.log(`🎫 Eventbrite: Strategy 3 failed: ${error}`);
      }
    }

    // Strategy 4: Radius search without category
    try {
      console.log(`🎫 Eventbrite: Strategy 4 - Radius search (${radius}) without category`);
      const radiusEvents = await this.getEventsWithRadius(city, startDate, endDate, radius);
      this.addUniqueEvents(allEvents, radiusEvents, seenEvents);
    } catch (error) {
      console.log(`🎫 Eventbrite: Strategy 4 failed: ${error}`);
    }

    // Strategy 5: Extended radius search (100km) for broader coverage
    try {
      console.log(`🎫 Eventbrite: Strategy 5 - Extended radius search (100km)`);
      const extendedRadiusEvents = await this.getEventsWithRadius(city, startDate, endDate, '100km', category);
      this.addUniqueEvents(allEvents, extendedRadiusEvents, seenEvents);
    } catch (error) {
      console.log(`🎫 Eventbrite: Strategy 5 failed: ${error}`);
    }

    console.log(`🎫 Eventbrite: Comprehensive fallback completed - found ${allEvents.length} unique events`);
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

export const eventbriteService = new EventbriteService();
