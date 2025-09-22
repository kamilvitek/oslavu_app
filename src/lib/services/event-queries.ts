import { DatabaseService, serverDatabaseService } from '@/lib/supabase';
import { 
  DatabaseEvent, 
  EventQuery, 
  EventSearchParams,
  EventAnalytics,
  ConflictScore,
  ConflictingEvent
} from '@/lib/types/events';

/**
 * Advanced query utilities for event data analysis and conflict detection
 */
export class EventQueryService {
  private db: DatabaseService;

  constructor(databaseService?: DatabaseService) {
    this.db = databaseService || serverDatabaseService;
  }

  /**
   * Get events for conflict analysis
   */
  async getEventsForConflictAnalysis(
    city: string,
    startDate: string,
    endDate: string,
    category?: string,
    minAttendees: number = 100
  ): Promise<DatabaseEvent[]> {
    try {
      let query = this.db.getClient()
        .from('events')
        .select('*')
        .eq('city', city)
        .gte('date', startDate)
        .lte('date', endDate)
        .gte('expected_attendees', minAttendees)
        .order('date', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await this.db.executeWithRetry(() => query);

      if (error) {
        throw new Error(`Failed to fetch events for conflict analysis: ${error.message}`);
      }

      return data as DatabaseEvent[] || [];
    } catch (error) {
      console.error('Error fetching events for conflict analysis:', error);
      throw error;
    }
  }

  /**
   * Get high-impact events (events with high attendance)
   */
  async getHighImpactEvents(
    city: string,
    startDate: string,
    endDate: string,
    minAttendees: number = 1000,
    limit: number = 50
  ): Promise<DatabaseEvent[]> {
    try {
      const { data, error } = await this.db.executeWithRetry(() =>
        this.db.getClient()
          .from('events')
          .select('*')
          .eq('city', city)
          .gte('date', startDate)
          .lte('date', endDate)
          .gte('expected_attendees', minAttendees)
          .order('expected_attendees', { ascending: false })
          .limit(limit)
      );

      if (error) {
        throw new Error(`Failed to fetch high-impact events: ${error.message}`);
      }

      return data as DatabaseEvent[] || [];
    } catch (error) {
      console.error('Error fetching high-impact events:', error);
      throw error;
    }
  }

  /**
   * Get events by venue
   */
  async getEventsByVenue(
    venue: string,
    city?: string,
    startDate?: string,
    endDate?: string,
    limit: number = 50
  ): Promise<DatabaseEvent[]> {
    try {
      let query = this.db.getClient()
        .from('events')
        .select('*')
        .ilike('venue', `%${venue}%`)
        .order('date', { ascending: true })
        .limit(limit);

      if (city) {
        query = query.eq('city', city);
      }

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await this.db.executeWithRetry(() => query);

      if (error) {
        throw new Error(`Failed to fetch events by venue: ${error.message}`);
      }

      return data as DatabaseEvent[] || [];
    } catch (error) {
      console.error('Error fetching events by venue:', error);
      throw error;
    }
  }

  /**
   * Get events by source
   */
  async getEventsBySource(
    source: string,
    city?: string,
    startDate?: string,
    endDate?: string,
    limit: number = 50
  ): Promise<DatabaseEvent[]> {
    try {
      let query = this.db.getClient()
        .from('events')
        .select('*')
        .eq('source', source)
        .order('date', { ascending: true })
        .limit(limit);

      if (city) {
        query = query.eq('city', city);
      }

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await this.db.executeWithRetry(() => query);

      if (error) {
        throw new Error(`Failed to fetch events by source: ${error.message}`);
      }

      return data as DatabaseEvent[] || [];
    } catch (error) {
      console.error('Error fetching events by source:', error);
      throw error;
    }
  }

  /**
   * Get upcoming events (next 30 days)
   */
  async getUpcomingEvents(
    city: string,
    category?: string,
    limit: number = 50
  ): Promise<DatabaseEvent[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const futureDate = thirtyDaysFromNow.toISOString().split('T')[0];

      let query = this.db.getClient()
        .from('events')
        .select('*')
        .eq('city', city)
        .gte('date', today)
        .lte('date', futureDate)
        .order('date', { ascending: true })
        .limit(limit);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await this.db.executeWithRetry(() => query);

      if (error) {
        throw new Error(`Failed to fetch upcoming events: ${error.message}`);
      }

      return data as DatabaseEvent[] || [];
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      throw error;
    }
  }

  /**
   * Get events with similar categories
   */
  async getSimilarEvents(
    eventId: string,
    limit: number = 10
  ): Promise<DatabaseEvent[]> {
    try {
      // First get the original event
      const { data: originalEvent, error: fetchError } = await this.db.executeWithRetry(() =>
        this.db.getClient()
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single()
      );

      if (fetchError || !originalEvent) {
        throw new Error('Original event not found');
      }

      // Find similar events
      const { data, error } = await this.db.executeWithRetry(() =>
        this.db.getClient()
          .from('events')
          .select('*')
          .eq('category', originalEvent.category)
          .eq('city', originalEvent.city)
          .neq('id', eventId)
          .order('date', { ascending: true })
          .limit(limit)
      );

      if (error) {
        throw new Error(`Failed to fetch similar events: ${error.message}`);
      }

      return data as DatabaseEvent[] || [];
    } catch (error) {
      console.error('Error fetching similar events:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive event analytics
   */
  async getEventAnalytics(
    city?: string,
    startDate?: string,
    endDate?: string
  ): Promise<EventAnalytics> {
    try {
      // Build base query
      let baseQuery = this.db.getClient().from('events');
      
      if (city) {
        baseQuery = baseQuery.eq('city', city);
      }
      
      if (startDate) {
        baseQuery = baseQuery.gte('date', startDate);
      }
      
      if (endDate) {
        baseQuery = baseQuery.lte('date', endDate);
      }

      // Execute multiple queries in parallel
      const [
        totalResult,
        venuesResult,
        citiesResult,
        categoriesResult,
        sourcesResult,
        dateRangeResult
      ] = await Promise.all([
        baseQuery.select('count', { count: 'exact' }),
        baseQuery.select('venue').not('venue', 'is', null),
        baseQuery.select('city'),
        baseQuery.select('category'),
        baseQuery.select('source'),
        baseQuery.select('date').order('date', { ascending: true })
      ]);

      // Process results
      const uniqueVenues = new Set(venuesResult.data?.map(event => event.venue).filter(Boolean) || []);
      const uniqueCities = new Set(citiesResult.data?.map(event => event.city) || []);
      
      const categoryCounts: Record<string, number> = {};
      categoriesResult.data?.forEach(event => {
        categoryCounts[event.category] = (categoryCounts[event.category] || 0) + 1;
      });

      const cityCounts: Record<string, number> = {};
      citiesResult.data?.forEach(event => {
        cityCounts[event.city] = (cityCounts[event.city] || 0) + 1;
      });

      const venueCounts: Record<string, number> = {};
      venuesResult.data?.forEach(event => {
        if (event.venue) {
          venueCounts[event.venue] = (venueCounts[event.venue] || 0) + 1;
        }
      });

      const sourceCounts: Record<string, number> = {};
      sourcesResult.data?.forEach(event => {
        sourceCounts[event.source] = (sourceCounts[event.source] || 0) + 1;
      });

      const dates = dateRangeResult.data?.map(event => event.date).sort() || [];
      const earliest = dates[0] || null;
      const latest = dates[dates.length - 1] || null;

      // Convert to arrays and sort
      const topCategories = Object.entries(categoryCounts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const topCities = Object.entries(cityCounts)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const topVenues = Object.entries(venueCounts)
        .map(([venue, count]) => ({ venue, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const sourceDistribution = Object.entries(sourceCounts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);

      return {
        total_events: totalResult.count || 0,
        unique_venues: uniqueVenues.size,
        unique_cities: uniqueCities.size,
        date_range: {
          earliest: earliest || '',
          latest: latest || ''
        },
        top_categories: topCategories,
        top_cities: topCities,
        top_venues: topVenues,
        source_distribution: sourceDistribution
      };
    } catch (error) {
      console.error('Error getting event analytics:', error);
      throw error;
    }
  }

  /**
   * Detect potential conflicts for a specific date and category
   */
  async detectConflicts(
    city: string,
    date: string,
    category: string,
    expectedAttendees: number = 100
  ): Promise<ConflictScore> {
    try {
      // Get events on the same date in the same city and category
      const { data, error } = await this.db.executeWithRetry(() =>
        this.db.getClient()
          .from('events')
          .select('*')
          .eq('city', city)
          .eq('date', date)
          .eq('category', category)
      );

      if (error) {
        throw new Error(`Failed to detect conflicts: ${error.message}`);
      }

      const conflictingEvents = data as DatabaseEvent[] || [];
      const conflictingEventDetails: ConflictingEvent[] = [];
      let totalImpact = 0;

      // Calculate conflict impact for each conflicting event
      for (const event of conflictingEvents) {
        const attendees = event.expected_attendees || 0;
        const impact = this.calculateConflictImpact(attendees, expectedAttendees);
        
        if (impact > 0) {
          conflictingEventDetails.push({
            id: event.id,
            title: event.title,
            date: event.date,
            category: event.category,
            expected_attendees: attendees,
            impact,
            reason: this.getConflictReason(attendees, expectedAttendees)
          });
          
          totalImpact += impact;
        }
      }

      // Calculate overall conflict score (0-20 scale)
      const conflictScore = Math.min(20, Math.round(totalImpact / 5));
      
      // Determine risk level
      let risk: 'low' | 'medium' | 'high';
      if (conflictScore <= 5) {
        risk = 'low';
      } else if (conflictScore <= 12) {
        risk = 'medium';
      } else {
        risk = 'high';
      }

      // Generate recommendation
      const recommendation = this.generateConflictRecommendation(conflictScore, conflictingEventDetails);

      return {
        date,
        score: conflictScore,
        risk,
        conflicting_events: conflictingEventDetails,
        recommendation
      };
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      throw error;
    }
  }

  /**
   * Calculate conflict impact between two events
   */
  private calculateConflictImpact(
    existingAttendees: number,
    newEventAttendees: number
  ): number {
    if (existingAttendees === 0 || newEventAttendees === 0) {
      return 0;
    }

    // Calculate overlap potential based on attendee numbers
    const smallerEvent = Math.min(existingAttendees, newEventAttendees);
    const largerEvent = Math.max(existingAttendees, newEventAttendees);
    
    // Base impact from size difference
    let impact = (smallerEvent / largerEvent) * 50;
    
    // Increase impact for high-attendance events
    if (existingAttendees >= 1000 || newEventAttendees >= 1000) {
      impact *= 1.5;
    }
    
    // Cap at 100
    return Math.min(100, Math.round(impact));
  }

  /**
   * Get conflict reason description
   */
  private getConflictReason(existingAttendees: number, newEventAttendees: number): string {
    if (existingAttendees >= 1000 && newEventAttendees >= 1000) {
      return 'Both events have high attendance, potential audience overlap';
    } else if (existingAttendees >= 500 || newEventAttendees >= 500) {
      return 'One or both events have significant attendance';
    } else {
      return 'Events may compete for the same audience';
    }
  }

  /**
   * Generate conflict recommendation
   */
  private generateConflictRecommendation(
    score: number,
    conflictingEvents: ConflictingEvent[]
  ): string {
    if (score === 0) {
      return 'No conflicts detected. This date looks good for your event.';
    } else if (score <= 5) {
      return 'Low conflict risk. Consider proceeding with your event.';
    } else if (score <= 12) {
      return 'Medium conflict risk. Consider alternative dates or venues.';
    } else {
      const highImpactEvents = conflictingEvents.filter(event => event.impact >= 50);
      return `High conflict risk. ${highImpactEvents.length} major event(s) on this date. Strongly consider alternative dates.`;
    }
  }

  /**
   * Get events with attendance predictions
   */
  async getEventsWithAttendancePredictions(
    city: string,
    startDate: string,
    endDate: string,
    minPredictedAttendees: number = 100
  ): Promise<DatabaseEvent[]> {
    try {
      const { data, error } = await this.db.executeWithRetry(() =>
        this.db.getClient()
          .from('events')
          .select('*')
          .eq('city', city)
          .gte('date', startDate)
          .lte('date', endDate)
          .gte('expected_attendees', minPredictedAttendees)
          .not('expected_attendees', 'is', null)
          .order('expected_attendees', { ascending: false })
      );

      if (error) {
        throw new Error(`Failed to fetch events with attendance predictions: ${error.message}`);
      }

      return data as DatabaseEvent[] || [];
    } catch (error) {
      console.error('Error fetching events with attendance predictions:', error);
      throw error;
    }
  }

  /**
   * Get venue popularity analysis
   */
  async getVenuePopularity(
    city: string,
    startDate?: string,
    endDate?: string
  ): Promise<Array<{ venue: string; event_count: number; total_attendees: number; avg_attendees: number }>> {
    try {
      let query = this.db.getClient()
        .from('events')
        .select('venue, expected_attendees')
        .eq('city', city)
        .not('venue', 'is', null);

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await this.db.executeWithRetry(() => query);

      if (error) {
        throw new Error(`Failed to fetch venue popularity: ${error.message}`);
      }

      // Process venue data
      const venueStats: Record<string, { count: number; totalAttendees: number }> = {};
      
      data?.forEach(event => {
        if (event.venue) {
          if (!venueStats[event.venue]) {
            venueStats[event.venue] = { count: 0, totalAttendees: 0 };
          }
          venueStats[event.venue].count++;
          venueStats[event.venue].totalAttendees += event.expected_attendees || 0;
        }
      });

      // Convert to array and calculate averages
      return Object.entries(venueStats)
        .map(([venue, stats]) => ({
          venue,
          event_count: stats.count,
          total_attendees: stats.totalAttendees,
          avg_attendees: Math.round(stats.totalAttendees / stats.count)
        }))
        .sort((a, b) => b.event_count - a.event_count);
    } catch (error) {
      console.error('Error getting venue popularity:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const eventQueryService = new EventQueryService();
