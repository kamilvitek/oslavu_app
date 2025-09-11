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
      if (!params.limit) searchParams.append('limit', '200');
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
   * Get events for a specific city and date range
   */
  async getEventsForCity(
    city: string,
    startDate: string,
    endDate: string,
    category?: string
  ): Promise<Event[]> {
    // Try multiple location parameters for better results
    const locationParams = this.getCityLocationParams(city);
    
    const { events } = await this.getEvents({
      ...locationParams,
      'start.gte': `${startDate}T00:00:00`,
      'start.lte': `${endDate}T23:59:59`,
      category: category ? this.mapCategoryToPredictHQ(category) : undefined,
      limit: 200,
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
      city,
      'start.gte': startDate ? `${startDate}T00:00:00` : undefined,
      'start.lte': endDate ? `${endDate}T23:59:59` : undefined,
      limit: 200,
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
      limit: 200,
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
   */
  private mapCategoryToPredictHQ(category: string): string {
    const categoryMap: Record<string, string> = {
      'Technology': 'conferences',
      'Business': 'conferences',
      'Marketing': 'conferences',
      'Healthcare': 'conferences',
      'Education': 'conferences',
      'Finance': 'conferences',
      'Entertainment': 'concerts',
      'Sports': 'sports',
      'Arts & Culture': 'festivals',
      'Other': 'community',
    };

    return categoryMap[category] || 'community';
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
      limit: 200,
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
      limit: 200,
    });

    return events;
  }
}

export const predicthqService = new PredictHQService();
