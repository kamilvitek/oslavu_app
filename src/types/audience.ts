// src/types/audience.ts
export interface AudienceProfile {
  demographics: {
    age: number[];
    interests: string[];
    profession: string[];
    income: number[];
    education: string[];
  };
  behavior: {
    ticketPrice: number;
    travelDistance: number;
    socialMedia: string[];
    eventFrequency: number; // events per month
    preferredDays: string[]; // ['monday', 'tuesday', etc.]
    preferredTimes: string[]; // ['morning', 'afternoon', 'evening']
  };
  pastEvents: {
    eventId: string;
    category: string;
    attendance: boolean;
    satisfaction: number; // 1-5 scale
    date: string;
  }[];
  preferences: {
    venueTypes: string[]; // ['conference_center', 'hotel', 'outdoor', etc.]
    eventFormats: string[]; // ['conference', 'workshop', 'networking', etc.]
    topics: string[];
  };
}

export interface AudienceOverlapPrediction {
  overlapScore: number; // 0-1 scale
  confidence: number; // 0-1 scale
  factors: {
    demographicSimilarity: number;
    interestAlignment: number;
    behaviorPatterns: number;
    historicalPreference: number;
  };
  reasoning: string[];
}

export interface EventAudienceProfile {
  eventId: string;
  title: string;
  category: string;
  subcategory?: string;
  expectedAudience: AudienceProfile;
  actualAudience?: AudienceProfile; // filled after event
  audienceSize: number;
  audienceQuality: number; // 0-1 scale based on engagement
}
