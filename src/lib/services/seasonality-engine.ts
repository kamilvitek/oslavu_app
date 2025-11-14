/**
 * Seasonality Engine Service
 * 
 * This service provides comprehensive seasonal analysis for event conflict scoring,
 * combining expert domain knowledge with holiday impact detection to enhance
 * the existing conflict analysis algorithm.
 * 
 * Key Features:
 * - Seasonal demand pattern analysis by category and subcategory
 * - Holiday impact detection and multiplier calculation
 * - Seasonal recommendations for optimal event timing
 * - Performance-optimized caching and batch processing
 * - Regional customization for Czech Republic with scalability
 * 
 * @fileoverview Core seasonality engine for enhanced conflict analysis
 */

import { supabase } from '@/lib/supabase';
import {
  SeasonalMultiplier,
  HolidayImpact,
  SeasonalRecommendation,
  SeasonalDemandCurve,
  SeasonalAnalysis,
  SeasonalInsights,
  SeasonalityEngineConfig,
  SeasonalAnalysisParams,
  SeasonalDemandCurveParams,
  DemandLevel,
  RiskLevel,
  DataSource
} from '@/types/seasonality';

/**
 * SeasonalityEngine - Core service for seasonal analysis
 * 
 * This class provides methods to calculate seasonal multipliers, analyze holiday impacts,
 * and generate seasonal recommendations for event planning. It integrates with the
 * existing conflict analysis system to enhance scoring accuracy.
 */
export class SeasonalityEngine {
  private supabase = supabase;
  private config: SeasonalityEngineConfig;
  private cache = new Map<string, any>();
  private cacheTimestamps = new Map<string, number>();

  constructor(config?: Partial<SeasonalityEngineConfig>) {
    this.config = {
      defaultRegion: 'CZ',
      cache: {
        enabled: true,
        ttl: 30 * 60 * 1000, // 30 minutes
        maxSize: 1000
      },
      performance: {
        maxConcurrentQueries: 10,
        queryTimeout: 5000, // 5 seconds
        enableBatchProcessing: true
      },
      dataSourcePriority: ['expert_rules', 'historical_data', 'ai_analysis', 'survey_data'],
      minConfidenceThreshold: 0.5,
      debugMode: process.env.NODE_ENV === 'development',
      ...config
    };
  }

  /**
   * Get seasonal multiplier for a specific date and event category
   * 
   * @param date - Target date for analysis
   * @param category - Event category
   * @param subcategory - Event subcategory (optional)
   * @param region - Geographic region (defaults to CZ)
   * @returns Promise<SeasonalMultiplier>
   */
  async getSeasonalMultiplier(
    date: string,
    category: string,
    subcategory?: string,
    region: string = this.config.defaultRegion
  ): Promise<SeasonalMultiplier> {
    const startTime = Date.now();
    
    // Validate and parse date
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      this.logError(`Invalid date format: ${date}`, new Error('Invalid date'));
      return this.getDefaultSeasonalMultiplier(category, subcategory);
    }
    const month = dateObj.getMonth() + 1;
    
    try {
      // Check in-memory cache first
      const cacheKey = `seasonal_${category}_${subcategory || 'null'}_${region}_${month}`;
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        this.logDebug(`In-memory cache hit for seasonal multiplier: ${cacheKey}`);
        return cached;
      }

      // Check database cache
      const dbCacheKey = this.generateDatabaseCacheKey(category, subcategory, region, month);
      const dbCached = await this.getDatabaseCachedResult(dbCacheKey);
      if (dbCached) {
        this.logDebug(`Database cache hit for seasonal multiplier: ${dbCacheKey}`);
        // Convert database cache to SeasonalMultiplier format
        const result = this.convertDatabaseCacheToMultiplier(dbCached, category, subcategory);
        // Store in memory cache for faster subsequent access
        this.setCachedResult(cacheKey, result);
        return result;
      }

      // Query database for seasonal rules
      const { data, error } = await this.supabase
        .from('seasonal_rules')
        .select('*')
        .eq('category', category)
        .eq('region', region)
        .eq('month', month)
        .order('confidence', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch seasonal rules: ${error.message}`);
      }

      // Find best matching rule
      let bestRule = data?.find(rule => rule.subcategory === subcategory);
      if (!bestRule && data?.length > 0) {
        // Fallback to category-level rule if no subcategory match
        bestRule = data.find(rule => !rule.subcategory);
      }

      if (!bestRule) {
        // Return default multiplier if no rules found
        return this.getDefaultSeasonalMultiplier(category, subcategory);
      }

      // Validate required fields from database
      if (typeof bestRule.demand_multiplier !== 'number' || isNaN(bestRule.demand_multiplier)) {
        this.logError('Invalid demand_multiplier in seasonal rule:', bestRule);
        return this.getDefaultSeasonalMultiplier(category, subcategory);
      }

      // Clamp multiplier to expected range (0.1-3.0)
      const multiplier = Math.max(0.1, Math.min(3.0, bestRule.demand_multiplier));
      const confidence = Math.max(0, Math.min(1, bestRule.confidence || 0.5));

      // Calculate demand level from multiplier
      const demandLevel = this.calculateDemandLevel(multiplier);
      const riskLevel = this.calculateRiskLevel(multiplier);
      
      // Generate reasoning (handle null/undefined reasoning from database)
      const reasoning = this.generateSeasonalReasoning(
        multiplier,
        bestRule.reasoning || 'Seasonal pattern detected',
        month,
        category,
        subcategory
      );

      const result: SeasonalMultiplier = {
        multiplier,
        demandLevel,
        confidence,
        reasoning,
        dataSource: (bestRule.data_source || 'expert_rules') as DataSource,
        expertSource: bestRule.expert_source
      };

      // Cache in memory
      this.setCachedResult(cacheKey, result);

      // Cache in database for persistence across restarts
      await this.setDatabaseCachedResult(
        dbCacheKey,
        category,
        subcategory,
        region,
        month,
        multiplier,
        riskLevel,
        confidence,
        bestRule.data_source || 'expert_rules'
      );

      const duration = Date.now() - startTime;
      this.logDebug(`Seasonal multiplier calculated in ${duration}ms: ${result.multiplier}x (${result.demandLevel})`);

      return result;

    } catch (error) {
      this.logError('Error calculating seasonal multiplier:', error);
      return this.getDefaultSeasonalMultiplier(category, subcategory);
    }
  }

  /**
   * Get seasonal demand curve for a category (12 months)
   * 
   * @param params - Parameters for demand curve analysis
   * @returns Promise<SeasonalDemandCurve>
   */
  async getSeasonalDemandCurve(params: SeasonalDemandCurveParams): Promise<SeasonalDemandCurve> {
    const startTime = Date.now();
    
    try {
      const { category, subcategory, region = this.config.defaultRegion, includeReasoning = true } = params;

      // Check cache first
      const cacheKey = `demand_curve_${category}_${subcategory || 'null'}_${region}`;
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        this.logDebug(`Cache hit for demand curve: ${cacheKey}`);
        return cached;
      }

      // Query all 12 months of data
      const { data, error } = await this.supabase
        .from('seasonal_rules')
        .select('*')
        .eq('category', category)
        .eq('region', region)
        .order('month', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch seasonal rules: ${error.message}`);
      }

      // Process monthly data
      const monthlyData = [];
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      for (let month = 1; month <= 12; month++) {
        const monthRule = data?.find(rule => 
          rule.month === month && 
          (rule.subcategory === subcategory || (!rule.subcategory && !subcategory))
        );

        if (monthRule) {
          // Validate and clamp demand_multiplier
          const demandMultiplier = typeof monthRule.demand_multiplier === 'number' && !isNaN(monthRule.demand_multiplier)
            ? Math.max(0.1, Math.min(3.0, monthRule.demand_multiplier))
            : 1.0;
          
          monthlyData.push({
            month,
            monthName: monthNames[month - 1],
            demandMultiplier,
            riskLevel: this.calculateRiskLevel(demandMultiplier),
            venueAvailability: typeof monthRule.venue_availability === 'number' ? monthRule.venue_availability : 0.8,
            conflictWeight: typeof monthRule.conflict_weight === 'number' ? monthRule.conflict_weight : 1.0,
            reasoning: includeReasoning ? (monthRule.reasoning || 'No specific reasoning available') : ''
          });
        } else {
          // Default values for missing months
          monthlyData.push({
            month,
            monthName: monthNames[month - 1],
            demandMultiplier: 1.0,
            riskLevel: 'medium' as RiskLevel,
            venueAvailability: 0.8,
            conflictWeight: 1.0,
            reasoning: includeReasoning ? 'No specific seasonal data available' : ''
          });
        }
      }

      // Analyze pattern
      const pattern = this.analyzeSeasonalPattern(monthlyData);
      const optimalMonths = this.findOptimalMonths(monthlyData);
      const avoidMonths = this.findAvoidMonths(monthlyData);

      const result: SeasonalDemandCurve = {
        category,
        subcategory,
        region,
        monthlyData,
        pattern: pattern as 'spring_peak' | 'summer_peak' | 'fall_peak' | 'winter_peak' | 'year_round' | 'irregular',
        optimalMonths,
        avoidMonths,
        confidence: this.calculateCurveConfidence(data || [])
      };

      // Cache the result
      this.setCachedResult(cacheKey, result);

      const duration = Date.now() - startTime;
      this.logDebug(`Demand curve calculated in ${duration}ms for ${category}`);

      return result;

    } catch (error) {
      this.logError('Error calculating demand curve:', error);
      throw error;
    }
  }

  /**
   * Calculate seasonal risk for hosting an event on a specific date
   * 
   * @param date - Target date for analysis
   * @param category - Event category
   * @param subcategory - Event subcategory (optional)
   * @param region - Geographic region
   * @returns Promise<RiskLevel>
   */
  async calculateSeasonalRisk(
    date: string,
    category: string,
    subcategory?: string,
    region: string = this.config.defaultRegion
  ): Promise<RiskLevel> {
    try {
      const seasonalMultiplier = await this.getSeasonalMultiplier(date, category, subcategory, region);
      
      // Use the full RiskLevel calculation method for consistency
      return this.calculateRiskLevel(seasonalMultiplier.multiplier);
    } catch (error) {
      this.logError('Error calculating seasonal risk:', error);
      return 'medium'; // Default to medium risk
    }
  }

  /**
   * Suggest optimal seasons for an event category
   * 
   * @param category - Event category
   * @param subcategory - Event subcategory (optional)
   * @param region - Geographic region
   * @param limit - Maximum number of recommendations
   * @returns Promise<SeasonalRecommendation[]>
   */
  async suggestOptimalSeasons(
    category: string,
    subcategory?: string,
    region: string = this.config.defaultRegion,
    limit: number = 3
  ): Promise<SeasonalRecommendation[]> {
    try {
      const demandCurve = await this.getSeasonalDemandCurve({
        category,
        subcategory,
        region,
        includeReasoning: true,
        includeAlternatives: true
      });

      const recommendations: SeasonalRecommendation[] = [];

      // Sort months by demand score
      const sortedMonths = demandCurve.monthlyData
        .map(month => ({
          ...month,
          demandScore: month.demandMultiplier / 3.0, // Normalize to 0-1
          riskLevel: this.calculateRiskLevel(month.demandMultiplier),
          historicalSuccess: this.estimateHistoricalSuccess(month.demandMultiplier),
          confidence: demandCurve.confidence
        }))
        .sort((a, b) => b.demandScore - a.demandScore);

      // Generate recommendations
      for (let i = 0; i < Math.min(limit, sortedMonths.length); i++) {
        const month = sortedMonths[i];
        
        recommendations.push({
          month: month.month,
          monthName: month.monthName,
          demandScore: month.demandScore,
          riskLevel: month.riskLevel,
          reasoning: [month.reasoning],
          historicalSuccess: month.historicalSuccess,
          confidence: month.confidence
        });
      }

      return recommendations;

    } catch (error) {
      this.logError('Error suggesting optimal seasons:', error);
      return [];
    }
  }

  /**
   * Perform comprehensive seasonal analysis for a specific date and event
   * 
   * @param params - Analysis parameters
   * @returns Promise<SeasonalAnalysis>
   */
  async analyzeSeasonalFactors(params: SeasonalAnalysisParams): Promise<SeasonalAnalysis> {
    const startTime = Date.now();
    
    try {
      const { date, category, subcategory, region = this.config.defaultRegion, includeHolidayImpact = true } = params;

      // Get seasonal multiplier
      const seasonalMultiplier = await this.getSeasonalMultiplier(date, category, subcategory, region);

      // Get holiday impact (if enabled)
      let holidayImpact: HolidayImpact | null = null;
      if (includeHolidayImpact) {
        // This would integrate with HolidayConflictDetector
        // For now, return default impact
        holidayImpact = {
          multiplier: 1.0,
          affectedHolidays: [],
          totalImpact: 'none',
          reasoning: ['No holiday impact detected'],
          impactWindow: { daysBefore: 0, daysAfter: 0 }
        };
      }

      // Calculate combined impact
      const combinedMultiplier = seasonalMultiplier.multiplier * (holidayImpact?.multiplier || 1.0);
      const combinedImpact = this.calculateCombinedImpact(combinedMultiplier);

      // Assess risk
      const riskAssessment = this.assessRisk(seasonalMultiplier, holidayImpact);

      // Ensure holidayImpact is not null (use default if not provided)
      const finalHolidayImpact: HolidayImpact = holidayImpact || {
        multiplier: 1.0,
        affectedHolidays: [],
        totalImpact: 'none',
        reasoning: ['No holiday impact detected'],
        impactWindow: { daysBefore: 0, daysAfter: 0 }
      };

      const result: SeasonalAnalysis = {
        date,
        category,
        subcategory,
        region,
        seasonalMultiplier,
        holidayImpact: finalHolidayImpact,
        combinedImpact,
        riskAssessment,
        confidence: Math.min(seasonalMultiplier.confidence, finalHolidayImpact.multiplier !== 1.0 ? 0.8 : 1.0),
        analyzedAt: new Date().toISOString()
      };

      const duration = Date.now() - startTime;
      this.logDebug(`Seasonal analysis completed in ${duration}ms`);

      return result;

    } catch (error) {
      this.logError('Error in seasonal analysis:', error);
      throw error;
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Calculate demand level from multiplier value
   */
  private calculateDemandLevel(multiplier: number): DemandLevel {
    if (multiplier >= 2.0) return 'very_high';
    if (multiplier >= 1.5) return 'high';
    if (multiplier >= 1.0) return 'medium';
    if (multiplier >= 0.7) return 'low';
    return 'very_low';
  }

  /**
   * Calculate risk level from multiplier value
   * Returns full range: very_low, low, medium, high, very_high
   */
  private calculateRiskLevel(multiplier: number): RiskLevel {
    if (multiplier >= 2.0) return 'very_high';
    if (multiplier >= 1.5) return 'high';
    if (multiplier >= 1.2) return 'medium';
    if (multiplier >= 0.7) return 'low';
    return 'very_low';
  }

  /**
   * Generate seasonal reasoning text
   */
  private generateSeasonalReasoning(
    multiplier: number,
    baseReasoning: string,
    month: number,
    category: string,
    subcategory?: string
  ): string[] {
    const reasoning: string[] = [];
    
    reasoning.push(baseReasoning);
    
    if (multiplier >= 1.5) {
      reasoning.push(`High demand period for ${category} events`);
    } else if (multiplier >= 1.2) {
      reasoning.push(`Above-average demand for ${category} events`);
    } else if (multiplier <= 0.7) {
      reasoning.push(`Lower demand period for ${category} events`);
    }

    if (subcategory) {
      reasoning.push(`Specific patterns for ${subcategory} subcategory`);
    }

    return reasoning;
  }

  /**
   * Get default seasonal multiplier when no rules are found
   */
  private getDefaultSeasonalMultiplier(category: string, subcategory?: string): SeasonalMultiplier {
    return {
      multiplier: 1.0,
      demandLevel: 'medium',
      confidence: 0.3,
      reasoning: [`No seasonal data available for ${category}${subcategory ? ` (${subcategory})` : ''}`],
      dataSource: 'expert_rules'
    };
  }

  /**
   * Analyze seasonal pattern from monthly data
   */
  private analyzeSeasonalPattern(monthlyData: any[]): string {
    if (!monthlyData || monthlyData.length === 0) {
      return 'irregular';
    }
    
    const multipliers = monthlyData.map(m => m.demandMultiplier);
    if (multipliers.length === 0) {
      return 'irregular';
    }
    
    const maxValue = Math.max(...multipliers);
    const maxMonth = multipliers.indexOf(maxValue) + 1;
    
    // Validate maxMonth is within valid range (1-12)
    if (maxMonth < 1 || maxMonth > 12) {
      const variance = this.calculateVariance(multipliers);
      return variance < 0.1 ? 'year_round' : 'irregular';
    }
    
    if (maxMonth >= 3 && maxMonth <= 5) return 'spring_peak';
    if (maxMonth >= 6 && maxMonth <= 8) return 'summer_peak';
    if (maxMonth >= 9 && maxMonth <= 11) return 'fall_peak';
    if (maxMonth === 12 || maxMonth <= 2) return 'winter_peak';
    
    const variance = this.calculateVariance(multipliers);
    return variance < 0.1 ? 'year_round' : 'irregular';
  }

  /**
   * Find optimal months from monthly data
   */
  private findOptimalMonths(monthlyData: any[]): number[] {
    return monthlyData
      .filter(month => month.demandMultiplier >= 1.3)
      .map(month => month.month)
      .sort((a, b) => b - a);
  }

  /**
   * Find months to avoid from monthly data
   */
  private findAvoidMonths(monthlyData: any[]): number[] {
    return monthlyData
      .filter(month => month.demandMultiplier <= 0.7)
      .map(month => month.month)
      .sort((a, b) => a - b);
  }

  /**
   * Calculate variance of an array
   */
  private calculateVariance(values: number[]): number {
    if (!values || values.length === 0) {
      return 0;
    }
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate curve confidence from rules data
   */
  private calculateCurveConfidence(rules: any[]): number {
    if (rules.length === 0) return 0.3;
    
    const avgConfidence = rules.reduce((sum, rule) => sum + rule.confidence, 0) / rules.length;
    const coverage = rules.length / 12; // How many months have data
    
    return Math.min(avgConfidence * coverage, 1.0);
  }

  /**
   * Estimate historical success rate
   */
  private estimateHistoricalSuccess(multiplier: number): number {
    // Simple estimation based on multiplier
    return Math.min(multiplier / 2.0, 1.0);
  }

  /**
   * Calculate combined impact level
   */
  private calculateCombinedImpact(multiplier: number): any {
    if (multiplier >= 2.5) return { multiplier, impactLevel: 'critical', reasoning: ['Very high combined seasonal and holiday impact'] };
    if (multiplier >= 2.0) return { multiplier, impactLevel: 'high', reasoning: ['High combined impact'] };
    if (multiplier >= 1.5) return { multiplier, impactLevel: 'moderate', reasoning: ['Moderate combined impact'] };
    if (multiplier >= 1.2) return { multiplier, impactLevel: 'low', reasoning: ['Low combined impact'] };
    return { multiplier, impactLevel: 'none', reasoning: ['Minimal combined impact'] };
  }

  /**
   * Assess risk based on seasonal and holiday factors
   */
  private assessRisk(seasonal: SeasonalMultiplier, holiday: HolidayImpact | null): any {
    const factors: string[] = [];
    const recommendations: string[] = [];
    
    // Use the full RiskLevel calculation for consistency
    const seasonalRiskLevel = this.calculateRiskLevel(seasonal.multiplier);
    
    if (seasonal.multiplier >= 1.5) {
      factors.push('High seasonal demand');
      recommendations.push('Consider alternative dates with lower demand');
    } else if (seasonal.multiplier <= 0.7) {
      factors.push('Low seasonal demand');
      recommendations.push('This may be a good time for events with lower competition');
    }
    
    if (holiday && holiday.totalImpact !== 'none') {
      factors.push('Holiday impact detected');
      recommendations.push('Review holiday calendar for conflicts');
    }
    
    // Determine overall risk level based on factors
    // If both seasonal and holiday factors are present, use the higher risk
    let riskLevel: RiskLevel = seasonalRiskLevel;
    if (holiday && holiday.totalImpact !== 'none') {
      // If holiday impact is significant, increase risk level
      if (holiday.totalImpact === 'critical' || holiday.totalImpact === 'high') {
        riskLevel = seasonalRiskLevel === 'very_high' ? 'very_high' : 
                   seasonalRiskLevel === 'high' ? 'high' : 'medium';
      }
    }
    
    return { level: riskLevel, factors, recommendations };
  }

  /**
   * Cache management methods - In-memory cache
   */
  private getCachedResult(key: string): any {
    if (!this.config.cache.enabled) return null;
    
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp || Date.now() - timestamp > this.config.cache.ttl) {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  private setCachedResult(key: string, value: any): void {
    if (!this.config.cache.enabled) return;
    
    // Check cache size limit
    if (this.cache.size >= this.config.cache.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        this.cacheTimestamps.delete(firstKey);
      }
    }
    
    this.cache.set(key, value);
    this.cacheTimestamps.set(key, Date.now());
  }

  /**
   * Database cache management methods
   */
  private generateDatabaseCacheKey(
    category: string,
    subcategory: string | undefined,
    region: string,
    month: number
  ): string {
    // Sanitize inputs to prevent special character issues
    // Replace colons and other special chars that could break the key format
    const sanitize = (str: string): string => {
      return str.replace(/[:|]/g, '_').trim();
    };
    
    // Generate consistent cache key: category:subcategory:region:month
    const subcat = subcategory ? sanitize(subcategory) : 'null';
    const sanitizedCategory = sanitize(category);
    const sanitizedRegion = sanitize(region);
    
    const cacheKey = `${sanitizedCategory}:${subcat}:${sanitizedRegion}:${month}`;
    
    // Validate key length (VARCHAR(200) limit)
    if (cacheKey.length > 200) {
      this.logError(`Cache key too long (${cacheKey.length} chars): ${cacheKey}`, new Error('Cache key length exceeded'));
      // Truncate and hash if needed - for now just truncate
      return cacheKey.substring(0, 200);
    }
    
    return cacheKey;
  }

  private async getDatabaseCachedResult(cacheKey: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('seasonal_insights_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error) {
        // PGRST116 = no rows returned (PostgREST), which is fine
        // Also check for other "not found" error codes
        if (error.code !== 'PGRST116' && error.code !== '42P01') {
          this.logError('Error fetching database cache:', error);
        }
        return null;
      }

      // Validate that data exists and has required fields
      if (!data || typeof data.demand_score !== 'number') {
        return null;
      }

      return data;
    } catch (error) {
      this.logError('Error accessing database cache:', error);
      return null;
    }
  }

  private async setDatabaseCachedResult(
    cacheKey: string,
    category: string,
    subcategory: string | undefined,
    region: string,
    month: number,
    demandMultiplier: number,
    riskLevel: RiskLevel,
    confidence: number,
    calculationMethod: string
  ): Promise<void> {
    try {
      // Validate inputs
      if (!category || !region || month < 1 || month > 12) {
        this.logError('Invalid parameters for database cache:', { category, region, month });
        return;
      }

      // Validate and clamp demandMultiplier to expected range (0.1-3.0)
      const clampedMultiplier = Math.max(0.1, Math.min(3.0, demandMultiplier));
      
      // Normalize demand multiplier to 0-1 range for demand_score
      // Multiplier range is 0.1-3.0, normalize to 0-1: (multiplier - 0.1) / (3.0 - 0.1)
      const demandScore = Math.max(0, Math.min(1, (clampedMultiplier - 0.1) / 2.9));

      // Calculate optimal_score: higher multiplier = more optimal (0-1 scale)
      // Optimal score represents how good this month is for events
      // Multiplier 3.0 = 1.0, multiplier 0.1 = 0.0
      const optimalScore = demandScore;

      // Set expiration to 30 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error } = await this.supabase
        .from('seasonal_insights_cache')
        .upsert({
          cache_key: cacheKey,
          category,
          subcategory: subcategory || null,
          region,
          month,
          demand_score: demandScore,
          risk_level: riskLevel,
          optimal_score: optimalScore,
          calculation_method: calculationMethod,
          confidence,
          calculated_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        }, {
          onConflict: 'cache_key'
        });

      if (error) {
        this.logError('Error storing database cache:', error);
      } else {
        this.logDebug(`Cached seasonal insight to database: ${cacheKey}`);
      }
    } catch (error) {
      this.logError('Error storing database cache:', error);
    }
  }

  private convertDatabaseCacheToMultiplier(
    dbCache: any,
    category: string,
    subcategory?: string
  ): SeasonalMultiplier {
    // Validate dbCache has required fields
    if (!dbCache || typeof dbCache.demand_score !== 'number' || typeof dbCache.confidence !== 'number') {
      this.logError('Invalid database cache data:', dbCache);
      return this.getDefaultSeasonalMultiplier(category, subcategory);
    }

    // Convert demand_score back to multiplier (reverse normalization)
    // demand_score = (multiplier - 0.1) / 2.9
    // multiplier = demand_score * 2.9 + 0.1
    const multiplier = Math.max(0.1, Math.min(3.0, dbCache.demand_score * 2.9 + 0.1));

    // Convert risk_level to demandLevel
    const demandLevelMap: Record<string, DemandLevel> = {
      'very_low': 'very_low',
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'very_high': 'very_high'
    };

    const riskLevel = dbCache.risk_level || 'medium';
    const demandLevel = demandLevelMap[riskLevel] || this.calculateDemandLevel(multiplier);

    return {
      multiplier,
      demandLevel,
      confidence: Math.max(0, Math.min(1, dbCache.confidence || 0.5)),
      reasoning: [`Cached seasonal insight for ${category}${subcategory ? ` (${subcategory})` : ''} in month ${dbCache.month || 'unknown'}`],
      dataSource: (dbCache.calculation_method || 'expert_rules') as DataSource
    };
  }

  /**
   * Clean expired cache entries from database
   * Useful for maintenance and keeping the cache table size manageable
   */
  async cleanExpiredCacheEntries(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('seasonal_insights_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        this.logError('Error cleaning expired cache entries:', error);
        return 0;
      }

      const deletedCount = data?.length || 0;
      if (deletedCount > 0) {
        this.logDebug(`Cleaned ${deletedCount} expired seasonal cache entries`);
      }
      return deletedCount;
    } catch (error) {
      this.logError('Error cleaning expired cache:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    memoryCacheSize: number;
  }> {
    try {
      // Use count queries instead of select with head:true
      const { count: totalCount, error: totalError } = await this.supabase
        .from('seasonal_insights_cache')
        .select('*', { count: 'exact', head: true });

      const { count: expiredCount, error: expiredError } = await this.supabase
        .from('seasonal_insights_cache')
        .select('*', { count: 'exact', head: true })
        .lt('expires_at', new Date().toISOString());

      if (totalError || expiredError) {
        this.logError('Error getting cache stats:', totalError || expiredError);
        return {
          totalEntries: 0,
          expiredEntries: 0,
          memoryCacheSize: this.cache.size
        };
      }

      return {
        totalEntries: totalCount || 0,
        expiredEntries: expiredCount || 0,
        memoryCacheSize: this.cache.size
      };
    } catch (error) {
      this.logError('Error getting cache statistics:', error);
      return {
        totalEntries: 0,
        expiredEntries: 0,
        memoryCacheSize: this.cache.size
      };
    }
  }

  /**
   * Logging methods
   */
  private logDebug(message: string, ...args: any[]): void {
    if (this.config.debugMode) {
      console.log(`[SeasonalityEngine] ${message}`, ...args);
    }
  }

  private logError(message: string, error: any): void {
    console.error(`[SeasonalityEngine] ${message}`, error);
  }
}

// Export singleton instance
export const seasonalityEngine = new SeasonalityEngine();
