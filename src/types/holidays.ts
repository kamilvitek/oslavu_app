// src/types/holidays.ts
export interface Country {
  id: string;
  code: string; // ISO 3166-1 alpha-3 code
  name: string;
  name_native?: string;
  region?: string;
  created_at: string;
}

export interface Region {
  id: string;
  country_id: string;
  code: string;
  name: string;
  name_native?: string;
  parent_region_id?: string;
  created_at: string;
}

export interface HolidayType {
  id: string;
  name: string;
  description?: string;
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

export interface Holiday {
  id: string;
  name: string;
  name_native?: string;
  description?: string;
  holiday_type_id: string;
  country_id: string;
  region_id?: string;
  date_type: 'fixed' | 'variable' | 'floating';
  month?: number;
  day?: number;
  weekday?: number;
  week_of_month?: number;
  easter_offset?: number;
  year_start?: number;
  year_end?: number;
  is_observed: boolean;
  business_impact: 'none' | 'partial' | 'full';
  venue_closure_expected: boolean;
  created_at: string;
  updated_at: string;
}

export interface HolidayObservance {
  id: string;
  holiday_id: string;
  observed_date: string;
  is_observed: boolean;
  notes?: string;
  created_at: string;
}

export interface CulturalEvent {
  id: string;
  name: string;
  name_native?: string;
  description?: string;
  country_id: string;
  region_id?: string;
  event_type: string;
  date_type: 'fixed' | 'variable' | 'floating';
  month?: number;
  day?: number;
  weekday?: number;
  week_of_month?: number;
  easter_offset?: number;
  duration_days: number;
  business_impact: 'none' | 'partial' | 'full';
  venue_closure_expected: boolean;
  year_start?: number;
  year_end?: number;
  created_at: string;
  updated_at: string;
}

export interface HolidayInfo {
  holiday_name: string;
  holiday_name_native?: string;
  holiday_type: string;
  business_impact: 'none' | 'partial' | 'full';
  venue_closure_expected: boolean;
  is_observed: boolean;
}

export interface CulturalEventInfo {
  event_name: string;
  event_name_native?: string;
  event_type: string;
  business_impact: 'none' | 'partial' | 'full';
  venue_closure_expected: boolean;
  duration_days: number;
}

export interface DateAvailabilityCheck {
  date: string;
  is_available: boolean;
  restrictions: {
    holidays: HolidayInfo[];
    cultural_events: CulturalEventInfo[];
    business_impact: 'none' | 'partial' | 'full';
    venue_closure_expected: boolean;
    reasons: string[];
  };
}

export interface HolidayServiceConfig {
  country_code: string;
  region_code?: string;
  include_cultural_events: boolean;
  business_impact_threshold: 'none' | 'partial' | 'full';
}

export interface HolidayValidationResult {
  is_valid_date: boolean;
  warnings: string[];
  restrictions: {
    holidays: HolidayInfo[];
    cultural_events: CulturalEventInfo[];
    business_impact: 'none' | 'partial' | 'full';
    venue_closure_expected: boolean;
  };
  recommendations: string[];
}

export interface DateRangeAvailability {
  start_date: string;
  end_date: string;
  available_dates: string[];
  restricted_dates: DateAvailabilityCheck[];
  summary: {
    total_days: number;
    available_days: number;
    restricted_days: number;
    high_impact_days: number;
    venue_closure_days: number;
  };
}
