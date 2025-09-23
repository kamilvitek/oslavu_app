import { DatabaseService, serverDatabaseService } from '@/lib/supabase';
import { 
  DatabaseEvent, 
  CreateEventData, 
  UpdateEventData, 
  EventQuery, 
  EventSearchParams,
  EventStats,
  EventAnalytics,
  UpsertResult,
  BatchOperationResult,
  EventQuerySchema,
  EventSearchSchema
} from '@/lib/types/events';
import { dataTransformer } from './data-transformer';

/**
 * Event storage service for managing events in the database
 */
export class EventStorageService {
  private db: DatabaseService;

  constructor(databaseService?: DatabaseService) {
    this.db = databaseService || serverDatabaseService;
  }

  /**
   * Save events with upsert logic and duplicate prevention
   */
  async saveEvents(events: CreateEventData[]): Promise<UpsertResult> {
    const result: UpsertResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    if (events.length === 0) {
      return result;
    }

    try {
      // Validate and transform events
      const validatedEvents: CreateEventData[] = [];
      for (const event of events) {
        const validation = dataTransformer.validateEventData(event);
        if (validation.isValid) {
          validatedEvents.push(validation.sanitizedData);
        } else {
          result.errors.push(`Validation failed for event "${event.title}": ${validation.errors.join(', ')}`);
          result.skipped++;
        }
      }

      if (validatedEvents.length === 0) {
        return result;
      }

      // Process events in batches to avoid overwhelming the database
      const batchSize = 100;
      const batches = this.chunkArray(validatedEvents, batchSize);

      for (const batch of batches) {
        const batchResult = await this.processBatch(batch);
        result.created += batchResult.created;
        result.updated += batchResult.updated;
        result.skipped += batchResult.skipped;
        result.errors.push(...batchResult.errors);
      }

      return result;
    } catch (error) {
      console.error('Error saving events:', error);
      result.errors.push(`Batch save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Process a batch of events with upsert logic
   */
  private async processBatch(events: CreateEventData[]): Promise<UpsertResult> {
    const result: UpsertResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    try {
      // Get existing events by source_id to check for duplicates
      const sourceIds = events
        .filter(event => event.source_id)
        .map(event => event.source_id!);
      
      const existingEvents = sourceIds.length > 0 
        ? await this.getExistingEventsBySourceIds(sourceIds)
        : new Map();

      const eventsToInsert: CreateEventData[] = [];
      const eventsToUpdate: Array<{ id: string; data: UpdateEventData }> = [];

      for (const event of events) {
        if (event.source_id && existingEvents.has(event.source_id)) {
          // Event exists, prepare for update
          const existingEvent = existingEvents.get(event.source_id)!;
          const updateData = this.prepareUpdateData(event, existingEvent);
          
          if (Object.keys(updateData).length > 0) {
            eventsToUpdate.push({
              id: existingEvent.id,
              data: updateData
            });
          } else {
            result.skipped++;
          }
        } else {
          // New event, prepare for insert
          eventsToInsert.push(event);
        }
      }

      // Insert new events
      if (eventsToInsert.length > 0) {
        const insertResult = await this.insertEvents(eventsToInsert);
        result.created += insertResult.created;
        result.errors.push(...insertResult.errors);
      }

      // Update existing events
      if (eventsToUpdate.length > 0) {
        const updateResult = await this.updateEvents(eventsToUpdate);
        result.updated += updateResult.updated;
        result.errors.push(...updateResult.errors);
      }

      return result;
    } catch (error) {
      console.error('Error processing batch:', error);
      result.errors.push(`Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Get existing events by source IDs
   */
  private async getExistingEventsBySourceIds(sourceIds: string[]): Promise<Map<string, DatabaseEvent>> {
    try {
      const { data, error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('events')
          .select('*')
          .in('source_id', sourceIds);
        return result;
      });

      if (error) {
        throw new Error(`Failed to fetch existing events: ${error.message}`);
      }

      const eventMap = new Map<string, DatabaseEvent>();
      data?.forEach((event: any) => {
        if (event.source_id) {
          eventMap.set(event.source_id, event as DatabaseEvent);
        }
      });

      return eventMap;
    } catch (error) {
      console.error('Error fetching existing events:', error);
      return new Map();
    }
  }

  /**
   * Prepare update data by comparing new event with existing event
   */
  private prepareUpdateData(newEvent: CreateEventData, existingEvent: DatabaseEvent): UpdateEventData {
    const updateData: UpdateEventData = {};

    // Check if any fields have changed
    if (newEvent.title !== existingEvent.title) updateData.title = newEvent.title;
    if (newEvent.description !== existingEvent.description) updateData.description = newEvent.description;
    if (newEvent.date !== existingEvent.date) updateData.date = newEvent.date;
    if (newEvent.end_date !== existingEvent.end_date) updateData.end_date = newEvent.end_date;
    if (newEvent.city !== existingEvent.city) updateData.city = newEvent.city;
    if (newEvent.venue !== existingEvent.venue) updateData.venue = newEvent.venue;
    if (newEvent.category !== existingEvent.category) updateData.category = newEvent.category;
    if (newEvent.subcategory !== existingEvent.subcategory) updateData.subcategory = newEvent.subcategory;
    if (newEvent.expected_attendees !== existingEvent.expected_attendees) updateData.expected_attendees = newEvent.expected_attendees;
    if (newEvent.url !== existingEvent.url) updateData.url = newEvent.url;
    if (newEvent.image_url !== existingEvent.image_url) updateData.image_url = newEvent.image_url;

    // Always update the updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    return updateData;
  }

  /**
   * Insert new events
   */
  private async insertEvents(events: CreateEventData[]): Promise<{ created: number; errors: string[] }> {
    const result = { created: 0, errors: [] as string[] };

    try {
      const { data, error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('events')
          .insert(events.map(event => ({
            // Map CreateEventData fields to database columns (matching actual schema)
            title: event.title,
            description: event.description,
            date: event.date,
            end_date: event.end_date ? new Date(event.end_date).toISOString() : null,
            venue: event.venue,
            city: event.city,
            category: event.category,
            subcategory: event.subcategory,
            expected_attendees: event.expected_attendees,
            source: event.source,
            source_id: event.source_id,
            url: event.url,
            image_url: event.image_url,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })))
          .select();
        return result;
      });

      if (error) {
        throw new Error(`Failed to insert events: ${error.message}`);
      }

      result.created = data?.length || 0;
    } catch (error) {
      console.error('Error inserting events:', error);
      result.errors.push(`Insert failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Update existing events
   */
  private async updateEvents(updates: Array<{ id: string; data: UpdateEventData }>): Promise<{ updated: number; errors: string[] }> {
    const result = { updated: 0, errors: [] as string[] };

    try {
      // Update events one by one to handle individual failures
      for (const update of updates) {
        try {
          const { error } = await this.db.executeWithRetry(async () => {
            const result = await this.db.getClient()
              .from('events')
              .update(update.data)
              .eq('id', update.id);
            return result;
          });

          if (error) {
            result.errors.push(`Failed to update event ${update.id}: ${error.message}`);
          } else {
            result.updated++;
          }
        } catch (error) {
          result.errors.push(`Error updating event ${update.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error updating events:', error);
      result.errors.push(`Update batch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Get events by city with optional date filtering
   */
  async getEventsByCity(
    city: string,
    startDate?: string,
    endDate?: string,
    category?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<DatabaseEvent[]> {
    try {
      let query = this.db.getClient()
        .from('events')
        .select('*')
        .eq('city', city)
        .order('date', { ascending: true })
        .range(offset, offset + limit - 1);

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await this.db.executeWithRetry(async () => {
        const result = await query;
        return result;
      });

      if (error) {
        throw new Error(`Failed to fetch events: ${error.message}`);
      }

      return data as DatabaseEvent[] || [];
    } catch (error) {
      console.error('Error fetching events by city:', error);
      throw error;
    }
  }

  /**
   * Get events by category
   */
  async getEventsByCategory(
    category: string,
    city?: string,
    startDate?: string,
    endDate?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<DatabaseEvent[]> {
    try {
      let query = this.db.getClient()
        .from('events')
        .select('*')
        .eq('category', category)
        .order('date', { ascending: true })
        .range(offset, offset + limit - 1);

      if (city) {
        query = query.eq('city', city);
      }

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await this.db.executeWithRetry(async () => {
        const result = await query;
        return result;
      });

      if (error) {
        throw new Error(`Failed to fetch events by category: ${error.message}`);
      }

      return data as DatabaseEvent[] || [];
    } catch (error) {
      console.error('Error fetching events by category:', error);
      throw error;
    }
  }

  /**
   * Get events in date range
   */
  async getEventsInDateRange(
    startDate: string,
    endDate: string,
    city?: string,
    category?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<DatabaseEvent[]> {
    try {
      let query = this.db.getClient()
        .from('events')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .range(offset, offset + limit - 1);

      if (city) {
        query = query.eq('city', city);
      }

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await this.db.executeWithRetry(async () => {
        const result = await query;
        return result;
      });

      if (error) {
        throw new Error(`Failed to fetch events in date range: ${error.message}`);
      }

      return data as DatabaseEvent[] || [];
    } catch (error) {
      console.error('Error fetching events in date range:', error);
      throw error;
    }
  }

  /**
   * Search events with advanced filtering
   */
  async searchEvents(params: EventSearchParams): Promise<DatabaseEvent[]> {
    try {
      // Validate search parameters
      const validatedParams = EventSearchSchema.parse(params);

      let query = this.db.getClient()
        .from('events')
        .select('*')
        .order('date', { ascending: true })
        .range(validatedParams.offset, validatedParams.offset + validatedParams.limit - 1);

      // Apply filters
      if (validatedParams.query) {
        query = query.or(`title.ilike.%${validatedParams.query}%,description.ilike.%${validatedParams.query}%`);
      }

      if (validatedParams.city) {
        query = query.eq('city', validatedParams.city);
      }

      if (validatedParams.category) {
        query = query.eq('category', validatedParams.category);
      }

      if (validatedParams.source) {
        query = query.eq('source', validatedParams.source);
      }

      if (validatedParams.start_date) {
        query = query.gte('date', validatedParams.start_date);
      }

      if (validatedParams.end_date) {
        query = query.lte('date', validatedParams.end_date);
      }

      if (validatedParams.min_attendees !== undefined) {
        query = query.gte('expected_attendees', validatedParams.min_attendees);
      }

      if (validatedParams.max_attendees !== undefined) {
        query = query.lte('expected_attendees', validatedParams.max_attendees);
      }

      const { data, error } = await this.db.executeWithRetry(async () => {
        const result = await query;
        return result;
      });

      if (error) {
        throw new Error(`Failed to search events: ${error.message}`);
      }

      return data as DatabaseEvent[] || [];
    } catch (error) {
      console.error('Error searching events:', error);
      throw error;
    }
  }

  /**
   * Delete old events (cleanup)
   */
  async deleteOldEvents(olderThanDays: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      const cutoffDateString = cutoffDate.toISOString().split('T')[0];

      const { data, error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('events')
          .delete()
          .lt('date', cutoffDateString)
          .select('id');
        return result;
      });

      if (error) {
        throw new Error(`Failed to delete old events: ${error.message}`);
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error deleting old events:', error);
      throw error;
    }
  }

  /**
   * Get event statistics
   */
  async getEventStats(): Promise<EventStats> {
    try {
      const [totalResult, sourceResult, categoryResult, cityResult, monthResult, lastUpdatedResult, avgAttendeesResult, highImpactResult] = await Promise.all([
        this.db.getClient().from('events').select('count', { count: 'exact' }),
        this.db.getClient().from('events').select('source'),
        this.db.getClient().from('events').select('category'),
        this.db.getClient().from('events').select('city'),
        this.db.getClient().from('events').select('date'),
        this.db.getClient().from('events').select('updated_at').order('updated_at', { ascending: false }).limit(1),
        this.db.getClient().from('events').select('expected_attendees').not('expected_attendees', 'is', null),
        this.db.getClient().from('events').select('count', { count: 'exact' }).gte('expected_attendees', 1000)
      ]);

      // Process results
      const eventsBySource: Record<string, number> = {};
      sourceResult.data?.forEach(event => {
        eventsBySource[event.source] = (eventsBySource[event.source] || 0) + 1;
      });

      const eventsByCategory: Record<string, number> = {};
      categoryResult.data?.forEach(event => {
        eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1;
      });

      const eventsByCity: Record<string, number> = {};
      cityResult.data?.forEach(event => {
        eventsByCity[event.city] = (eventsByCity[event.city] || 0) + 1;
      });

      const eventsByMonth: Record<string, number> = {};
      monthResult.data?.forEach(event => {
        const month = event.date.substring(0, 7); // YYYY-MM format
        eventsByMonth[month] = (eventsByMonth[month] || 0) + 1;
      });

      // Calculate average attendees
      const attendees = avgAttendeesResult.data?.map(event => event.expected_attendees).filter(Boolean) || [];
      const averageAttendees = attendees.length > 0 
        ? attendees.reduce((sum, count) => sum + count, 0) / attendees.length 
        : 0;

      return {
        total_events: totalResult.count || 0,
        events_by_source: eventsBySource,
        events_by_category: eventsByCategory,
        events_by_city: eventsByCity,
        events_by_month: eventsByMonth,
        last_updated: lastUpdatedResult.data?.[0]?.updated_at || null,
        average_attendees: Math.round(averageAttendees),
        high_impact_events: highImpactResult.count || 0
      };
    } catch (error) {
      console.error('Error getting event stats:', error);
      throw error;
    }
  }

  /**
   * Get event by ID
   */
  async getEventById(id: string): Promise<DatabaseEvent | null> {
    try {
      const { data, error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('events')
          .select('*')
          .eq('id', id)
          .single();
        return result;
      });

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(`Failed to fetch event: ${error.message}`);
      }

      return data as DatabaseEvent;
    } catch (error) {
      console.error('Error fetching event by ID:', error);
      throw error;
    }
  }

  /**
   * Update a single event
   */
  async updateEvent(id: string, updateData: UpdateEventData): Promise<DatabaseEvent | null> {
    try {
      const { data, error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('events')
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();
        return result;
      });

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(`Failed to update event: ${error.message}`);
      }

      return data as DatabaseEvent;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(id: string): Promise<boolean> {
    try {
      const { error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('events')
          .delete()
          .eq('id', id);
        return result;
      });

      if (error) {
        throw new Error(`Failed to delete event: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  /**
   * Utility function to chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// Export singleton instance
export const eventStorageService = new EventStorageService();
