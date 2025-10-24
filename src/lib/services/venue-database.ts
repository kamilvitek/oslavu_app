// src/lib/services/venue-database.ts
import { serverDatabaseService } from '@/lib/supabase';

export interface VenueData {
  id: string;
  name: string;
  normalized_name: string;
  city: string;
  country: string;
  capacity: number;
  capacity_standing?: number;
  capacity_seated?: number;
  capacity_source: 'official' | 'estimated' | 'user_reported';
  capacity_verified: boolean;
  capacity_verified_at?: string;
  venue_type?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  website?: string;
  average_attendance?: number;
  typical_utilization?: number;
  events_hosted: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  data_source: 'manual' | 'api' | 'scraper' | 'user_contribution';
}

export interface VenueInput {
  name: string;
  city: string;
  country?: string;
  capacity: number;
  capacity_standing?: number;
  capacity_seated?: number;
  capacity_source: 'official' | 'estimated' | 'user_reported';
  venue_type?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  website?: string;
  data_source: 'manual' | 'api' | 'scraper' | 'user_contribution';
}

export interface VenueStats {
  totalEvents: number;
  averageAttendance: number;
  typicalUtilization: number;
  capacityUtilization: number;
  lastEventDate?: string;
  mostCommonCategory?: string;
}

export class VenueDatabaseService {
  private db = serverDatabaseService;

  /**
   * Lookup venue by name and city
   */
  async lookupVenue(venueName: string, city?: string): Promise<VenueData | null> {
    try {
      const normalizedName = this.normalizeVenueName(venueName);
      
      let query = this.db.getClient()
        .from('venues')
        .select('*')
        .eq('normalized_name', normalizedName);

      if (city) {
        query = query.eq('city', city);
      }

      const { data, error } = await this.db.executeWithRetry(async () => {
        const result = await query;
        return result;
      });

      if (error) {
        console.error('Error looking up venue:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      return this.transformVenueData(data[0]);
    } catch (error) {
      console.error('Error in venue lookup:', error);
      return null;
    }
  }

  /**
   * Add new venue to database
   */
  async addVenue(venueData: VenueInput): Promise<VenueData> {
    try {
      const normalizedName = this.normalizeVenueName(venueData.name);
      
      const venueRecord = {
        name: venueData.name,
        normalized_name: normalizedName,
        city: venueData.city,
        country: venueData.country || 'Czech Republic',
        capacity: venueData.capacity,
        capacity_standing: venueData.capacity_standing,
        capacity_seated: venueData.capacity_seated,
        capacity_source: venueData.capacity_source,
        venue_type: venueData.venue_type,
        address: venueData.address,
        coordinates: venueData.coordinates ? 
          `POINT(${venueData.coordinates.lng} ${venueData.coordinates.lat})` : null,
        website: venueData.website,
        data_source: venueData.data_source,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('venues')
          .insert(venueRecord)
          .select()
          .single();
        return result;
      });

      if (error) {
        throw new Error(`Failed to add venue: ${error.message}`);
      }

      return this.transformVenueData(data);
    } catch (error) {
      console.error('Error adding venue:', error);
      throw error;
    }
  }

  /**
   * Update venue capacity
   */
  async updateVenueCapacity(
    venueId: string, 
    capacity: number, 
    source: string
  ): Promise<void> {
    try {
      const { error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('venues')
          .update({
            capacity,
            capacity_source: source,
            updated_at: new Date().toISOString()
          })
          .eq('id', venueId);
        return result;
      });

      if (error) {
        throw new Error(`Failed to update venue capacity: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating venue capacity:', error);
      throw error;
    }
  }

  /**
   * Search venues by query
   */
  async searchVenues(query: string, city?: string): Promise<VenueData[]> {
    try {
      let dbQuery = this.db.getClient()
        .from('venues')
        .select('*')
        .or(`name.ilike.%${query}%,normalized_name.ilike.%${query}%`);

      if (city) {
        dbQuery = dbQuery.eq('city', city);
      }

      const { data, error } = await this.db.executeWithRetry(async () => {
        const result = await dbQuery.limit(20);
        return result;
      });

      if (error) {
        console.error('Error searching venues:', error);
        return [];
      }

      return (data || []).map(venue => this.transformVenueData(venue));
    } catch (error) {
      console.error('Error in venue search:', error);
      return [];
    }
  }

  /**
   * Get venue statistics
   */
  async getVenueStats(venueId: string): Promise<VenueStats> {
    try {
      // Get venue info
      const { data: venueData, error: venueError } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('venues')
          .select('name, capacity, average_attendance, typical_utilization')
          .eq('id', venueId)
          .single();
        return result;
      });

      if (venueError || !venueData) {
        throw new Error('Venue not found');
      }

      // Get event statistics
      const { data: eventData, error: eventError } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('events')
          .select('expected_attendees, category, date')
          .eq('venue', venueData.name)
          .not('expected_attendees', 'is', null);
        return result;
      });

      if (eventError) {
        console.warn('Error fetching event statistics:', eventError);
      }

      const events = eventData || [];
      const totalEvents = events.length;
      const averageAttendance = events.length > 0 
        ? Math.round(events.reduce((sum, event) => sum + (event.expected_attendees || 0), 0) / events.length)
        : 0;
      
      const typicalUtilization = venueData.typical_utilization || 0.7;
      const capacityUtilization = venueData.capacity > 0 
        ? averageAttendance / venueData.capacity 
        : 0;

      const lastEventDate = events.length > 0 
        ? events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
        : undefined;

      // Find most common category
      const categoryCounts: Record<string, number> = {};
      events.forEach(event => {
        if (event.category) {
          categoryCounts[event.category] = (categoryCounts[event.category] || 0) + 1;
        }
      });
      
      const mostCommonCategory = Object.keys(categoryCounts).length > 0
        ? Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b)
        : undefined;

      return {
        totalEvents,
        averageAttendance,
        typicalUtilization,
        capacityUtilization,
        lastEventDate,
        mostCommonCategory
      };
    } catch (error) {
      console.error('Error getting venue stats:', error);
      throw error;
    }
  }

  /**
   * Get all venues for a city
   */
  async getVenuesByCity(city: string): Promise<VenueData[]> {
    try {
      const { data, error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('venues')
          .select('*')
          .eq('city', city)
          .order('capacity', { ascending: false });
        return result;
      });

      if (error) {
        console.error('Error getting venues by city:', error);
        return [];
      }

      return (data || []).map(venue => this.transformVenueData(venue));
    } catch (error) {
      console.error('Error in getVenuesByCity:', error);
      return [];
    }
  }

  /**
   * Update venue statistics after event
   */
  async updateVenueStats(venueId: string, actualAttendance: number): Promise<void> {
    try {
      // Get current venue data
      const { data: venueData, error: fetchError } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('venues')
          .select('average_attendance, events_hosted, capacity')
          .eq('id', venueId)
          .single();
        return result;
      });

      if (fetchError || !venueData) {
        throw new Error('Venue not found');
      }

      // Calculate new averages
      const currentAverage = venueData.average_attendance || 0;
      const currentEvents = venueData.events_hosted || 0;
      const newEvents = currentEvents + 1;
      const newAverage = Math.round(
        (currentAverage * currentEvents + actualAttendance) / newEvents
      );

      const newUtilization = venueData.capacity > 0 
        ? newAverage / venueData.capacity 
        : 0;

      // Update venue
      const { error: updateError } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('venues')
          .update({
            average_attendance: newAverage,
            typical_utilization: Math.min(newUtilization, 1.0),
            events_hosted: newEvents,
            updated_at: new Date().toISOString()
          })
          .eq('id', venueId);
        return result;
      });

      if (updateError) {
        throw new Error(`Failed to update venue stats: ${updateError.message}`);
      }
    } catch (error) {
      console.error('Error updating venue stats:', error);
      throw error;
    }
  }

  /**
   * Normalize venue name for consistent lookup
   */
  private normalizeVenueName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Transform database venue data to VenueData interface
   */
  private transformVenueData(dbVenue: any): VenueData {
    return {
      id: dbVenue.id,
      name: dbVenue.name,
      normalized_name: dbVenue.normalized_name,
      city: dbVenue.city,
      country: dbVenue.country,
      capacity: dbVenue.capacity,
      capacity_standing: dbVenue.capacity_standing,
      capacity_seated: dbVenue.capacity_seated,
      capacity_source: dbVenue.capacity_source,
      capacity_verified: dbVenue.capacity_verified,
      capacity_verified_at: dbVenue.capacity_verified_at,
      venue_type: dbVenue.venue_type,
      address: dbVenue.address,
      coordinates: dbVenue.coordinates ? this.parseCoordinates(dbVenue.coordinates) : undefined,
      website: dbVenue.website,
      average_attendance: dbVenue.average_attendance,
      typical_utilization: dbVenue.typical_utilization,
      events_hosted: dbVenue.events_hosted,
      created_at: dbVenue.created_at,
      updated_at: dbVenue.updated_at,
      created_by: dbVenue.created_by,
      data_source: dbVenue.data_source
    };
  }

  /**
   * Parse PostGIS POINT coordinates
   */
  private parseCoordinates(coordinates: string): { lat: number; lng: number } | undefined {
    try {
      // Parse POINT(lng lat) format
      const match = coordinates.match(/POINT\(([^)]+)\)/);
      if (match) {
        const [lng, lat] = match[1].split(' ').map(Number);
        return { lat, lng };
      }
    } catch (error) {
      console.warn('Error parsing coordinates:', error);
    }
    return undefined;
  }
}

// Export singleton instance
export const venueDatabaseService = new VenueDatabaseService();
