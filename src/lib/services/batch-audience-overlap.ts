// src/lib/services/batch-audience-overlap.ts
import { Event } from '@/types';
import { AudienceOverlapPrediction } from '@/types/audience';
import { audienceOverlapService } from './audience-overlap';
import { openaiAudienceOverlapService } from './openai-audience-overlap';

export interface BatchOverlapRequest {
  plannedEvent: Event;
  competingEvents: Event[];
}

export interface BatchOverlapResult {
  results: Map<string, AudienceOverlapPrediction>; // eventId -> prediction
  processingTime: number;
  cacheHits: number;
  apiCalls: number;
}

export class BatchAudienceOverlapService {
  private readonly BATCH_SIZE = 5; // Process 5 events in parallel
  private readonly MAX_CONCURRENT_BATCHES = 2; // Max 2 batches running simultaneously

  /**
   * Process multiple audience overlap analyses in optimized batches
   */
  async processBatchOverlap(request: BatchOverlapRequest): Promise<BatchOverlapResult> {
    const startTime = Date.now();
    const results = new Map<string, AudienceOverlapPrediction>();
    let cacheHits = 0;
    let apiCalls = 0;

    console.log(`🚀 Starting batch audience overlap analysis for ${request.competingEvents.length} events`);

    // Split events into batches for parallel processing
    const batches = this.createBatches(request.competingEvents, this.BATCH_SIZE);
    
    // Process batches with controlled concurrency
    const batchPromises = batches.map((batch, batchIndex) => 
      this.processBatch(request.plannedEvent, batch, batchIndex)
    );

    // Wait for all batches to complete
    const batchResults = await Promise.all(batchPromises);

    // Combine results
    for (const batchResult of batchResults) {
      for (const [eventId, prediction] of batchResult.results) {
        results.set(eventId, prediction);
      }
      cacheHits += batchResult.cacheHits;
      apiCalls += batchResult.apiCalls;
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Batch analysis completed in ${processingTime}ms (${cacheHits} cache hits, ${apiCalls} API calls)`);

    return {
      results,
      processingTime,
      cacheHits,
      apiCalls
    };
  }

  /**
   * Process a single batch of events
   */
  private async processBatch(
    plannedEvent: Event, 
    events: Event[], 
    batchIndex: number
  ): Promise<{ results: Map<string, AudienceOverlapPrediction>, cacheHits: number, apiCalls: number }> {
    const results = new Map<string, AudienceOverlapPrediction>();
    let cacheHits = 0;
    let apiCalls = 0;

    console.log(`📦 Processing batch ${batchIndex + 1} with ${events.length} events`);

    // Process events in parallel within the batch
    const eventPromises = events.map(async (event) => {
      try {
        const startTime = Date.now();
        
        // Use the appropriate service based on availability
        const prediction = openaiAudienceOverlapService.isAvailable()
          ? await openaiAudienceOverlapService.predictAudienceOverlap(plannedEvent, event)
          : await audienceOverlapService.predictAudienceOverlap(plannedEvent, event);

        const processingTime = Date.now() - startTime;
        console.log(`  ✅ Event "${event.title}" analyzed in ${processingTime}ms`);

        // Track cache hits and API calls
        if (processingTime < 100) { // Likely a cache hit
          cacheHits++;
        } else {
          apiCalls++;
        }

        return { eventId: event.id, prediction };
      } catch (error) {
        console.error(`❌ Failed to analyze event "${event.title}":`, error);
        // Return default low overlap
        return {
          eventId: event.id,
          prediction: {
            overlapScore: 0.1,
            confidence: 0.1,
            factors: {
              demographicSimilarity: 0.1,
              interestAlignment: 0.1,
              behaviorPatterns: 0.1,
              historicalPreference: 0.1
            },
            reasoning: ['Analysis failed - using default low overlap']
          }
        };
      }
    });

    // Wait for all events in this batch to complete
    const eventResults = await Promise.all(eventPromises);

    // Store results
    for (const { eventId, prediction } of eventResults) {
      results.set(eventId, prediction);
    }

    return { results, cacheHits, apiCalls };
  }

  /**
   * Create batches from events array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Optimized single event analysis with smart caching
   */
  async analyzeSingleEvent(plannedEvent: Event, competingEvent: Event): Promise<AudienceOverlapPrediction> {
    const startTime = Date.now();
    
    try {
      const prediction = openaiAudienceOverlapService.isAvailable()
        ? await openaiAudienceOverlapService.predictAudienceOverlap(plannedEvent, competingEvent)
        : await audienceOverlapService.predictAudienceOverlap(plannedEvent, competingEvent);

      const processingTime = Date.now() - startTime;
      console.log(`🎯 Single event analysis completed in ${processingTime}ms`);
      
      return prediction;
    } catch (error) {
      console.error('Single event analysis failed:', error);
      return {
        overlapScore: 0.1,
        confidence: 0.1,
        factors: {
          demographicSimilarity: 0.1,
          interestAlignment: 0.1,
          behaviorPatterns: 0.1,
          historicalPreference: 0.1
        },
        reasoning: ['Analysis failed - using default low overlap']
      };
    }
  }
}

export const batchAudienceOverlapService = new BatchAudienceOverlapService();
