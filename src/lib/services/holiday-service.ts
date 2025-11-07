// src/lib/services/holiday-service.ts
import { serverDatabaseService } from '@/lib/supabase';
import {
  HolidayInfo,
  CulturalEventInfo,
  DateAvailabilityCheck,
  HolidayServiceConfig,
  HolidayValidationResult,
  DateRangeAvailability,
  Country,
  Region,
  HolidayType,
  Holiday,
  CulturalEvent
} from '@/types/holidays';

export class HolidayService {
  private supabase = serverDatabaseService.getClient();

  /**
   * Check if a specific date is available for events based on holidays and cultural events
   */
  async checkDateAvailability(
    date: string,
    config: HolidayServiceConfig
  ): Promise<DateAvailabilityCheck> {
    try {
      const { data: holidays, error: holidayError } = await this.supabase
        .rpc('get_holidays_for_date', {
          target_date: date,
          country_code: config.country_code,
          region_code: config.region_code || null
        });

      if (holidayError) {
        console.error('Error fetching holidays:', holidayError);
        // If the function doesn't exist, return a safe default
        if (holidayError.message.includes('function') || holidayError.message.includes('does not exist')) {
          console.warn('Holiday system not set up yet, returning safe default');
          return {
            date,
            is_available: true,
            restrictions: {
              holidays: [],
              cultural_events: [],
              business_impact: 'none',
              venue_closure_expected: false,
              reasons: ['Holiday system not yet configured']
            }
          };
        }
        throw new Error('Failed to fetch holiday data');
      }

      let culturalEvents: CulturalEventInfo[] = [];
      if (config.include_cultural_events) {
        const { data: events, error: eventError } = await this.supabase
          .rpc('get_cultural_events_for_date', {
            target_date: date,
            country_code: config.country_code,
            region_code: config.region_code || null
          });

        if (eventError) {
          console.error('Error fetching cultural events:', eventError);
          // If the function doesn't exist, just continue with empty events
          if (eventError.message.includes('function') || eventError.message.includes('does not exist')) {
            console.warn('Cultural events function not set up yet, continuing with empty events');
          }
        } else {
          culturalEvents = events || [];
        }
      }

      const holidayList = holidays || [];
      const isAvailable = this.determineAvailability(holidayList, culturalEvents, config);
      const businessImpact = this.calculateBusinessImpact(holidayList, culturalEvents);
      const venueClosureExpected = this.checkVenueClosure(holidayList, culturalEvents);
      const reasons = this.generateRestrictionReasons(holidayList, culturalEvents);

      return {
        date,
        is_available: isAvailable,
        restrictions: {
          holidays: holidayList,
          cultural_events: culturalEvents,
          business_impact: businessImpact,
          venue_closure_expected: venueClosureExpected,
          reasons
        }
      };
    } catch (error) {
      console.error('Error checking date availability:', error);
      // Return a safe default - assume date is available if we can't check
      return {
        date,
        is_available: true,
        restrictions: {
          holidays: [],
          cultural_events: [],
          business_impact: 'none',
          venue_closure_expected: false,
          reasons: ['Unable to verify holiday restrictions']
        }
      };
    }
  }

  /**
   * Check availability for a range of dates
   */
  async checkDateRangeAvailability(
    startDate: string,
    endDate: string,
    config: HolidayServiceConfig
  ): Promise<DateRangeAvailability> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const availableDates: string[] = [];
    const restrictedDates: DateAvailabilityCheck[] = [];

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      const availability = await this.checkDateAvailability(dateStr, config);
      
      if (availability.is_available) {
        availableDates.push(dateStr);
      } else {
        restrictedDates.push(availability);
      }
    }

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const availableDays = availableDates.length;
    const restrictedDays = restrictedDates.length;
    const highImpactDays = restrictedDates.filter(d => 
      d.restrictions.business_impact === 'full'
    ).length;
    const venueClosureDays = restrictedDates.filter(d => 
      d.restrictions.venue_closure_expected
    ).length;

    return {
      start_date: startDate,
      end_date: endDate,
      available_dates: availableDates,
      restricted_dates: restrictedDates,
      summary: {
        total_days: totalDays,
        available_days: availableDays,
        restricted_days: restrictedDays,
        high_impact_days: highImpactDays,
        venue_closure_days: venueClosureDays
      }
    };
  }

  /**
   * Validate if a date is suitable for events
   */
  async validateEventDate(
    date: string,
    config: HolidayServiceConfig
  ): Promise<HolidayValidationResult> {
    const availability = await this.checkDateAvailability(date, config);
    
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Generate warnings based on restrictions
    if (availability.restrictions.holidays.length > 0) {
      const publicHolidays = availability.restrictions.holidays.filter(h => 
        h.holiday_type === 'public_holiday'
      );
      if (publicHolidays.length > 0) {
        warnings.push(`Public holiday(s) on this date: ${publicHolidays.map(h => h.holiday_name).join(', ')}`);
        recommendations.push('Consider alternative dates to avoid public holidays');
      }
    }

    if (availability.restrictions.cultural_events.length > 0) {
      warnings.push(`Cultural event(s) on this date: ${availability.restrictions.cultural_events.map(e => e.event_name).join(', ')}`);
      recommendations.push('Check if cultural events might affect attendance or venue availability');
    }

    if (availability.restrictions.venue_closure_expected) {
      warnings.push('Venues may be closed on this date');
      recommendations.push('Verify venue availability before confirming the date');
    }

    if (availability.restrictions.business_impact === 'full') {
      warnings.push('Full business closure expected on this date');
      recommendations.push('Strongly consider alternative dates');
    } else if (availability.restrictions.business_impact === 'partial') {
      warnings.push('Partial business impact expected on this date');
      recommendations.push('Check with venues about their operating hours');
    }

    return {
      is_valid_date: availability.is_available,
      warnings,
      restrictions: availability.restrictions,
      recommendations
    };
  }

  /**
   * Get all countries supported by the system
   */
  async getCountries(): Promise<Country[]> {
    const { data, error } = await this.supabase
      .from('countries')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching countries:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get regions for a specific country
   */
  async getRegions(countryCode: string): Promise<Region[]> {
    const { data, error } = await this.supabase
      .from('regions')
      .select(`
        *,
        countries!inner(code)
      `)
      .eq('countries.code', countryCode)
      .order('name');

    if (error) {
      console.error('Error fetching regions:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get holiday types
   */
  async getHolidayTypes(): Promise<HolidayType[]> {
    const { data, error } = await this.supabase
      .from('holiday_types')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching holiday types:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Add a new holiday
   */
  async addHoliday(holiday: Omit<Holiday, 'id' | 'created_at' | 'updated_at'>): Promise<Holiday | null> {
    const { data, error } = await this.supabase
      .from('holidays')
      .insert(holiday)
      .select()
      .single();

    if (error) {
      console.error('Error adding holiday:', error);
      return null;
    }

    return data;
  }

  /**
   * Add a new cultural event
   */
  async addCulturalEvent(event: Omit<CulturalEvent, 'id' | 'created_at' | 'updated_at'>): Promise<CulturalEvent | null> {
    const { data, error } = await this.supabase
      .from('cultural_events')
      .insert(event)
      .select()
      .single();

    if (error) {
      console.error('Error adding cultural event:', error);
      return null;
    }

    return data;
  }

  /**
   * Determine if a date is available based on restrictions
   */
  private determineAvailability(
    holidays: HolidayInfo[],
    culturalEvents: CulturalEventInfo[],
    config: HolidayServiceConfig
  ): boolean {
    // Check if any holiday has full business impact
    const hasFullBusinessImpact = holidays.some(h => h.business_impact === 'full') ||
      culturalEvents.some(e => e.business_impact === 'full');

    if (hasFullBusinessImpact) {
      return false;
    }

    // Check against business impact threshold
    const hasHighImpact = holidays.some(h => 
      this.compareBusinessImpact(h.business_impact, config.business_impact_threshold) >= 0
    ) || culturalEvents.some(e => 
      this.compareBusinessImpact(e.business_impact, config.business_impact_threshold) >= 0
    );

    return !hasHighImpact;
  }

  /**
   * Calculate overall business impact
   */
  private calculateBusinessImpact(
    holidays: HolidayInfo[],
    culturalEvents: CulturalEventInfo[]
  ): 'none' | 'partial' | 'full' {
    const allItems = [...holidays, ...culturalEvents];
    
    if (allItems.some(item => item.business_impact === 'full')) {
      return 'full';
    }
    
    if (allItems.some(item => item.business_impact === 'partial')) {
      return 'partial';
    }
    
    return 'none';
  }

  /**
   * Check if venue closure is expected
   */
  private checkVenueClosure(
    holidays: HolidayInfo[],
    culturalEvents: CulturalEventInfo[]
  ): boolean {
    return holidays.some(h => h.venue_closure_expected) ||
      culturalEvents.some(e => e.venue_closure_expected);
  }

  /**
   * Generate restriction reasons
   */
  private generateRestrictionReasons(
    holidays: HolidayInfo[],
    culturalEvents: CulturalEventInfo[]
  ): string[] {
    const reasons: string[] = [];

    holidays.forEach(holiday => {
      if (holiday.business_impact === 'full') {
        reasons.push(`Public holiday: ${holiday.holiday_name} (full closure)`);
      } else if (holiday.business_impact === 'partial') {
        reasons.push(`Public holiday: ${holiday.holiday_name} (partial impact)`);
      }
    });

    culturalEvents.forEach(event => {
      if (event.business_impact === 'full') {
        reasons.push(`Cultural event: ${event.event_name} (full closure)`);
      } else if (event.business_impact === 'partial') {
        reasons.push(`Cultural event: ${event.event_name} (partial impact)`);
      }
    });

    return reasons;
  }

  /**
   * Compare business impact levels
   */
  private compareBusinessImpact(
    impact1: 'none' | 'partial' | 'full',
    impact2: 'none' | 'partial' | 'full'
  ): number {
    const levels = { 'none': 0, 'partial': 1, 'full': 2 };
    return levels[impact1] - levels[impact2];
  }

  /**
   * Get Czech Republic default configuration
   */
  getCzechRepublicConfig(): HolidayServiceConfig {
    return {
      country_code: 'CZE',
      include_cultural_events: true,
      business_impact_threshold: 'partial'
    };
  }

  /**
   * Get holidays for a date range
   * Note: The database function get_holidays_for_date_range doesn't exist,
   * so we use get_holidays_for_date in a loop as a fallback
   */
  async getHolidaysForDateRange(
    startDate: string,
    endDate: string,
    region: string = 'CZ'
  ): Promise<any[]> {
    try {
      // Try the date range function first (if it exists in the future)
      const { data, error } = await this.supabase
        .rpc('get_holidays_for_date_range', {
          start_date: startDate,
          end_date: endDate,
          country_code: 'CZE',
          region_code: region
        });

      // If function doesn't exist, use get_holidays_for_date in a loop
      if (error && (error.message?.includes('function') || error.message?.includes('does not exist') || error.code === 'PGRST202')) {
        console.warn('get_holidays_for_date_range function not found, using get_holidays_for_date in a loop');
        
        const holidays: any[] = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Iterate through each date in the range
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
          const dateStr = date.toISOString().split('T')[0];
          const { data: dayHolidays, error: dayError } = await this.supabase
            .rpc('get_holidays_for_date', {
              target_date: dateStr,
              country_code: 'CZE',
              region_code: region || null
            });
          
          if (!dayError && dayHolidays) {
            holidays.push(...dayHolidays);
          }
        }
        
        return holidays;
      }

      if (error) {
        console.error('Error fetching holidays for date range:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getHolidaysForDateRange:', error);
      return [];
    }
  }

  /**
   * Get configuration for specific Czech region
   */
  getCzechRegionConfig(regionCode: string): HolidayServiceConfig {
    return {
      country_code: 'CZE',
      region_code: regionCode,
      include_cultural_events: true,
      business_impact_threshold: 'partial'
    };
  }
}

// Export singleton instance
export const holidayService = new HolidayService();
