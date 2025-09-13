import { Event } from '@/types';
import { audienceOverlapService } from './audience-overlap';
import { openaiAudienceOverlapService } from './openai-audience-overlap';
import { venueIntelligenceService } from './venue-intelligence';

export interface ConflictAnalysisResult {
  recommendedDates: DateRecommendation[];
  highRiskDates: DateRecommendation[];
  allEvents: Event[];
  analysisDate: string;
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
  venueIntelligence?: {
    venueConflictScore: number;
    capacityUtilization: number;
    pricingImpact: number;
    recommendations: string[];
  };
}

export interface ConflictAnalysisParams {
  city: string;
  category: string;
  subcategory?: string;
  expectedAttendees: number;
  startDate: string; // preferred start date
  endDate: string; // preferred end date
  dateRangeStart: string; // analysis range start
  dateRangeEnd: string; // analysis range end
  venue?: string; // optional venue name for venue intelligence
  enableAdvancedAnalysis?: boolean; // enable audience overlap and venue intelligence
  searchRadius?: string; // search radius for geographic coverage (e.g., "50km", "25miles")
  useComprehensiveFallback?: boolean; // use comprehensive fallback strategies
}

export class ConflictAnalysisService {
  /**
   * Analyze conflicts for event dates
   */
  async analyzeConflicts(params: ConflictAnalysisParams): Promise<ConflictAnalysisResult> {
    const startTime = Date.now();
    try {
      console.log('Starting conflict analysis with params:', params);
      
      // Fetch events from multiple APIs
      const fetchStartTime = Date.now();
      const events = await this.fetchEventsFromAPI(params);
      const fetchTime = Date.now() - fetchStartTime;
      console.log(`Total events fetched: ${events.length} (took ${fetchTime}ms)`);
      
      // Generate date recommendations
      const analysisStartTime = Date.now();
      const dateRecommendations = await this.generateDateRecommendations(
        params,
        events
      );
      const analysisTime = Date.now() - analysisStartTime;
      console.log(`Generated ${dateRecommendations.length} date recommendations (took ${analysisTime}ms)`);

      // Log all recommendations with their scores
      dateRecommendations.forEach((rec, index) => {
        console.log(`Recommendation ${index + 1}: ${rec.startDate} to ${rec.endDate} - Score: ${rec.conflictScore}, Risk: ${rec.riskLevel}, Competing Events: ${rec.competingEvents.length}`);
      });

      // Categorize recommendations
      const recommendedDates = dateRecommendations
        .filter(rec => rec.riskLevel === 'Low')
        .slice(0, 3); // Top 3 recommendations

      // For high-risk dates, get the highest scoring ones (most problematic)
      const highRiskDates = dateRecommendations
        .filter(rec => rec.riskLevel === 'High')
        .sort((a, b) => b.conflictScore - a.conflictScore) // Sort by highest conflict score first
        .slice(0, 3); // Top 3 high risk dates

      // Also include medium risk dates with high scores as potential high-risk dates if we don't have enough high-risk dates
      if (highRiskDates.length < 3) {
        const additionalHighRisk = dateRecommendations
          .filter(rec => rec.riskLevel === 'Medium' && rec.conflictScore > 50)
          .sort((a, b) => b.conflictScore - a.conflictScore)
          .slice(0, 3 - highRiskDates.length);
        
        highRiskDates.push(...additionalHighRisk);
        console.log(`Added ${additionalHighRisk.length} medium-risk dates with high scores to high-risk list`);
      }

      console.log(`Final results: ${recommendedDates.length} low risk dates, ${highRiskDates.length} high risk dates`);
      console.log(`High-risk dates scores:`, highRiskDates.map(d => `${d.startDate}: ${d.conflictScore} (${d.riskLevel})`));

      const totalTime = Date.now() - startTime;
      console.log(`🎯 Conflict analysis completed in ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);

      return {
        recommendedDates,
        highRiskDates,
        allEvents: events,
        analysisDate: new Date().toISOString()
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ Error in conflict analysis after ${totalTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Fetch events from multiple APIs (Ticketmaster, Eventbrite, PredictHQ, and Brno)
   */
  private async fetchEventsFromAPI(params: ConflictAnalysisParams): Promise<Event[]> {
    // Validate required parameters
    if (!params.city) {
      throw new Error('City is required');
    }
    
    if (!params.dateRangeStart || !params.dateRangeEnd) {
      throw new Error('Analysis date range is required');
    }

    const queryParams = new URLSearchParams({
      city: params.city,
      startDate: params.dateRangeStart,
      endDate: params.dateRangeEnd,
      category: params.category,
      size: '500', // Increased from 100 to 500 for better event coverage
      radius: params.searchRadius || '50km', // Default radius
      useComprehensiveFallback: params.useComprehensiveFallback ? 'true' : 'false'
    });

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
    console.log('- EVENTBRITE_API_KEY:', !!process.env.EVENTBRITE_API_KEY);
    console.log('API URLs being called:');
    console.log('- Ticketmaster:', `${baseUrl}/api/analyze/events/ticketmaster?${queryParams.toString()}`);
    console.log('- Eventbrite:', `${baseUrl}/api/analyze/events/eventbrite?${queryParams.toString()}`);
    console.log('- PredictHQ:', `${baseUrl}/api/analyze/events/predicthq?${queryParams.toString()}`);
    console.log('- Brno:', `${baseUrl}/api/analyze/events/brno?${new URLSearchParams({
      startDate: params.dateRangeStart,
      endDate: params.dateRangeEnd
    }).toString()}`);

    // Use comprehensive search if enabled
    const useComprehensiveSearch = params.useComprehensiveFallback || false;
    
    // Create comprehensive search query params
    const comprehensiveQueryParams = new URLSearchParams({
      city: params.city,
      startDate: params.dateRangeStart,
      endDate: params.dateRangeEnd,
      category: params.category,
      comprehensive: 'true', // Enable comprehensive search
      size: '500',
      radius: params.searchRadius || '50km'
    });

    // Fetch from Ticketmaster, Eventbrite, PredictHQ, and Brno ArcGIS in parallel
    const [ticketmasterResponse, eventbriteResponse, predicthqResponse, brnoResponse] = await Promise.allSettled([
      fetch(`${baseUrl}/api/analyze/events/ticketmaster?${useComprehensiveSearch ? comprehensiveQueryParams.toString() : queryParams.toString()}`),
      fetch(`${baseUrl}/api/analyze/events/eventbrite?${useComprehensiveSearch ? comprehensiveQueryParams.toString() : queryParams.toString()}`),
      fetch(`${baseUrl}/api/analyze/events/predicthq?${useComprehensiveSearch ? comprehensiveQueryParams.toString() : queryParams.toString()}`),
      fetch(`${baseUrl}/api/analyze/events/brno?${new URLSearchParams({
        startDate: params.dateRangeStart,
        endDate: params.dateRangeEnd
      }).toString()}`)
    ]);

    const allEvents: Event[] = [];

    // Process Ticketmaster results
    if (ticketmasterResponse.status === 'fulfilled' && ticketmasterResponse.value.ok) {
      try {
        const ticketmasterResult = await ticketmasterResponse.value.json();
        console.log('🎟️ Ticketmaster API response structure:', ticketmasterResult);
        
        // Handle different response structures
        let events = [];
        if (ticketmasterResult.success && ticketmasterResult.data?.events) {
          events = ticketmasterResult.data.events;
        } else if (ticketmasterResult.data?.events) {
          events = ticketmasterResult.data.events;
        } else if (ticketmasterResult.data && Array.isArray(ticketmasterResult.data)) {
          events = ticketmasterResult.data;
        } else if (Array.isArray(ticketmasterResult)) {
          events = ticketmasterResult;
        } else if (ticketmasterResult.data) {
          // Handle case where data is directly the events array
          events = Array.isArray(ticketmasterResult.data) ? ticketmasterResult.data : [];
        }
        
        allEvents.push(...events);
        console.log(`🎟️ Ticketmaster: Fetched ${events.length} events ${useComprehensiveSearch ? '(comprehensive search)' : '(standard search)'}`);
      } catch (error) {
        console.error('🎟️ Ticketmaster: Error processing response:', error);
      }
    } else if (ticketmasterResponse.status === 'rejected') {
      console.error('🎟️ Ticketmaster: API request failed:', ticketmasterResponse.reason);
    } else {
      console.error('🎟️ Ticketmaster: API returned error:', ticketmasterResponse.value?.status || 'Unknown error');
      // Try to get the error message from response
      try {
        const errorResult = await ticketmasterResponse.value.json();
        if (errorResult.success === false && errorResult.data?.events) {
          // API returned error but still has data structure - use empty events
          console.log('🎟️ Ticketmaster: Using empty events due to API error');
        }
      } catch (parseError) {
        console.error('🎟️ Ticketmaster: Could not parse error response');
      }
    }

    // Process Eventbrite results
    if (eventbriteResponse.status === 'fulfilled' && eventbriteResponse.value.ok) {
      try {
        const eventbriteResult = await eventbriteResponse.value.json();
        console.log('🎫 Eventbrite API response structure:', eventbriteResult);
        
        // Handle different response structures
        let events = [];
        if (eventbriteResult.success && eventbriteResult.data?.events) {
          events = eventbriteResult.data.events;
        } else if (eventbriteResult.data?.events) {
          events = eventbriteResult.data.events;
        } else if (eventbriteResult.data && Array.isArray(eventbriteResult.data)) {
          events = eventbriteResult.data;
        } else if (Array.isArray(eventbriteResult)) {
          events = eventbriteResult;
        } else if (eventbriteResult.data) {
          // Handle case where data is directly the events array
          events = Array.isArray(eventbriteResult.data) ? eventbriteResult.data : [];
        }
        
        allEvents.push(...events);
        console.log(`🎫 Eventbrite: Fetched ${events.length} events ${useComprehensiveSearch ? '(comprehensive search)' : '(standard search)'}`);
      } catch (error) {
        console.error('🎫 Eventbrite: Error processing response:', error);
      }
    } else if (eventbriteResponse.status === 'rejected') {
      console.error('🎫 Eventbrite: API request failed:', eventbriteResponse.reason);
    } else {
      console.error('🎫 Eventbrite: API returned error:', eventbriteResponse.value?.status || 'Unknown error');
      // Try to get the error message from response
      try {
        const errorResult = await eventbriteResponse.value.json();
        if (errorResult.success === false && errorResult.data?.events) {
          // API returned error but still has data structure - use empty events
          console.log('🎫 Eventbrite: Using empty events due to API error');
        }
      } catch (parseError) {
        console.error('🎫 Eventbrite: Could not parse error response');
      }
    }

    // Process PredictHQ results
    if (predicthqResponse.status === 'fulfilled' && predicthqResponse.value.ok) {
      try {
        const predicthqResult = await predicthqResponse.value.json();
        console.log('🔮 PredictHQ API response structure:', {
          success: predicthqResult.success,
          hasData: !!predicthqResult.data,
          hasEvents: !!predicthqResult.data?.events,
          eventsLength: predicthqResult.data?.events?.length || 0
        });
        
        // Handle different response structures
        let events = [];
        if (predicthqResult.success && predicthqResult.data?.events) {
          events = predicthqResult.data.events;
        } else if (predicthqResult.data?.events) {
          events = predicthqResult.data.events;
        } else if (predicthqResult.data && Array.isArray(predicthqResult.data)) {
          events = predicthqResult.data;
        } else if (Array.isArray(predicthqResult)) {
          events = predicthqResult;
        } else if (predicthqResult.data) {
          // Handle case where data is directly the events array
          events = Array.isArray(predicthqResult.data) ? predicthqResult.data : [];
        }
        
        allEvents.push(...events);
        console.log(`🔮 PredictHQ: Fetched ${events.length} events ${useComprehensiveSearch ? '(comprehensive search)' : '(standard search)'}`);
      } catch (error) {
        console.error('🔮 PredictHQ: Error processing response:', error);
      }
    } else if (predicthqResponse.status === 'rejected') {
      console.error('🔮 PredictHQ: API request failed:', predicthqResponse.reason);
    } else {
      console.error('🔮 PredictHQ: API returned error:', predicthqResponse.value?.status || 'Unknown error');
      // Try to get the error message from response
      try {
        const errorResult = await predicthqResponse.value.json();
        if (errorResult.success === false && errorResult.data?.events) {
          // API returned error but still has data structure - use empty events
          console.log('🔮 PredictHQ: Using empty events due to API error');
        }
      } catch (parseError) {
        console.error('🔮 PredictHQ: Could not parse error response');
      }
    }

    // Process Brno results
    if (brnoResponse.status === 'fulfilled' && brnoResponse.value.ok) {
      try {
        const brnoResult = await brnoResponse.value.json();
        console.log('🏛️ Brno API response structure:', brnoResult);

        let events = [] as any[];
        if (brnoResult.data?.events) {
          events = brnoResult.data.events;
        } else if (brnoResult.data && Array.isArray(brnoResult.data)) {
          events = brnoResult.data;
        } else if (Array.isArray(brnoResult)) {
          events = brnoResult;
        } else if (brnoResult.data) {
          events = Array.isArray(brnoResult.data) ? brnoResult.data : [];
        }

        allEvents.push(...events);
        console.log(`🏛️ Brno: Fetched ${events.length} events`);
      } catch (error) {
        console.error('🏛️ Brno: Error processing response:', error);
      }
    } else if (brnoResponse.status === 'rejected') {
      console.error('🏛️ Brno: API request failed:', brnoResponse.reason);
    } else {
      // @ts-ignore
      console.error('🏛️ Brno: API returned error:', brnoResponse.value?.status);
    }

    // Filter events by location to remove distant cities
    console.log(`📍 Events before location filtering: ${allEvents.length}`);
    console.log(`📍 Sample event cities:`, allEvents.slice(0, 5).map(e => ({ title: e.title, city: e.city, venue: e.venue })));
    
    const locationFilteredEvents = this.filterEventsByLocation(allEvents, params.city);
    console.log(`📍 Total events after location filtering: ${locationFilteredEvents.length}`);

    // Remove duplicates based on title, date, and venue
    const uniqueEvents = this.removeDuplicateEvents(locationFilteredEvents);
    console.log(`🔄 Total unique events after deduplication: ${uniqueEvents.length}`);

    // Log comprehensive search strategy summary
    if (useComprehensiveSearch) {
      console.log(`🎯 COMPREHENSIVE SEARCH SUMMARY:`);
      console.log(`  - Search Type: Multi-strategy comprehensive search`);
      console.log(`  - Total Events Found: ${allEvents.length}`);
      console.log(`  - After Location Filtering: ${locationFilteredEvents.length}`);
      console.log(`  - After Deduplication: ${uniqueEvents.length}`);
      console.log(`  - Deduplication Rate: ${((allEvents.length - uniqueEvents.length) / allEvents.length * 100).toFixed(1)}%`);
      console.log(`  - Search Strategies Used: Multiple strategies per API`);
    } else {
      console.log(`🎯 STANDARD SEARCH SUMMARY:`);
      console.log(`  - Search Type: Standard single-strategy search`);
      console.log(`  - Total Events Found: ${allEvents.length}`);
      console.log(`  - After Location Filtering: ${locationFilteredEvents.length}`);
      console.log(`  - After Deduplication: ${uniqueEvents.length}`);
    }

    return uniqueEvents;
  }

  /**
   * Generate date recommendations based on events and parameters
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
      let venueIntelligence;

      if (params.enableAdvancedAnalysis) {
        // Calculate audience overlap analysis
        audienceOverlap = await this.calculateAudienceOverlapAnalysis(
          competingEvents,
          params
        );

        // Calculate venue intelligence if venue is provided
        if (params.venue) {
          venueIntelligence = await this.calculateVenueIntelligenceAnalysis(
            params.venue,
            dateRange.startDate,
            params.expectedAttendees
          );
        }
      }

      recommendations.push({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        conflictScore,
        riskLevel,
        competingEvents,
        reasons,
        audienceOverlap,
        venueIntelligence
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
    const eventDuration = Math.ceil((preferredEnd.getTime() - preferredStart.getTime()) / (1000 * 60 * 60 * 24));

    // First, generate dates ±7 days around preferred dates for more comprehensive analysis
    for (let i = -7; i <= 7; i++) {
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
   * Find events that compete with the proposed date range
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
   * Calculate conflict score based on competing events
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

    // Limit to top 5 most significant events for performance (prioritize events with venues and images)
    const eventsToProcess = competingEvents
      .sort((a, b) => {
        const scoreA = (a.venue ? 2 : 0) + (a.imageUrl ? 1 : 0) + (a.description && a.description.length > 50 ? 1 : 0);
        const scoreB = (b.venue ? 2 : 0) + (b.imageUrl ? 1 : 0) + (b.description && b.description.length > 50 ? 1 : 0);
        return scoreB - scoreA;
      })
      .slice(0, 5);

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

      // Advanced analysis: Audience overlap prediction (with timeout)
      if (params.enableAdvancedAnalysis) {
        try {
          // Create a mock event for the user's planned event
          const plannedEvent: Event = {
            id: 'planned_event',
            title: 'Planned Event',
            date: params.startDate,
            city: params.city,
            category: params.category,
            subcategory: params.subcategory,
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
              setTimeout(() => reject(new Error('Audience overlap analysis timeout')), 5000)
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
                subcategory: params.subcategory,
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
      score *= 1.2;
      console.log(`Large event (${expectedAttendees} attendees): score *= 1.2 = ${score}`);
    } else if (expectedAttendees > 500) {
      score *= 1.1;
      console.log(`Medium event (${expectedAttendees} attendees): score *= 1.1 = ${score}`);
    }

    // Cap the score at 100
    const finalScore = Math.min(score, 100);
    console.log(`Final conflict score: ${finalScore}`);
    return finalScore;
  }

  /**
   * Determine risk level based on conflict score
   */
  private determineRiskLevel(conflictScore: number): 'Low' | 'Medium' | 'High' {
    let riskLevel: 'Low' | 'Medium' | 'High';
    if (conflictScore <= 30) {
      riskLevel = 'Low';
    } else if (conflictScore <= 60) {
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
   * Check if two categories are related (more restrictive to reduce false positives)
   */
  private isRelatedCategory(category1: string, category2: string): boolean {
    const relatedCategories: Record<string, string[]> = {
      // Only very closely related categories should compete
      'Technology': ['Technology'], // Only compete with other tech events
      'Business': ['Business', 'Finance', 'Marketing'], // Business-related only
      'Entertainment': ['Arts & Culture', 'Entertainment'],
      'Arts & Culture': ['Entertainment', 'Arts & Culture'],
      'Sports': ['Sports'], // Sports only compete with sports
      'Healthcare': ['Healthcare'], // Healthcare only competes with healthcare
      'Education': ['Education'], // Education only competes with education
      'Finance': ['Business', 'Finance'],
      'Marketing': ['Business', 'Marketing'],
    };

    return relatedCategories[category1]?.includes(category2) || 
           relatedCategories[category2]?.includes(category1) || false;
  }

  /**
   * Filter events by location to remove events from distant cities
   */
  private filterEventsByLocation(events: Event[], targetCity: string): Event[] {
    const normalizedTargetCity = targetCity.toLowerCase().trim();
    
    // Define city aliases and nearby cities for better matching
    const cityAliases: Record<string, string[]> = {
      'prague': ['praha', 'prag', 'prague'],
      'brno': ['brno', 'brünn'],
      'ostrava': ['ostrava'],
      'olomouc': ['olomouc'],
      'london': ['london', 'londres'],
      'berlin': ['berlin', 'berlín'],
      'paris': ['paris', 'parís'],
      'amsterdam': ['amsterdam', 'amsterdam'],
      'vienna': ['vienna', 'wien', 'vienne'],
      'warsaw': ['warsaw', 'warszawa'],
      'budapest': ['budapest', 'budapest'],
      'zurich': ['zurich', 'zürich'],
      'munich': ['munich', 'münchen'],
      'stockholm': ['stockholm', 'stockholm'],
      'copenhagen': ['copenhagen', 'københavn'],
      'helsinki': ['helsinki', 'helsingfors'],
      'oslo': ['oslo', 'oslo'],
      'madrid': ['madrid', 'madrid'],
      'barcelona': ['barcelona', 'barcelona'],
      'rome': ['rome', 'roma'],
      'milan': ['milan', 'milano'],
      'athens': ['athens', 'athina'],
      'lisbon': ['lisbon', 'lisboa'],
      'dublin': ['dublin', 'dublin'],
      'edinburgh': ['edinburgh', 'edinburgh'],
      'glasgow': ['glasgow', 'glasgow'],
      'manchester': ['manchester', 'manchester'],
      'birmingham': ['birmingham', 'birmingham'],
      'liverpool': ['liverpool', 'liverpool'],
      'leeds': ['leeds', 'leeds'],
      'sheffield': ['sheffield', 'sheffield'],
      'bristol': ['bristol', 'bristol'],
      'newcastle': ['newcastle', 'newcastle'],
      'nottingham': ['nottingham', 'nottingham'],
      'leicester': ['leicester', 'leicester'],
      'hamburg': ['hamburg', 'hamburg'],
      'cologne': ['cologne', 'köln'],
      'frankfurt': ['frankfurt', 'frankfurt'],
      'stuttgart': ['stuttgart', 'stuttgart'],
      'düsseldorf': ['düsseldorf', 'düsseldorf'],
      'dortmund': ['dortmund', 'dortmund'],
      'essen': ['essen', 'essen'],
      'leipzig': ['leipzig', 'leipzig'],
      'bremen': ['bremen', 'bremen'],
      'dresden': ['dresden', 'dresden'],
      'hannover': ['hannover', 'hannover'],
      'nuremberg': ['nuremberg', 'nürnberg'],
      'duisburg': ['duisburg', 'duisburg'],
      'bochum': ['bochum', 'bochum'],
      'wuppertal': ['wuppertal', 'wuppertal'],
      'bielefeld': ['bielefeld', 'bielefeld'],
      'bonn': ['bonn', 'bonn'],
      'münster': ['münster', 'münster'],
      'karlsruhe': ['karlsruhe', 'karlsruhe'],
      'mannheim': ['mannheim', 'mannheim'],
      'augsburg': ['augsburg', 'augsburg'],
      'wiesbaden': ['wiesbaden', 'wiesbaden'],
      'gelsenkirchen': ['gelsenkirchen', 'gelsenkirchen'],
      'mönchengladbach': ['mönchengladbach', 'mönchengladbach'],
      'braunschweig': ['braunschweig', 'braunschweig'],
      'chemnitz': ['chemnitz', 'chemnitz'],
      'kiel': ['kiel', 'kiel'],
      'aachen': ['aachen', 'aachen'],
      'halle': ['halle', 'halle'],
      'magdeburg': ['magdeburg', 'magdeburg'],
      'freiburg': ['freiburg', 'freiburg'],
      'krefeld': ['krefeld', 'krefeld'],
      'lübeck': ['lübeck', 'lübeck'],
      'oberhausen': ['oberhausen', 'oberhausen'],
      'erfurt': ['erfurt', 'erfurt'],
      'mainz': ['mainz', 'mainz'],
      'rostock': ['rostock', 'rostock'],
      'kassel': ['kassel', 'kassel'],
      'hagen': ['hagen', 'hagen'],
      'hamm': ['hamm', 'hamm'],
      'saarbrücken': ['saarbrücken', 'saarbrücken'],
      'mülheim': ['mülheim', 'mülheim'],
      'potsdam': ['potsdam', 'potsdam'],
      'ludwigshafen': ['ludwigshafen', 'ludwigshafen'],
      'oldenburg': ['oldenburg', 'oldenburg'],
      'leverkusen': ['leverkusen', 'leverkusen'],
      'osnabrück': ['osnabrück', 'osnabrück'],
      'solingen': ['solingen', 'solingen'],
      'heidelberg': ['heidelberg', 'heidelberg'],
      'herne': ['herne', 'herne'],
      'neuss': ['neuss', 'neuss'],
      'darmstadt': ['darmstadt', 'darmstadt'],
      'paderborn': ['paderborn', 'paderborn'],
      'regensburg': ['regensburg', 'regensburg'],
      'ingolstadt': ['ingolstadt', 'ingolstadt'],
      'würzburg': ['würzburg', 'würzburg'],
      'fürth': ['fürth', 'fürth'],
      'wolfsburg': ['wolfsburg', 'wolfsburg'],
      'offenbach': ['offenbach', 'offenbach'],
      'ulm': ['ulm', 'ulm'],
      'heilbronn': ['heilbronn', 'heilbronn'],
      'pforzheim': ['pforzheim', 'pforzheim'],
      'göttingen': ['göttingen', 'göttingen'],
      'bottrop': ['bottrop', 'bottrop'],
      'trier': ['trier', 'trier'],
      'recklinghausen': ['recklinghausen', 'recklinghausen'],
      'reutlingen': ['reutlingen', 'reutlingen'],
      'bremerhaven': ['bremerhaven', 'bremerhaven'],
      'koblenz': ['koblenz', 'koblenz'],
      'bergisch gladbach': ['bergisch gladbach', 'bergisch gladbach'],
      'jena': ['jena', 'jena'],
      'remscheid': ['remscheid', 'remscheid'],
      'erlangen': ['erlangen', 'erlangen'],
      'moers': ['moers', 'moers'],
      'siegen': ['siegen', 'siegen'],
      'hildesheim': ['hildesheim', 'hildesheim'],
      'salzgitter': ['salzgitter', 'salzgitter'],
    };

    const targetAliases = cityAliases[normalizedTargetCity] || [normalizedTargetCity];
    
    return events.filter(event => {
      const eventCity = event.city?.toLowerCase().trim() || '';
      
      // Check if event city matches any of the target city aliases
      const isMatchingCity = targetAliases.some(alias => 
        eventCity === alias || 
        eventCity.includes(alias) || 
        alias.includes(eventCity)
      );
      
      // If no city match, check if the event has a venue in the target city
      if (!isMatchingCity && event.venue) {
        const venue = event.venue.toLowerCase().trim();
        const isMatchingVenue = targetAliases.some(alias => 
          venue.includes(alias) || 
          alias.includes(venue)
        );
        
        if (isMatchingVenue) {
          console.log(`Event "${event.title}" matched by venue "${event.venue}" for city "${targetCity}"`);
          return true;
        }
      }
      
      // Log filtered out events for debugging
      if (!isMatchingCity) {
        console.log(`Filtered out event "${event.title}" from "${event.city}" (target: "${targetCity}")`);
      }
      
      return isMatchingCity;
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
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
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
      subcategory: params.subcategory,
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

        if (overlap.overlapScore > 0.6) {
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
   * Calculate venue intelligence analysis
   */
  private async calculateVenueIntelligenceAnalysis(
    venueName: string,
    date: string,
    expectedAttendees: number
  ): Promise<{
    venueConflictScore: number;
    capacityUtilization: number;
    pricingImpact: number;
    recommendations: string[];
  }> {
    try {
      const venueAnalysis = await venueIntelligenceService.analyzeVenueConflict(
        venueName,
        date,
        expectedAttendees
      );

      return {
        venueConflictScore: venueAnalysis.conflictScore,
        capacityUtilization: venueAnalysis.factors.capacityUtilization,
        pricingImpact: venueAnalysis.factors.pricingImpact,
        recommendations: [
          venueAnalysis.recommendations.pricingStrategy,
          venueAnalysis.recommendations.marketingAdvice
        ]
      };
    } catch (error) {
      console.error('Error calculating venue intelligence:', error);
      return {
        venueConflictScore: 0.5,
        capacityUtilization: 0.5,
        pricingImpact: 0.5,
        recommendations: ['Unable to analyze venue intelligence']
      };
    }
  }
}

export const conflictAnalysisService = new ConflictAnalysisService();