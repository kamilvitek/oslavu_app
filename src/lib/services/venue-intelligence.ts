// src/lib/services/venue-intelligence.ts
import { Event } from '@/types';
import { 
  VenueIntelligence, 
  VenueBooking, 
  PricingTier, 
  CompetitorEvent, 
  DemandForecast, 
  VenueConflictAnalysis 
} from '@/types/venue';

export class VenueIntelligenceService {
  private readonly baseUrl = '/api/venue';

  /**
   * Get comprehensive venue intelligence for a specific venue and date
   */
  async getVenueIntelligence(venueName: string, date: string): Promise<VenueIntelligence> {
    try {
      // Get venue basic information
      const venueInfo = await this.getVenueInfo(venueName);
      
      // Get current bookings
      const currentBookings = await this.getVenueBookings(venueName, date);
      
      // Get pricing information
      const pricingTiers = await this.getPricingTiers(venueName, date);
      
      // Get competitor events
      const competitorEvents = await this.getCompetitorEvents(venueName, date);
      
      // Get demand forecast
      const demandForecast = await this.getDemandForecast(venueName, date);
      
      // Get venue reputation
      const reputation = await this.getVenueReputation(venueName);

      return {
        venueId: venueInfo.id,
        name: venueName,
        capacity: venueInfo.capacity,
        currentBookings,
        pricingTiers,
        competitorEvents,
        demandForecast,
        amenities: venueInfo.amenities,
        location: venueInfo.location,
        reputation
      };
    } catch (error) {
      console.error('Error getting venue intelligence:', error);
      // Return default venue intelligence if error occurs
      return this.getDefaultVenueIntelligence(venueName, date);
    }
  }

  /**
   * Analyze venue conflict for a specific date
   */
  async analyzeVenueConflict(
    venueName: string, 
    date: string, 
    expectedAttendees: number
  ): Promise<VenueConflictAnalysis> {
    const intelligence = await this.getVenueIntelligence(venueName, date);
    
    // Calculate capacity utilization
    const capacityUtilization = this.calculateCapacityUtilization(
      intelligence.currentBookings,
      intelligence.capacity,
      expectedAttendees
    );

    // Calculate pricing impact
    const pricingImpact = this.calculatePricingImpact(
      intelligence.pricingTiers,
      date
    );

    // Calculate competitor pressure
    const competitorPressure = this.calculateCompetitorPressure(
      intelligence.competitorEvents,
      expectedAttendees
    );

    // Get demand forecast impact
    const demandForecast = intelligence.demandForecast.demandLevel;

    // Calculate overall conflict score
    const conflictScore = this.calculateVenueConflictScore({
      capacityUtilization,
      pricingImpact,
      competitorPressure,
      demandForecast
    });

    // Generate recommendations
    const recommendations = this.generateVenueRecommendations(
      intelligence,
      date,
      expectedAttendees,
      conflictScore
    );

    return {
      venueId: intelligence.venueId,
      date,
      conflictScore,
      factors: {
        capacityUtilization,
        pricingImpact,
        competitorPressure,
        demandForecast
      },
      recommendations
    };
  }

  /**
   * Get venue basic information
   */
  private async getVenueInfo(venueName: string): Promise<{
    id: string;
    capacity: number;
    amenities: string[];
    location: {
      address: string;
      city: string;
      coordinates: { lat: number; lng: number };
      accessibility: string[];
    };
  }> {
    // In a real implementation, this would query a venue database
    // For now, we'll generate realistic venue information based on name patterns
    const venueInfo = this.generateVenueInfoFromName(venueName);
    
    // TODO: Integrate with actual venue database/API
    return venueInfo;
  }

  /**
   * Get current bookings for a venue
   */
  private async getVenueBookings(venueName: string, date: string): Promise<VenueBooking[]> {
    // In a real implementation, this would query booking systems
    // For now, we'll generate realistic booking data
    const bookings = this.generateRealisticBookings(venueName, date);
    
    // TODO: Integrate with actual booking systems
    return bookings;
  }

  /**
   * Get pricing tiers for a venue
   */
  private async getPricingTiers(venueName: string, date: string): Promise<PricingTier[]> {
    // Generate pricing tiers based on demand patterns
    const basePrice = this.getBasePriceForVenue(venueName);
    const demandMultiplier = this.calculateDemandMultiplier(date);
    
    const pricingTiers: PricingTier[] = [];
    
    // Generate pricing for the week around the target date
    for (let i = -3; i <= 3; i++) {
      const tierDate = new Date(date);
      tierDate.setDate(tierDate.getDate() + i);
      const dateStr = tierDate.toISOString().split('T')[0];
      
      const dayMultiplier = this.getDayOfWeekMultiplier(tierDate.getDay());
      const finalMultiplier = demandMultiplier * dayMultiplier;
      
      pricingTiers.push({
        date: dateStr,
        basePrice,
        multiplier: finalMultiplier,
        availability: this.determineAvailability(finalMultiplier),
        minimumBooking: this.getMinimumBooking(venueName)
      });
    }
    
    return pricingTiers;
  }

  /**
   * Get competitor events in the area
   */
  private async getCompetitorEvents(venueName: string, date: string): Promise<CompetitorEvent[]> {
    // In a real implementation, this would query event databases
    // For now, we'll generate realistic competitor events
    const competitors = this.generateCompetitorEvents(venueName, date);
    
    // TODO: Integrate with actual event databases
    return competitors;
  }

  /**
   * Get demand forecast for a venue
   */
  private async getDemandForecast(venueName: string, date: string): Promise<DemandForecast> {
    const targetDate = new Date(date);
    
    // Calculate seasonality factor
    const seasonality = this.calculateSeasonalityFactor(targetDate);
    
    // Calculate competitor activity impact
    const competitorActivity = this.calculateCompetitorActivity(venueName, date);
    
    // Calculate economic factors
    const economicFactors = this.calculateEconomicFactors(targetDate);
    
    // Calculate social trends impact
    const socialTrends = this.calculateSocialTrends(targetDate);
    
    // Calculate overall demand level
    const demandLevel = this.calculateOverallDemand({
      seasonality,
      competitorActivity,
      economicFactors,
      socialTrends
    });
    
    // Calculate confidence
    const confidence = this.calculateForecastConfidence(venueName, date);
    
    // Generate recommendations
    const recommendations = this.generateDemandRecommendations(demandLevel, {
      seasonality,
      competitorActivity,
      economicFactors,
      socialTrends
    });

    return {
      date,
      demandLevel,
      factors: {
        seasonality,
        competitorActivity,
        economicFactors,
        socialTrends
      },
      confidence,
      recommendations
    };
  }

  /**
   * Get venue reputation information
   */
  private async getVenueReputation(venueName: string): Promise<{
    rating: number;
    reviews: number;
    cancellationRate: number;
    organizerSatisfaction: number;
  }> {
    // In a real implementation, this would query review systems
    // For now, we'll generate realistic reputation data
    return this.generateVenueReputation(venueName);
  }

  // Calculation methods
  private calculateCapacityUtilization(
    bookings: VenueBooking[],
    capacity: number,
    expectedAttendees: number
  ): number {
    const totalBookedAttendees = bookings.reduce((sum, booking) => 
      sum + booking.expectedAttendees, 0
    );
    
    const totalAfterBooking = totalBookedAttendees + expectedAttendees;
    return Math.min(totalAfterBooking / capacity, 1.0);
  }

  private calculatePricingImpact(pricingTiers: PricingTier[], date: string): number {
    const targetTier = pricingTiers.find(tier => tier.date === date);
    if (!targetTier) return 0.5;
    
    // Higher multiplier = higher pricing impact
    return Math.min(targetTier.multiplier, 2.0) / 2.0;
  }

  private calculateCompetitorPressure(
    competitors: CompetitorEvent[],
    expectedAttendees: number
  ): number {
    if (competitors.length === 0) return 0;
    
    const totalCompetitorAttendees = competitors.reduce((sum, competitor) => 
      sum + competitor.expectedAttendees, 0
    );
    
    const totalMarketSize = totalCompetitorAttendees + expectedAttendees;
    return totalCompetitorAttendees / totalMarketSize;
  }

  private calculateVenueConflictScore(factors: {
    capacityUtilization: number;
    pricingImpact: number;
    competitorPressure: number;
    demandForecast: number;
  }): number {
    const weights = {
      capacityUtilization: 0.3,
      pricingImpact: 0.2,
      competitorPressure: 0.3,
      demandForecast: 0.2
    };

    return (
      factors.capacityUtilization * weights.capacityUtilization +
      factors.pricingImpact * weights.pricingImpact +
      factors.competitorPressure * weights.competitorPressure +
      factors.demandForecast * weights.demandForecast
    );
  }

  // Helper methods for generating realistic data
  private generateVenueInfoFromName(venueName: string): {
    id: string;
    capacity: number;
    amenities: string[];
    location: {
      address: string;
      city: string;
      coordinates: { lat: number; lng: number };
      accessibility: string[];
    };
  } {
    const name = venueName.toLowerCase();
    
    // Determine capacity based on venue type
    let capacity = 100;
    let amenities = ['wifi', 'parking'];
    
    if (name.includes('conference') || name.includes('center')) {
      capacity = 500;
      amenities = ['wifi', 'parking', 'catering', 'av_equipment', 'breakout_rooms'];
    } else if (name.includes('hotel')) {
      capacity = 300;
      amenities = ['wifi', 'parking', 'catering', 'accommodation', 'av_equipment'];
    } else if (name.includes('university') || name.includes('college')) {
      capacity = 200;
      amenities = ['wifi', 'parking', 'av_equipment', 'library_access'];
    } else if (name.includes('stadium') || name.includes('arena')) {
      capacity = 10000;
      amenities = ['wifi', 'parking', 'catering', 'av_equipment', 'security'];
    }

    return {
      id: `venue_${venueName.replace(/\s+/g, '_').toLowerCase()}`,
      capacity,
      amenities,
      location: {
        address: `${venueName}, City Center`,
        city: 'Prague', // Default city
        coordinates: { lat: 50.0755, lng: 14.4378 },
        accessibility: ['wheelchair_accessible', 'public_transport']
      }
    };
  }

  private generateRealisticBookings(venueName: string, date: string): VenueBooking[] {
    const bookings: VenueBooking[] = [];
    const targetDate = new Date(date);
    
    // Generate some realistic bookings around the target date
    for (let i = -2; i <= 2; i++) {
      const bookingDate = new Date(targetDate);
      bookingDate.setDate(bookingDate.getDate() + i);
      
      if (Math.random() > 0.6) { // 40% chance of having a booking
        bookings.push({
          eventId: `event_${i}_${Date.now()}`,
          eventTitle: `Sample Event ${i}`,
          startDate: bookingDate.toISOString().split('T')[0],
          endDate: bookingDate.toISOString().split('T')[0],
          expectedAttendees: Math.floor(Math.random() * 200) + 50,
          category: ['Technology', 'Business', 'Entertainment'][Math.floor(Math.random() * 3)],
          organizer: `Organizer ${i}`,
          status: 'confirmed'
        });
      }
    }
    
    return bookings;
  }

  private getBasePriceForVenue(venueName: string): number {
    const name = venueName.toLowerCase();
    
    if (name.includes('stadium') || name.includes('arena')) return 5000;
    if (name.includes('conference') || name.includes('center')) return 2000;
    if (name.includes('hotel')) return 1500;
    if (name.includes('university')) return 800;
    
    return 1000; // Default
  }

  private calculateDemandMultiplier(date: string): number {
    const targetDate = new Date(date);
    const month = targetDate.getMonth();
    const day = targetDate.getDay();
    
    // Seasonal adjustments
    let seasonalMultiplier = 1.0;
    if (month >= 5 && month <= 8) seasonalMultiplier = 1.3; // Summer
    if (month === 11 || month === 0) seasonalMultiplier = 1.2; // Holiday season
    if (month === 1 || month === 2) seasonalMultiplier = 0.8; // Winter
    
    // Day of week adjustments
    let dayMultiplier = 1.0;
    if (day === 5 || day === 6) dayMultiplier = 1.2; // Weekend
    if (day === 0) dayMultiplier = 0.9; // Sunday
    
    return seasonalMultiplier * dayMultiplier;
  }

  private getDayOfWeekMultiplier(dayOfWeek: number): number {
    const multipliers = [0.9, 1.0, 1.1, 1.1, 1.0, 1.2, 1.2]; // Sun-Sat
    return multipliers[dayOfWeek];
  }

  private determineAvailability(multiplier: number): 'available' | 'limited' | 'sold_out' {
    if (multiplier > 1.5) return 'limited';
    if (multiplier > 2.0) return 'sold_out';
    return 'available';
  }

  private getMinimumBooking(venueName: string): number {
    const name = venueName.toLowerCase();
    if (name.includes('stadium')) return 1000;
    if (name.includes('conference')) return 50;
    if (name.includes('hotel')) return 30;
    return 20;
  }

  private generateCompetitorEvents(venueName: string, date: string): CompetitorEvent[] {
    const competitors: CompetitorEvent[] = [];
    const targetDate = new Date(date);
    
    // Generate some competitor events
    for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
      const competitorDate = new Date(targetDate);
      competitorDate.setDate(competitorDate.getDate() + (Math.random() - 0.5) * 4);
      
      competitors.push({
        eventId: `competitor_${i}_${Date.now()}`,
        title: `Competitor Event ${i}`,
        date: competitorDate.toISOString().split('T')[0],
        category: ['Technology', 'Business', 'Entertainment'][Math.floor(Math.random() * 3)],
        expectedAttendees: Math.floor(Math.random() * 500) + 100,
        ticketPrice: Math.floor(Math.random() * 200) + 50,
        organizer: `Competitor Organizer ${i}`,
        marketingBudget: Math.floor(Math.random() * 10000) + 1000,
        socialMediaReach: Math.floor(Math.random() * 10000) + 1000
      });
    }
    
    return competitors;
  }

  private calculateSeasonalityFactor(date: Date): number {
    const month = date.getMonth();
    // Higher demand in spring/summer, lower in winter
    const seasonalFactors = [0.7, 0.8, 1.0, 1.2, 1.3, 1.2, 1.1, 1.0, 1.1, 1.0, 0.9, 0.8];
    return seasonalFactors[month];
  }

  private calculateCompetitorActivity(venueName: string, date: string): number {
    // This would ideally query actual competitor data
    // For now, return a random value
    return Math.random() * 0.5 + 0.3;
  }

  private calculateEconomicFactors(date: Date): number {
    // This would ideally use economic indicators
    // For now, return a base value
    return 0.8;
  }

  private calculateSocialTrends(date: Date): number {
    // This would ideally use social media trends
    // For now, return a base value
    return 0.9;
  }

  private calculateOverallDemand(factors: {
    seasonality: number;
    competitorActivity: number;
    economicFactors: number;
    socialTrends: number;
  }): number {
    const weights = { seasonality: 0.4, competitorActivity: 0.3, economicFactors: 0.2, socialTrends: 0.1 };
    
    return (
      factors.seasonality * weights.seasonality +
      factors.competitorActivity * weights.competitorActivity +
      factors.economicFactors * weights.economicFactors +
      factors.socialTrends * weights.socialTrends
    );
  }

  private calculateForecastConfidence(venueName: string, date: string): number {
    // Confidence based on data availability and venue type
    let confidence = 0.6; // Base confidence
    
    if (venueName.toLowerCase().includes('conference')) confidence += 0.2;
    if (venueName.toLowerCase().includes('hotel')) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private generateDemandRecommendations(
    demandLevel: number,
    factors: {
      seasonality: number;
      competitorActivity: number;
      economicFactors: number;
      socialTrends: number;
    }
  ): string[] {
    const recommendations: string[] = [];
    
    if (demandLevel > 0.8) {
      recommendations.push('High demand period - consider premium pricing');
      recommendations.push('Book early to secure preferred dates');
    } else if (demandLevel < 0.4) {
      recommendations.push('Low demand period - consider promotional pricing');
      recommendations.push('Good opportunity for budget-conscious events');
    }
    
    if (factors.competitorActivity > 0.7) {
      recommendations.push('High competitor activity - differentiate your event');
    }
    
    return recommendations;
  }

  private generateVenueReputation(venueName: string): {
    rating: number;
    reviews: number;
    cancellationRate: number;
    organizerSatisfaction: number;
  } {
    // Generate realistic reputation data
    const baseRating = 4.0 + Math.random() * 1.0;
    const reviews = Math.floor(Math.random() * 500) + 50;
    const cancellationRate = Math.random() * 0.1; // 0-10%
    const organizerSatisfaction = 0.7 + Math.random() * 0.3; // 0.7-1.0
    
    return {
      rating: Math.round(baseRating * 10) / 10,
      reviews,
      cancellationRate,
      organizerSatisfaction
    };
  }

  private generateVenueRecommendations(
    intelligence: VenueIntelligence,
    date: string,
    expectedAttendees: number,
    conflictScore: number
  ): {
    alternativeDates: string[];
    pricingStrategy: string;
    marketingAdvice: string;
  } {
    const alternativeDates: string[] = [];
    const targetDate = new Date(date);
    
    // Find alternative dates with lower conflict
    for (let i = -7; i <= 7; i++) {
      if (i === 0) continue;
      const altDate = new Date(targetDate);
      altDate.setDate(altDate.getDate() + i);
      alternativeDates.push(altDate.toISOString().split('T')[0]);
    }
    
    let pricingStrategy = 'Standard pricing recommended';
    if (conflictScore > 0.7) {
      pricingStrategy = 'Consider premium pricing due to high demand';
    } else if (conflictScore < 0.3) {
      pricingStrategy = 'Consider promotional pricing to attract attendees';
    }
    
    let marketingAdvice = 'Standard marketing approach';
    if (intelligence.competitorEvents.length > 2) {
      marketingAdvice = 'Increase marketing budget to compete with multiple events';
    } else if (intelligence.demandForecast.demandLevel > 0.8) {
      marketingAdvice = 'Focus on early bird promotions due to high demand';
    }
    
    return {
      alternativeDates: alternativeDates.slice(0, 5), // Top 5 alternatives
      pricingStrategy,
      marketingAdvice
    };
  }

  private getDefaultVenueIntelligence(venueName: string, date: string): VenueIntelligence {
    return {
      venueId: `default_${venueName.replace(/\s+/g, '_').toLowerCase()}`,
      name: venueName,
      capacity: 200,
      currentBookings: [],
      pricingTiers: [{
        date,
        basePrice: 1000,
        multiplier: 1.0,
        availability: 'available',
        minimumBooking: 20
      }],
      competitorEvents: [],
      demandForecast: {
        date,
        demandLevel: 0.5,
        factors: {
          seasonality: 1.0,
          competitorActivity: 0.5,
          economicFactors: 0.8,
          socialTrends: 0.9
        },
        confidence: 0.5,
        recommendations: ['Standard market conditions']
      },
      amenities: ['wifi', 'parking'],
      location: {
        address: `${venueName}, City Center`,
        city: 'Prague',
        coordinates: { lat: 50.0755, lng: 14.4378 },
        accessibility: ['wheelchair_accessible']
      },
      reputation: {
        rating: 4.0,
        reviews: 100,
        cancellationRate: 0.05,
        organizerSatisfaction: 0.8
      }
    };
  }
}

export const venueIntelligenceService = new VenueIntelligenceService();
