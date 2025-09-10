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
}

export class ConflictAnalysisService {
  /**
   * Analyze conflicts for event dates
   */
  async analyzeConflicts(params: ConflictAnalysisParams): Promise<ConflictAnalysisResult> {
    try {
      console.log('Starting conflict analysis with params:', params);
      
      // Fetch events from multiple APIs
      const events = await this.fetchEventsFromAPI(params);
      console.log(`Total events fetched: ${events.length}`);
      
      // Generate date recommendations
      const dateRecommendations = await this.generateDateRecommendations(
        params,
        events
      );
      console.log(`Generated ${dateRecommendations.length} date recommendations`);

      // Log all recommendations with their scores
      dateRecommendations.forEach((rec, index) => {
        console.log(`Recommendation ${index + 1}: ${rec.startDate} to ${rec.endDate} - Score: ${rec.conflictScore}, Risk: ${rec.riskLevel}, Competing Events: ${rec.competingEvents.length}`);
      });

      // Categorize recommendations
      const recommendedDates = dateRecommendations
        .filter(rec => rec.riskLevel === 'Low')
        .slice(0, 3); // Top 3 recommendations

      const highRiskDates = dateRecommendations
        .filter(rec => rec.riskLevel === 'High')
        .slice(0, 3); // Top 3 high risk dates

      console.log(`Final results: ${recommendedDates.length} low risk dates, ${highRiskDates.length} high risk dates`);

      return {
        recommendedDates,
        highRiskDates,
        allEvents: events,
        analysisDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in conflict analysis:', error);
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
      size: '100'
    });

    console.log('Fetching events with params:', queryParams.toString());

    // Get base URL for server-side requests
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : 'https://your-app.vercel.app' // Replace with your actual Vercel URL
      : 'http://localhost:3001'; // Use the correct port

    // Fetch from Ticketmaster, Eventbrite, PredictHQ, and Brno ArcGIS in parallel
    const [ticketmasterResponse, eventbriteResponse, predicthqResponse, brnoResponse] = await Promise.allSettled([
      fetch(`${baseUrl}/api/analyze/events/ticketmaster?${queryParams.toString()}`),
      fetch(`${baseUrl}/api/analyze/events/eventbrite?${queryParams.toString()}`),
      fetch(`${baseUrl}/api/analyze/events/predicthq?${queryParams.toString()}`),
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
        console.log('Ticketmaster API response structure:', ticketmasterResult);
        
        // Handle different response structures
        let events = [];
        if (ticketmasterResult.data?.events) {
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
        console.log(`Fetched ${events.length} events from Ticketmaster`);
      } catch (error) {
        console.error('Error processing Ticketmaster response:', error);
      }
    } else if (ticketmasterResponse.status === 'rejected') {
      console.error('Ticketmaster API request failed:', ticketmasterResponse.reason);
    } else {
      console.error('Ticketmaster API returned error:', ticketmasterResponse.value.status);
    }

    // Process Eventbrite results
    if (eventbriteResponse.status === 'fulfilled' && eventbriteResponse.value.ok) {
      try {
        const eventbriteResult = await eventbriteResponse.value.json();
        console.log('Eventbrite API response structure:', eventbriteResult);
        
        // Handle different response structures
        let events = [];
        if (eventbriteResult.data?.events) {
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
        console.log(`Fetched ${events.length} events from Eventbrite`);
      } catch (error) {
        console.error('Error processing Eventbrite response:', error);
      }
    } else if (eventbriteResponse.status === 'rejected') {
      console.error('Eventbrite API request failed:', eventbriteResponse.reason);
    } else {
      console.error('Eventbrite API returned error:', eventbriteResponse.value.status);
    }

    // Process PredictHQ results
    if (predicthqResponse.status === 'fulfilled' && predicthqResponse.value.ok) {
      try {
        const predicthqResult = await predicthqResponse.value.json();
        console.log('PredictHQ API response structure:', predicthqResult);
        
        // Handle different response structures
        let events = [];
        if (predicthqResult.data?.events) {
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
        console.log(`Fetched ${events.length} events from PredictHQ`);
      } catch (error) {
        console.error('Error processing PredictHQ response:', error);
      }
    } else if (predicthqResponse.status === 'rejected') {
      console.error('PredictHQ API request failed:', predicthqResponse.reason);
    } else {
      console.error('PredictHQ API returned error:', predicthqResponse.value.status);
    }

    // Process Brno results
    if (brnoResponse.status === 'fulfilled' && brnoResponse.value.ok) {
      try {
        const brnoResult = await brnoResponse.value.json();
        console.log('Brno API response structure:', brnoResult);

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
        console.log(`Fetched ${events.length} events from Brno`);
      } catch (error) {
        console.error('Error processing Brno response:', error);
      }
    } else if (brnoResponse.status === 'rejected') {
      console.error('Brno API request failed:', brnoResponse.reason);
    } else {
      // @ts-ignore
      console.error('Brno API returned error:', brnoResponse.value?.status);
    }

    // Filter events by location to remove distant cities
    const locationFilteredEvents = this.filterEventsByLocation(allEvents, params.city);
    console.log(`Total events after location filtering: ${locationFilteredEvents.length}`);

    // Remove duplicates based on title, date, and venue
    const uniqueEvents = this.removeDuplicateEvents(locationFilteredEvents);
    console.log(`Total unique events after deduplication: ${uniqueEvents.length}`);

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
    
    for (const dateRange of potentialDates) {
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
    }

    // Sort by conflict score (ascending for recommendations, descending for high risk)
    return recommendations.sort((a, b) => a.conflictScore - b.conflictScore);
  }

  /**
   * Generate potential dates around the preferred dates
   */
  private generatePotentialDates(params: ConflictAnalysisParams): Array<{startDate: string, endDate: string}> {
    const dates: Array<{startDate: string, endDate: string}> = [];
    const preferredStart = new Date(params.startDate);
    const preferredEnd = new Date(params.endDate);
    const eventDuration = Math.ceil((preferredEnd.getTime() - preferredStart.getTime()) / (1000 * 60 * 60 * 24));

    // Generate dates ±7 days around preferred dates
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
        console.log(`Event "${event.title}" on ${event.date}: overlaps=${overlaps}, sameCategory=${sameCategory}, isSignificant=${isSignificant}, isCompeting=${isCompeting}`);
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

    for (const event of competingEvents) {
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

      // Advanced analysis: Audience overlap prediction
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

          // Use OpenAI-powered analysis if available, otherwise fallback to rule-based
          const audienceOverlap = openaiAudienceOverlapService.isAvailable()
            ? await openaiAudienceOverlapService.predictAudienceOverlap(plannedEvent, event)
            : await audienceOverlapService.predictAudienceOverlap(plannedEvent, event);
          
          // Increase score based on audience overlap
          const overlapMultiplier = 1 + (audienceOverlap.overlapScore * 0.5); // Up to 50% increase
          eventScore *= overlapMultiplier;
          console.log(`  "${event.title}": audience overlap multiplier ${overlapMultiplier.toFixed(2)} (${openaiAudienceOverlapService.isAvailable() ? 'AI-powered' : 'rule-based'})`);
        } catch (error) {
          console.error('Error calculating audience overlap:', error);
        }
      }

      score += eventScore;
      console.log(`  "${event.title}": total contribution = ${eventScore}`);
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
   * Check if two categories are related
   */
  private isRelatedCategory(category1: string, category2: string): boolean {
    const relatedCategories: Record<string, string[]> = {
      'Technology': ['Business', 'Education'],
      'Business': ['Technology', 'Finance', 'Marketing'],
      'Entertainment': ['Arts & Culture'],
      'Arts & Culture': ['Entertainment'],
      'Sports': ['Entertainment'],
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