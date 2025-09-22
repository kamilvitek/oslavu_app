import { z } from 'zod';

// Base Event interface matching the Supabase schema
export interface DatabaseEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  end_date?: string;
  city: string;
  venue?: string;
  category: string;
  subcategory?: string;
  expected_attendees?: number;
  source: 'ticketmaster' | 'predicthq' | 'meetup' | 'manual' | 'brno';
  source_id?: string;
  url?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

// Extended Event interface for API responses
export interface Event extends DatabaseEvent {
  // Additional computed fields
  is_conflict?: boolean;
  conflict_score?: number;
  days_until_event?: number;
}

// Event creation/update interfaces
export interface CreateEventData {
  title: string;
  description?: string;
  date: string;
  end_date?: string;
  city: string;
  venue?: string;
  category: string;
  subcategory?: string;
  expected_attendees?: number;
  source: 'ticketmaster' | 'predicthq' | 'meetup' | 'manual' | 'brno';
  source_id?: string;
  url?: string;
  image_url?: string;
}

export interface UpdateEventData extends Partial<CreateEventData> {
  updated_at?: string;
}

// Event query interfaces
export interface EventQuery {
  city?: string;
  category?: string;
  source?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
  order_by?: 'date' | 'created_at' | 'updated_at';
  order_direction?: 'asc' | 'desc';
}

export interface EventSearchParams {
  query?: string;
  city?: string;
  category?: string;
  source?: string;
  start_date?: string;
  end_date?: string;
  min_attendees?: number;
  max_attendees?: number;
  limit?: number;
  offset?: number;
}

// Event statistics interfaces
export interface EventStats {
  total_events: number;
  events_by_source: Record<string, number>;
  events_by_category: Record<string, number>;
  events_by_city: Record<string, number>;
  events_by_month: Record<string, number>;
  last_updated: string | null;
  average_attendees: number;
  high_impact_events: number; // Events with 1000+ attendees
}

export interface EventAnalytics {
  total_events: number;
  unique_venues: number;
  unique_cities: number;
  date_range: {
    earliest: string;
    latest: string;
  };
  top_categories: Array<{ category: string; count: number }>;
  top_cities: Array<{ city: string; count: number }>;
  top_venues: Array<{ venue: string; count: number }>;
  source_distribution: Array<{ source: string; count: number }>;
}

// Conflict analysis interfaces
export interface ConflictAnalysis {
  id: string;
  user_id: string;
  city: string;
  category: string;
  preferred_dates: string[];
  expected_attendees: number;
  results: ConflictScore[];
  created_at: string;
  updated_at: string;
}

export interface ConflictScore {
  date: string;
  score: number; // 0-20, where 0 = no conflicts, 20 = major conflicts
  risk: 'low' | 'medium' | 'high';
  conflicting_events: ConflictingEvent[];
  recommendation: string;
}

export interface ConflictingEvent {
  id: string;
  title: string;
  date: string;
  category: string;
  expected_attendees?: number;
  impact: number; // 0-100, contribution to conflict score
  reason: string;
}

// Data synchronization interfaces
export interface SyncStatus {
  source: string;
  last_sync: string | null;
  status: 'success' | 'error' | 'in_progress';
  events_synced: number;
  errors: string[];
}

export interface SyncResult {
  source: string;
  success: boolean;
  events_processed: number;
  events_created: number;
  events_updated: number;
  events_skipped: number;
  errors: string[];
  duration_ms: number;
}

// API response interfaces
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Data transformation interfaces
export interface EventTransformer {
  source: string;
  transform: (rawEvent: any) => CreateEventData;
  validate: (event: CreateEventData) => boolean;
}

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData: CreateEventData;
}

// Database operation interfaces
export interface UpsertResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface BatchOperationResult {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
  duration_ms: number;
}

// Zod schemas for runtime validation
export const CreateEventSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  city: z.string().min(1).max(100),
  venue: z.string().max(200).optional(),
  category: z.string().min(1).max(50),
  subcategory: z.string().max(50).optional(),
  expected_attendees: z.number().int().min(0).max(1000000).optional(),
  source: z.enum(['ticketmaster', 'predicthq', 'meetup', 'manual', 'brno']),
  source_id: z.string().max(100).optional(),
  url: z.string().url().max(500).optional(),
  image_url: z.string().url().max(500).optional(),
});

export const UpdateEventSchema = CreateEventSchema.partial();

export const EventQuerySchema = z.object({
  city: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  source: z.enum(['ticketmaster', 'predicthq', 'meetup', 'manual', 'brno']).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().min(0).default(0),
  order_by: z.enum(['date', 'created_at', 'updated_at']).default('date'),
  order_direction: z.enum(['asc', 'desc']).default('asc'),
});

export const EventSearchSchema = z.object({
  query: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  source: z.enum(['ticketmaster', 'predicthq', 'meetup', 'manual', 'brno']).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  min_attendees: z.number().int().min(0).optional(),
  max_attendees: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().min(0).default(0),
});

// Type guards
export function isDatabaseEvent(obj: any): obj is DatabaseEvent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.date === 'string' &&
    typeof obj.city === 'string' &&
    typeof obj.category === 'string' &&
    typeof obj.source === 'string' &&
    typeof obj.created_at === 'string' &&
    typeof obj.updated_at === 'string'
  );
}

export function isCreateEventData(obj: any): obj is CreateEventData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.title === 'string' &&
    typeof obj.date === 'string' &&
    typeof obj.city === 'string' &&
    typeof obj.category === 'string' &&
    typeof obj.source === 'string'
  );
}

// Utility types
export type EventSource = DatabaseEvent['source'];
export type EventCategory = string;
export type EventSortField = 'date' | 'created_at' | 'updated_at';
export type EventSortDirection = 'asc' | 'desc';

// Database table types (matching Supabase schema)
export interface EventsTable {
  id: string;
  title: string;
  description?: string;
  date: string;
  end_date?: string;
  city: string;
  venue?: string;
  category: string;
  subcategory?: string;
  expected_attendees?: number;
  source: string;
  source_id?: string;
  url?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ConflictAnalysesTable {
  id: string;
  user_id: string;
  city: string;
  category: string;
  preferred_dates: string[];
  expected_attendees: number;
  results: ConflictScore[];
  created_at: string;
  updated_at: string;
}

export interface SyncLogsTable {
  id: string;
  source: string;
  status: 'success' | 'error' | 'in_progress';
  events_processed: number;
  events_created: number;
  events_updated: number;
  events_skipped: number;
  errors: string[];
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
}
