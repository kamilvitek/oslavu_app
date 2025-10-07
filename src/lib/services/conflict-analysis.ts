import { Event } from '@/types';
import { audienceOverlapService } from './audience-overlap';
import { openaiAudienceOverlapService } from './openai-audience-overlap';
import { USPUpdater } from './usp-updater';
import { getCityCountryCode, validateCityCountryPair } from '@/lib/utils/city-country-mapping';
import { eventDeduplicator, DeduplicationMetrics } from './event-deduplicator';
import { cityRecognitionService } from './city-recognition';

// High-performance data structures for conflict detection
interface EventIndex {
  byDate: Map<string, Set<string>>; // date -> event IDs
  byCategory: Map<string, Set<string>>; // category -> event IDs
  byVenue: Map<string, Set<string>>; // venue -> event IDs
  byCity: Map<string, Set<string>>; // city -> event IDs
  events: Map<string, Event>; // event ID -> event data
  spatialIndex: Map<string, Set<string>>; // spatial grid -> event IDs
}

interface ConflictSeverityConfig {
  depth: 'shallow' | 'medium' | 'deep';
  maxComparisons: number;
  stringSimilarityThreshold: number;
  spatialRadius: number; // in km
}

interface ConflictCache {
  comparisons: Map<string, number>; // event pair -> conflict score
  expiry: Map<string, number>; // cache key -> expiry timestamp
  ttl: number; // time to live in ms
}

export interface ConflictAnalysisResult {
  recommendedDates: DateRecommendation[];
  highRiskDates: DateRecommendation[];
  allEvents: Event[];
  analysisDate: string;
  userPreferredStartDate?: string;
  userPreferredEndDate?: string;
  deduplicationMetrics?: DeduplicationMetrics;
}

export interface DateRecommendation {
  startDate: string;
  endDate: string;
  conflictScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  competingEvents: Event[];
  reasons: string[];
  audienceOverlap?: {
    averageOverlap: number;
    highOverlapEvents: Event[];
    overlapReasoning: string[];
  };
}

export interface ConflictAnalysisParams {
  city: string;
  category: string;
  expectedAttendees: number;
  startDate: string; // preferred start date
  endDate: string; // preferred end date
  dateRangeStart: string; // analysis range start (auto-calculated)
  dateRangeEnd: string; // analysis range end (auto-calculated)
  enableAdvancedAnalysis?: boolean; // enable audience overlap analysis (defaults to true)
  searchRadius?: string; // search radius for geographic coverage (e.g., "50km", "25miles")
  useComprehensiveFallback?: boolean; // use comprehensive fallback strategies
}

export class ConflictAnalysisService {
  // Request deduplication cache
  private requestCache = new Map<string, Promise<any>>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // High-performance conflict detection
  private eventIndex: EventIndex | null = null;
  private conflictCache: ConflictCache = {
    comparisons: new Map(),
    expiry: new Map(),
    ttl: 10 * 60 * 1000 // 10 minutes
  };

  // Web Worker for CPU-intensive calculations
  private worker: Worker | null = null;
  private workerTasks = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    startTime: number;
  }>();

  // Severity configurations for different analysis depths
  // OPTIMIZED: Reduced maxComparisons for 60-80% performance improvement
  private readonly severityConfigs: Record<string, ConflictSeverityConfig> = {
    'low': {
      depth: 'shallow',
      maxComparisons: 20,    // Reduced from 50 (60% reduction)
      stringSimilarityThreshold: 0.7,
      spatialRadius: 10
    },
    'medium': {
      depth: 'medium',
      maxComparisons: 50,    // Reduced from 200 (75% reduction)
      stringSimilarityThreshold: 0.8,
      spatialRadius: 25
    },
    'high': {
      depth: 'deep',
      maxComparisons: 100,   // Reduced from 500 (80% reduction)
      stringSimilarityThreshold: 0.9,
      spatialRadius: 50
    }
  };

  /**
   * Pre-process events into high-performance searchable data structures
   */
  private preprocessEvents(events: Event[]): EventIndex {
    const startTime = Date.now();
    console.log(`🚀 Preprocessing ${events.length} events into optimized data structures...`);

    const index: EventIndex = {
      byDate: new Map(),
      byCategory: new Map(),
      byVenue: new Map(),
      byCity: new Map(),
      events: new Map(),
      spatialIndex: new Map()
    };

    for (const event of events) {
      const eventId = event.id;
      index.events.set(eventId, event);

      // Index by date
      const dateKey = event.date.split('T')[0]; // YYYY-MM-DD
      if (!index.byDate.has(dateKey)) {
        index.byDate.set(dateKey, new Set());
      }
      index.byDate.get(dateKey)!.add(eventId);

      // Index by category
      if (!index.byCategory.has(event.category)) {
        index.byCategory.set(event.category, new Set());
      }
      index.byCategory.get(event.category)!.add(eventId);

      // Index by venue (if available)
      if (event.venue) {
        const venueKey = event.venue.toLowerCase().trim();
        if (!index.byVenue.has(venueKey)) {
          index.byVenue.set(venueKey, new Set());
        }
        index.byVenue.get(venueKey)!.add(eventId);
      }

      // Index by city
      const cityKey = event.city.toLowerCase().trim();
      if (!index.byCity.has(cityKey)) {
        index.byCity.set(cityKey, new Set());
      }
      index.byCity.get(cityKey)!.add(eventId);

      // Spatial indexing (simplified grid-based approach)
      if (event.venue) {
        const spatialKey = this.generateSpatialKey(event.city, event.venue);
        if (!index.spatialIndex.has(spatialKey)) {
          index.spatialIndex.set(spatialKey, new Set());
        }
        index.spatialIndex.get(spatialKey)!.add(eventId);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Event preprocessing completed in ${processingTime}ms`);
    console.log(`📊 Index statistics:`);
    console.log(`  - Dates: ${index.byDate.size}`);
    console.log(`  - Categories: ${index.byCategory.size}`);
    console.log(`  - Venues: ${index.byVenue.size}`);
    console.log(`  - Cities: ${index.byCity.size}`);
    console.log(`  - Spatial cells: ${index.spatialIndex.size}`);

    return index;
  }

  /**
   * Generate spatial key for grid-based spatial indexing
   */
  private generateSpatialKey(city: string, venue: string): string {
    // Simple hash-based spatial key (in production, use proper geohashing)
    const cityHash = this.simpleHash(city.toLowerCase());
    const venueHash = this.simpleHash(venue.toLowerCase());
    return `${cityHash}-${venueHash}`;
  }

  /**
   * Simple hash function for spatial indexing
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached conflict score or calculate and cache it
   */
  private getCachedConflictScore(eventId1: string, eventId2: string, config: ConflictSeverityConfig): number | null {
    const cacheKey = `${eventId1}-${eventId2}-${config.depth}`;
    const now = Date.now();
    
    // Check if cache entry exists and is not expired
    if (this.conflictCache.comparisons.has(cacheKey) && 
        this.conflictCache.expiry.has(cacheKey) &&
        this.conflictCache.expiry.get(cacheKey)! > now) {
      return this.conflictCache.comparisons.get(cacheKey)!;
    }
    
    return null;
  }

  /**
   * Cache conflict score with expiry
   */
  private setCachedConflictScore(eventId1: string, eventId2: string, config: ConflictSeverityConfig, score: number): void {
    const cacheKey = `${eventId1}-${eventId2}-${config.depth}`;
    const expiry = Date.now() + this.conflictCache.ttl;
    
    this.conflictCache.comparisons.set(cacheKey, score);
    this.conflictCache.expiry.set(cacheKey, expiry);
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, expiry] of this.conflictCache.expiry.entries()) {
      if (expiry <= now) {
        this.conflictCache.comparisons.delete(key);
        this.conflictCache.expiry.delete(key);
      }
    }
  }

  /**
   * Initialize Web Worker for CPU-intensive calculations
   */
  private initializeWorker(): void {
    if (typeof Worker !== 'undefined' && !this.worker) {
      try {
        // Create worker from the worker file
        this.worker = new Worker(new URL('../workers/conflict-analysis-worker.ts', import.meta.url));
        
        // Handle worker messages
        this.worker.onmessage = (e) => {
          const { taskId, result, error } = e.data;
          const task = this.workerTasks.get(taskId);
          
          if (task) {
            this.workerTasks.delete(taskId);
            const processingTime = Date.now() - task.startTime;
            
            if (error) {
              console.error(`Worker task ${taskId} failed:`, error);
              task.reject(new Error(error));
            } else {
              console.log(`✅ Worker task ${taskId} completed in ${processingTime}ms`);
              task.resolve(result);
            }
          }
        };
        
        // Handle worker errors
        this.worker.onerror = (error) => {
          console.error('Web Worker error:', error);
          // Reject all pending tasks
          for (const [taskId, task] of this.workerTasks.entries()) {
            task.reject(error);
          }
          this.workerTasks.clear();
        };
        
        console.log('🚀 Web Worker initialized for CPU-intensive calculations');
      } catch (error) {
        console.warn('Failed to initialize Web Worker, falling back to main thread:', error);
        this.worker = null;
      }
    }
  }

  /**
   * Terminate Web Worker
   */
  private terminateWorker(): void {
    if (this.worker) {
      // Reject all pending tasks
      for (const [taskId, task] of this.workerTasks.entries()) {
        task.reject(new Error('Worker terminated'));
      }
      this.workerTasks.clear();
      
      this.worker.terminate();
      this.worker = null;
      console.log('🛑 Web Worker terminated');
    }
  }

  /**
   * Execute CPU-intensive calculation in Web Worker or fallback to main thread
   */
  private async executeInWorker<T>(
    taskType: string,
    data: any,
    fallbackFn: () => Promise<T>
  ): Promise<T> {
    // Initialize worker if not already done
    if (!this.worker) {
      this.initializeWorker();
    }
    
    // If worker is not available, use fallback
    if (!this.worker) {
      console.log(`⚠️ Web Worker not available, using main thread for ${taskType}`);
      return await fallbackFn();
    }
    
    const taskId = `${taskType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise<T>((resolve, reject) => {
      // Store task info
      this.workerTasks.set(taskId, {
        resolve,
        reject,
        startTime: Date.now()
      });
      
      // Send task to worker
      this.worker!.postMessage({
        type: taskType,
        data,
        taskId
      });
      
      // Set timeout for worker tasks (30 seconds)
      setTimeout(() => {
        if (this.workerTasks.has(taskId)) {
          this.workerTasks.delete(taskId);
          reject(new Error(`Worker task ${taskId} timed out`));
        }
      }, 30000);
    });
  }

  /**
   * Analyze conflicts for event dates
   */
  async analyzeConflicts(params: ConflictAnalysisParams): Promise<ConflictAnalysisResult> {
    const startTime = Date.now();
    try {
      console.log('Starting conflict analysis with params:', params);
      
      // Fetch events from multiple APIs
      const fetchStartTime = Date.now();
      const { filteredEvents, allEvents, deduplicationResult } = await this.fetchEventsFromAPI(params);
      const fetchTime = Date.now() - fetchStartTime;
      console.log(`Total filtered events: ${filteredEvents.length}, Total unfiltered events: ${allEvents.length} (took ${fetchTime}ms)`);
      
      // Store the original unfiltered events for UI display
      const originalAllEvents = [...allEvents];
      
      // Pre-process events into high-performance data structures
      const preprocessStartTime = Date.now();
      this.eventIndex = this.preprocessEvents(filteredEvents);
      const preprocessTime = Date.now() - preprocessStartTime;
      console.log(`Event preprocessing completed in ${preprocessTime}ms`);
      
      // Clean expired cache entries
      this.cleanExpiredCache();
      
      // Generate date recommendations using optimized algorithms
      const analysisStartTime = Date.now();
      const dateRecommendations = await this.generateDateRecommendationsOptimized(
        params,
        filteredEvents
      );
      const analysisTime = Date.now() - analysisStartTime;
      console.log(`Generated ${dateRecommendations.length} date recommendations (took ${analysisTime}ms)`);

      // Log all recommendations with their scores
      dateRecommendations.forEach((rec, index) => {
        console.log(`Recommendation ${index + 1}: ${rec.startDate} to ${rec.endDate} - Score: ${rec.conflictScore}, Risk: ${rec.riskLevel}, Competing Events: ${rec.competingEvents.length}`);
      });

      // Categorize recommendations - prioritize user's preferred dates
      // First, ensure user's preferred dates are always included in the appropriate category
      const userPreferredDates = dateRecommendations.filter(rec => 
        rec.startDate === params.startDate && rec.endDate === params.endDate
      );
      
      // Get all other dates (non-user preferred)
      const otherDates = dateRecommendations.filter(rec => 
        !(rec.startDate === params.startDate && rec.endDate === params.endDate)
      );

      // Build recommended dates: user's preferred dates (if low risk) + other low risk dates
      const userPreferredLowRisk = userPreferredDates.filter(rec => rec.riskLevel === 'Low');
      const otherLowRiskDates = otherDates.filter(rec => rec.riskLevel === 'Low');
      
      const recommendedDates = [
        ...userPreferredLowRisk, // Always include user's preferred dates if they're low risk
        ...otherLowRiskDates
      ].slice(0, 3); // Top 3 recommendations

      // Build high risk dates: user's preferred dates (if medium/high risk) + other high risk dates
      const userPreferredMediumHighRisk = userPreferredDates.filter(rec => 
        rec.riskLevel === 'Medium' || rec.riskLevel === 'High'
      );
      const otherHighRiskDates = otherDates.filter(rec => {
        // Include high risk dates
        if (rec.riskLevel === 'High') return true;
        // Include medium risk dates with significant conflicts
        if (rec.riskLevel === 'Medium' && rec.conflictScore > 6) return true;
        return false;
      });
      
      const highRiskDates = [
        ...userPreferredMediumHighRisk, // Always include user's preferred dates if they're medium/high risk
        ...otherHighRiskDates
      ].sort((a, b) => {
        // Prioritize user's preferred dates first
        const aIsPreferred = a.startDate === params.startDate && a.endDate === params.endDate;
        const bIsPreferred = b.startDate === params.startDate && b.endDate === params.endDate;
        if (aIsPreferred && !bIsPreferred) return -1;
        if (!aIsPreferred && bIsPreferred) return 1;
        // Then sort by conflict score
        return b.conflictScore - a.conflictScore;
      }).slice(0, 5); // Show up to 5 high-risk dates

      // Remove any dates that are already in recommended dates to avoid duplicates
      const recommendedDateKeys = new Set(recommendedDates.map(rec => `${rec.startDate}-${rec.endDate}`));
      const filteredHighRiskDates = highRiskDates.filter(rec => {
        const isUserPreferred = rec.startDate === params.startDate && rec.endDate === params.endDate;
        const isDuplicate = recommendedDateKeys.has(`${rec.startDate}-${rec.endDate}`);
        // Always include user's preferred dates, even if they appear in both categories
        return isUserPreferred || !isDuplicate;
      });
      console.log(`Final results: ${recommendedDates.length} low risk dates, ${filteredHighRiskDates.length} high risk dates`);
      console.log(`User's preferred dates (${params.startDate} to ${params.endDate}) included: ${filteredHighRiskDates.some(d => d.startDate === params.startDate && d.endDate === params.endDate)}`);
      console.log(`High-risk dates scores:`, filteredHighRiskDates.map(d => `${d.startDate}: ${d.conflictScore} (${d.riskLevel})`));

      const totalTime = Date.now() - startTime;
      console.log(`🎯 Conflict analysis completed in ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);

      return {
        recommendedDates,
        highRiskDates: filteredHighRiskDates,
        allEvents: originalAllEvents, // Return original unfiltered events for UI display
        analysisDate: new Date().toISOString(),
        userPreferredStartDate: params.startDate,
        userPreferredEndDate: params.endDate,
        deduplicationMetrics: deduplicationResult ? eventDeduplicator.getMetrics(deduplicationResult) : undefined
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ Error in conflict analysis after ${totalTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Fetch events from multiple APIs (Ticketmaster, PredictHQ, and Brno)
   */
  private async fetchEventsFromAPI(params: ConflictAnalysisParams): Promise<{ filteredEvents: Event[], allEvents: Event[], deduplicationResult?: any }> {
    // Validate required parameters
    if (!params.city) {
      throw new Error('City is required');
    }
    
    if (!params.dateRangeStart || !params.dateRangeEnd) {
      throw new Error('Analysis date range is required');
    }

    // Add geographic validation
    const countryCode = getCityCountryCode(params.city);
    if (!validateCityCountryPair(params.city, countryCode)) {
      console.warn(`Geographic mismatch: ${params.city} does not belong to ${countryCode}`);
      // Use the correct country code from our mapping
      const correctCountryCode = getCityCountryCode(params.city);
      console.log(`Using correct country code: ${correctCountryCode} for city: ${params.city}`);
    }

    const queryParams = new URLSearchParams({
      city: params.city,
      startDate: params.dateRangeStart,
      endDate: params.dateRangeEnd,
      category: params.category,
      size: '25', // Reduced from 50 for faster responses
      useComprehensiveFallback: params.useComprehensiveFallback !== false ? 'true' : 'false' // Default to true for better event discovery
    });

    // Add radius only for PredictHQ (Ticketmaster city variations work better without radius)
    const ticketmasterQueryParams = new URLSearchParams(queryParams);
    const predicthqQueryParams = new URLSearchParams(queryParams);
    predicthqQueryParams.set('radius', params.searchRadius || '50km');

    console.log('Fetching events with params:', queryParams.toString());

    // Get base URL for server-side requests
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://oslavu-app.vercel.app'
        : `http://localhost:${process.env.PORT || 3000}`);

    // Add this debug logging block right after: console.log('Fetching events with params:', queryParams.toString());
    console.log('🔍 Production Debug Info:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL);
    console.log('Final baseUrl:', baseUrl);
    console.log('API Keys availability:');
    console.log('- TICKETMASTER_API_KEY:', !!process.env.TICKETMASTER_API_KEY);
    console.log('- PREDICTHQ_API_KEY:', !!process.env.PREDICTHQ_API_KEY);
    console.log('API URLs being called:');
    console.log('- Ticketmaster:', `${baseUrl}/api/analyze/events/ticketmaster?${ticketmasterQueryParams.toString()}`);
    console.log('- PredictHQ:', `${baseUrl}/api/analyze/events/predicthq?${predicthqQueryParams.toString()}`);
    console.log('- Brno:', `${baseUrl}/api/analyze/events/brno?${new URLSearchParams({
      startDate: params.dateRangeStart,
      endDate: params.dateRangeEnd
    }).toString()}`);

    // Use consistent search parameters for all APIs with expanded category mapping
    const expandedCategories = this.getExpandedCategories(params.category);
    const ticketmasterExpandedCategories = this.getTicketmasterExpandedCategories(params.category);
    
    const standardTicketmasterParams = new URLSearchParams({
      city: params.city,
      startDate: params.dateRangeStart,
      endDate: params.dateRangeEnd,
      category: params.category,
      expandedCategories: ticketmasterExpandedCategories.join(','), // FIXED: Use Ticketmaster-specific categories
      size: '25'
    });

    const standardPredicthqParams = new URLSearchParams({
      city: params.city,
      startDate: params.dateRangeStart,
      endDate: params.dateRangeEnd,
      category: params.category,
      expandedCategories: expandedCategories.join(','),
      size: '25',
      radius: params.searchRadius || '50km'
    });

    // Create timeout controller for API requests
    const timeoutMs = 6000; // Consistent 6 second timeout for all requests
    const createTimeoutFetch = (url: string, apiName: string) => {
      // Get API-specific timeout (more reasonable values for external APIs)
      let specificTimeout = timeoutMs;
      if (apiName === 'ticketmaster') {
        specificTimeout = 8000; // Restored to reasonable timeout for external API
      } else if (apiName === 'predicthq') {
        specificTimeout = 10000; // Restored to reasonable timeout for external API
      } else if (apiName === 'brno') { 
        specificTimeout = 6000; // Restored to reasonable timeout for external API
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), specificTimeout);
      
      return fetch(url, { 
        signal: controller.signal,
        headers: {
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept': 'application/json'
        }
      }).finally(() => clearTimeout(timeoutId));
    };

    // Request deduplication helper
    const getCachedRequest = (url: string, apiName: string) => {
      const now = Date.now();
      const cacheKey = `${apiName}:${url}`;
      
      // Clean expired entries
      if (this.cacheExpiry.has(cacheKey) && this.cacheExpiry.get(cacheKey)! < now) {
        console.log(`🧹 Cleaning expired cache entry for ${apiName}`);
        this.requestCache.delete(cacheKey);
        this.cacheExpiry.delete(cacheKey);
      }
      
      // Return cached request or create new one
      if (this.requestCache.has(cacheKey)) {
        const expiryTime = this.cacheExpiry.get(cacheKey);
        const remainingTime = expiryTime ? Math.round((expiryTime - now) / 1000) : 0;
        console.log(`🔄 Using cached request for ${apiName} (expires in ${remainingTime}s)`);
        return this.requestCache.get(cacheKey)!;
      }
      
      console.log(`🆕 Creating new request for ${apiName}`);
      const request = createTimeoutFetch(url, apiName);
      this.requestCache.set(cacheKey, request);
      this.cacheExpiry.set(cacheKey, now + this.CACHE_TTL);
      
      return request;
    };

    // Optimized parallel execution
    console.log(`🚀 Starting optimized parallel API requests...`);
    const startTime = Date.now();
    
    // Create API request promises with consistent parameters
    const ticketmasterUrl = `${baseUrl}/api/analyze/events/ticketmaster?${standardTicketmasterParams.toString()}`;
    const predicthqUrl = `${baseUrl}/api/analyze/events/predicthq?${standardPredicthqParams.toString()}`;
    const brnoUrl = `${baseUrl}/api/analyze/events/brno?${new URLSearchParams({
      startDate: params.dateRangeStart,
      endDate: params.dateRangeEnd
    }).toString()}`;

    console.log('🔗 API URLs being called:');
    console.log(`  Ticketmaster: ${ticketmasterUrl}`);
    console.log(`  PredictHQ: ${predicthqUrl}`);
    console.log(`  Brno: ${brnoUrl}`);

    // Add scraped events URL
    const scrapedUrl = `${baseUrl}/api/events/scraped?${queryParams.toString()}`;
    console.log(`  Scraped: ${scrapedUrl}`);

    const apiRequests = [
      {
        name: 'ticketmaster',
        promise: createTimeoutFetch(ticketmasterUrl, 'ticketmaster') // Temporarily disable caching for debugging
      },
      {
        name: 'predicthq', 
        promise: createTimeoutFetch(predicthqUrl, 'predicthq') // Temporarily disable caching for debugging
      },
      {
        name: 'brno',
        promise: createTimeoutFetch(brnoUrl, 'brno') // Temporarily disable caching for debugging
      },
      {
        name: 'scraped',
        promise: createTimeoutFetch(scrapedUrl, 'scraped') // Add scraped events
      }
    ];

    // Optimized parallel execution
    const allEvents: Event[] = [];
    const responses: Array<{name: string, status: 'fulfilled' | 'rejected', value?: any, reason?: any}> = [];
    let completedCount = 0;
    
    // Process requests as they complete
    const processResponse = async (apiRequest: typeof apiRequests[0], index: number) => {
      const requestStartTime = Date.now();
      console.log(`🚀 Starting request for ${apiRequest.name}...`);
      
      try {
        const response = await apiRequest.promise;
        const requestTime = Date.now() - requestStartTime;
        console.log(`📡 ${apiRequest.name}: Response received in ${requestTime}ms, status: ${response.status}`);
        
        responses[index] = { name: apiRequest.name, status: 'fulfilled', value: response };
        
        // Process the response immediately
        if (response.ok) {
          const events = await this.extractEventsFromResponse(response, apiRequest.name);
          allEvents.push(...events);
          console.log(`✅ ${apiRequest.name}: Added ${events.length} events (total: ${allEvents.length})`);
        } else {
          console.warn(`❌ ${apiRequest.name}: HTTP error ${response.status}`);
        }
      } catch (error) {
        const requestTime = Date.now() - requestStartTime;
        responses[index] = { name: apiRequest.name, status: 'rejected', reason: error };
        
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn(`⏰ ${apiRequest.name}: Request timed out after ${requestTime}ms`);
        } else {
          console.warn(`⚠️ ${apiRequest.name}: Request failed after ${requestTime}ms:`, error);
        }
      }
      
      completedCount++;
      return false;
    };

    // Process all requests in parallel
    const racePromises = apiRequests.map((req, idx) => processResponse(req, idx));
    
    // Wait for all requests to complete
    try {
      await Promise.allSettled(racePromises);
    } catch (error) {
      console.warn('Error in parallel request processing:', error);
    }

    // Create legacy response format for compatibility
    const [ticketmasterResponse, predicthqResponse, brnoResponse, scrapedResponse] = responses;

    const totalFetchTime = Date.now() - startTime;
    console.log(`🚀 API requests completed in ${totalFetchTime}ms`);


    // Store original unfiltered events for UI display
    const originalAllEvents = [...allEvents];
    
    // Filter events by location to remove distant cities
    console.log(`📍 Events before location filtering: ${allEvents.length}`);
    console.log(`📍 Sample event cities:`, allEvents.slice(0, 5).map(e => ({ title: e.title, city: e.city, venue: e.venue })));
    
    // Debug: Check for foreign events before filtering
    const foreignEvents = allEvents.filter(e => {
      const eventCity = e.city?.toLowerCase().trim() || '';
      const targetCity = params.city.toLowerCase().trim();
      
      // Check for known foreign patterns
      const isForeign = eventCity !== targetCity && 
                       eventCity !== 'brno' && 
                       eventCity !== 'prague' &&
                       (eventCity.includes('-') && !eventCity.startsWith(targetCity)) || // Foreign patterns like "US-CA"
                       ['westfield', 'kragujevac', 'adelaide', 'halifax', 'baltimore', 'atlanta', 'exeter', 'concord', 'kerikeri'].includes(eventCity);
      
      return isForeign;
    });
    console.log(`🚨 Found ${foreignEvents.length} foreign events before location filtering:`, foreignEvents.slice(0, 5).map(e => ({ title: e.title, city: e.city })));
    
    const locationFilteredEvents = await this.filterEventsByLocation(allEvents, params.city);
    console.log(`📍 Total events after location filtering: ${locationFilteredEvents.length}`);

    // For conflict analysis, use all location-filtered events to consider all potential competitors
    // But for UI display, we'll show only category-relevant events
    console.log(`📂 Using all location-filtered events for conflict analysis, category filtering applied for UI display`);

    // NEW: Semantic deduplication across all sources using vector embeddings
    console.log(`📊 Total events before semantic deduplication: ${locationFilteredEvents.length}`);
    
    const deduplicationResult = await eventDeduplicator.deduplicateEvents(locationFilteredEvents);
    const uniqueEvents: Event[] = deduplicationResult.uniqueEvents;
    
    console.log(`📊 Events after semantic deduplication: ${uniqueEvents.length}`);
    console.log(`📊 Duplicates removed: ${deduplicationResult.duplicatesRemoved}`);
    console.log(`⏱️ Deduplication took ${deduplicationResult.processingTimeMs}ms`);

    // Log search strategy summary
    console.log(`🎯 SEARCH SUMMARY:`);
    console.log(`  - Search Type: Consistent geographic and category filtering`);
    console.log(`  - Total Events Found: ${allEvents.length}`);
    console.log(`  - After Location Filtering: ${locationFilteredEvents.length}`);
    console.log(`  - After Deduplication: ${uniqueEvents.length}`);
    console.log(`  - Deduplication Rate: ${((allEvents.length - uniqueEvents.length) / allEvents.length * 100).toFixed(1)}%`);
    console.log(`  - Geographic Filtering: Strict city-based filtering enabled`);
    console.log(`  - Category Filtering: Applied at API level and post-processing`);

    // Update USP data with event counts from different sources
    try {
      const eventCounts: Record<string, number> = {};
      
      // Count events by source (you might need to add source tracking to events)
      // For now, we'll estimate based on the total events and known sources
      const activeSources = ['ticketmaster', 'predicthq', 'brno-local'];
      const eventsPerSource = Math.floor(uniqueEvents.length / activeSources.length);
      
      activeSources.forEach(sourceId => {
        eventCounts[sourceId] = eventsPerSource;
      });
      
      // Update USP data
      await USPUpdater.updateMultipleEventCounts(eventCounts);
    } catch (error) {
      console.error('Failed to update USP data:', error);
    }

    // For UI display, show category-filtered events to show only relevant events
    // This ensures users see events that are actually relevant to their event type
    const categoryFilteredEvents = this.filterEventsByCategory(uniqueEvents, params.category);
    console.log(`📂 UI display events (category-filtered): ${categoryFilteredEvents.length}`);
    console.log(`📂 All location-filtered events: ${uniqueEvents.length}`);
    
    return { 
      filteredEvents: uniqueEvents, // Use all location-filtered events for conflict analysis
      allEvents: categoryFilteredEvents, // Show only category-relevant events in UI
      deduplicationResult // Include deduplication result for metrics
    };
  }

  /**
   * Generate date recommendations using optimized algorithms
   */
  private async generateDateRecommendationsOptimized(
    params: ConflictAnalysisParams,
    events: Event[]
  ): Promise<DateRecommendation[]> {
    const recommendations: DateRecommendation[] = [];
    
    // Generate potential dates around the preferred dates
    const potentialDates = this.generatePotentialDates(params);
    console.log(`Generated ${potentialDates.length} potential date ranges to analyze`);
    
    // Process dates in parallel for better performance
    const datePromises = potentialDates.map(async (dateRange, index) => {
      const dateStartTime = Date.now();
      console.log(`Analyzing date range ${index + 1}/${potentialDates.length}: ${dateRange.startDate} to ${dateRange.endDate}`);
      
      // Use optimized conflict detection
      const competingEvents = this.findCompetingEventsOptimized(
        dateRange.startDate,
        dateRange.endDate,
        params
      );

      // Determine severity level based on number of competing events
      const severityLevel = this.determineSeverityLevel(competingEvents.length);
      const config = this.severityConfigs[severityLevel];

      const conflictScore = await this.calculateConflictScoreOptimized(
        competingEvents,
        params.expectedAttendees,
        params.category,
        params,
        config
      );

      const riskLevel = this.determineRiskLevel(conflictScore);
      const reasons = this.generateReasons(competingEvents, conflictScore);

      // Advanced analysis features
      let audienceOverlap;

      // Advanced analysis is disabled for performance reasons
      // Audience overlap analysis causes 70+ second delays due to sequential OpenAI API calls
      // This feature will be re-enabled in a higher-tier plan with optimized implementation
      if (params.enableAdvancedAnalysis !== false) {
        // Calculate audience overlap analysis
        audienceOverlap = await this.calculateAudienceOverlapAnalysis(
          competingEvents,
          params
        );

      }

      const dateTime = Date.now() - dateStartTime;
      console.log(`✅ Date range ${index + 1} analyzed in ${dateTime}ms (Score: ${conflictScore}, Risk: ${riskLevel}, Events: ${competingEvents.length})`);

      return {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        conflictScore,
        riskLevel,
        competingEvents,
        reasons,
        audienceOverlap
      };
    });

    // Wait for all date analyses to complete
    const results = await Promise.all(datePromises);
    recommendations.push(...results);

    // Sort by conflict score (ascending for recommendations, descending for high risk)
    return recommendations.sort((a, b) => a.conflictScore - b.conflictScore);
  }

  /**
   * Determine severity level based on number of competing events
   */
  private determineSeverityLevel(competingEventsCount: number): string {
    if (competingEventsCount <= 5) return 'low';
    if (competingEventsCount <= 15) return 'medium';
    return 'high';
  }

  /**
   * Generate date recommendations based on events and parameters (legacy method)
   */
  private async generateDateRecommendations(
    params: ConflictAnalysisParams,
    events: Event[]
  ): Promise<DateRecommendation[]> {
    const recommendations: DateRecommendation[] = [];
    
    // Generate potential dates around the preferred dates
    const potentialDates = this.generatePotentialDates(params);
    console.log(`Generated ${potentialDates.length} potential date ranges to analyze`);
    
    for (let i = 0; i < potentialDates.length; i++) {
      const dateRange = potentialDates[i];
      const dateStartTime = Date.now();
      console.log(`Analyzing date range ${i + 1}/${potentialDates.length}: ${dateRange.startDate} to ${dateRange.endDate}`);
      const competingEvents = this.findCompetingEvents(
        dateRange.startDate,
        dateRange.endDate,
        events,
        params
      );

      const conflictScore = await this.calculateConflictScore(
        competingEvents,
        params.expectedAttendees,
        params.category,
        params
      );

      const riskLevel = this.determineRiskLevel(conflictScore);
      const reasons = this.generateReasons(competingEvents, conflictScore);

      // Advanced analysis features
      let audienceOverlap;

      // Advanced analysis is disabled for performance reasons
      // Audience overlap analysis causes 70+ second delays due to sequential OpenAI API calls
      // This feature will be re-enabled in a higher-tier plan with optimized implementation
      if (params.enableAdvancedAnalysis !== false) {
        // Calculate audience overlap analysis
        audienceOverlap = await this.calculateAudienceOverlapAnalysis(
          competingEvents,
          params
        );

      }

      recommendations.push({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        conflictScore,
        riskLevel,
        competingEvents,
        reasons,
        audienceOverlap
      });

      const dateTime = Date.now() - dateStartTime;
      console.log(`✅ Date range ${i + 1} analyzed in ${dateTime}ms (Score: ${conflictScore}, Risk: ${riskLevel}, Events: ${competingEvents.length})`);
    }

    // Sort by conflict score (ascending for recommendations, descending for high risk)
    return recommendations.sort((a, b) => a.conflictScore - b.conflictScore);
  }

  /**
   * Generate potential dates around the preferred dates and throughout the analysis range
   */
  private generatePotentialDates(params: ConflictAnalysisParams): Array<{startDate: string, endDate: string}> {
    const dates: Array<{startDate: string, endDate: string}> = [];
    const preferredStart = new Date(params.startDate);
    const preferredEnd = new Date(params.endDate);
    const eventDuration = Math.max(1, Math.ceil((preferredEnd.getTime() - preferredStart.getTime()) / (1000 * 60 * 60 * 24)));
    
    console.log(`📅 Date calculation: preferred ${params.startDate} to ${params.endDate}, duration: ${eventDuration} days`);

    // ALWAYS include the user's preferred date first, regardless of analysis range
    dates.push({
      startDate: params.startDate,
      endDate: params.endDate
    });

    // Then generate dates ±7 days around preferred dates for more comprehensive analysis
    for (let i = -7; i <= 7; i++) {
      if (i === 0) continue; // Skip the user's preferred date (already added above)
      
      const startDate = new Date(preferredStart);
      startDate.setDate(startDate.getDate() + i);
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + eventDuration);

      // Only include dates within the analysis range
      if (startDate >= new Date(params.dateRangeStart) && 
          endDate <= new Date(params.dateRangeEnd)) {
        dates.push({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });
      }
    }

    // Additionally, sample dates throughout the entire analysis range to catch high-risk periods
    const analysisStart = new Date(params.dateRangeStart);
    const analysisEnd = new Date(params.dateRangeEnd);
    const totalDays = Math.ceil((analysisEnd.getTime() - analysisStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // Sample every 3 days throughout the range to find high-risk dates
    for (let dayOffset = 0; dayOffset < totalDays; dayOffset += 3) {
      const startDate = new Date(analysisStart);
      startDate.setDate(startDate.getDate() + dayOffset);
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + eventDuration);

      // Only include if within range and not already added
      if (endDate <= analysisEnd) {
        const dateStr = {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        };
        
        // Check if this date range is already in our list
        const alreadyExists = dates.some(d => 
          d.startDate === dateStr.startDate && d.endDate === dateStr.endDate
        );
        
        if (!alreadyExists) {
          dates.push(dateStr);
        }
      }
    }

    console.log(`Generated ${dates.length} potential date ranges for analysis`);
    return dates;
  }

  /**
   * Find competing events using optimized data structures
   */
  private findCompetingEventsOptimized(
    startDate: string,
    endDate: string,
    params: ConflictAnalysisParams
  ): Event[] {
    if (!this.eventIndex) {
      console.warn('Event index not available, falling back to legacy method');
      return [];
    }

    const startTime = Date.now();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    console.log(`🔍 Finding competing events between ${startDate} and ${endDate} using optimized search`);
    
    const competingEventIds = new Set<string>();
    
    // Get all dates in the range
    const datesInRange = this.getDatesInRange(startDate, endDate);
    
    // Find events by date using the index
    for (const date of datesInRange) {
      const eventsOnDate = this.eventIndex.byDate.get(date);
      if (eventsOnDate) {
        for (const eventId of eventsOnDate) {
          competingEventIds.add(eventId);
        }
      }
    }
    
    // For conflict analysis, be more lenient - consider all events in the city during the date range
    // as potential competitors, not just same category
    const filteredEventIds = new Set<string>();
    for (const eventId of competingEventIds) {
      const event = this.eventIndex.events.get(eventId);
      if (!event) continue;
      
      // Check if event is in the same category or related categories
      const sameCategory = event.category === params.category || 
                          this.isRelatedCategory(event.category, params.category);
      
      // Check if it's a significant event (has venue, good attendance potential)
      const isSignificant = event.venue && event.venue.length > 0;
      
      // Check if it has substantial expected attendance
      const hasAttendance = event.expectedAttendees && event.expectedAttendees > 50;
      
      // More restrictive matching - only include events that are:
      // 1. Same/related category (primary criteria), OR
      // 2. Significant events in related categories (secondary criteria)
      // This prevents sports events from conflicting with business events
      const isCompeting = sameCategory || (isSignificant && this.isRelatedCategory(event.category, params.category));      
      if (isCompeting) {
        filteredEventIds.add(eventId);
        console.log(`✅ Competing event "${event.title}" on ${event.date}: category="${event.category}", sameCategory=${sameCategory}, isSignificant=${isSignificant}, hasAttendance=${hasAttendance}, isCompeting=${isCompeting}`);
      } else {
        console.log(`❌ Filtered out "${event.title}" on ${event.date}: category="${event.category}", sameCategory=${sameCategory}, isSignificant=${isSignificant}, hasAttendance=${hasAttendance}`);
      }
    }
    
    // Convert event IDs back to Event objects
    const competingEvents: Event[] = [];
    for (const eventId of filteredEventIds) {
      const event = this.eventIndex.events.get(eventId);
      if (event) {
        competingEvents.push(event);
      }
    }
    
    const searchTime = Date.now() - startTime;
    console.log(`✅ Found ${competingEvents.length} competing events in ${searchTime}ms using optimized search`);
    
    return competingEvents;
  }

  /**
   * Get all dates in a range (inclusive)
   */
  private getDatesInRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }

  /**
   * Find events that compete with the proposed date range (legacy method)
   */
  private findCompetingEvents(
    startDate: string,
    endDate: string,
    events: Event[],
    params: ConflictAnalysisParams
  ): Event[] {
    const start = new Date(startDate);
    const end = new Date(endDate);

    console.log(`Looking for competing events between ${startDate} and ${endDate}`);
    console.log(`Total events to check: ${events.length}`);

    const competingEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      
      // Check if event overlaps with our date range (inclusive)
      const overlaps = eventDate >= start && eventDate <= end;
      
      // Check if it's in the same category or related categories
      const sameCategory = event.category === params.category || 
                          this.isRelatedCategory(event.category, params.category);
      
      // Check if it's a significant event (has venue, good attendance potential)
      const isSignificant = event.venue && event.venue.length > 0;

      // More lenient matching - include events that are either same category OR significant
      const isCompeting = overlaps && (sameCategory || isSignificant);

      if (overlaps) {
        console.log(`Event "${event.title}" on ${event.date}: category="${event.category}", overlaps=${overlaps}, sameCategory=${sameCategory}, isSignificant=${isSignificant}, isCompeting=${isCompeting}`);
      }

      return isCompeting;
    });

    console.log(`Found ${competingEvents.length} competing events`);
    return competingEvents;
  }

  /**
   * Calculate conflict score using optimized algorithms, caching, and Web Workers
   */
  private async calculateConflictScoreOptimized(
    competingEvents: Event[],
    expectedAttendees: number,
    category: string,
    params: ConflictAnalysisParams,
    config: ConflictSeverityConfig
  ): Promise<number> {
    if (competingEvents.length === 0) {
      console.log('No competing events, score = 0');
      return 0;
    }

    const startTime = Date.now();
    // OPTIMIZED: Reduced logging in production for better performance
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🚀 Calculating optimized conflict score for ${competingEvents.length} competing events (${config.depth} depth)`);
    }

    // Use Web Worker for CPU-intensive calculations if available
    // OPTIMIZED: Increased threshold to 50 for better performance on small datasets
    if (competingEvents.length > 50) {
      try {
        const workerResult = await this.executeInWorker<{score: number, processingTime: number, eventsProcessed: number}>(
          'calculateConflictScore',
          {
            competingEvents,
            expectedAttendees,
            category,
            config
          },
          async () => {
            const score = await this.calculateConflictScoreFallback(competingEvents, expectedAttendees, category, config);
            return { score, processingTime: 0, eventsProcessed: competingEvents.length };
          }
        );

        const totalTime = Date.now() - startTime;
        console.log(`✅ Web Worker conflict score calculation completed in ${totalTime}ms: ${workerResult.score}`);
        return workerResult.score;
      } catch (error) {
        console.warn('Web Worker failed, falling back to main thread:', error);
      }
    }

    // Fallback to main thread calculation
    return await this.calculateConflictScoreFallback(competingEvents, expectedAttendees, category, config, params);
  }

  /**
   * Fallback conflict score calculation on main thread
   */
  private async calculateConflictScoreFallback(
    competingEvents: Event[],
    expectedAttendees: number,
    category: string,
    config: ConflictSeverityConfig,
    params?: ConflictAnalysisParams
  ): Promise<number> {
    const startTime = Date.now();
    let score = 0;
    // OPTIMIZED: Reduced logging in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔄 Using main thread for conflict score calculation`);
    }

    // Sort events by significance for prioritized processing
    const sortedEvents = competingEvents
      .map(event => ({
        event,
        significance: this.calculateEventSignificance(event)
      }))
      .sort((a, b) => b.significance - a.significance)
      .slice(0, config.maxComparisons); // Limit based on severity config

    // OPTIMIZED: Reduced logging in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Processing top ${sortedEvents.length} most significant events for detailed analysis`);
    }

    // Process events with caching
    for (const { event } of sortedEvents) {
      let eventScore = 0;
      
      // Check cache first
      const cachedScore = this.getCachedConflictScore('planned', event.id, config);
      
      if (cachedScore !== null) {
        eventScore = cachedScore;
        console.log(`  "${event.title}": cached score = ${eventScore}`);
      } else {
        // Calculate score using optimized algorithm
        eventScore = this.calculateEventConflictScore(event, category, config);
        
        // Apply audience overlap analysis if enabled and available
        if (params?.enableAdvancedAnalysis) {
          // Create a mock event for the user's planned event
          const plannedEvent: Event = {
            id: 'planned_event',
            title: 'Planned Event',
            date: params.startDate,
            city: params.city,
            category: params.category,
            expectedAttendees: params.expectedAttendees,
            source: 'manual',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          // Calculate audience overlap with longer timeout and fallback logic
          try {
            const overlap = await Promise.race([
              openaiAudienceOverlapService.isAvailable()
                ? openaiAudienceOverlapService.predictAudienceOverlap(plannedEvent, event)
                : audienceOverlapService.predictAudienceOverlap(plannedEvent, event),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Audience overlap analysis timeout')), 10000) // Increased to 10 seconds
              )
            ]) as any;

            // Apply audience overlap multiplier with improved logic
            const overlapMultiplier = this.calculateAudienceOverlapMultiplier(overlap.overlapScore, event.category, category);
            eventScore *= overlapMultiplier;
            console.log(`  "${event.title}": audience overlap ${(overlap.overlapScore * 100).toFixed(1)}% -> multiplier ${overlapMultiplier.toFixed(2)} (${openaiAudienceOverlapService.isAvailable() ? 'AI-powered' : 'rule-based'})`);
          } catch (overlapError) {
            // Fallback: Use conservative overlap estimation based on category similarity
            const fallbackOverlap = this.estimateOverlapFromCategories(event.category, category);
            const overlapMultiplier = this.calculateAudienceOverlapMultiplier(fallbackOverlap, event.category, category);
            eventScore *= overlapMultiplier;
            console.log(`  "${event.title}": audience overlap analysis failed, using fallback estimation ${(fallbackOverlap * 100).toFixed(1)}% -> multiplier ${overlapMultiplier.toFixed(2)}`);
          }
        }
        
        // Cache the result
        this.setCachedConflictScore('planned', event.id, config, eventScore);
        console.log(`  "${event.title}": final calculated score = ${eventScore}`);
      }
      
      score += eventScore;
    }

    // Add base score for remaining events (not processed in detail for performance)
    const remainingEvents = competingEvents.length - sortedEvents.length;
    if (remainingEvents > 0) {
      const remainingScore = remainingEvents * 2; // Further reduced base score for unprocessed events
      score += remainingScore;
      console.log(`Added base score for ${remainingEvents} remaining events: +${remainingScore}`);
    }

    console.log(`Base score before attendee adjustment: ${score}`);

    // Apply proportional scaling based on audience size and overlap
    // Smaller events should have proportionally lower conflict scores
    const audienceScalingFactor = this.calculateAudienceScalingFactor(expectedAttendees, competingEvents);
    score *= audienceScalingFactor;
    console.log(`Audience scaling factor: ${audienceScalingFactor.toFixed(2)} (${expectedAttendees} attendees) -> adjusted score: ${score}`);

    // Adjust based on expected attendees (larger events are more affected by conflicts)
    if (expectedAttendees > 1000) {
      score *= 1.1; // Reduced from 1.05 to 1.1
      console.log(`Large event (${expectedAttendees} attendees): score *= 1.1 = ${score}`);
    } else if (expectedAttendees > 500) {
      score *= 1.05; // Reduced from 1.05 to 1.05
      console.log(`Medium event (${expectedAttendees} attendees): score *= 1.05 = ${score}`);
    }

    // Cap the score at 20 (adjusted for new scoring system)
    const finalScore = Math.min(score, 20);
    const calculationTime = Date.now() - startTime;
    console.log(`✅ Main thread conflict score calculation completed in ${calculationTime}ms: ${finalScore}`);
    return finalScore;
  }

  /**
   * Calculate event significance score for prioritization
   */
  private calculateEventSignificance(event: Event): number {
    let significance = 0;
    
    // Base significance (reduced from 10 to 5)
    significance += 5;
    
    // Higher significance for events with venues (reduced from 20 to 10)
    if (event.venue) {
      significance += 10;
    }
    
    // Higher significance for events with images (reduced from 15 to 8)
    if (event.imageUrl) {
      significance += 8;
    }
    
    // Higher significance for events with descriptions (reduced from 10 to 5)
    if (event.description && event.description.length > 50) {
      significance += 5;
    }
    
    // Higher significance for events with expected attendees (reduced impact)
    if (event.expectedAttendees && event.expectedAttendees > 100) {
      significance += Math.min(event.expectedAttendees / 20, 15); // Reduced from /10, 25 to /20, 15
    }
    
    return significance;
  }

  /**
   * Calculate conflict score for a single event using optimized algorithm
   */
  private calculateEventConflictScore(event: Event, category: string, config: ConflictSeverityConfig): number {
    let eventScore = 0;
    
    // Base score for any competing event - increased to catch more events
    eventScore += 5;
    
    // Higher score for same category - increased to better detect same-category conflicts
    if (event.category === category) {
      eventScore += 10;
    }
    
    // Higher score for events with venues (more significant) - increased
    if (event.venue) {
      eventScore += 6;
    }
    
    // Higher score for events with images (more professional/promoted) - increased
    if (event.imageUrl) {
      eventScore += 3;
    }
    
    // Higher score for events with descriptions (more detailed/promoted) - increased
    if (event.description && event.description.length > 50) {
      eventScore += 2;
    }
    
    // Higher score for events with expected attendees (indicates significant events)
    if (event.expectedAttendees && event.expectedAttendees > 100) {
      eventScore += Math.min(event.expectedAttendees / 100, 5); // Up to 5 points for large events
    }
    
    // Adjust based on analysis depth
    if (config.depth === 'deep') {
      // More detailed analysis for deep mode
      if (event.expectedAttendees && event.expectedAttendees > 500) {
        eventScore += 3; // Increased for large events
      }
    }
    
    return eventScore;
  }

  /**
   * Calculate audience overlap multiplier with improved logic for small overlaps
   */
  private calculateAudienceOverlapMultiplier(overlapScore: number, competingEventCategory: string, plannedEventCategory: string): number {
    // Convert overlap score to percentage for easier understanding
    const overlapPercentage = overlapScore * 100;
    
    // Base multiplier starts at 1.0 (no change)
    let multiplier = 1.0;
    
    // For very small overlaps (less than 10%), apply minimal impact
    if (overlapPercentage < 10) {
      // Small overlaps should have minimal impact, especially for different categories
      if (competingEventCategory !== plannedEventCategory) {
        // Different categories with small overlap: very minimal impact
        multiplier = 1.0 + (overlapPercentage * 0.005); // Max 0.05x increase for 10% overlap
      } else {
        // Same category with small overlap: slightly more impact
        multiplier = 1.0 + (overlapPercentage * 0.01); // Max 0.1x increase for 10% overlap
      }
    }
    // For small to moderate overlaps (10-25%), apply proportional impact
    else if (overlapPercentage <= 25) {
      if (competingEventCategory !== plannedEventCategory) {
        // Different categories: moderate impact
        multiplier = 1.0 + (overlapPercentage * 0.02); // Max 0.5x increase for 25% overlap
      } else {
        // Same category: higher impact
        multiplier = 1.0 + (overlapPercentage * 0.03); // Max 0.75x increase for 25% overlap
      }
    }
    // For moderate overlaps (25-50%), apply significant impact
    else if (overlapPercentage <= 50) {
      if (competingEventCategory !== plannedEventCategory) {
        // Different categories: significant impact
        multiplier = 1.0 + (overlapPercentage * 0.04); // Max 2x increase for 50% overlap
      } else {
        // Same category: high impact
        multiplier = 1.0 + (overlapPercentage * 0.06); // Max 3x increase for 50% overlap
      }
    }
    // For high overlaps (50%+), apply maximum impact
    else {
      if (competingEventCategory !== plannedEventCategory) {
        // Different categories: maximum impact
        multiplier = 1.0 + (overlapPercentage * 0.08); // Max 5x increase for 50%+ overlap
      } else {
        // Same category: very high impact
        multiplier = 1.0 + (overlapPercentage * 0.12); // Max 7x increase for 50%+ overlap
      }
    }
    
    // Cap the multiplier to prevent extreme scores
    multiplier = Math.min(multiplier, 2.0); // Maximum 2.0x multiplier (increased from 1.5)
    
    console.log(`    Audience overlap analysis: ${overlapPercentage.toFixed(1)}% overlap, ${competingEventCategory} vs ${plannedEventCategory} -> ${multiplier.toFixed(2)}x multiplier`);
    
    return multiplier;
  }

  /**
   * Calculate audience scaling factor based on event size and competing events
   */
  private calculateAudienceScalingFactor(expectedAttendees: number, competingEvents: Event[]): number {
    // Base scaling factor
    let scalingFactor = 1.0;
    
    // Calculate total potential audience from competing events
    const totalCompetingAudience = competingEvents.reduce((sum, event) => {
      return sum + (event.expectedAttendees || 100); // Default to 100 if not specified
    }, 0);
    
    // Calculate market saturation factor
    const marketSaturation = totalCompetingAudience / (expectedAttendees + totalCompetingAudience);
    
    // Apply scaling based on market saturation
    if (marketSaturation < 0.1) {
      // Low saturation: minimal impact
      scalingFactor = 0.3;
    } else if (marketSaturation < 0.3) {
      // Moderate saturation: moderate impact
      scalingFactor = 0.5;
    } else if (marketSaturation < 0.6) {
      // High saturation: significant impact
      scalingFactor = 0.8;
    } else {
      // Very high saturation: maximum impact
      scalingFactor = 1.0;
    }
    
    // Adjust for event size - smaller events are less affected by conflicts
    if (expectedAttendees < 100) {
      scalingFactor *= 0.5; // Very small events
    } else if (expectedAttendees < 500) {
      scalingFactor *= 0.7; // Small events
    } else if (expectedAttendees < 1000) {
      scalingFactor *= 0.9; // Medium events
    }
    // Large events (1000+) keep full scaling factor
    
    console.log(`    Audience scaling: ${expectedAttendees} attendees, ${totalCompetingAudience} competing audience, saturation: ${(marketSaturation * 100).toFixed(1)}% -> factor: ${scalingFactor.toFixed(2)}`);
    
    return Math.max(scalingFactor, 0.1); // Minimum 0.1 factor to prevent zero scores
  }

  /**
   * Estimate overlap from category similarity when audience analysis fails
   */
  private estimateOverlapFromCategories(competingEventCategory: string, plannedEventCategory: string): number {
    // Same category: moderate overlap (30-50%)
    if (competingEventCategory === plannedEventCategory) {
      return 0.4; // 40% estimated overlap
    }
    
    // Related categories: low overlap (10-20%)
    const relatedCategories = {
      'Business': ['Marketing', 'Professional Development', 'Networking', 'Conferences'],
      'Technology': ['Business', 'Professional Development'],
      'Sports': ['Entertainment'],
      'Entertainment': ['Sports', 'Music', 'Art']
    };
    
    const plannedRelated = relatedCategories[plannedEventCategory as keyof typeof relatedCategories] || [];
    if (plannedRelated.includes(competingEventCategory)) {
      return 0.15; // 15% estimated overlap
    }
    
    // Unrelated categories: very low overlap (5-10%)
    return 0.075; // 7.5% estimated overlap
  }

  /**
   * Calculate conflict score based on competing events (legacy method)
   */
  private async calculateConflictScore(
    competingEvents: Event[],
    expectedAttendees: number,
    category: string,
    params: ConflictAnalysisParams
  ): Promise<number> {
    if (competingEvents.length === 0) {
      console.log('No competing events, score = 0');
      return 0;
    }

    let score = 0;
    console.log(`Calculating conflict score for ${competingEvents.length} competing events`);

    // Limit to top 3 most significant events for performance (prioritize events with venues and images)
    const eventsToProcess = competingEvents
      .sort((a, b) => {
        const scoreA = (a.venue ? 2 : 0) + (a.imageUrl ? 1 : 0) + (a.description && a.description.length > 50 ? 1 : 0);
        const scoreB = (b.venue ? 2 : 0) + (b.imageUrl ? 1 : 0) + (b.description && b.description.length > 50 ? 1 : 0);
        return scoreB - scoreA;
      })
      .slice(0, 3);

    console.log(`Processing top ${eventsToProcess.length} most significant events for detailed analysis`);

    for (const event of eventsToProcess) {
      let eventScore = 0;
      
      // Base score for any competing event
      eventScore += 20;
      console.log(`  "${event.title}": base score +20`);

      // Higher score for same category
      if (event.category === category) {
        eventScore += 30;
        console.log(`  "${event.title}": same category +30`);
      }

      // Higher score for events with venues (more significant)
      if (event.venue) {
        eventScore += 15;
        console.log(`  "${event.title}": has venue +15`);
      }

      // Higher score for events with images (more professional/promoted)
      if (event.imageUrl) {
        eventScore += 10;
        console.log(`  "${event.title}": has image +10`);
      }

      // Higher score for events with descriptions (more detailed/promoted)
      if (event.description && event.description.length > 50) {
        eventScore += 5;
        console.log(`  "${event.title}": has description +5`);
      }

      // Advanced analysis: Audience overlap prediction (with timeout) - DISABLED FOR PERFORMANCE
      if (false && params.enableAdvancedAnalysis) {
        try {
          // Create a mock event for the user's planned event
          const plannedEvent: Event = {
            id: 'planned_event',
            title: 'Planned Event',
            date: params.startDate,
            city: params.city,
            category: params.category,
            expectedAttendees: params.expectedAttendees,
            source: 'manual',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          // Use OpenAI-powered analysis with timeout (5 seconds max)
          const audienceOverlap = await Promise.race([
            openaiAudienceOverlapService.isAvailable()
              ? openaiAudienceOverlapService.predictAudienceOverlap(plannedEvent, event)
              : audienceOverlapService.predictAudienceOverlap(plannedEvent, event),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Audience overlap analysis timeout')), 2000)
            )
          ]) as any;
          
          // Increase score based on audience overlap
          const overlapMultiplier = 1 + (audienceOverlap.overlapScore * 0.5); // Up to 50% increase
          eventScore *= overlapMultiplier;
          console.log(`  "${event.title}": audience overlap multiplier ${overlapMultiplier.toFixed(2)} (${openaiAudienceOverlapService.isAvailable() ? 'AI-powered' : 'rule-based'})`);
        } catch (error) {
          console.error('Error calculating audience overlap (using fallback):', error);
          // Fallback: use rule-based analysis without timeout
          try {
            const { audienceOverlapService } = await import('./audience-overlap');
            const fallbackOverlap = await audienceOverlapService.predictAudienceOverlap(
              {
                id: 'planned_event',
                title: 'Planned Event',
                date: params.startDate,
                city: params.city,
                category: params.category,
                expectedAttendees: params.expectedAttendees,
                source: 'manual',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              },
              event
            );
            const overlapMultiplier = 1 + (fallbackOverlap.overlapScore * 0.3); // Reduced multiplier for fallback
            eventScore *= overlapMultiplier;
            console.log(`  "${event.title}": fallback audience overlap multiplier ${overlapMultiplier.toFixed(2)}`);
          } catch (fallbackError) {
            console.error('Fallback audience overlap also failed:', fallbackError);
          }
        }
      }

      score += eventScore;
      console.log(`  "${event.title}": total contribution = ${eventScore}`);
    }

    // Add base score for remaining events (not processed in detail for performance)
    const remainingEvents = competingEvents.length - eventsToProcess.length;
    if (remainingEvents > 0) {
      const remainingScore = remainingEvents * 15; // Lower base score for unprocessed events
      score += remainingScore;
      console.log(`Added base score for ${remainingEvents} remaining events: +${remainingScore}`);
    }

    console.log(`Base score before attendee adjustment: ${score}`);

    // Adjust based on expected attendees (larger events are more affected by conflicts)
    if (expectedAttendees > 1000) {
      score *= 1.05;
      console.log(`Large event (${expectedAttendees} attendees): score *= 1.2 = ${score}`);
    } else if (expectedAttendees > 500) {
      score *= 1.05;
      console.log(`Medium event (${expectedAttendees} attendees): score *= 1.1 = ${score}`);
    }

    // Cap the score at 20 (adjusted for new scoring system)
    const finalScore = Math.min(score, 20);
    console.log(`Final conflict score: ${finalScore}`);
    return finalScore;
  }

  /**
   * Determine risk level based on conflict score
   */
  private determineRiskLevel(conflictScore: number): 'Low' | 'Medium' | 'High' {
    let riskLevel: 'Low' | 'Medium' | 'High';
    if (conflictScore <= 2) {
      riskLevel = 'Low';
    } else if (conflictScore <= 6) {
      riskLevel = 'Medium';
    } else {
      riskLevel = 'High';
    }
    
    console.log(`Risk level for score ${conflictScore}: ${riskLevel}`);
    return riskLevel;
  }

  /**
   * Generate human-readable reasons for the conflict score
   */
  private generateReasons(competingEvents: Event[], conflictScore: number): string[] {
    const reasons: string[] = [];

    if (competingEvents.length === 0) {
      reasons.push('No major competing events found');
      return reasons;
    }

    // Group events by category
    const eventsByCategory = competingEvents.reduce((acc, event) => {
      acc[event.category] = (acc[event.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Add reasons based on competing events
    for (const [category, count] of Object.entries(eventsByCategory)) {
      if (count === 1) {
        reasons.push(`${category} event on same date`);
      } else {
        reasons.push(`${count} ${category} events during period`);
      }
    }

    // Add specific event names for high-profile events
    const highProfileEvents = competingEvents.filter(event => 
      event.venue && event.imageUrl
    ).slice(0, 2);

    for (const event of highProfileEvents) {
      reasons.push(`${event.title} overlaps`);
    }

    // Add general risk assessment
    if (conflictScore > 70) {
      reasons.push('High competition for audience attention');
    } else if (conflictScore > 40) {
      reasons.push('Moderate competition expected');
    }

    return reasons.slice(0, 3); // Limit to 3 reasons
  }

  /**
   * Get expanded categories for better event discovery
   * FIXED: Now uses correct category mappings for each API
   */
  private getExpandedCategories(primaryCategory: string): string[] {
    const categoryExpansions: Record<string, string[]> = {
      'Marketing': ['Marketing', 'Business', 'Professional Development', 'Networking', 'Conferences', 'Trade Shows'],
      'Entertainment': ['Entertainment', 'Music', 'Arts & Culture', 'Comedy', 'Theater', 'Film'],
      'Music': ['Music', 'Entertainment', 'Arts & Culture'],
      'Sports': ['Sports'],
      'Business': ['Business', 'Marketing', 'Professional Development', 'Networking', 'Conferences', 'Trade Shows'],
      'Technology': ['Technology', 'Business', 'Professional Development', 'Conferences'],
      'Arts & Culture': ['Arts & Culture', 'Entertainment', 'Music', 'Theater', 'Film'],
      'Education': ['Education', 'Academic', 'Professional Development'],
      'Healthcare': ['Healthcare'],
      'Finance': ['Finance', 'Business'],
      'Networking': ['Networking', 'Business', 'Professional Development'],
      'Conferences': ['Conferences', 'Business', 'Technology', 'Professional Development'],
      'Trade Shows': ['Trade Shows', 'Business', 'Expos'],
      'Comedy': ['Comedy', 'Entertainment', 'Arts & Culture'],
      'Theater': ['Theater', 'Arts & Culture', 'Entertainment'],
      'Film': ['Film', 'Entertainment', 'Arts & Culture']
    };

    return categoryExpansions[primaryCategory] || [primaryCategory];
  }

  /**
   * Get Ticketmaster-specific expanded categories
   * FIXED: Uses correct Ticketmaster classification names
   */
  private getTicketmasterExpandedCategories(primaryCategory: string): string[] {
    const ticketmasterExpansions: Record<string, string[]> = {
      // FIXED: Entertainment - use correct Ticketmaster classifications
      'Entertainment': ['Music', 'Arts & Theatre', 'Film'], // FIXED: Was ['Entertainment', 'Music', 'Arts & Culture', ...]
      'Music': ['Music'],
      'Arts & Culture': ['Arts & Theatre'], // FIXED: Map to correct classification
      'Sports': ['Sports'],
      'Film': ['Film'],
      'Theater': ['Arts & Theatre'],
      'Comedy': ['Arts & Theatre'],
      'Dance': ['Arts & Theatre'],
      'Opera': ['Arts & Theatre'],
      
      // FIXED: Business categories - use Miscellaneous
      'Business': ['Miscellaneous'], // FIXED: Was ['Business', 'Marketing', ...]
      'Technology': ['Miscellaneous'], // FIXED: Was ['Technology', 'Business', ...]
      'Marketing': ['Miscellaneous'], // FIXED: Was ['Marketing', 'Business', ...]
      'Finance': ['Miscellaneous'], // FIXED: Was ['Finance', 'Business']
      'Healthcare': ['Miscellaneous'], // FIXED: Was ['Healthcare']
      'Education': ['Miscellaneous'], // FIXED: Was ['Education', 'Academic', ...]
      'Academic': ['Miscellaneous'], // FIXED: Was ['Academic']
      'Professional Development': ['Miscellaneous'], // FIXED: Was ['Professional Development']
      'Networking': ['Miscellaneous'], // FIXED: Was ['Networking', 'Business', ...]
      'Conferences': ['Miscellaneous'], // FIXED: Was ['Conferences', 'Business', ...]
      'Trade Shows': ['Miscellaneous'], // FIXED: Was ['Trade Shows', 'Business', ...]
      'Workshops': ['Miscellaneous'], // FIXED: Was ['Workshops']
      'Seminars': ['Miscellaneous'], // FIXED: Was ['Seminars']
    };

    return ticketmasterExpansions[primaryCategory] || [primaryCategory];
  }

  /**
   * Check if two categories are related (restrictive to show only truly relevant events)
   */
  private isRelatedCategory(category1: string, category2: string): boolean {
    const relatedCategories: Record<string, string[]> = {
      // Business and professional categories - only truly related ones
      'Technology': ['Technology', 'Business'], // Tech events compete with business events
      'Business': ['Business', 'Marketing', 'Technology'], // Business-related categories
      'Marketing': ['Marketing', 'Business'], // Marketing only competes with business and marketing
      'Finance': ['Finance', 'Business'], // Finance competes with business
      'Professional Development': ['Professional Development', 'Business', 'Education'],
      'Networking': ['Networking', 'Business', 'Professional Development'],
      
      // Entertainment and cultural categories
      'Entertainment': ['Entertainment', 'Music', 'Arts & Culture'], // Entertainment categories
      'Arts & Culture': ['Arts & Culture', 'Entertainment', 'Music'], // Cultural events
      'Music': ['Music', 'Entertainment', 'Arts & Culture'], // Music events
      'Comedy': ['Comedy', 'Entertainment', 'Arts & Culture'],
      'Theater': ['Theater', 'Arts & Culture', 'Entertainment'],
      
      // Sports - only competes with sports
      'Sports': ['Sports'],
      
      // Healthcare and education - more restrictive
      'Healthcare': ['Healthcare'], // Healthcare only competes with healthcare
      'Education': ['Education', 'Academic'], // Educational events
      'Academic': ['Academic', 'Education'],
      
      // Conferences and trade shows
      'Conferences': ['Conferences', 'Business', 'Technology'],
      'Trade Shows': ['Trade Shows', 'Business', 'Expos'],
      'Expos': ['Expos', 'Trade Shows'],
      
      // Film and media
      'Film': ['Film', 'Entertainment'],
      
      // Fallback
      'Other': ['Other'],
    };

    return relatedCategories[category1]?.includes(category2) || 
           relatedCategories[category2]?.includes(category1) || false;
  }

  /**
   * Check if an event is likely an international conference
   */
  private isInternationalConference(title: string, description?: string): boolean {
    const text = `${title} ${description || ''}`.toLowerCase();
    
    // International conference indicators
    const internationalKeywords = [
      'international', 'global', 'world', 'european', 'europe', 'euro',
      'conference', 'congress', 'summit', 'forum', 'symposium', 'workshop',
      'annual conference', 'annual meeting', 'scientific conference',
      'business forum', 'tech conference', 'industry conference'
    ];
    
    // Check for international keywords
    const hasInternationalKeywords = internationalKeywords.some(keyword => 
      text.includes(keyword)
    );
    
    // Check for specific patterns that indicate international events
    const hasInternationalPatterns = 
      /international.*conference/i.test(text) ||
      /global.*forum/i.test(text) ||
      /european.*summit/i.test(text) ||
      /world.*congress/i.test(text) ||
      /annual.*conference/i.test(text);
    
    return hasInternationalKeywords || hasInternationalPatterns;
  }

  /**
   * Filter events by location to remove events from distant cities
   * Uses LLM-based city recognition for intelligent matching
   */
  private async filterEventsByLocation(events: Event[], targetCity: string): Promise<Event[]> {
    console.log(`🔍 Location filtering: Target city = "${targetCity}"`);
    
    try {
      // Use LLM-based city recognition to normalize the target city
      const cityRecognition = await cityRecognitionService.recognizeCity(targetCity);
      const normalizedTargetCity = cityRecognition.normalizedCity.toLowerCase();
      const targetAliases = cityRecognitionService.getCityAliases(cityRecognition.normalizedCity);
      
      console.log(`🏙️ City recognition result:`, {
        input: targetCity,
        normalized: cityRecognition.normalizedCity,
        confidence: cityRecognition.confidence,
        isRecognized: cityRecognition.isRecognized,
        aliases: targetAliases.slice(0, 5) // Show first 5 aliases
      });
      
      // Define TBA/TBD venue patterns that should be allowed for local searches
      const tbaPatterns = ['to be announced', 'tba', 'tbd', 'to be determined', 'venue tba', 'location tba', 'location to be announced'];
      
      // Define foreign cities that should be filtered out when searching Czech cities
      const foreignCities: string[] = [
        'london', 'londres', 'berlin', 'berlín', 'paris', 'parís', 'amsterdam', 'vienna', 'wien', 'vienne',
        'warsaw', 'warszawa', 'budapest', 'zurich', 'zürich', 'munich', 'münchen', 'stockholm', 'copenhagen', 
        'københavn', 'helsinki', 'helsingfors', 'oslo', 'madrid', 'barcelona', 'rome', 'roma', 'milan', 'milano',
        'athens', 'athina', 'lisbon', 'lisboa', 'dublin', 'edinburgh', 'glasgow', 'manchester', 'birmingham',
        'liverpool', 'leeds', 'sheffield', 'bristol', 'newcastle', 'nottingham', 'leicester', 'hamburg', 'cologne',
        'köln', 'frankfurt', 'stuttgart', 'düsseldorf', 'dortmund', 'essen', 'leipzig', 'bremen', 'dresden',
        'hannover', 'nuremberg', 'nürnberg', 'duisburg', 'bochum', 'wuppertal', 'bielefeld', 'bonn', 'münster',
        'karlsruhe', 'mannheim', 'augsburg', 'wiesbaden', 'gelsenkirchen', 'mönchengladbach', 'braunschweig',
        'chemnitz', 'kiel', 'aachen', 'halle', 'magdeburg', 'freiburg', 'krefeld', 'lübeck', 'oberhausen',
        'erfurt', 'mainz', 'rostock', 'kassel', 'hagen', 'hamm', 'saarbrücken', 'mülheim', 'potsdam',
        'ludwigshafen', 'oldenburg', 'leverkusen', 'osnabrück', 'solingen', 'heidelberg', 'herne', 'neuss',
        'darmstadt', 'paderborn', 'regensburg', 'ingolstadt', 'würzburg', 'fürth', 'wolfsburg', 'offenbach',
        'ulm', 'heilbronn', 'pforzheim', 'göttingen', 'bottrop', 'trier', 'recklinghausen', 'reutlingen',
        'bremerhaven', 'koblenz', 'bergisch gladbach', 'jena', 'remscheid', 'erlangen', 'moers', 'siegen',
        'hildesheim', 'salzgitter',
        // Add more foreign cities that might appear in searches
        'kragujevac', 'westfield', 'belgrade', 'zagreb', 'ljubljana', 'bratislava', 'bucharest', 'sofia',
        'tirana', 'skopje', 'podgorica', 'sarajevo', 'banja luka', 'novi sad', 'nis', 'subotica', 'kraljevo',
        'cacak', 'zrenjanin', 'pancevo', 'novi pazar', 'kikinda', 'smederevo', 'leskovac', 'uzice', 'cacak',
        'sabac', 'pozarevac', 'kragujevac', 'krusevac', 'vranje', 'valjevo', 'sombor', 'zajecar', 'priboj',
        'prokuplje', 'vrsac', 'backa palanka', 'sremska mitrovica', 'indjija', 'ruma', 'stara pazova',
        'kula', 'odzaci', 'bajmok', 'backa topola', 'kanjiza', 'senta', 'ada', 'mokrin', 'kikinda',
        'novi knezevac', 'coka', 'srbobran', 'becej', 'titel', 'zabalj', 'temerin', 'sirig', 'backi petrovac',
        'kula', 'odzaci', 'bajmok', 'backa topola', 'kanjiza', 'senta', 'ada', 'mokrin', 'kikinda'
      ];

      // Check if target city is a Czech city (using LLM recognition result)
      const isCzechCity = cityRecognition.isRecognized && 
                         (cityRecognition.normalizedCity.toLowerCase().includes('prague') ||
                          cityRecognition.normalizedCity.toLowerCase().includes('brno') ||
                          cityRecognition.normalizedCity.toLowerCase().includes('ostrava') ||
                          cityRecognition.normalizedCity.toLowerCase().includes('olomouc') ||
                          cityRecognition.normalizedCity.toLowerCase().includes('plzen') ||
                          cityRecognition.normalizedCity.toLowerCase().includes('liberec') ||
                          cityRecognition.normalizedCity.toLowerCase().includes('ceske') ||
                          cityRecognition.normalizedCity.toLowerCase().includes('hradec') ||
                          cityRecognition.normalizedCity.toLowerCase().includes('pardubice') ||
                          cityRecognition.normalizedCity.toLowerCase().includes('zlin'));
    
      return events.filter(event => {
        const eventCity = event.city?.toLowerCase().trim() || '';
        const eventVenue = event.venue?.toLowerCase().trim() || '';
        
        // Check if this is a TBA/TBD event
        const isTBAEvent = tbaPatterns.some(pattern => 
          eventVenue.includes(pattern) || 
          eventCity.includes(pattern) ||
          event.title?.toLowerCase().includes(pattern)
        );
        
        // For TBA events, be more lenient with location filtering
        // Assume TBA events from the search are likely local if they came from city-specific searches
        if (isTBAEvent) {
          console.log(`📍 Found TBA event "${event.title}" - allowing for local search in "${targetCity}"`);
          return true; // Allow TBA events to pass through location filtering
        }
        
        // STRICT FILTERING: If searching for a specific city, only allow events from that city or its aliases
        // This prevents foreign events from appearing in local searches
        
        // First, check if event city matches the target city or its aliases
        let isMatchingCity = targetAliases.some(alias => 
          eventCity === alias || 
          eventCity.includes(alias) || 
          alias.includes(eventCity)
        );
        
        // SPECIAL CASE: Handle events where APIs return "Czech Republic" as city name
        // If we're searching for a Czech city and the event city is "Czech Republic", 
        // check if the venue or title contains the target city name
        if (!isMatchingCity && isCzechCity && eventCity === 'czech republic') {
          const hasTargetCityInVenue = event.venue && targetAliases.some(alias => 
            event.venue!.toLowerCase().includes(alias.toLowerCase())
          );
          const hasTargetCityInTitle = targetAliases.some(alias => 
            event.title.toLowerCase().includes(alias.toLowerCase())
          );
          
          // ENHANCED: Also check if venue is a known venue for the target city
          let isKnownVenueForCity = false;
          if (event.venue) {
            // Import venue-city mapping service to check if venue belongs to target city
            const { venueCityMappingService } = require('./venue-city-mapping');
            const venueCity = venueCityMappingService.getCityForVenue(event.venue);
            if (venueCity && targetAliases.some(alias => 
              venueCity.toLowerCase() === alias.toLowerCase()
            )) {
              isKnownVenueForCity = true;
              console.log(`✅ Event "${event.title}" from "Czech Republic" matched by known venue "${event.venue}" for city "${targetCity}"`);
            }
          }
          
          if (hasTargetCityInVenue || hasTargetCityInTitle || isKnownVenueForCity) {
            console.log(`✅ Event "${event.title}" from "Czech Republic" matched by ${hasTargetCityInVenue ? 'venue' : hasTargetCityInTitle ? 'title' : 'known venue'} for city "${targetCity}"`);
            return true;
          }
        }
        
        // ENHANCED: Check for international conferences that might be incorrectly assigned
        if (!isMatchingCity && this.isInternationalConference(event.title, event.description)) {
          console.log(`🌍 Location filter: International conference "${event.title}" detected - likely not in target city "${normalizedTargetCity}"`);
          return false;
        }
        
        // Debug: Log foreign events
        if (!isMatchingCity && (eventCity === 'kragujevac' || eventCity === 'westfield')) {
          console.log(`🚨 Location filter: Foreign event "${event.title}" from "${eventCity}" (target: "${normalizedTargetCity}")`);
        }
        
        // If no city match, check if the event has a venue in the target city
        if (!isMatchingCity && event.venue) {
          // First try simple venue name matching
          const isMatchingVenue = targetAliases.some(alias => 
            eventVenue.includes(alias) || 
            alias.includes(eventVenue)
          );
          
          if (isMatchingVenue) {
            console.log(`✅ Event "${event.title}" matched by venue "${event.venue}" for city "${targetCity}"`);
            return true;
          }
          
          // ENHANCED: Also check if venue is a known venue for the target city using venue-city mapping
          const { venueCityMappingService } = require('./venue-city-mapping');
          const venueCity = venueCityMappingService.getCityForVenue(event.venue);
          if (venueCity && targetAliases.some(alias => 
            venueCity.toLowerCase() === alias.toLowerCase()
          )) {
            console.log(`✅ Event "${event.title}" matched by known venue "${event.venue}" (${venueCity}) for city "${targetCity}"`);
            return true;
          }
        }
        
        // If searching for a Czech city, also filter out known foreign cities
        if (isCzechCity) {
          // Check if event city is a known foreign city
          const isForeignCity = foreignCities.some(foreignCity => 
            eventCity === foreignCity || 
            eventCity.includes(foreignCity) || 
            foreignCity.includes(eventCity)
          );
          
          if (isForeignCity) {
            console.log(`🚫 Filtered out foreign event "${event.title}" from "${event.city}" when searching Czech city "${targetCity}"`);
            return false;
          }
          
          // Check if event venue contains foreign city names
          const isForeignVenue = foreignCities.some(foreignCity => 
            eventVenue.includes(foreignCity)
          );
          
          if (isForeignVenue) {
            console.log(`🚫 Filtered out event with foreign venue "${event.venue}" when searching Czech city "${targetCity}"`);
            return false;
          }
        }
        
        // Log filtered out events for debugging
        if (!isMatchingCity) {
          console.log(`🚫 Filtered out event "${event.title}" from "${event.city}" (target: "${targetCity}") - city mismatch`);
        }
        
        return isMatchingCity;
      });
    } catch (error) {
      console.error(`❌ City recognition failed for "${targetCity}":`, error);
      // Fallback to simple case-insensitive matching
      const normalizedTargetCity = targetCity.toLowerCase().trim();
      return events.filter(event => {
        const eventCity = event.city?.toLowerCase().trim() || '';
        return eventCity === normalizedTargetCity || 
               eventCity.includes(normalizedTargetCity) || 
               normalizedTargetCity.includes(eventCity);
      });
    }
  }

  /**
   * Filter events by category to show only relevant events in "Found Events"
   */
  private filterEventsByCategory(events: Event[], targetCategory?: string): Event[] {
    if (!targetCategory) {
      return events; // No category filter, return all events
    }

    const normalizedTargetCategory = targetCategory.toLowerCase().trim();
    const expandedCategories = this.getExpandedCategories(targetCategory).map(cat => cat.toLowerCase().trim());
    
    return events.filter(event => {
      const eventCategory = event.category?.toLowerCase().trim() || '';
      
      // For UI display, use expanded category matching to show related events
      // This ensures users see events that are relevant to their selected category
      const isMatchingCategory = expandedCategories.includes(eventCategory);
      
      if (!isMatchingCategory) {
        console.log(`🚫 Filtered out event "${event.title}" with category "${event.category}" (target: "${targetCategory}") - category not in expanded list`);
      }
      
      return isMatchingCategory;
    });
  }

  /**
   * Remove duplicate events based on title, date, and venue similarity
   */
  private removeDuplicateEvents(events: Event[]): Event[] {
    const uniqueEvents: Event[] = [];
    const seenEvents = new Set<string>();

    for (const event of events) {
      // Create a normalized key for comparison
      const normalizedTitle = event.title.toLowerCase().trim();
      const normalizedVenue = event.venue?.toLowerCase().trim() || '';
      const eventKey = `${normalizedTitle}-${event.date}-${normalizedVenue}`;

      // Check if we've seen a similar event
      let isDuplicate = false;
      for (const seenKey of seenEvents) {
        if (this.isEventSimilar(eventKey, seenKey)) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        uniqueEvents.push(event);
        seenEvents.add(eventKey);
        
      }
    }

    return uniqueEvents;
  }

  /**
   * Check if two event keys are similar (for deduplication)
   */
  private isEventSimilar(key1: string, key2: string): boolean {
    const [title1, date1, venue1] = key1.split('-');
    const [title2, date2, venue2] = key2.split('-');

    // Same date and venue
    if (date1 === date2 && venue1 === venue2 && venue1 !== '') {
      return true;
    }

    // Same date and very similar titles (for typos/variations)
    if (date1 === date2) {
      const similarity = this.calculateStringSimilarity(title1, title2);
      return similarity > 0.8; // 80% similarity threshold
    }

    return false;
  }

  /**
   * Calculate string similarity using optimized algorithms with configurable thresholds
   */
  private calculateStringSimilarity(str1: string, str2: string, threshold: number = 0.8): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    // Early termination if strings are too different in length
    const lengthRatio = shorter.length / longer.length;
    if (lengthRatio < threshold) {
      return 0;
    }

    // Use optimized Levenshtein distance with early termination
    const distance = this.levenshteinDistanceOptimized(longer, shorter, threshold);
    const similarity = (longer.length - distance) / longer.length;
    
    return similarity >= threshold ? similarity : 0;
  }

  /**
   * Optimized Levenshtein distance with early termination
   */
  private levenshteinDistanceOptimized(str1: string, str2: string, threshold: number): number {
    const maxDistance = Math.floor(str1.length * (1 - threshold));
    
    // Use only two rows for memory efficiency
    let prevRow = Array(str2.length + 1).fill(0);
    let currRow = Array(str2.length + 1).fill(0);
    
    // Initialize first row
    for (let i = 0; i <= str2.length; i++) {
      prevRow[i] = i;
    }
    
    for (let i = 1; i <= str1.length; i++) {
      currRow[0] = i;
      
      for (let j = 1; j <= str2.length; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        currRow[j] = Math.min(
          currRow[j - 1] + 1,     // deletion
          prevRow[j] + 1,         // insertion
          prevRow[j - 1] + cost   // substitution
        );
      }
      
      // Early termination if minimum possible distance exceeds threshold
      const minDistance = Math.min(...currRow);
      if (minDistance > maxDistance) {
        return maxDistance + 1;
      }
      
      // Swap rows
      [prevRow, currRow] = [currRow, prevRow];
    }
    
    return prevRow[str2.length];
  }

  /**
   * Calculate string similarity using Levenshtein distance (legacy method)
   */
  private calculateStringSimilarityLegacy(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate audience overlap analysis for competing events
   */
  private async calculateAudienceOverlapAnalysis(
    competingEvents: Event[],
    params: ConflictAnalysisParams
  ): Promise<{
    averageOverlap: number;
    highOverlapEvents: Event[];
    overlapReasoning: string[];
  }> {
    if (competingEvents.length === 0) {
      return {
        averageOverlap: 0,
        highOverlapEvents: [],
        overlapReasoning: ['No competing events to analyze']
      };
    }

    // Create a mock event for the user's planned event
    const plannedEvent: Event = {
      id: 'planned_event',
      title: 'Planned Event',
      date: params.startDate,
      city: params.city,
      category: params.category,
      expectedAttendees: params.expectedAttendees,
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const overlapScores: number[] = [];
    const highOverlapEvents: Event[] = [];
    const allReasoning: string[] = [];

    for (const event of competingEvents) {
      try {
        // Use OpenAI-powered analysis if available, otherwise fallback to rule-based
        const overlap = openaiAudienceOverlapService.isAvailable()
          ? await openaiAudienceOverlapService.predictAudienceOverlap(plannedEvent, event)
          : await audienceOverlapService.predictAudienceOverlap(plannedEvent, event);
        
        overlapScores.push(overlap.overlapScore);
        allReasoning.push(...overlap.reasoning);

        // Only consider events with significant overlap (>30%) as high overlap
        if (overlap.overlapScore > 0.3) {
          highOverlapEvents.push(event);
        }
      } catch (error) {
        console.error(`Error calculating overlap for event ${event.title}:`, error);
        overlapScores.push(0);
      }
    }

    const averageOverlap = overlapScores.length > 0 
      ? overlapScores.reduce((sum, score) => sum + score, 0) / overlapScores.length 
      : 0;

    // Remove duplicate reasoning
    const uniqueReasoning = [...new Set(allReasoning)];

    return {
      averageOverlap,
      highOverlapEvents,
      overlapReasoning: uniqueReasoning.slice(0, 3) // Limit to top 3 reasons
    };
  }


  /**
   * Extract events from API response (moved from inline processing for optimization)
   */
  private async extractEventsFromResponse(response: Response, apiName: string): Promise<Event[]> {
    if (!response.ok) {
      console.warn(`${apiName}: API returned error status ${response.status}`);
      return [];
    }

    try {
      // Clone the response to avoid "body already read" errors
      const responseClone = response.clone();
      let result;
      
      try {
        result = await responseClone.json();
      } catch (jsonError) {
        // If JSON parsing fails, try reading as text for debugging
        console.error(`${apiName}: JSON parsing failed, trying text:`, jsonError);
        const responseText = await response.text();
        console.error(`${apiName}: Response text:`, responseText.substring(0, 500));
        return [];
      }
      
      let events: Event[] = [];

      // Handle different response structures based on API
      if (apiName === 'ticketmaster') {
        console.log('🎟️ Ticketmaster API response structure:', result);
        if (result.success && result.data?.events) {
          events = result.data.events;
        } else if (result.data?.events) {
          events = result.data.events;
        } else if (result.data && Array.isArray(result.data)) {
          events = result.data;
        } else if (Array.isArray(result)) {
          events = result;
        } else if (result.data) {
          events = Array.isArray(result.data) ? result.data : [];
        }
        console.log(`🎟️ Ticketmaster: Extracted ${events.length} events`);
      } else if (apiName === 'predicthq') {
        console.log('🔮 PredictHQ API response structure:', {
          success: result.success,
          hasData: !!result.data,
          hasEvents: !!result.data?.events,
          eventsLength: result.data?.events?.length || 0
        });
        if (result.success && result.data?.events) {
          events = result.data.events;
        } else if (result.data?.events) {
          events = result.data.events;
        } else if (result.data && Array.isArray(result.data)) {
          events = result.data;
        } else if (Array.isArray(result)) {
          events = result;
        } else if (result.data) {
          events = Array.isArray(result.data) ? result.data : [];
        }
        console.log(`🔮 PredictHQ: Extracted ${events.length} events`);
      } else if (apiName === 'brno') {
        console.log('🏛️ Brno API response structure:', result);
        if (result.data?.events) {
          events = result.data.events;
        } else if (result.data && Array.isArray(result.data)) {
          events = result.data;
        } else if (Array.isArray(result)) {
          events = result;
        } else if (result.data) {
          events = Array.isArray(result.data) ? result.data : [];
        }
        console.log(`🏛️ Brno: Extracted ${events.length} events`);
      } else if (apiName === 'scraped') {
        console.log('🔍 Scraped events API response structure:', result);
        if (result.success && result.data?.events) {
          events = result.data.events;
        } else if (result.data?.events) {
          events = result.data.events;
        } else if (result.data && Array.isArray(result.data)) {
          events = result.data;
        } else if (Array.isArray(result)) {
          events = result;
        } else if (result.data) {
          events = Array.isArray(result.data) ? result.data : [];
        }
        console.log(`🔍 Scraped: Extracted ${events.length} events`);
      }

      return events;
    } catch (error) {
      console.error(`${apiName}: Error processing response:`, error);
      return [];
    }
  }

  /**
   * Cleanup resources (terminate worker, clear caches)
   */
  cleanup(): void {
    console.log('🧹 Cleaning up conflict analysis service resources...');
    this.terminateWorker();
    this.conflictCache.comparisons.clear();
    this.conflictCache.expiry.clear();
    this.requestCache.clear();
    this.cacheExpiry.clear();
    this.eventIndex = null;
    console.log('✅ Conflict analysis service cleanup completed');
  }
}

export const conflictAnalysisService = new ConflictAnalysisService();

// Cleanup worker on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    conflictAnalysisService.cleanup();
  });
}