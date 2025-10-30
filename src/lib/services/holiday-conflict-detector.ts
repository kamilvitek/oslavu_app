/**
 * Holiday Conflict Detector Service
 * 
 * This service integrates with the existing holiday system to detect holiday conflicts
 * and calculate impact multipliers for event conflict scoring. It leverages the
 * comprehensive holiday database schema and provides category-specific impact analysis.
 * 
 * Key Features:
 * - Holiday conflict detection within configurable impact windows
 * - Category-specific holiday impact multipliers
 * - Integration with existing holiday-service.ts functions
 * - Performance-optimized batch holiday queries
 * - Regional holiday support with Czech Republic focus
 * 
 * @fileoverview Holiday impact detection for enhanced conflict analysis
 */

import { supabase } from '@/lib/supabase';
import { holidayService } from './holiday-service';
import {
  HolidayImpact,
  HolidayConflict,
  ImpactLevel,
  BusinessImpact,
  HolidayImpactRule
} from '@/types/seasonality';

/**
 * HolidayConflictDetector - Service for detecting and analyzing holiday impacts
 * 
 * This class provides methods to detect holidays within impact windows,
 * calculate category-specific multipliers, and integrate with the existing
 * holiday system for comprehensive conflict analysis.
 */
export class HolidayConflictDetector {
  private supabase = supabase;
  private cache = new Map<string, any>();
  private cacheTimestamps = new Map<string, number>();
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  /**
   * Detect holiday conflicts for a specific date and event category
   * 
   * @param date - Target date for analysis
   * @param category - Event category
   * @param subcategory - Event subcategory (optional)
   * @param region - Geographic region (defaults to CZ)
   * @returns Promise<HolidayConflict[]>
   */
  async detectHolidayConflicts(
    date: string,
    category: string,
    subcategory?: string,
    region: string = 'CZ'
  ): Promise<HolidayConflict[]> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = `holiday_conflicts_${date}_${category}_${subcategory || 'null'}_${region}`;
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        console.log(`Cache hit for holiday conflicts: ${cacheKey}`);
        return cached;
      }

      // Get holidays for the date using existing holiday service
      const holidays = await holidayService.getHolidaysForDateRange(
        date,
        date,
        region
      );

      if (!holidays || holidays.length === 0) {
        this.setCachedResult(cacheKey, []);
        return [];
      }

      // Get holiday impact rules for this category
      const impactRules = await this.getHolidayImpactRules(category, subcategory, region);
      
      // Process each holiday to check for conflicts
      const conflicts: HolidayConflict[] = [];
      
      for (const holiday of holidays) {
        // Find applicable impact rules for this holiday type
        const applicableRules = impactRules.filter(rule => 
          rule.holidayType === holiday.holiday_type
        );

        for (const rule of applicableRules) {
          // Check if the date falls within the impact window
          const isWithinImpactWindow = this.isDateWithinImpactWindow(
            date,
            holiday.observed_date || holiday.date,
            rule.daysBefore,
            rule.daysAfter
          );

          if (isWithinImpactWindow) {
            conflicts.push({
              name: holiday.holiday_name,
              nameNative: holiday.holiday_name_native,
              holidayType: holiday.holiday_type,
              date: holiday.observed_date || holiday.date,
              impactMultiplier: rule.impactMultiplier,
              daysBefore: rule.daysBefore,
              daysAfter: rule.daysAfter,
              businessImpact: holiday.business_impact as BusinessImpact,
              venueClosureExpected: holiday.venue_closure_expected
            });
          }
        }
      }

      // Cache the result
      this.setCachedResult(cacheKey, conflicts);

      const duration = Date.now() - startTime;
      console.log(`Holiday conflicts detected in ${duration}ms: ${conflicts.length} conflicts`);

      return conflicts;

    } catch (error) {
      console.error('Error detecting holiday conflicts:', error);
      return [];
    }
  }

  /**
   * Get holiday impact multiplier for a specific date and event category
   * 
   * @param date - Target date for analysis
   * @param category - Event category
   * @param subcategory - Event subcategory (optional)
   * @param region - Geographic region
   * @returns Promise<number>
   */
  async getHolidayMultiplier(
    date: string,
    category: string,
    subcategory?: string,
    region: string = 'CZ'
  ): Promise<number> {
    try {
      const conflicts = await this.detectHolidayConflicts(date, category, subcategory, region);
      
      if (conflicts.length === 0) {
        return 1.0; // No holiday impact
      }

      // Calculate combined multiplier from all conflicts
      let totalMultiplier = 1.0;
      for (const conflict of conflicts) {
        totalMultiplier *= conflict.impactMultiplier;
      }

      // Cap the multiplier to prevent extreme values
      return Math.min(totalMultiplier, 5.0);

    } catch (error) {
      console.error('Error calculating holiday multiplier:', error);
      return 1.0; // Default to no impact on error
    }
  }

  /**
   * Get comprehensive holiday impact analysis
   * 
   * @param date - Target date for analysis
   * @param category - Event category
   * @param subcategory - Event subcategory (optional)
   * @param region - Geographic region
   * @returns Promise<HolidayImpact>
   */
  async getHolidayImpact(
    date: string,
    category: string,
    subcategory?: string,
    region: string = 'CZ'
  ): Promise<HolidayImpact> {
    try {
      const conflicts = await this.detectHolidayConflicts(date, category, subcategory, region);
      const multiplier = await this.getHolidayMultiplier(date, category, subcategory, region);
      
      // Calculate total impact level
      const totalImpact = this.calculateTotalImpact(multiplier, conflicts);
      
      // Generate reasoning
      const reasoning = this.generateHolidayReasoning(conflicts, multiplier);
      
      // Determine impact window
      const impactWindow = this.calculateImpactWindow(conflicts);

      return {
        multiplier,
        affectedHolidays: conflicts,
        totalImpact,
        reasoning,
        impactWindow
      };

    } catch (error) {
      console.error('Error getting holiday impact:', error);
      return {
        multiplier: 1.0,
        affectedHolidays: [],
        totalImpact: 'none',
        reasoning: ['Holiday impact analysis failed'],
        impactWindow: { daysBefore: 0, daysAfter: 0 }
      };
    }
  }

  /**
   * Get upcoming holidays within a date range
   * 
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @param region - Geographic region
   * @returns Promise<HolidayConflict[]>
   */
  async getUpcomingHolidays(
    startDate: string,
    endDate: string,
    region: string = 'CZ'
  ): Promise<HolidayConflict[]> {
    try {
      // Use existing holiday service to get holidays in range
      const holidays = await holidayService.getHolidaysForDateRange(
        startDate,
        endDate,
        region
      );

      if (!holidays || holidays.length === 0) {
        return [];
      }

      // Convert to HolidayConflict format
      const conflicts: HolidayConflict[] = holidays.map((holiday: any) => ({
        name: holiday.holiday_name,
        nameNative: holiday.holiday_name_native,
        holidayType: holiday.holiday_type,
        date: holiday.observed_date || holiday.date,
        impactMultiplier: 1.5, // Default multiplier
        daysBefore: 1,
        daysAfter: 1,
        businessImpact: holiday.business_impact as BusinessImpact,
        venueClosureExpected: holiday.venue_closure_expected
      }));

      return conflicts;

    } catch (error) {
      console.error('Error getting upcoming holidays:', error);
      return [];
    }
  }

  /**
   * Get impact window for a specific holiday type and event category
   * 
   * @param holidayType - Type of holiday
   * @param category - Event category
   * @param subcategory - Event subcategory (optional)
   * @param region - Geographic region
   * @returns Promise<{daysBefore: number, daysAfter: number}>
   */
  async getImpactWindow(
    holidayType: string,
    category: string,
    subcategory?: string,
    region: string = 'CZ'
  ): Promise<{ daysBefore: number; daysAfter: number }> {
    try {
      const rules = await this.getHolidayImpactRules(category, subcategory, region);
      const applicableRule = rules.find(rule => rule.holidayType === holidayType);
      
      if (applicableRule) {
        return {
          daysBefore: applicableRule.daysBefore,
          daysAfter: applicableRule.daysAfter
        };
      }

      // Default impact window
      return { daysBefore: 1, daysAfter: 1 };

    } catch (error) {
      console.error('Error getting impact window:', error);
      return { daysBefore: 1, daysAfter: 1 };
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Get holiday impact rules for a category
   */
  private async getHolidayImpactRules(
    category: string,
    subcategory?: string,
    region: string = 'CZ'
  ): Promise<HolidayImpactRule[]> {
    try {
      const { data, error } = await this.supabase
        .from('holiday_impact_rules')
        .select('*')
        .eq('event_category', category)
        .eq('region', region)
        .order('confidence', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch holiday impact rules: ${error.message}`);
      }

      // Filter by subcategory if specified
      let rules = data || [];
      if (subcategory) {
        rules = rules.filter(rule => 
          rule.event_subcategory === subcategory || !rule.event_subcategory
        );
      }

      return rules;

    } catch (error) {
      console.error('Error fetching holiday impact rules:', error);
      return [];
    }
  }

  /**
   * Check if a date is within the impact window of a holiday
   */
  private isDateWithinImpactWindow(
    targetDate: string,
    holidayDate: string,
    daysBefore: number,
    daysAfter: number
  ): boolean {
    const target = new Date(targetDate);
    const holiday = new Date(holidayDate);
    
    const startWindow = new Date(holiday);
    startWindow.setDate(startWindow.getDate() - daysBefore);
    
    const endWindow = new Date(holiday);
    endWindow.setDate(endWindow.getDate() + daysAfter);
    
    return target >= startWindow && target <= endWindow;
  }

  /**
   * Calculate total impact level from multiplier and conflicts
   */
  private calculateTotalImpact(multiplier: number, conflicts: HolidayConflict[]): ImpactLevel {
    if (conflicts.length === 0) return 'none';
    
    if (multiplier >= 4.0) return 'critical';
    if (multiplier >= 2.5) return 'high';
    if (multiplier >= 1.8) return 'moderate';
    if (multiplier >= 1.2) return 'low';
    return 'none';
  }

  /**
   * Generate reasoning for holiday impacts
   */
  private generateHolidayReasoning(conflicts: HolidayConflict[], multiplier: number): string[] {
    const reasoning: string[] = [];
    
    if (conflicts.length === 0) {
      reasoning.push('No holiday conflicts detected');
      return reasoning;
    }

    reasoning.push(`${conflicts.length} holiday conflict${conflicts.length > 1 ? 's' : ''} detected`);
    
    for (const conflict of conflicts) {
      reasoning.push(`${conflict.name} (${conflict.holidayType}) - ${conflict.impactMultiplier}x impact`);
    }

    if (multiplier >= 2.0) {
      reasoning.push('High combined holiday impact expected');
    } else if (multiplier >= 1.5) {
      reasoning.push('Moderate holiday impact expected');
    } else {
      reasoning.push('Low holiday impact expected');
    }

    return reasoning;
  }

  /**
   * Calculate overall impact window from all conflicts
   */
  private calculateImpactWindow(conflicts: HolidayConflict[]): { daysBefore: number; daysAfter: number } {
    if (conflicts.length === 0) {
      return { daysBefore: 0, daysAfter: 0 };
    }

    const maxDaysBefore = Math.max(...conflicts.map(c => c.daysBefore));
    const maxDaysAfter = Math.max(...conflicts.map(c => c.daysAfter));

    return {
      daysBefore: maxDaysBefore,
      daysAfter: maxDaysAfter
    };
  }

  /**
   * Cache management methods
   */
  private getCachedResult(key: string): any {
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp || Date.now() - timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  private setCachedResult(key: string, value: any): void {
    this.cache.set(key, value);
    this.cacheTimestamps.set(key, Date.now());
  }
}

// Export singleton instance
export const holidayConflictDetector = new HolidayConflictDetector();
