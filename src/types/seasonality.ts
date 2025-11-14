/**
 * Seasonality System Types and Interfaces
 * 
 * This file defines all TypeScript types and interfaces for the seasonality system,
 * which enhances conflict analysis with expert seasonal rules and holiday impact detection.
 * 
 * @fileoverview Comprehensive type definitions for seasonal demand patterns,
 * holiday impact calculations, and seasonal recommendations.
 */

// =============================================================================
// CORE SEASONALITY TYPES
// =============================================================================

/**
 * Represents a seasonal multiplier with demand level and confidence metrics
 */
export interface SeasonalMultiplier {
  /** Multiplier value (0.1-3.0) indicating seasonal demand strength */
  multiplier: number;
  /** Human-readable demand level classification */
  demandLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  /** Confidence in the multiplier calculation (0.0-1.0) */
  confidence: number;
  /** Human-readable reasoning for the seasonal pattern */
  reasoning: string[];
  /** Source of the seasonal data */
  dataSource: 'expert_rules' | 'historical_data' | 'ai_analysis' | 'survey_data';
  /** Expert or system that defined this rule */
  expertSource?: string;
}

/**
 * Represents holiday impact on event conflict scoring
 */
export interface HolidayImpact {
  /** Combined multiplier from all affecting holidays */
  multiplier: number;
  /** List of holidays affecting the date */
  affectedHolidays: HolidayConflict[];
  /** Overall impact severity */
  totalImpact: 'none' | 'low' | 'moderate' | 'high' | 'critical';
  /** Human-readable reasoning for holiday impacts */
  reasoning: string[];
  /** Days before/after holiday with impact */
  impactWindow: {
    daysBefore: number;
    daysAfter: number;
  };
}

/**
 * Individual holiday conflict information
 */
export interface HolidayConflict {
  /** Holiday name */
  name: string;
  /** Native language holiday name */
  nameNative?: string;
  /** Holiday type (public_holiday, cultural_event, etc.) */
  holidayType: string;
  /** Date of the holiday */
  date: string;
  /** Impact multiplier for this specific holiday */
  impactMultiplier: number;
  /** Days before holiday that impact starts */
  daysBefore: number;
  /** Days after holiday that impact continues */
  daysAfter: number;
  /** Business impact level */
  businessImpact: 'none' | 'partial' | 'full';
  /** Whether venue closure is expected */
  venueClosureExpected: boolean;
}

/**
 * Seasonal recommendation for optimal event timing
 */
export interface SeasonalRecommendation {
  /** Month number (1-12) */
  month: number;
  /** Month name for display */
  monthName: string;
  /** Demand score (0.0-1.0) indicating how optimal this month is */
  demandScore: number;
  /** Risk level for hosting events in this month */
  riskLevel: RiskLevel;
  /** Human-readable reasoning for the recommendation */
  reasoning: string[];
  /** Historical success rate (0.0-1.0) based on past events */
  historicalSuccess: number;
  /** Confidence in the recommendation */
  confidence: number;
  /** Alternative months if primary recommendation is not available */
  alternatives?: SeasonalRecommendation[];
}

/**
 * Complete seasonal demand curve for a category (12 months)
 */
export interface SeasonalDemandCurve {
  /** Event category */
  category: string;
  /** Event subcategory (optional) */
  subcategory?: string;
  /** Geographic region */
  region: string;
  /** Monthly demand data */
  monthlyData: SeasonalMonthData[];
  /** Overall seasonal pattern classification */
  pattern: 'spring_peak' | 'summer_peak' | 'fall_peak' | 'winter_peak' | 'year_round' | 'irregular';
  /** Best months for this category */
  optimalMonths: number[];
  /** Worst months for this category */
  avoidMonths: number[];
  /** Confidence in the overall curve */
  confidence: number;
}

/**
 * Individual month data within a seasonal curve
 */
export interface SeasonalMonthData {
  /** Month number (1-12) */
  month: number;
  /** Month name */
  monthName: string;
  /** Demand multiplier for this month */
  demandMultiplier: number;
  /** Risk level for this month */
  riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  /** Venue availability factor (0.0-1.0) */
  venueAvailability: number;
  /** Conflict weight adjustment (0.5-2.0) */
  conflictWeight: number;
  /** Reasoning for this month's characteristics */
  reasoning: string;
}

// =============================================================================
// SEASONAL RULES DATABASE TYPES
// =============================================================================

/**
 * Database record for seasonal rules
 */
export interface SeasonalRule {
  id: string;
  category: string;
  subcategory?: string;
  region: string;
  month: number;
  demandMultiplier: number;
  conflictWeight: number;
  venueAvailability: number;
  confidence: number;
  dataSource: string;
  reasoning: string;
  expertSource?: string;
  lastUpdatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database record for holiday impact rules
 */
export interface HolidayImpactRule {
  id: string;
  holidayType: string;
  eventCategory: string;
  eventSubcategory?: string;
  daysBefore: number;
  daysAfter: number;
  impactMultiplier: number;
  impactType: 'conflict' | 'demand' | 'availability' | 'combined';
  region: string;
  yearStart?: number;
  yearEnd?: number;
  confidence: number;
  dataSource: string;
  reasoning: string;
  expertSource?: string;
  lastUpdatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// SEASONAL ANALYSIS RESULT TYPES
// =============================================================================

/**
 * Complete seasonal analysis for a specific date and event
 */
export interface SeasonalAnalysis {
  /** Target date for analysis */
  date: string;
  /** Event category */
  category: string;
  /** Event subcategory */
  subcategory?: string;
  /** Geographic region */
  region: string;
  /** Seasonal multiplier for this date */
  seasonalMultiplier: SeasonalMultiplier;
  /** Holiday impact for this date */
  holidayImpact: HolidayImpact;
  /** Combined seasonal and holiday impact */
  combinedImpact: {
    multiplier: number;
    impactLevel: 'none' | 'low' | 'moderate' | 'high' | 'critical';
    reasoning: string[];
  };
  /** Risk assessment for hosting event on this date */
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    recommendations: string[];
  };
  /** Confidence in the overall analysis */
  confidence: number;
  /** Analysis timestamp */
  analyzedAt: string;
}

/**
 * Seasonal insights for date recommendations
 */
export interface SeasonalInsights {
  /** Seasonal demand curve for the category */
  demandCurve: SeasonalDemandCurve;
  /** Best months for this event type */
  optimalMonths: SeasonalRecommendation[];
  /** Months to avoid for this event type */
  avoidMonths: SeasonalRecommendation[];
  /** Holiday calendar for the analysis period */
  upcomingHolidays: HolidayConflict[];
  /** Seasonal risk factors to consider */
  riskFactors: string[];
  /** Recommendations for optimal timing */
  timingRecommendations: string[];
}

// =============================================================================
// SEASONAL ENGINE CONFIGURATION
// =============================================================================

/**
 * Configuration for the seasonality engine
 */
export interface SeasonalityEngineConfig {
  /** Default region for analysis */
  defaultRegion: string;
  /** Cache configuration */
  cache: {
    enabled: boolean;
    ttl: number; // Time to live in milliseconds
    maxSize: number; // Maximum cache entries
  };
  /** Performance settings */
  performance: {
    maxConcurrentQueries: number;
    queryTimeout: number; // Milliseconds
    enableBatchProcessing: boolean;
  };
  /** Data source priorities */
  dataSourcePriority: ('expert_rules' | 'historical_data' | 'ai_analysis' | 'survey_data')[];
  /** Minimum confidence threshold for recommendations */
  minConfidenceThreshold: number;
  /** Enable debug logging */
  debugMode: boolean;
}

/**
 * Parameters for seasonal analysis requests
 */
export interface SeasonalAnalysisParams {
  /** Target date for analysis */
  date: string;
  /** Event category */
  category: string;
  /** Event subcategory (optional) */
  subcategory?: string;
  /** Geographic region */
  region?: string;
  /** Include holiday impact analysis */
  includeHolidayImpact?: boolean;
  /** Include seasonal recommendations */
  includeRecommendations?: boolean;
  /** Analysis depth */
  depth?: 'shallow' | 'medium' | 'deep';
}

/**
 * Parameters for seasonal demand curve requests
 */
export interface SeasonalDemandCurveParams {
  /** Event category */
  category: string;
  /** Event subcategory (optional) */
  subcategory?: string;
  /** Geographic region */
  region?: string;
  /** Include monthly reasoning */
  includeReasoning?: boolean;
  /** Include alternative months */
  includeAlternatives?: boolean;
}

// =============================================================================
// ENHANCED CONFLICT ANALYSIS TYPES
// =============================================================================

/**
 * Enhanced date recommendation with seasonal insights
 */
export interface SeasonalDateRecommendation {
  /** Start date */
  startDate: string;
  /** End date */
  endDate: string;
  /** Base conflict score (before seasonal adjustments) */
  baseConflictScore: number;
  /** Seasonal multiplier applied */
  seasonalMultiplier: number;
  /** Holiday impact multiplier applied */
  holidayMultiplier: number;
  /** Final conflict score (after all adjustments) */
  finalConflictScore: number;
  /** Risk level assessment */
  riskLevel: 'Low' | 'Medium' | 'High';
  /** Competing events */
  competingEvents: any[]; // Using existing Event type
  /** Seasonal factors affecting this date */
  seasonalFactors: {
    demandLevel: string;
    seasonalReasoning: string[];
    holidayImpact: HolidayImpact;
    venueAvailability: number;
    optimalityScore: number; // 0-1 score for how optimal this date is
  };
  /** Traditional conflict reasons */
  reasons: string[];
  /** Audience overlap analysis (existing) */
  audienceOverlap?: {
    averageOverlap: number;
    highOverlapEvents: any[];
    overlapReasoning: string[];
  };
  /** Holiday restrictions (existing, enhanced) */
  holidayRestrictions?: {
    holidays: HolidayConflict[];
    cultural_events: any[];
    business_impact: 'none' | 'partial' | 'full';
    venue_closure_expected: boolean;
    reasons: string[];
  };
}

// =============================================================================
// CACHE AND PERFORMANCE TYPES
// =============================================================================

/**
 * Cache entry for seasonal insights
 */
export interface SeasonalCacheEntry {
  /** Cache key */
  key: string;
  /** Cached seasonal multiplier */
  seasonalMultiplier: SeasonalMultiplier;
  /** Cached holiday impact */
  holidayImpact: HolidayImpact;
  /** Cache timestamp */
  cachedAt: string;
  /** Cache expiration */
  expiresAt: string;
  /** Cache hit count */
  hitCount: number;
}

/**
 * Performance metrics for seasonal analysis
 */
export interface SeasonalPerformanceMetrics {
  /** Analysis duration in milliseconds */
  analysisDuration: number;
  /** Database query count */
  queryCount: number;
  /** Cache hit rate (0.0-1.0) */
  cacheHitRate: number;
  /** Memory usage in bytes */
  memoryUsage: number;
  /** CPU usage percentage */
  cpuUsage: number;
}

// =============================================================================
// ERROR AND VALIDATION TYPES
// =============================================================================

/**
 * Seasonal analysis error
 */
export interface SeasonalAnalysisError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Detailed error information */
  details?: any;
  /** Suggested resolution */
  resolution?: string;
  /** Error timestamp */
  timestamp: string;
}

/**
 * Validation result for seasonal rules
 */
export interface SeasonalRuleValidation {
  /** Whether the rule is valid */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Suggested improvements */
  suggestions: string[];
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Month names for display
 */
export type MonthName = 
  | 'January' | 'February' | 'March' | 'April' | 'May' | 'June'
  | 'July' | 'August' | 'September' | 'October' | 'November' | 'December';

/**
 * Demand level classifications
 */
export type DemandLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

/**
 * Risk level classifications
 */
export type RiskLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

/**
 * Impact level classifications
 */
export type ImpactLevel = 'none' | 'low' | 'moderate' | 'high' | 'critical';

/**
 * Data source types
 */
export type DataSource = 'expert_rules' | 'historical_data' | 'ai_analysis' | 'survey_data';

/**
 * Impact type classifications
 */
export type ImpactType = 'conflict' | 'demand' | 'availability' | 'combined';

/**
 * Business impact levels
 */
export type BusinessImpact = 'none' | 'partial' | 'full';

// =============================================================================
// EXPORT ALL TYPES
// =============================================================================

// All types and interfaces are already exported above when declared
