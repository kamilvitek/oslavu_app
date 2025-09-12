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
   */
  private mapCategoryToTicketmaster(category: string): string {
    const categoryMap: Record<string, string> = {
      'Technology': 'Miscellaneous',
      'Business': 'Miscellaneous',
      'Marketing': 'Miscellaneous',
      'Healthcare': 'Miscellaneous',
      'Education': 'Miscellaneous',
      'Finance': 'Miscellaneous',
      'Entertainment': 'Arts & Theatre',
      'Sports': 'Sports',
      'Arts & Culture': 'Arts & Theatre',
    };

    return categoryMap[category] || 'Miscellaneous';
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
    };

    return cityCountryMap[city] || 'US';
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
}

export const ticketmasterService = new TicketmasterService();