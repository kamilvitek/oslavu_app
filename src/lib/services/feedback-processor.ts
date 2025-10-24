// src/lib/services/feedback-processor.ts
import { serverDatabaseService } from '@/lib/supabase';
import { venueDatabaseService } from './venue-database';
import { attendeeLearningService } from './attendee-learning';

export interface EventFeedback {
  event_id: string;
  feedback_type: 'attendee_correction' | 'venue_correction' | 'capacity_report';
  reported_attendees?: number;
  actual_attendees?: number;
  attendance_source?: 'ticket_sales' | 'manual_count' | 'organizer_report';
  notes?: string;
}

export interface FeedbackSummary {
  eventId: string;
  totalFeedback: number;
  attendeeCorrections: number;
  venueCorrections: number;
  capacityReports: number;
  averageActualAttendance?: number;
  consensusReached: boolean;
  recommendedAction?: string;
}

export interface FeedbackProcessingResult {
  success: boolean;
  eventUpdated: boolean;
  venueUpdated: boolean;
  learningTriggered: boolean;
  message: string;
  errors: string[];
}

export class FeedbackProcessorService {
  private db = serverDatabaseService;

  /**
   * Process user feedback and apply corrections
   */
  async processFeedback(feedback: EventFeedback): Promise<FeedbackProcessingResult> {
    const result: FeedbackProcessingResult = {
      success: false,
      eventUpdated: false,
      venueUpdated: false,
      learningTriggered: false,
      message: '',
      errors: []
    };

    try {
      console.log(`🔄 Processing feedback for event ${feedback.event_id}`);

      // Store feedback in database
      await this.storeFeedback(feedback);

      // Process based on feedback type
      switch (feedback.feedback_type) {
        case 'attendee_correction':
          await this.processAttendeeCorrection(feedback, result);
          break;
        case 'venue_correction':
          await this.processVenueCorrection(feedback, result);
          break;
        case 'capacity_report':
          await this.processCapacityReport(feedback, result);
          break;
      }

      // Check for consensus and auto-apply if appropriate
      const consensus = await this.checkFeedbackConsensus(feedback.event_id);
      if (consensus.consensusReached && consensus.recommendedAction) {
        await this.applyConsensusCorrection(feedback.event_id, consensus, result);
      }

      // Trigger learning if significant data was updated
      if (result.eventUpdated || result.venueUpdated) {
        await this.triggerLearningUpdate(feedback.event_id, result);
      }

      result.success = true;
      result.message = 'Feedback processed successfully';

    } catch (error) {
      console.error('Error processing feedback:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.message = 'Failed to process feedback';
    }

    return result;
  }

  /**
   * Store feedback in database
   */
  private async storeFeedback(feedback: EventFeedback): Promise<void> {
    const { error } = await this.db.executeWithRetry(async () => {
      const result = await this.db.getClient()
        .from('event_feedback')
        .insert({
          event_id: feedback.event_id,
          feedback_type: feedback.feedback_type,
          reported_attendees: feedback.reported_attendees,
          actual_attendees: feedback.actual_attendees,
          attendance_source: feedback.attendance_source,
          notes: feedback.notes,
          created_at: new Date().toISOString()
        });
      return result;
    });

    if (error) {
      throw new Error(`Failed to store feedback: ${error.message}`);
    }
  }

  /**
   * Process attendee correction feedback
   */
  private async processAttendeeCorrection(
    feedback: EventFeedback, 
    result: FeedbackProcessingResult
  ): Promise<void> {
    if (!feedback.actual_attendees && !feedback.reported_attendees) {
      result.errors.push('No attendee data provided for correction');
      return;
    }

    const newAttendeeCount = feedback.actual_attendees || feedback.reported_attendees;
    if (!newAttendeeCount) return;

    try {
      // Update event with corrected attendee count
      const { error } = await this.db.executeWithRetry(async () => {
        const updateResult = await this.db.getClient()
          .from('events')
          .update({
            expected_attendees: newAttendeeCount,
            attendee_source: 'user_verified',
            attendee_confidence: 0.9, // High confidence for user-verified data
            attendee_verified: true,
            attendee_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', feedback.event_id);
        return updateResult;
      });

      if (error) {
        throw new Error(`Failed to update event: ${error.message}`);
      }

      result.eventUpdated = true;
      result.message += `Updated attendee count to ${newAttendeeCount}. `;

    } catch (error) {
      result.errors.push(`Failed to update attendee count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process venue correction feedback
   */
  private async processVenueCorrection(
    feedback: EventFeedback, 
    result: FeedbackProcessingResult
  ): Promise<void> {
    try {
      // Get current event data
      const { data: eventData, error: fetchError } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('events')
          .select('venue, city')
          .eq('id', feedback.event_id)
          .single();
        return result;
      });

      if (fetchError || !eventData) {
        throw new Error('Event not found');
      }

      // If feedback includes venue capacity information, update venue database
      if (feedback.notes && feedback.notes.toLowerCase().includes('capacity')) {
        const capacityMatch = feedback.notes.match(/(\d+)\s*(?:capacity|seats|people)/i);
        if (capacityMatch) {
          const capacity = parseInt(capacityMatch[1]);
          const venue = await venueDatabaseService.lookupVenue(eventData.venue, eventData.city);
          
          if (venue) {
            await venueDatabaseService.updateVenueCapacity(venue.id, capacity, 'user_reported');
            result.venueUpdated = true;
            result.message += `Updated venue capacity to ${capacity}. `;
          }
        }
      }

    } catch (error) {
      result.errors.push(`Failed to process venue correction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process capacity report feedback
   */
  private async processCapacityReport(
    feedback: EventFeedback, 
    result: FeedbackProcessingResult
  ): Promise<void> {
    try {
      // Get event venue information
      const { data: eventData, error: fetchError } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('events')
          .select('venue, city')
          .eq('id', feedback.event_id)
          .single();
        return result;
      });

      if (fetchError || !eventData || !eventData.venue) {
        result.errors.push('Event venue not found for capacity report');
        return;
      }

      // Look up venue and update capacity if provided
      const venue = await venueDatabaseService.lookupVenue(eventData.venue, eventData.city);
      if (venue && feedback.notes) {
        const capacityMatch = feedback.notes.match(/(\d+)\s*(?:capacity|seats|people)/i);
        if (capacityMatch) {
          const capacity = parseInt(capacityMatch[1]);
          await venueDatabaseService.updateVenueCapacity(venue.id, capacity, 'user_reported');
          result.venueUpdated = true;
          result.message += `Updated venue capacity to ${capacity}. `;
        }
      }

      // If actual attendance is provided, update event
      if (feedback.actual_attendees) {
        const { error: updateError } = await this.db.executeWithRetry(async () => {
          const result = await this.db.getClient()
            .from('events')
            .update({
              expected_attendees: feedback.actual_attendees,
              attendee_source: 'user_verified',
              attendee_confidence: 0.9,
              attendee_verified: true,
              attendee_verified_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', feedback.event_id);
          return result;
        });

        if (!updateError) {
          result.eventUpdated = true;
          result.message += `Updated attendee count to ${feedback.actual_attendees}. `;
        }
      }

    } catch (error) {
      result.errors.push(`Failed to process capacity report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check for feedback consensus
   */
  private async checkFeedbackConsensus(eventId: string): Promise<FeedbackSummary> {
    try {
      const { data: feedbackData, error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('event_feedback')
          .select('*')
          .eq('event_id', eventId);
        return result;
      });

      if (error || !feedbackData) {
        return {
          eventId,
          totalFeedback: 0,
          attendeeCorrections: 0,
          venueCorrections: 0,
          capacityReports: 0,
          consensusReached: false
        };
      }

      const attendeeCorrections = feedbackData.filter(f => f.feedback_type === 'attendee_correction');
      const venueCorrections = feedbackData.filter(f => f.feedback_type === 'venue_correction');
      const capacityReports = feedbackData.filter(f => f.feedback_type === 'capacity_report');

      // Check for consensus in attendee corrections
      const actualAttendees = attendeeCorrections
        .map(f => f.actual_attendees)
        .filter(a => a !== null && a !== undefined);

      let consensusReached = false;
      let recommendedAction: string | undefined;

      if (actualAttendees.length >= 2) {
        const average = actualAttendees.reduce((sum, val) => sum + val, 0) / actualAttendees.length;
        const variance = actualAttendees.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / actualAttendees.length;
        const standardDeviation = Math.sqrt(variance);

        // If standard deviation is low, we have consensus
        if (standardDeviation / average < 0.2) { // Less than 20% variance
          consensusReached = true;
          recommendedAction = `Update attendee count to ${Math.round(average)} (consensus from ${actualAttendees.length} reports)`;
        }
      }

      return {
        eventId,
        totalFeedback: feedbackData.length,
        attendeeCorrections: attendeeCorrections.length,
        venueCorrections: venueCorrections.length,
        capacityReports: capacityReports.length,
        averageActualAttendance: actualAttendees.length > 0 
          ? Math.round(actualAttendees.reduce((sum, val) => sum + val, 0) / actualAttendees.length)
          : undefined,
        consensusReached,
        recommendedAction
      };

    } catch (error) {
      console.error('Error checking feedback consensus:', error);
      return {
        eventId,
        totalFeedback: 0,
        attendeeCorrections: 0,
        venueCorrections: 0,
        capacityReports: 0,
        consensusReached: false
      };
    }
  }

  /**
   * Apply consensus correction
   */
  private async applyConsensusCorrection(
    eventId: string, 
    consensus: FeedbackSummary, 
    result: FeedbackProcessingResult
  ): Promise<void> {
    if (!consensus.averageActualAttendance) return;

    try {
      const { error } = await this.db.executeWithRetry(async () => {
        const updateResult = await this.db.getClient()
          .from('events')
          .update({
            expected_attendees: consensus.averageActualAttendance,
            attendee_source: 'user_verified',
            attendee_confidence: 0.95, // Very high confidence for consensus
            attendee_verified: true,
            attendee_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', eventId);
        return updateResult;
      });

      if (error) {
        throw new Error(`Failed to apply consensus correction: ${error.message}`);
      }

      result.eventUpdated = true;
      result.message += `Applied consensus correction: ${consensus.recommendedAction}. `;

    } catch (error) {
      result.errors.push(`Failed to apply consensus: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Trigger learning update
   */
  private async triggerLearningUpdate(
    eventId: string, 
    result: FeedbackProcessingResult
  ): Promise<void> {
    try {
      console.log(`🧠 Triggering learning update for event ${eventId}`);
      
      // Trigger historical learning analysis
      await attendeeLearningService.learnFromHistory();
      
      result.learningTriggered = true;
      result.message += 'Learning system updated. ';

    } catch (error) {
      console.warn('Failed to trigger learning update:', error);
      result.errors.push('Learning update failed (non-critical)');
    }
  }

  /**
   * Get feedback summary for an event
   */
  async getFeedbackSummary(eventId: string): Promise<FeedbackSummary> {
    return await this.checkFeedbackConsensus(eventId);
  }

  /**
   * Get all feedback for an event
   */
  async getEventFeedback(eventId: string): Promise<any[]> {
    try {
      const { data, error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('event_feedback')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });
        return result;
      });

      if (error) {
        console.error('Error fetching event feedback:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Error in getEventFeedback:', error);
      return [];
    }
  }

  /**
   * Verify feedback (admin function)
   */
  async verifyFeedback(feedbackId: string, verifiedBy: string): Promise<boolean> {
    try {
      const { error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('event_feedback')
          .update({
            is_verified: true,
            verified_by: verifiedBy,
            verified_at: new Date().toISOString()
          })
          .eq('id', feedbackId);
        return result;
      });

      if (error) {
        throw new Error(`Failed to verify feedback: ${error.message}`);
      }

      return true;

    } catch (error) {
      console.error('Error verifying feedback:', error);
      return false;
    }
  }
}

// Export singleton instance
export const feedbackProcessorService = new FeedbackProcessorService();
