export interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  city: string;
  venue?: string;
  category: string;
  subcategory?: string;
  expectedAttendees?: number;
  source: 'ticketmaster' | 'meetup' | 'predicthq' | 'manual' | 'brno' | 'online_research';
  sourceId?: string;
  url?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  // Audience overlap properties
  audienceOverlapPercentage?: number;
  overlapReasoning?: string[];
}

export interface ConflictAnalysis {
  id: string;
  userId: string | null;
  city: string;
  category: string;
  subcategory?: string | null; // Add subcategory field
  preferredDates: string[];
  expectedAttendees: number;
  dateRangeStart?: string; // Add date_range_start field
  dateRangeEnd?: string; // Add date_range_end field
  results: ConflictScore[] | Record<string, any>; // Results can be ConflictScore[] or JSONB object
  createdAt: string;
}

export interface ConflictScore {
  date: string;
  score: number; // 0-20, where 0 = no conflicts, 20 = major conflicts
  risk: 'low' | 'medium' | 'high';
  conflictingEvents: ConflictingEvent[];
  recommendation: string;
}

export interface ConflictingEvent {
  id: string;
  title: string;
  date: string;
  category: string;
  subcategory?: string;
  expectedAttendees?: number;
  impact: number; // 0-100, contribution to conflict score
  audienceOverlapPercentage: number; // NEW: 0-100
  overlapReasoning?: string[]; // NEW: AI-generated reasons
  reason: string;
}

export interface AnalysisRequest {
  city: string;
  category: string;
  subcategory: string;
  preferredDates: string[];
  expectedAttendees: number;
  dateRange: {
    start: string;
    end: string;
  };
  enableAdvancedAnalysis?: boolean;
  enablePerplexityResearch?: boolean;
  enableLLMRelevanceFilter?: boolean; // Opt-in LLM relevance filtering
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  plan: 'free' | 'pro' | 'agency';
  analysesUsed: number;
  analysesLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface EventSource {
  name: string;
  enabled: boolean;
  lastSync?: string;
  apiKey?: string;
}

export const EVENT_CATEGORIES = [
  'Technology',
  'Business',
  'Marketing',
  'Healthcare',
  'Education',
  'Finance',
  'Entertainment',
  'Sports',
  'Arts & Culture',
  'Other'
] as const;

export type EventCategory = typeof EVENT_CATEGORIES[number];