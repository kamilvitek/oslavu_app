// src/types/perplexity.ts

export interface PerplexityEvent {
  name: string;
  date: string;
  location: string;
  type: 'concert' | 'festival' | 'cultural_event' | 'other';
  expectedAttendance?: number;
  description?: string;
  source?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface PerplexityTouringArtist {
  artistName: string;
  tourDates: string[];
  locations: string[];
  genre?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface PerplexityFestival {
  name: string;
  dates: string;
  location: string;
  type: string;
  description?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface PerplexityHoliday {
  name: string;
  date: string;
  type: 'holiday' | 'cultural_event';
  impact: 'low' | 'medium' | 'high';
  description?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface PerplexityRecommendation {
  shouldMoveDate: boolean;
  recommendedDates?: string[];
  reasoning: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface PerplexityConflictResearch {
  conflictingEvents: PerplexityEvent[];
  touringArtists: PerplexityTouringArtist[];
  localFestivals: PerplexityFestival[];
  holidaysAndCulturalEvents: PerplexityHoliday[];
  recommendations: PerplexityRecommendation;
  researchMetadata?: {
    query: string;
    timestamp: string;
    sourcesUsed: number;
    confidence: 'high' | 'medium' | 'low';
  };
}

export interface PerplexityResearchParams {
  city: string;
  category: string;
  subcategory?: string;
  date: string; // YYYY-MM-DD
  expectedAttendees: number;
  dateRange?: {
    start: string;
    end: string;
  };
}

