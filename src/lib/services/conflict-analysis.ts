// src/lib/services/conflict-analysis.ts
import { AnalysisRequest, ConflictAnalysis, ConflictScore, ConflictingEvent, Event } from "@/types";
import { ticketmasterService } from './ticketmaster';

class ConflictAnalysisService {
  async analyzeConflicts(request: AnalysisRequest): Promise<ConflictAnalysis> {
    const results: ConflictScore[] = [];
    
    // Fetch competing events from external APIs
    const competingEvents = await this.fetchCompetingEvents(request);
    
    // Generate analysis for each date in the range
    const startDate = new Date(request.dateRange.start);
    const endDate = new Date(request.dateRange.end);
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateString = date.toISOString().split('T')[0];
      
      // Skip if not in preferred dates (if specified)
      if (request.preferredDates.length > 0 && !request.preferredDates.includes(dateString)) {
        continue;
      }
      
      const conflictsForDate = this.findConflictsForDate(dateString, competingEvents, request);
      const score = this.calculateConflictScore(conflictsForDate, request.expectedAttendees);
      const risk = this.determineRiskLevel(score);
      
      results.push({
        date: dateString,
        score,
        risk,
        conflictingEvents: conflictsForDate,
        recommendation: this.generateRecommendation(score, risk, conflictsForDate.length),
      });
    }
    
    return {
      id: crypto.randomUUID(),
      userId: 'mock-user-id', // Will come from auth
      city: request.city,
      category: request.category,
      preferredDates: request.preferredDates,
      expectedAttendees: request.expectedAttendees,
      results: results.sort((a, b) => a.score - b.score), // Sort by best scores first
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Fetch competing events from all external sources
   */
  private async fetchCompetingEvents(request: AnalysisRequest): Promise<Event[]> {
    const allEvents: Event[] = [];
    
    try {
      // Fetch from Ticketmaster
      const ticketmasterEvents = await this.fetchTicketmasterEvents(
        request.city,
        request.dateRange,
        request.category
      );
      allEvents.push(...ticketmasterEvents);
      
      // TODO: Add other sources (Eventbrite, Meetup, PredictHQ)
      // const eventbriteEvents = await this.fetchEventbriteEvents(request.city, request.dateRange);
      // allEvents.push(...eventbriteEvents);
      
    } catch (error) {
      console.error('Error fetching competing events:', error);
      // Continue with empty array if API fails
    }
    
    return this.deduplicateEvents(allEvents);
  }

  /**
   * Fetch events from Ticketmaster API
   */
  private async fetchTicketmasterEvents(
    city: string,
    dateRange: { start: string; end: string },
    category?: string
  ): Promise<Event[]> {
    try {
      return await ticketmasterService.getEventsForCity(
        city,
        dateRange.start,
        dateRange.end,
        category
      );
    } catch (error) {
      console.error('Error fetching Ticketmaster events:', error);
      return [];
    }
  }

  /**
   * Find conflicting events for a specific date
   */
  private findConflictsForDate(
    targetDate: string,
    allEvents: Event[],
    request: AnalysisRequest
  ): ConflictingEvent[] {
    const conflicts: ConflictingEvent[] = [];
    const targetDateObj = new Date(targetDate);
    
    for (const event of allEvents) {
      const eventDate = new Date(event.date);
      const endDate = event.endDate ? new Date(event.endDate) : eventDate;
      
      // Check if dates overlap (including multi-day events)
      if (targetDateObj >= eventDate && targetDateObj <= endDate) {
        const impact = this.calculateEventImpact(event, request);
        
        // Only include events with significant impact
        if (impact > 10) {
          conflicts.push({
            id: event.id,
            title: event.title,
            date: event.date,
            category: event.category,
            expectedAttendees: event.expectedAttendees,
            impact,
            reason: this.generateConflictReason(event, request),
          });
        }
      }
    }
    
    return conflicts.sort((a, b) => b.impact - a.impact); // Sort by highest impact first
  }

  /**
   * Calculate impact score for a specific event
   */
  private calculateEventImpact(event: Event, request: AnalysisRequest): number {
    let impact = 0;
    
    // Category match (highest impact)
    if (event.category === request.category) {
      impact += 60;
    } else if (this.areCategoriesRelated(event.category, request.category)) {
      impact += 30;
    }
    
    // Subcategory match
    if (event.subcategory === request.subcategory) {
      impact += 20;
    }
    
    // Audience size consideration
    if (event.expectedAttendees) {
      const audienceRatio = event.expectedAttendees / request.expectedAttendees;
      if (audienceRatio > 0.5) impact += 15; // Large competing event
      else if (audienceRatio > 0.2) impact += 8; // Medium competing event
    }
    
    // Same venue/city (already filtered by city in the request)
    impact += 5;
    
    return Math.min(impact, 100); // Cap at 100
  }

  /**
   * Check if two categories are related
   */
  private areCategoriesRelated(category1: string, category2: string): boolean {
    const relatedCategories: Record<string, string[]> = {
      'Technology': ['Business', 'Education'],
      'Business': ['Technology', 'Finance', 'Marketing'],
      'Marketing': ['Business', 'Technology'],
      'Healthcare': ['Education', 'Business'],
      'Education': ['Technology', 'Healthcare', 'Business'],
      'Finance': ['Business', 'Technology'],
      'Entertainment': ['Arts & Culture'],
      'Arts & Culture': ['Entertainment'],
    };
    
    return relatedCategories[category1]?.includes(category2) || false;
  }

  /**
   * Calculate overall conflict score for a date
   */
  private calculateConflictScore(conflicts: ConflictingEvent[], expectedAttendees: number): number {
    if (conflicts.length === 0) return 0;
    
    // Base score from highest impact event
    const maxImpact = Math.max(...conflicts.map(c => c.impact));
    let score = maxImpact;
    
    // Add penalty for multiple conflicts
    if (conflicts.length > 1) {
      score += Math.min(conflicts.length * 5, 20);
    }
    
    // Add penalty for large competing events
    const largeEvents = conflicts.filter(c => 
      c.expectedAttendees && c.expectedAttendees > expectedAttendees * 0.5
    );
    score += largeEvents.length * 10;
    
    return Math.min(score, 100);
  }

  /**
   * Determine risk level based on score
   */
  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score <= 30) return 'low';
    if (score <= 70) return 'medium';
    return 'high';
  }

  /**
   * Generate human-readable recommendation
   */
  private generateRecommendation(score: number, risk: string, conflictCount: number): string {
    if (risk === 'low') {
      return conflictCount === 0 
        ? "Excellent choice! No significant conflicts detected."
        : "Good choice! Minor conflicts that shouldn't significantly impact attendance.";
    } else if (risk === 'medium') {
      return `Moderate risk detected. ${conflictCount} competing event${conflictCount > 1 ? 's' : ''} found. Consider monitoring competitor marketing closely.`;
    } else {
      return `High risk! ${conflictCount} major conflict${conflictCount > 1 ? 's' : ''} detected. Strongly consider alternative dates.`;
    }
  }

  /**
   * Generate reason for conflict
   */
  private generateConflictReason(event: Event, request: AnalysisRequest): string {
    const reasons = [];
    
    if (event.category === request.category) {
      reasons.push('same category');
    } else if (this.areCategoriesRelated(event.category, request.category)) {
      reasons.push('related category');
    }
    
    if (event.subcategory === request.subcategory) {
      reasons.push('same subcategory');
    }
    
    if (event.expectedAttendees && event.expectedAttendees > request.expectedAttendees * 0.5) {
      reasons.push('large audience overlap');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'potential audience overlap';
  }

  /**
   * Remove duplicate events across sources
   */
  private deduplicateEvents(events: Event[]): Event[] {
    const seen = new Set<string>();
    const deduplicated: Event[] = [];
    
    for (const event of events) {
      // Create a key based on event details for deduplication
      const key = `${event.title.toLowerCase()}_${event.date}_${event.city.toLowerCase()}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(event);
      }
    }
    
    return deduplicated;
  }

  // Placeholder methods for other API integrations
  async fetchEventbriteEvents(city: string, dateRange: { start: string; end: string }) {
    // TODO: Implement Eventbrite API integration
    return [];
  }

  async fetchMeetupEvents(city: string, dateRange: { start: string; end: string }) {
    // TODO: Implement Meetup API integration
    return [];
  }

  async fetchPredictHQEvents(city: string, dateRange: { start: string; end: string }) {
    // TODO: Implement PredictHQ API integration
    return [];
  }
}

export const conflictAnalysisService = new ConflictAnalysisService();