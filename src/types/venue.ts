// src/types/venue.ts
export interface VenueIntelligence {
  venueId: string;
  name: string;
  capacity: number;
  currentBookings: VenueBooking[];
  pricingTiers: PricingTier[];
  competitorEvents: CompetitorEvent[];
  demandForecast: DemandForecast;
  amenities: string[];
  location: {
    address: string;
    city: string;
    coordinates: { lat: number; lng: number };
    accessibility: string[];
  };
  reputation: {
    rating: number; // 1-5 scale
    reviews: number;
    cancellationRate: number; // 0-1 scale
    organizerSatisfaction: number; // 0-1 scale
  };
}

export interface VenueBooking {
  eventId: string;
  eventTitle: string;
  startDate: string;
  endDate: string;
  expectedAttendees: number;
  category: string;
  organizer: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
}

export interface PricingTier {
  date: string;
  basePrice: number;
  multiplier: number; // 1.0 = normal, 1.5 = high demand, 0.8 = low demand
  availability: 'available' | 'limited' | 'sold_out';
  minimumBooking: number; // minimum attendees required
}

export interface CompetitorEvent {
  eventId: string;
  title: string;
  date: string;
  category: string;
  expectedAttendees: number;
  ticketPrice: number;
  organizer: string;
  marketingBudget: number; // estimated
  socialMediaReach: number;
}

export interface DemandForecast {
  date: string;
  demandLevel: number; // 0-1 scale
  factors: {
    seasonality: number;
    competitorActivity: number;
    economicFactors: number;
    socialTrends: number;
  };
  confidence: number; // 0-1 scale
  recommendations: string[];
}

export interface VenueConflictAnalysis {
  venueId: string;
  date: string;
  conflictScore: number; // 0-1 scale
  factors: {
    capacityUtilization: number;
    pricingImpact: number;
    competitorPressure: number;
    demandForecast: number;
  };
  recommendations: {
    alternativeDates: string[];
    pricingStrategy: string;
    marketingAdvice: string;
  };
}
