// src/lib/services/attendee-learning.ts
import { DatabaseEvent } from '@/lib/types/events';
import { serverDatabaseService } from '@/lib/supabase';
import { venueDatabaseService } from './venue-database';

export interface SimilarEvent {
  id: string;
  title: string;
  venue: string;
  city: string;
  category: string;
  expected_attendees: number;
  date: string;
  similarity_score: number;
  similarity_factors: string[];
}

export interface ImprovedEstimate {
  estimate: number;
  confidence: number;
  similarEventsCount: number;
  reasoning: string[];
  similarEvents: SimilarEvent[];
  method: 'historical_average' | 'venue_based' | 'category_based' | 'hybrid';
}

export interface LearningPattern {
  pattern_type: 'venue_utilization' | 'category_trends' | 'seasonal_patterns' | 'city_factors';
  description: string;
  confidence: number;
  sample_size: number;
  last_updated: string;
  data: Record<string, any>;
}

export interface LearningInsights {
  venueInsights: Record<string, {
    averageUtilization: number;
    typicalCapacity: number;
    eventCount: number;
    lastEvent: string;
  }>;
  categoryInsights: Record<string, {
    averageAttendance: number;
    medianAttendance: number;
    eventCount: number;
    growthTrend: number;
  }>;
  seasonalInsights: Record<string, {
    averageAttendance: number;
    eventCount: number;
    peakMonth: string;
  }>;
  cityInsights: Record<string, {
    averageAttendance: number;
    eventCount: number;
    topVenues: string[];
  }>;
}

export class AttendeeLearningService {
  private db = serverDatabaseService;
  private learningCache: Map<string, any> = new Map();
  private cacheExpiry = 60 * 60 * 1000; // 1 hour

  /**
   * Learn from historical patterns
   */
  async learnFromHistory(): Promise<LearningInsights> {
    console.log('🧠 Starting historical learning analysis...');

    try {
      // Get all events with attendee data
      const { data: events, error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('events')
          .select('*')
          .not('expected_attendees', 'is', null)
          .gt('expected_attendees', 0)
          .order('date', { ascending: false });
        return result;
      });

      if (error) {
        throw new Error(`Failed to fetch events for learning: ${error.message}`);
      }

      if (!events || events.length === 0) {
        console.log('⚠️  No events found for learning analysis');
        return this.getEmptyInsights();
      }

      console.log(`📊 Analyzing ${events.length} events for patterns...`);

      const insights: LearningInsights = {
        venueInsights: await this.analyzeVenuePatterns(events),
        categoryInsights: await this.analyzeCategoryPatterns(events),
        seasonalInsights: await this.analyzeSeasonalPatterns(events),
        cityInsights: await this.analyzeCityPatterns(events)
      };

      console.log('✅ Historical learning analysis completed');
      return insights;

    } catch (error) {
      console.error('❌ Error in historical learning:', error);
      return this.getEmptyInsights();
    }
  }

  /**
   * Improve estimate based on similar events
   */
  async improveEstimate(event: DatabaseEvent): Promise<ImprovedEstimate> {
    try {
      const similarEvents = await this.findSimilarEvents(event);
      
      if (similarEvents.length === 0) {
        return {
          estimate: event.expected_attendees || 0,
          confidence: 0.3,
          similarEventsCount: 0,
          reasoning: ['No similar events found'],
          similarEvents: [],
          method: 'category_based'
        };
      }

      const averageAttendance = this.calculateAverage(similarEvents);
      const confidence = this.calculateConfidence(similarEvents);
      const reasoning = this.generateReasoning(similarEvents, event);

      return {
        estimate: Math.round(averageAttendance),
        confidence,
        similarEventsCount: similarEvents.length,
        reasoning,
        similarEvents: similarEvents.slice(0, 5), // Top 5 most similar
        method: this.determineMethod(similarEvents, event)
      };

    } catch (error) {
      console.error('Error improving estimate:', error);
      return {
        estimate: event.expected_attendees || 0,
        confidence: 0.3,
        similarEventsCount: 0,
        reasoning: ['Error in analysis'],
        similarEvents: [],
        method: 'category_based'
      };
    }
  }

  /**
   * Find similar events based on multiple criteria
   */
  private async findSimilarEvents(event: DatabaseEvent): Promise<SimilarEvent[]> {
    try {
      const { data: events, error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('events')
          .select('*')
          .not('expected_attendees', 'is', null)
          .gt('expected_attendees', 0)
          .neq('id', event.id); // Exclude current event
        return result;
      });

      if (error || !events) {
        return [];
      }

      const similarEvents: SimilarEvent[] = [];

      for (const candidateEvent of events) {
        const similarityScore = this.calculateSimilarity(event, candidateEvent);
        
        if (similarityScore > 0.3) { // Minimum similarity threshold
          similarEvents.push({
            id: candidateEvent.id,
            title: candidateEvent.title,
            venue: candidateEvent.venue || '',
            city: candidateEvent.city,
            category: candidateEvent.category,
            expected_attendees: candidateEvent.expected_attendees || 0,
            date: candidateEvent.date,
            similarity_score: similarityScore,
            similarity_factors: this.getSimilarityFactors(event, candidateEvent)
          });
        }
      }

      // Sort by similarity score (highest first)
      return similarEvents.sort((a, b) => b.similarity_score - a.similarity_score);

    } catch (error) {
      console.error('Error finding similar events:', error);
      return [];
    }
  }

  /**
   * Calculate similarity between two events
   */
  private calculateSimilarity(event1: DatabaseEvent, event2: DatabaseEvent): number {
    let score = 0;
    let factors = 0;

    // Same venue (highest weight)
    if (event1.venue && event2.venue && event1.venue.toLowerCase() === event2.venue.toLowerCase()) {
      score += 0.4;
      factors++;
    }

    // Same category
    if (event1.category === event2.category) {
      score += 0.3;
      factors++;
    }

    // Same city
    if (event1.city === event2.city) {
      score += 0.2;
      factors++;
    }

    // Similar title keywords
    const titleSimilarity = this.calculateTitleSimilarity(event1.title, event2.title);
    score += titleSimilarity * 0.1;

    // Same day of week
    const dayOfWeek1 = new Date(event1.date).getDay();
    const dayOfWeek2 = new Date(event2.date).getDay();
    if (dayOfWeek1 === dayOfWeek2) {
      score += 0.1;
      factors++;
    }

    // Same season
    const season1 = this.getSeason(event1.date);
    const season2 = this.getSeason(event2.date);
    if (season1 === season2) {
      score += 0.1;
      factors++;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Calculate title similarity using simple keyword matching
   */
  private calculateTitleSimilarity(title1: string, title2: string): number {
    const words1 = title1.toLowerCase().split(/\s+/);
    const words2 = title2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }

  /**
   * Get similarity factors for explanation
   */
  private getSimilarityFactors(event1: DatabaseEvent, event2: DatabaseEvent): string[] {
    const factors: string[] = [];

    if (event1.venue && event2.venue && event1.venue.toLowerCase() === event2.venue.toLowerCase()) {
      factors.push('Same venue');
    }
    if (event1.category === event2.category) {
      factors.push('Same category');
    }
    if (event1.city === event2.city) {
      factors.push('Same city');
    }

    return factors;
  }

  /**
   * Calculate average attendance from similar events
   */
  private calculateAverage(similarEvents: SimilarEvent[]): number {
    if (similarEvents.length === 0) return 0;
    
    const total = similarEvents.reduce((sum, event) => sum + event.expected_attendees, 0);
    return total / similarEvents.length;
  }

  /**
   * Calculate confidence based on similar events
   */
  private calculateConfidence(similarEvents: SimilarEvent[]): number {
    if (similarEvents.length === 0) return 0.3;
    
    // More similar events = higher confidence
    const countFactor = Math.min(similarEvents.length / 10, 1);
    
    // Higher similarity scores = higher confidence
    const avgSimilarity = similarEvents.reduce((sum, event) => sum + event.similarity_score, 0) / similarEvents.length;
    
    // Combine factors
    return Math.min(0.3 + (countFactor * 0.4) + (avgSimilarity * 0.3), 0.9);
  }

  /**
   * Generate reasoning for the estimate
   */
  private generateReasoning(similarEvents: SimilarEvent[], event: DatabaseEvent): string[] {
    const reasoning: string[] = [];
    
    reasoning.push(`Based on ${similarEvents.length} similar events`);
    
    if (similarEvents.length > 0) {
      const avgAttendance = this.calculateAverage(similarEvents);
      reasoning.push(`Average attendance: ${Math.round(avgAttendance)}`);
      
      const venueMatches = similarEvents.filter(e => e.venue === event.venue).length;
      if (venueMatches > 0) {
        reasoning.push(`${venueMatches} events at same venue`);
      }
      
      const categoryMatches = similarEvents.filter(e => e.category === event.category).length;
      if (categoryMatches > 0) {
        reasoning.push(`${categoryMatches} events in same category`);
      }
    }

    return reasoning;
  }

  /**
   * Determine the method used for estimation
   */
  private determineMethod(similarEvents: SimilarEvent[], event: DatabaseEvent): 'historical_average' | 'venue_based' | 'category_based' | 'hybrid' {
    const venueMatches = similarEvents.filter(e => e.venue === event.venue).length;
    const categoryMatches = similarEvents.filter(e => e.category === event.category).length;
    
    if (venueMatches >= 3) return 'venue_based';
    if (categoryMatches >= 5) return 'category_based';
    if (venueMatches > 0 && categoryMatches > 0) return 'hybrid';
    return 'historical_average';
  }

  /**
   * Analyze venue patterns
   */
  private async analyzeVenuePatterns(events: DatabaseEvent[]): Promise<Record<string, any>> {
    const venueStats: Record<string, any> = {};
    
    for (const event of events) {
      if (!event.venue) continue;
      
      if (!venueStats[event.venue]) {
        venueStats[event.venue] = {
          attendances: [],
          cities: new Set(),
          categories: new Set(),
          dates: []
        };
      }
      
      venueStats[event.venue].attendances.push(event.expected_attendees || 0);
      venueStats[event.venue].cities.add(event.city);
      venueStats[event.venue].categories.add(event.category);
      venueStats[event.venue].dates.push(event.date);
    }

    // Calculate insights for each venue
    const insights: Record<string, any> = {};
    for (const [venue, stats] of Object.entries(venueStats)) {
      const attendances = stats.attendances;
      const averageUtilization = this.calculateVenueUtilization(venue, attendances);
      
      insights[venue] = {
        averageUtilization,
        typicalCapacity: Math.max(...attendances),
        eventCount: attendances.length,
        lastEvent: stats.dates.sort().pop(),
        averageAttendance: Math.round(attendances.reduce((a, b) => a + b, 0) / attendances.length)
      };
    }

    return insights;
  }

  /**
   * Calculate venue utilization
   */
  private async calculateVenueUtilization(venueName: string, attendances: number[]): Promise<number> {
    try {
      const venue = await venueDatabaseService.lookupVenue(venueName);
      if (!venue) return 0.7; // Default utilization
      
      const avgAttendance = attendances.reduce((a, b) => a + b, 0) / attendances.length;
      return Math.min(avgAttendance / venue.capacity, 1.0);
    } catch (error) {
      return 0.7; // Default utilization
    }
  }

  /**
   * Analyze category patterns
   */
  private async analyzeCategoryPatterns(events: DatabaseEvent[]): Promise<Record<string, any>> {
    const categoryStats: Record<string, any> = {};
    
    for (const event of events) {
      if (!categoryStats[event.category]) {
        categoryStats[event.category] = {
          attendances: [],
          dates: []
        };
      }
      
      categoryStats[event.category].attendances.push(event.expected_attendees || 0);
      categoryStats[event.category].dates.push(event.date);
    }

    const insights: Record<string, any> = {};
    for (const [category, stats] of Object.entries(categoryStats)) {
      const attendances = stats.attendances.sort((a, b) => a - b);
      const dates = stats.dates.sort();
      
      insights[category] = {
        averageAttendance: Math.round(attendances.reduce((a, b) => a + b, 0) / attendances.length),
        medianAttendance: attendances[Math.floor(attendances.length / 2)],
        eventCount: attendances.length,
        growthTrend: this.calculateGrowthTrend(attendances, dates)
      };
    }

    return insights;
  }

  /**
   * Analyze seasonal patterns
   */
  private async analyzeSeasonalPatterns(events: DatabaseEvent[]): Promise<Record<string, any>> {
    const seasonalStats: Record<string, any> = {};
    
    for (const event of events) {
      const month = new Date(event.date).getMonth();
      const season = this.getSeasonFromMonth(month);
      
      if (!seasonalStats[season]) {
        seasonalStats[season] = {
          attendances: [],
          months: new Set()
        };
      }
      
      seasonalStats[season].attendances.push(event.expected_attendees || 0);
      seasonalStats[season].months.add(month);
    }

    const insights: Record<string, any> = {};
    for (const [season, stats] of Object.entries(seasonalStats)) {
      const attendances = stats.attendances;
      const months = Array.from(stats.months);
      const peakMonth = this.getMonthName(months[Math.floor(months.length / 2)]);
      
      insights[season] = {
        averageAttendance: Math.round(attendances.reduce((a, b) => a + b, 0) / attendances.length),
        eventCount: attendances.length,
        peakMonth
      };
    }

    return insights;
  }

  /**
   * Analyze city patterns
   */
  private async analyzeCityPatterns(events: DatabaseEvent[]): Promise<Record<string, any>> {
    const cityStats: Record<string, any> = {};
    
    for (const event of events) {
      if (!cityStats[event.city]) {
        cityStats[event.city] = {
          attendances: [],
          venues: new Set()
        };
      }
      
      cityStats[event.city].attendances.push(event.expected_attendees || 0);
      if (event.venue) {
        cityStats[event.city].venues.add(event.venue);
      }
    }

    const insights: Record<string, any> = {};
    for (const [city, stats] of Object.entries(cityStats)) {
      const attendances = stats.attendances;
      const venues = Array.from(stats.venues);
      
      insights[city] = {
        averageAttendance: Math.round(attendances.reduce((a, b) => a + b, 0) / attendances.length),
        eventCount: attendances.length,
        topVenues: venues.slice(0, 3) // Top 3 venues
      };
    }

    return insights;
  }

  /**
   * Calculate growth trend
   */
  private calculateGrowthTrend(attendances: number[], dates: string[]): number {
    if (attendances.length < 2) return 0;
    
    const sortedData = dates.map((date, index) => ({
      date: new Date(date).getTime(),
      attendance: attendances[index]
    })).sort((a, b) => a.date - b.date);
    
    const firstHalf = sortedData.slice(0, Math.floor(sortedData.length / 2));
    const secondHalf = sortedData.slice(Math.floor(sortedData.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, item) => sum + item.attendance, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, item) => sum + item.attendance, 0) / secondHalf.length;
    
    return firstAvg > 0 ? (secondAvg - firstAvg) / firstAvg : 0;
  }

  /**
   * Get season from date
   */
  private getSeason(date: string): string {
    const month = new Date(date).getMonth();
    return this.getSeasonFromMonth(month);
  }

  /**
   * Get season from month
   */
  private getSeasonFromMonth(month: number): string {
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  /**
   * Get month name
   */
  private getMonthName(month: number): string {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month] || 'Unknown';
  }

  /**
   * Get empty insights structure
   */
  private getEmptyInsights(): LearningInsights {
    return {
      venueInsights: {},
      categoryInsights: {},
      seasonalInsights: {},
      cityInsights: {}
    };
  }
}

// Export singleton instance
export const attendeeLearningService = new AttendeeLearningService();
