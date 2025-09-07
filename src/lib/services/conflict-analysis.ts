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
      // Fetch events from Ticketmaster API
      const events = await this.fetchEventsFromAPI(params);
      
      // Generate date recommendations
      const dateRecommendations = this.generateDateRecommendations(
        params,
        events
      );

      // Categorize recommendations
      const recommendedDates = dateRecommendations
        .filter(rec => rec.riskLevel === 'Low')
        .slice(0, 3); // Top 3 recommendations

      const highRiskDates = dateRecommendations
        .filter(rec => rec.riskLevel === 'High')
        .slice(0, 3); // Top 3 high risk dates

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
   * Fetch events from Ticketmaster API
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

    const response = await fetch(`/api/analyze/events/ticketmaster?${queryParams.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`Failed to fetch events: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || [];
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

    return events.filter(event => {
      const eventDate = new Date(event.date);
      
      // Check if event overlaps with our date range
      const overlaps = eventDate >= start && eventDate <= end;
      
      // Check if it's in the same category or related categories
      const sameCategory = event.category === params.category || 
                          this.isRelatedCategory(event.category, params.category);
      
      // Check if it's a significant event (has venue, good attendance potential)
      const isSignificant = event.venue && event.venue.length > 0;

      return overlaps && (sameCategory || isSignificant);
    });
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
      return 0;
    }

    let score = 0;

    for (const event of competingEvents) {
      // Base score for any competing event
      score += 20;

      // Higher score for same category
      if (event.category === category) {
        score += 30;
      }

      // Higher score for events with venues (more significant)
      if (event.venue) {
        score += 15;
      }

      // Higher score for events with images (more professional/promoted)
      if (event.imageUrl) {
        score += 10;
      }

      // Higher score for events with descriptions (more detailed/promoted)
      if (event.description && event.description.length > 50) {
        score += 5;
      }
    }

    // Adjust based on expected attendees (larger events are more affected by conflicts)
    if (expectedAttendees > 1000) {
      score *= 1.2;
    } else if (expectedAttendees > 500) {
      score *= 1.1;
    }

    // Cap the score at 100
    return Math.min(score, 100);
  }

  /**
   * Determine risk level based on conflict score
   */
  private determineRiskLevel(conflictScore: number): 'Low' | 'Medium' | 'High' {
    if (conflictScore <= 30) return 'Low';
    if (conflictScore <= 60) return 'Medium';
    return 'High';
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
}

export const conflictAnalysisService = new ConflictAnalysisService();