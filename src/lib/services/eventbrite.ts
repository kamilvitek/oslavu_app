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
  private readonly apiKey: string;
  private readonly baseUrl = 'https://www.eventbriteapi.com/v3';

  constructor() {
    this.apiKey = process.env.EVENTBRITE_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('EVENTBRITE_API_KEY environment variable is required');
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
        token: this.apiKey,
        page_size: (params.page_size || 50).toString(),
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
          'Authorization': `Bearer ${this.apiKey}`,
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
   * Get events for a specific city and date range
   */
  async getEventsForCity(
    city: string,
    startDate: string,
    endDate: string,
    category?: string
  ): Promise<Event[]> {
    const { events } = await this.getEvents({
      location: city,
      location_radius: '50km',
      start_date: `${startDate}T00:00:00`,
      end_date: `${endDate}T23:59:59`,
      categories: category ? this.mapCategoryToEventbrite(category) : undefined,
      page_size: 200,
    });

    return events;
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
      page_size: 200,
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
   */
  private mapCategoryToEventbrite(category: string): string {
    const categoryMap: Record<string, string> = {
      'Technology': '102', // Science & Technology
      'Business': '101', // Business & Professional
      'Marketing': '101', // Business & Professional
      'Healthcare': '108', // Health & Wellness
      'Education': '110', // Education
      'Finance': '101', // Business & Professional
      'Entertainment': '103', // Music
      'Sports': '108', // Health & Wellness (closest to sports)
      'Arts & Culture': '105', // Arts
      'Other': '199', // Other
    };

    return categoryMap[category] || '199';
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
      const url = `${this.baseUrl}/categories/?token=${this.apiKey}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
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
      const url = `${this.baseUrl}/events/${eventId}/?token=${this.apiKey}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
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
      const url = `${this.baseUrl}/venues/${venueId}/?token=${this.apiKey}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
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
}

export const eventbriteService = new EventbriteService();
