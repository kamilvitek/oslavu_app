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

import { createClient } from '@/lib/supabase';
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
  private supabase = createClient();
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
    
    try {
      // Check cache first
      const cacheKey = `seasonal_${category}_${subcategory || 'null'}_${region}_${new Date(date).getMonth() + 1}`;
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        this.logDebug(`Cache hit for seasonal multiplier: ${cacheKey}`);
        return cached;
      }

      // Query database for seasonal rules
      const { data, error } = await this.supabase
        .from('seasonal_rules')
        .select('*')
        .eq('category', category)
        .eq('region', region)
        .eq('month', new Date(date).getMonth() + 1)
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

      // Calculate demand level from multiplier
      const demandLevel = this.calculateDemandLevel(bestRule.demand_multiplier);
      
      // Generate reasoning
      const reasoning = this.generateSeasonalReasoning(
        bestRule.demand_multiplier,
        bestRule.reasoning,
        new Date(date).getMonth() + 1,
        category,
        subcategory
      );

      const result: SeasonalMultiplier = {
        multiplier: bestRule.demand_multiplier,
        demandLevel,
        confidence: bestRule.confidence,
        reasoning,
        dataSource: bestRule.data_source as DataSource,
        expertSource: bestRule.expert_source
      };

      // Cache the result
      this.setCachedResult(cacheKey, result);

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
          monthlyData.push({
            month,
            monthName: monthNames[month - 1],
            demandMultiplier: monthRule.demand_multiplier,
            riskLevel: this.calculateRiskLevel(monthRule.demand_multiplier),
            venueAvailability: monthRule.venue_availability,
            conflictWeight: monthRule.conflict_weight,
            reasoning: includeReasoning ? monthRule.reasoning : ''
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
        pattern,
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
      
      // Risk assessment based on demand multiplier
      if (seasonalMultiplier.multiplier >= 1.5) {
        return 'high';
      } else if (seasonalMultiplier.multiplier >= 1.2) {
        return 'medium';
      } else {
        return 'low';
      }
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

      const result: SeasonalAnalysis = {
        date,
        category,
        subcategory,
        region,
        seasonalMultiplier,
        holidayImpact: holidayImpact!,
        combinedImpact,
        riskAssessment,
        confidence: Math.min(seasonalMultiplier.confidence, holidayImpact?.multiplier ? 0.8 : 1.0),
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
   */
  private calculateRiskLevel(multiplier: number): RiskLevel {
    if (multiplier >= 1.5) return 'high';
    if (multiplier >= 1.2) return 'medium';
    return 'low';
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
    const multipliers = monthlyData.map(m => m.demandMultiplier);
    const maxMonth = multipliers.indexOf(Math.max(...multipliers)) + 1;
    
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
    
    if (seasonal.multiplier >= 1.5) {
      factors.push('High seasonal demand');
      recommendations.push('Consider alternative dates with lower demand');
    }
    
    if (holiday && holiday.totalImpact !== 'none') {
      factors.push('Holiday impact detected');
      recommendations.push('Review holiday calendar for conflicts');
    }
    
    const riskLevel = factors.length >= 2 ? 'high' : factors.length === 1 ? 'medium' : 'low';
    
    return { level: riskLevel, factors, recommendations };
  }

  /**
   * Cache management methods
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
      this.cache.delete(firstKey);
      this.cacheTimestamps.delete(firstKey);
    }
    
    this.cache.set(key, value);
    this.cacheTimestamps.set(key, Date.now());
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
