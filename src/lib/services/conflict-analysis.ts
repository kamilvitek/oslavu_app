import { Event } from '@/types';

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
      const dateRecommendations = this.generateDateRecommendations(
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
   * Fetch events from multiple APIs (Ticketmaster and Eventbrite)
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

    // Fetch from both Ticketmaster and Eventbrite in parallel
    const [ticketmasterResponse, eventbriteResponse] = await Promise.allSettled([
      fetch(`/api/analyze/events/ticketmaster?${queryParams.toString()}`),
      fetch(`/api/analyze/events/eventbrite?${queryParams.toString()}`)
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

    // Remove duplicates based on title, date, and venue
    const uniqueEvents = this.removeDuplicateEvents(allEvents);
    console.log(`Total unique events after deduplication: ${uniqueEvents.length}`);

    return uniqueEvents;
  }

  /**
   * Generate date recommendations based on events and parameters
   */
  private generateDateRecommendations(
    params: ConflictAnalysisParams,
    events: Event[]
  ): DateRecommendation[] {
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

      const conflictScore = this.calculateConflictScore(
        competingEvents,
        params.expectedAttendees,
        params.category
      );

      const riskLevel = this.determineRiskLevel(conflictScore);
      const reasons = this.generateReasons(competingEvents, conflictScore);

      recommendations.push({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        conflictScore,
        riskLevel,
        competingEvents,
        reasons
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
  private calculateConflictScore(
    competingEvents: Event[],
    expectedAttendees: number,
    category: string
  ): number {
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
}

export const conflictAnalysisService = new ConflictAnalysisService();