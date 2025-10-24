// src/lib/services/attendee-backfill.ts
import { serverDatabaseService } from '@/lib/supabase';
import { venueCapacityService } from './venue-capacity';

export interface BackfillResult {
  totalEvents: number;
  processedEvents: number;
  updatedEvents: number;
  skippedEvents: number;
  failedEvents: number;
  errors: string[];
  duration: number;
  startTime: string;
  endTime: string;
}

export interface BackfillOptions {
  dryRun?: boolean;
  limit?: number;
  batchSize?: number;
  verbose?: boolean;
}

export interface EventWithoutAttendees {
  id: string;
  title: string;
  venue?: string;
  city: string;
  category: string;
  subcategory?: string;
  source: string;
  created_at: string;
}

export class AttendeeBackfillService {
  private db = serverDatabaseService;

  /**
   * Main orchestrator for backfilling missing attendee data
   */
  async backfillMissingAttendees(options: BackfillOptions = {}): Promise<BackfillResult> {
    const startTime = new Date();
    const {
      dryRun = false,
      limit = 1000,
      batchSize = 100,
      verbose = false
    } = options;

    const result: BackfillResult = {
      totalEvents: 0,
      processedEvents: 0,
      updatedEvents: 0,
      skippedEvents: 0,
      failedEvents: 0,
      errors: [],
      duration: 0,
      startTime: startTime.toISOString(),
      endTime: ''
    };

    try {
      console.log(`🔄 Starting attendee backfill (dryRun: ${dryRun}, limit: ${limit})`);
      
      // Get events without attendee data
      const eventsWithoutAttendees = await this.getEventsWithoutAttendees(limit);
      result.totalEvents = eventsWithoutAttendees.length;

      if (eventsWithoutAttendees.length === 0) {
        console.log('✅ No events found without attendee data');
        return this.finalizeResult(result, startTime);
      }

      console.log(`📊 Found ${eventsWithoutAttendees.length} events without attendee data`);

      // Process events in batches
      const batches = this.chunkArray(eventsWithoutAttendees, batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} events)`);
        
        const batchResult = await this.processBatch(batch, dryRun, verbose);
        
        result.processedEvents += batchResult.processed;
        result.updatedEvents += batchResult.updated;
        result.skippedEvents += batchResult.skipped;
        result.failedEvents += batchResult.failed;
        result.errors.push(...batchResult.errors);

        // Log progress
        if (verbose) {
          console.log(`   ✅ Updated: ${batchResult.updated}, Skipped: ${batchResult.skipped}, Failed: ${batchResult.failed}`);
        }
      }

      return this.finalizeResult(result, startTime);
    } catch (error) {
      result.errors.push(`Backfill failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('❌ Attendee backfill failed:', error);
      return this.finalizeResult(result, startTime);
    }
  }

  /**
   * Get events that don't have attendee data
   */
  async getEventsWithoutAttendees(limit: number = 1000): Promise<EventWithoutAttendees[]> {
    try {
      const { data, error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('events')
          .select('id, title, venue, city, category, subcategory, source, created_at')
          .is('expected_attendees', null)
          .not('venue', 'is', null) // Only events with venue names
          .order('created_at', { ascending: false })
          .limit(limit);
        return result;
      });

      if (error) {
        throw new Error(`Failed to fetch events without attendees: ${error.message}`);
      }

      return (data || []) as EventWithoutAttendees[];
    } catch (error) {
      console.error('Error fetching events without attendees:', error);
      throw error;
    }
  }

  /**
   * Process a batch of events
   */
  private async processBatch(
    events: EventWithoutAttendees[], 
    dryRun: boolean, 
    verbose: boolean
  ): Promise<{
    processed: number;
    updated: number;
    skipped: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      processed: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const event of events) {
      try {
        result.processed++;
        
        // Estimate attendees using venue capacity service
        const estimatedAttendees = this.estimateAttendeesForEvent(event);
        
        if (estimatedAttendees === null) {
          result.skipped++;
          if (verbose) {
            console.log(`   ⏭️  Skipped ${event.title} - no venue or unable to estimate`);
          }
          continue;
        }

        if (dryRun) {
          result.updated++;
          if (verbose) {
            console.log(`   🔍 [DRY RUN] Would update ${event.title}: ${estimatedAttendees} attendees`);
          }
        } else {
          // Update the event with estimated attendees
          await this.updateEventAttendees(event.id, estimatedAttendees);
          result.updated++;
          if (verbose) {
            console.log(`   ✅ Updated ${event.title}: ${estimatedAttendees} attendees`);
          }
        }
      } catch (error) {
        result.failed++;
        const errorMsg = `Failed to process event "${event.title}": ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(`   ❌ ${errorMsg}`);
      }
    }

    return result;
  }

  /**
   * Estimate attendees for a specific event
   */
  private estimateAttendeesForEvent(event: EventWithoutAttendees): number | null {
    if (!event.venue) return null;

    try {
      const estimate = venueCapacityService.estimateAttendees(
        event.venue, 
        event.category, 
        event.city
      );
      
      // Validate the estimate
      if (venueCapacityService.validateCapacity(estimate, event.venue, event.category)) {
        return estimate;
      }
      
      return null;
    } catch (error) {
      console.warn(`Failed to estimate attendees for event "${event.title}":`, error);
      return null;
    }
  }

  /**
   * Update event with estimated attendees
   */
  private async updateEventAttendees(eventId: string, expectedAttendees: number): Promise<void> {
    try {
      const { error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('events')
          .update({ 
            expected_attendees: expectedAttendees,
            updated_at: new Date().toISOString()
          })
          .eq('id', eventId);
        return result;
      });

      if (error) {
        throw new Error(`Failed to update event ${eventId}: ${error.message}`);
      }
    } catch (error) {
      console.error(`Error updating event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Get backfill statistics
   */
  async getBackfillStats(): Promise<{
    totalEvents: number;
    eventsWithAttendees: number;
    eventsWithoutAttendees: number;
    percentageComplete: number;
  }> {
    try {
      const { data, error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('events')
          .select('expected_attendees', { count: 'exact' });
        return result;
      });

      if (error) {
        throw new Error(`Failed to get backfill stats: ${error.message}`);
      }

      const totalEvents = data?.length || 0;
      const eventsWithAttendees = data?.filter((event: any) => event.expected_attendees !== null).length || 0;
      const eventsWithoutAttendees = totalEvents - eventsWithAttendees;
      const percentageComplete = totalEvents > 0 ? (eventsWithAttendees / totalEvents) * 100 : 0;

      return {
        totalEvents,
        eventsWithAttendees,
        eventsWithoutAttendees,
        percentageComplete: Math.round(percentageComplete * 100) / 100
      };
    } catch (error) {
      console.error('Error getting backfill stats:', error);
      throw error;
    }
  }

  /**
   * Chunk array into smaller batches
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Finalize result with timing information
   */
  private finalizeResult(result: BackfillResult, startTime: Date): BackfillResult {
    const endTime = new Date();
    result.endTime = endTime.toISOString();
    result.duration = endTime.getTime() - startTime.getTime();
    
    console.log(`🏁 Backfill completed in ${(result.duration / 1000).toFixed(2)}s`);
    console.log(`📊 Results: ${result.updatedEvents} updated, ${result.skippedEvents} skipped, ${result.failedEvents} failed`);
    
    return result;
  }

  /**
   * Log backfill progress
   */
  private logBackfillProgress(
    processed: number, 
    total: number, 
    updated: number, 
    skipped: number, 
    failed: number
  ): void {
    const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
    console.log(`📈 Progress: ${processed}/${total} (${percentage}%) - Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`);
  }
}

// Export singleton instance
export const attendeeBackfillService = new AttendeeBackfillService();
