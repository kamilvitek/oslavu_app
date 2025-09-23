import { DatabaseService, serverDatabaseService } from '@/lib/supabase';
import { 
  SyncStatus, 
  SyncResult, 
  CreateEventData,
  UpsertResult 
} from '@/lib/types/events';
import { eventStorageService } from './event-storage';
import { dataTransformer } from './data-transformer';
import { ticketmasterService } from './ticketmaster';
import { predicthqService } from './predicthq';

/**
 * Data synchronization service for periodic data updates
 */
export class DataSyncService {
  private db: DatabaseService;
  private syncStatus: Map<string, SyncStatus> = new Map();
  private isRunning: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(databaseService?: DatabaseService) {
    this.db = databaseService || serverDatabaseService;
  }

  /**
   * Start automatic synchronization
   */
  startAutoSync(intervalMinutes: number = 60): void {
    if (this.isRunning) {
      console.log('Data sync is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting automatic data sync every ${intervalMinutes} minutes`);

    // Run initial sync
    this.performFullSync();

    // Set up interval
    this.syncInterval = setInterval(() => {
      this.performFullSync();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('Automatic data sync stopped');
  }

  /**
   * Perform full synchronization from all sources
   */
  async performFullSync(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    
    console.log('Starting full data synchronization...');
    
    try {
      // Sync from Ticketmaster
      const ticketmasterResult = await this.syncFromTicketmaster();
      results.push(ticketmasterResult);

      // Sync from PredictHQ
      const predicthqResult = await this.syncFromPredictHQ();
      results.push(predicthqResult);

      // Log overall results
      const totalProcessed = results.reduce((sum, r) => sum + r.events_processed, 0);
      const totalCreated = results.reduce((sum, r) => sum + r.events_created, 0);
      const totalUpdated = results.reduce((sum, r) => sum + r.events_updated, 0);
      const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

      console.log(`Full sync completed: ${totalProcessed} processed, ${totalCreated} created, ${totalUpdated} updated, ${totalErrors} errors`);
      
      return results;
    } catch (error) {
      console.error('Full sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync events from Ticketmaster
   */
  async syncFromTicketmaster(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      source: 'ticketmaster',
      success: false,
      events_processed: 0,
      events_created: 0,
      events_updated: 0,
      events_skipped: 0,
      errors: [],
      duration_ms: 0
    };

    try {
      console.log('Syncing events from Ticketmaster...');
      
      // Update sync status
      this.updateSyncStatus('ticketmaster', 'in_progress', 0, []);

      // Get events from major cities for the next 6 months
      const cities = ['Prague', 'Brno', 'Ostrava', 'Olomouc', 'Plzen'];
      const allEvents: CreateEventData[] = [];
      
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6);
      const endDateString = endDate.toISOString().split('T')[0];

      for (const city of cities) {
        try {
          console.log(`Fetching Ticketmaster events for ${city}...`);
          const events = await ticketmasterService.getEventsForCity(
            city,
            startDate,
            endDateString
          );

          // Transform events to standardized format
          for (const event of events) {
            try {
              const transformedEvent = dataTransformer.transformEvent('ticketmaster', event);
              allEvents.push(transformedEvent);
            } catch (error) {
              result.errors.push(`Failed to transform event "${event.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }

          console.log(`Found ${events.length} events for ${city}`);
        } catch (error) {
          result.errors.push(`Failed to fetch events for ${city}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      result.events_processed = allEvents.length;

      // Save events to database
      if (allEvents.length > 0) {
        const saveResult = await eventStorageService.saveEvents(allEvents);
        result.events_created = saveResult.created;
        result.events_updated = saveResult.updated;
        result.events_skipped = saveResult.skipped;
        result.errors.push(...saveResult.errors);
      }

      result.success = result.errors.length === 0;
      result.duration_ms = Date.now() - startTime;

      // Update sync status
      this.updateSyncStatus('ticketmaster', result.success ? 'success' : 'error', result.events_processed, result.errors);

      console.log(`Ticketmaster sync completed: ${result.events_processed} processed, ${result.events_created} created, ${result.events_updated} updated`);
      
      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Ticketmaster sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.duration_ms = Date.now() - startTime;

      this.updateSyncStatus('ticketmaster', 'error', result.events_processed, result.errors);
      
      console.error('Ticketmaster sync failed:', error);
      return result;
    }
  }

  /**
   * Sync events from PredictHQ
   */
  async syncFromPredictHQ(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      source: 'predicthq',
      success: false,
      events_processed: 0,
      events_created: 0,
      events_updated: 0,
      events_skipped: 0,
      errors: [],
      duration_ms: 0
    };

    try {
      console.log('Syncing events from PredictHQ...');
      
      // Update sync status
      this.updateSyncStatus('predicthq', 'in_progress', 0, []);

      // Get events from major cities for the next 6 months
      const cities = ['Prague', 'Brno', 'Ostrava', 'Olomouc', 'Plzen'];
      const allEvents: CreateEventData[] = [];
      
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6);
      const endDateString = endDate.toISOString().split('T')[0];

      for (const city of cities) {
        try {
          console.log(`Fetching PredictHQ events for ${city}...`);
          const events = await predicthqService.getEventsForCity(
            city,
            startDate,
            endDateString
          );

          // Transform events to standardized format
          for (const event of events) {
            try {
              const transformedEvent = dataTransformer.transformEvent('predicthq', event);
              allEvents.push(transformedEvent);
            } catch (error) {
              result.errors.push(`Failed to transform event "${event.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }

          console.log(`Found ${events.length} events for ${city}`);
        } catch (error) {
          result.errors.push(`Failed to fetch events for ${city}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      result.events_processed = allEvents.length;

      // Save events to database
      if (allEvents.length > 0) {
        const saveResult = await eventStorageService.saveEvents(allEvents);
        result.events_created = saveResult.created;
        result.events_updated = saveResult.updated;
        result.events_skipped = saveResult.skipped;
        result.errors.push(...saveResult.errors);
      }

      result.success = result.errors.length === 0;
      result.duration_ms = Date.now() - startTime;

      // Update sync status
      this.updateSyncStatus('predicthq', result.success ? 'success' : 'error', result.events_processed, result.errors);

      console.log(`PredictHQ sync completed: ${result.events_processed} processed, ${result.events_created} created, ${result.events_updated} updated`);
      
      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`PredictHQ sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.duration_ms = Date.now() - startTime;

      this.updateSyncStatus('predicthq', 'error', result.events_processed, result.errors);
      
      console.error('PredictHQ sync failed:', error);
      return result;
    }
  }

  /**
   * Sync events for a specific city and date range
   */
  async syncForCity(
    city: string,
    startDate: string,
    endDate: string,
    sources: string[] = ['ticketmaster', 'predicthq']
  ): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const source of sources) {
      try {
        let result: SyncResult;
        
        if (source === 'ticketmaster') {
          result = await this.syncTicketmasterForCity(city, startDate, endDate);
        } else if (source === 'predicthq') {
          result = await this.syncPredictHQForCity(city, startDate, endDate);
        } else {
          throw new Error(`Unknown source: ${source}`);
        }
        
        results.push(result);
      } catch (error) {
        console.error(`Sync failed for ${source} in ${city}:`, error);
        results.push({
          source,
          success: false,
          events_processed: 0,
          events_created: 0,
          events_updated: 0,
          events_skipped: 0,
          errors: [`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
          duration_ms: 0
        });
      }
    }

    return results;
  }

  /**
   * Sync Ticketmaster events for a specific city
   */
  private async syncTicketmasterForCity(
    city: string,
    startDate: string,
    endDate: string
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      source: 'ticketmaster',
      success: false,
      events_processed: 0,
      events_created: 0,
      events_updated: 0,
      events_skipped: 0,
      errors: [],
      duration_ms: 0
    };

    try {
      const events = await ticketmasterService.getEventsForCity(city, startDate, endDate);
      const transformedEvents: CreateEventData[] = [];

      for (const event of events) {
        try {
          const transformedEvent = dataTransformer.transformEvent('ticketmaster', event);
          transformedEvents.push(transformedEvent);
        } catch (error) {
          result.errors.push(`Failed to transform event "${event.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      result.events_processed = transformedEvents.length;

      if (transformedEvents.length > 0) {
        const saveResult = await eventStorageService.saveEvents(transformedEvents);
        result.events_created = saveResult.created;
        result.events_updated = saveResult.updated;
        result.events_skipped = saveResult.skipped;
        result.errors.push(...saveResult.errors);
      }

      result.success = result.errors.length === 0;
      result.duration_ms = Date.now() - startTime;

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Ticketmaster sync failed for ${city}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.duration_ms = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Sync PredictHQ events for a specific city
   */
  private async syncPredictHQForCity(
    city: string,
    startDate: string,
    endDate: string
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      source: 'predicthq',
      success: false,
      events_processed: 0,
      events_created: 0,
      events_updated: 0,
      events_skipped: 0,
      errors: [],
      duration_ms: 0
    };

    try {
      const events = await predicthqService.getEventsForCity(city, startDate, endDate);
      const transformedEvents: CreateEventData[] = [];

      for (const event of events) {
        try {
          const transformedEvent = dataTransformer.transformEvent('predicthq', event);
          transformedEvents.push(transformedEvent);
        } catch (error) {
          result.errors.push(`Failed to transform event "${event.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      result.events_processed = transformedEvents.length;

      if (transformedEvents.length > 0) {
        const saveResult = await eventStorageService.saveEvents(transformedEvents);
        result.events_created = saveResult.created;
        result.events_updated = saveResult.updated;
        result.events_skipped = saveResult.skipped;
        result.errors.push(...saveResult.errors);
      }

      result.success = result.errors.length === 0;
      result.duration_ms = Date.now() - startTime;

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`PredictHQ sync failed for ${city}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.duration_ms = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Clean up old events
   */
  async cleanupOldEvents(olderThanDays: number = 365): Promise<number> {
    try {
      console.log(`Cleaning up events older than ${olderThanDays} days...`);
      const deletedCount = await eventStorageService.deleteOldEvents(olderThanDays);
      console.log(`Cleaned up ${deletedCount} old events`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old events:', error);
      throw error;
    }
  }

  /**
   * Validate data quality
   */
  async validateDataQuality(): Promise<{
    total_events: number;
    invalid_events: number;
    missing_data: {
      missing_venue: number;
      missing_attendees: number;
      missing_description: number;
    };
    quality_score: number;
  }> {
    try {
      // Get all events
      const { data: events, error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('events')
          .select('*');
        return result;
      });

      if (error) {
        throw new Error(`Failed to fetch events for quality validation: ${error.message}`);
      }

      const totalEvents = events?.length || 0;
      let invalidEvents = 0;
      const missingData = {
        missing_venue: 0,
        missing_attendees: 0,
        missing_description: 0
      };

      // Validate each event
      for (const event of events || []) {
        let isInvalid = false;

        if (!event.venue) {
          missingData.missing_venue++;
          isInvalid = true;
        }

        if (!event.expected_attendees) {
          missingData.missing_attendees++;
          isInvalid = true;
        }

        if (!event.description) {
          missingData.missing_description++;
          isInvalid = true;
        }

        if (isInvalid) {
          invalidEvents++;
        }
      }

      // Calculate quality score (0-100)
      const qualityScore = totalEvents > 0 
        ? Math.round(((totalEvents - invalidEvents) / totalEvents) * 100)
        : 100;

      return {
        total_events: totalEvents,
        invalid_events: invalidEvents,
        missing_data: missingData,
        quality_score: qualityScore
      };
    } catch (error) {
      console.error('Error validating data quality:', error);
      throw error;
    }
  }

  /**
   * Get sync status for all sources
   */
  getSyncStatus(): Map<string, SyncStatus> {
    return new Map(this.syncStatus);
  }

  /**
   * Get sync status for a specific source
   */
  getSourceSyncStatus(source: string): SyncStatus | undefined {
    return this.syncStatus.get(source);
  }

  /**
   * Update sync status for a source
   */
  private updateSyncStatus(
    source: string,
    status: 'success' | 'error' | 'in_progress',
    eventsSynced: number,
    errors: string[]
  ): void {
    this.syncStatus.set(source, {
      source,
      last_sync: new Date().toISOString(),
      status,
      events_synced: eventsSynced,
      errors
    });
  }

  /**
   * Check if sync is running
   */
  isSyncRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get sync statistics
   */
  async getSyncStatistics(): Promise<{
    total_sources: number;
    successful_syncs: number;
    failed_syncs: number;
    last_sync: string | null;
    total_events_synced: number;
  }> {
    const statuses = Array.from(this.syncStatus.values());
    
    return {
      total_sources: statuses.length,
      successful_syncs: statuses.filter(s => s.status === 'success').length,
      failed_syncs: statuses.filter(s => s.status === 'error').length,
      last_sync: statuses.length > 0 
        ? statuses.sort((a, b) => new Date(b.last_sync || 0).getTime() - new Date(a.last_sync || 0).getTime())[0].last_sync
        : null,
      total_events_synced: statuses.reduce((sum, s) => sum + s.events_synced, 0)
    };
  }
}

// Export singleton instance
export const dataSyncService = new DataSyncService();
