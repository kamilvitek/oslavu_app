import OpenAI from 'openai';
import { Event } from '../../types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface DeduplicationResult {
  uniqueEvents: Event[];
  duplicatesRemoved: number;
  duplicateGroups: Array<{
    primary: Event;
    duplicates: Array<{
      event: Event;
      similarity: number;
    }>;
  }>;
  processingTimeMs: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface DeduplicationMetrics {
  totalEvents: number;
  uniqueEvents: number;
  duplicatesRemoved: number;
  duplicateGroups: number;
  sourcesWithDuplicates: string[];
  processingTimeMs: number;
  cacheHitRate: number;
}

export class EventDeduplicator {
  private embeddingCache = new Map<string, number[]>();
  private readonly CACHE_SIZE_LIMIT = 1000;
  private readonly DEFAULT_SIMILARITY_THRESHOLD = 0.85;
  private readonly BATCH_SIZE = 20; // OpenAI batch limit for embeddings
  private readonly MAX_PARALLEL_BATCHES = 5; // Limit concurrent API calls to avoid rate limits

  // Source priority for duplicate resolution (higher = better)
  private readonly sourcePriority: Record<string, number> = {
    'ticketmaster': 3,
    'predicthq': 2,
    'goout': 1,
    'brnoexpat': 1,
    'firecrawl': 1,
    'scraper': 1,
    'manual': 0
  };

  /**
   * Main deduplication method
   */
  async deduplicateEvents(
    events: Event[],
    threshold: number = this.DEFAULT_SIMILARITY_THRESHOLD
  ): Promise<DeduplicationResult> {
    const startTime = Date.now();
    let cacheHits = 0;
    let cacheMisses = 0;

    console.log(`🔍 Starting deduplication of ${events.length} events...`);

    if (events.length === 0) {
      return {
        uniqueEvents: [],
        duplicatesRemoved: 0,
        duplicateGroups: [],
        processingTimeMs: 0,
        cacheHits: 0,
        cacheMisses: 0
      };
    }

    // Generate embeddings for all events in parallel batches with rate limiting
    const batchSize = this.BATCH_SIZE;
    const batchPromises: Promise<number[][]>[] = [];
    
    // Create all batch promises for parallel execution
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      batchPromises.push(this.generateEmbeddingsBatch(batch));
    }
    
    // Execute batches in chunks to respect rate limits
    console.log(`🚀 Processing ${batchPromises.length} batches in parallel (max ${this.MAX_PARALLEL_BATCHES} concurrent)...`);
    const batchResults: number[][][] = [];
    
    for (let i = 0; i < batchPromises.length; i += this.MAX_PARALLEL_BATCHES) {
      const chunk = batchPromises.slice(i, i + this.MAX_PARALLEL_BATCHES);
      const chunkResults = await Promise.all(chunk);
      batchResults.push(...chunkResults);
    }
    
    // Flatten results and track cache hits/misses
    const embeddings: number[][] = [];
    for (let i = 0; i < batchResults.length; i++) {
      const batch = events.slice(i * batchSize, (i + 1) * batchSize);
      const batchEmbeddings = batchResults[i];
      
      // Track cache hits/misses for this batch
      for (const event of batch) {
        const cacheKey = this.getCacheKey(event);
        if (this.embeddingCache.has(cacheKey)) {
          cacheHits++;
        } else {
          cacheMisses++;
        }
      }
      
      embeddings.push(...batchEmbeddings);
    }

    // Find duplicate groups
    const duplicateGroups = this.findDuplicateGroups(events, embeddings, threshold);
    
    // Resolve duplicates and get unique events
    const uniqueEvents = this.resolveDuplicates(events, duplicateGroups);
    
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Deduplication completed in ${processingTime}ms`);
    console.log(`📊 Results: ${uniqueEvents.length} unique events, ${events.length - uniqueEvents.length} duplicates removed`);
    console.log(`💾 Cache: ${cacheHits} hits, ${cacheMisses} misses`);

    return {
      uniqueEvents,
      duplicatesRemoved: events.length - uniqueEvents.length,
      duplicateGroups,
      processingTimeMs: processingTime,
      cacheHits,
      cacheMisses
    };
  }

  /**
   * Generate embeddings for a batch of events
   */
  private async generateEmbeddingsBatch(events: Event[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    for (const event of events) {
      const embedding = await this.getOrGenerateEmbedding(event);
      embeddings.push(embedding);
    }
    
    return embeddings;
  }

  /**
   * Get or generate embedding for an event (with caching)
   */
  private async getOrGenerateEmbedding(event: Event): Promise<number[]> {
    const cacheKey = this.getCacheKey(event);
    
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }
    
    const embedding = await this.generateEmbedding(event);
    this.embeddingCache.set(cacheKey, embedding);
    
    // Limit cache size
    if (this.embeddingCache.size > this.CACHE_SIZE_LIMIT) {
      const firstKey = this.embeddingCache.keys().next().value;
      if (firstKey) {
        this.embeddingCache.delete(firstKey);
      }
    }
    
    return embedding;
  }

  /**
   * Generate embedding for a single event
   */
  private async generateEmbedding(event: Event): Promise<number[]> {
    const embeddingText = this.getEmbeddingText(event);
    
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: embeddingText
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding for event: ${event.title}`);
    }
  }

  /**
   * Create embedding text from event data
   */
  private getEmbeddingText(event: Event): string {
    return `
      ${event.title}
      ${event.description || ''}
      ${event.venue || ''}
      ${event.city}
      ${event.category}
    `.trim();
  }

  /**
   * Generate cache key for an event
   */
  private getCacheKey(event: Event): string {
    return `${event.source}:${event.sourceId || event.title}`;
  }

  /**
   * Find duplicate groups using cosine similarity and exact matching
   */
  private findDuplicateGroups(
    events: Event[],
    embeddings: number[][],
    threshold: number
  ): Array<{
    primary: Event;
    duplicates: Array<{
      event: Event;
      similarity: number;
    }>;
  }> {
    const duplicateGroups: Array<{
      primary: Event;
      duplicates: Array<{
        event: Event;
        similarity: number;
      }>;
    }> = [];
    
    const processed = new Set<number>();
    console.log(`🔍 Finding duplicates among ${events.length} events (threshold: ${threshold})`);
    
    for (let i = 0; i < events.length; i++) {
      if (processed.has(i)) continue;
      
      const currentEvent = events[i];
      const currentEmbedding = embeddings[i];
      const duplicates: Array<{
        event: Event;
        similarity: number;
      }> = [];
      
      // Optimize: Check exact matches first (faster than similarity calculation)
      for (let j = i + 1; j < events.length; j++) {
        if (processed.has(j)) continue;
        
        const otherEvent = events[j];
        const isExactMatch = this.isExactMatch(currentEvent, otherEvent);
        
        if (isExactMatch) {
          console.log(`🔍 Found exact duplicate: "${currentEvent.title}" vs "${otherEvent.title}"`);
          duplicates.push({
            event: otherEvent,
            similarity: 1.0
          });
          processed.add(j);
          continue; // Skip similarity calculation for exact matches
        }
      }
      
      // Only calculate similarity for non-exact matches
      for (let j = i + 1; j < events.length; j++) {
        if (processed.has(j)) continue;
        
        const otherEvent = events[j];
        const otherEmbedding = embeddings[j];
        
        // Check for semantic similarity
        const similarity = this.calculateCosineSimilarity(currentEmbedding, otherEmbedding);
        const isSimilar = similarity >= threshold;
        
        if (isSimilar) {
          console.log(`🔍 Found semantic duplicate: "${currentEvent.title}" vs "${otherEvent.title}" (similarity: ${similarity.toFixed(3)})`);
          duplicates.push({
            event: otherEvent,
            similarity
          });
          processed.add(j);
        }
      }
      
      if (duplicates.length > 0) {
        // Add current event to duplicates for resolution
        const allEvents = [currentEvent, ...duplicates.map(d => d.event)];
        const primary = this.selectBestEvent(allEvents);
        
        console.log(`🔍 Selected primary event: "${primary.title}" (source: ${primary.source}, date: ${primary.date})`);
        console.log(`🔍 Removing ${duplicates.length} duplicate(s)`);
        
        duplicateGroups.push({
          primary,
          duplicates: duplicates.filter(d => d.event !== primary)
        });
        
        processed.add(i);
      }
    }
    
    return duplicateGroups;
  }

  /**
   * Check if two events are exact matches (same title and venue, ignoring date)
   */
  private isExactMatch(event1: Event, event2: Event): boolean {
    // Normalize titles for comparison
    const title1 = event1.title.toLowerCase().trim();
    const title2 = event2.title.toLowerCase().trim();
    
    // Normalize venues for comparison
    const venue1 = (event1.venue || '').toLowerCase().trim();
    const venue2 = (event2.venue || '').toLowerCase().trim();
    
    // Check if titles match exactly
    const titlesMatch = title1 === title2;
    
    // Check if venues match (if both have venues)
    const venuesMatch = venue1 === '' || venue2 === '' || venue1 === venue2;
    
    // Check if cities match
    const citiesMatch = event1.city.toLowerCase().trim() === event2.city.toLowerCase().trim();
    
    // Events are exact matches if they have the same title and venue (if available) and city
    return titlesMatch && venuesMatch && citiesMatch;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same length');
    }
    
    const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0);
    const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }
    
    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Select the best event from a group of duplicates
   */
  private selectBestEvent(events: Event[]): Event {
    if (events.length === 1) {
      return events[0];
    }
    
    // Score each event based on data completeness and source priority
    const scored = events.map(event => {
      const sourceScore = this.sourcePriority[event.source] || 0;
      const descriptionScore = (event.description?.length || 0) * 0.1;
      const venueScore = event.venue ? 100 : 0;
      const imageScore = event.imageUrl ? 50 : 0;
      const urlScore = event.url ? 25 : 0;
      const attendeesScore = event.expectedAttendees ? 10 : 0;
      
      const totalScore = 
        sourceScore * 200 + // Source priority is most important
        descriptionScore +
        venueScore +
        imageScore +
        urlScore +
        attendeesScore;
      
      return {
        event,
        score: totalScore
      };
    });
    
    // Sort by score (highest first) and return the best event
    scored.sort((a, b) => b.score - a.score);
    return scored[0].event;
  }

  /**
   * Resolve duplicates and return unique events
   */
  private resolveDuplicates(
    events: Event[],
    duplicateGroups: Array<{
      primary: Event;
      duplicates: Array<{
        event: Event;
        similarity: number;
      }>;
    }>
  ): Event[] {
    const uniqueEvents: Event[] = [];
    const processedEvents = new Set<string>();
    
    // Add primary events from duplicate groups
    for (const group of duplicateGroups) {
      uniqueEvents.push(group.primary);
      processedEvents.add(this.getEventKey(group.primary));
      
      // Mark all duplicates as processed
      for (const duplicate of group.duplicates) {
        processedEvents.add(this.getEventKey(duplicate.event));
      }
    }
    
    // Add events that weren't part of any duplicate group
    for (const event of events) {
      const eventKey = this.getEventKey(event);
      if (!processedEvents.has(eventKey)) {
        uniqueEvents.push(event);
      }
    }
    
    return uniqueEvents;
  }

  /**
   * Generate unique key for an event
   */
  private getEventKey(event: Event): string {
    return `${event.source}:${event.sourceId || event.title}:${event.date}:${event.city}`;
  }

  /**
   * Get deduplication metrics
   */
  getMetrics(result: DeduplicationResult): DeduplicationMetrics {
    const sourcesWithDuplicates = result.duplicateGroups
      .flatMap(group => [
        group.primary.source,
        ...group.duplicates.map(d => d.event.source)
      ])
      .filter((source, index, arr) => arr.indexOf(source) === index);
    
    const cacheHitRate = result.cacheHits + result.cacheMisses > 0 
      ? result.cacheHits / (result.cacheHits + result.cacheMisses)
      : 0;
    
    return {
      totalEvents: result.uniqueEvents.length + result.duplicatesRemoved,
      uniqueEvents: result.uniqueEvents.length,
      duplicatesRemoved: result.duplicatesRemoved,
      duplicateGroups: result.duplicateGroups.length,
      sourcesWithDuplicates,
      processingTimeMs: result.processingTimeMs,
      cacheHitRate
    };
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
    console.log('🧹 Embedding cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; limit: number } {
    return {
      size: this.embeddingCache.size,
      limit: this.CACHE_SIZE_LIMIT
    };
  }
}

// Export singleton instance
export const eventDeduplicator = new EventDeduplicator();
