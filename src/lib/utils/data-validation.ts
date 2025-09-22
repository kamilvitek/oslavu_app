import { z } from 'zod';
import { CreateEventData, UpdateEventData } from '@/lib/types/events';

/**
 * Enhanced data validation utilities
 */
export class DataValidator {
  /**
   * Validate event data with comprehensive checks
   */
  static validateEventData(data: unknown): {
    isValid: boolean;
    data?: CreateEventData;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic schema validation
      const CreateEventSchema = z.object({
        title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
        description: z.string().max(2000, 'Description too long').optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format').optional(),
        city: z.string().min(1, 'City is required').max(100, 'City name too long'),
        venue: z.string().max(200, 'Venue name too long').optional(),
        category: z.string().min(1, 'Category is required').max(50, 'Category too long'),
        subcategory: z.string().max(50, 'Subcategory too long').optional(),
        expected_attendees: z.number().int().min(0, 'Attendees cannot be negative').max(1000000, 'Attendees too high').optional(),
        source: z.enum(['ticketmaster', 'predicthq', 'meetup', 'manual', 'brno'], {
          errorMap: () => ({ message: 'Invalid source' })
        }),
        source_id: z.string().max(100, 'Source ID too long').optional(),
        url: z.string().url('Invalid URL format').max(500, 'URL too long').optional(),
        image_url: z.string().url('Invalid image URL format').max(500, 'Image URL too long').optional(),
      });

      const validatedData = CreateEventSchema.parse(data);

      // Additional business logic validation
      this.validateBusinessRules(validatedData, errors, warnings);

      return {
        isValid: errors.length === 0,
        data: errors.length === 0 ? validatedData : undefined,
        errors,
        warnings
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(err => `${err.path.join('.')}: ${err.message}`));
      } else {
        errors.push('Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }

      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Validate business rules
   */
  private static validateBusinessRules(
    data: CreateEventData,
    errors: string[],
    warnings: string[]
  ): void {
    // Date validation
    if (data.end_date && data.end_date < data.date) {
      errors.push('End date cannot be before start date');
    }

    // Future date validation
    const eventDate = new Date(data.date);
    const now = new Date();
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

    if (eventDate < now) {
      warnings.push('Event date is in the past');
    }

    if (eventDate > oneYearFromNow) {
      warnings.push('Event date is more than one year in the future');
    }

    // Attendance validation
    if (data.expected_attendees && data.expected_attendees > 100000) {
      warnings.push('Expected attendees seems unusually high');
    }

    // City name validation
    if (data.city) {
      const normalizedCity = this.normalizeCityName(data.city);
      if (normalizedCity !== data.city) {
        warnings.push(`City name normalized from "${data.city}" to "${normalizedCity}"`);
      }
    }

    // Category validation
    if (data.category) {
      const normalizedCategory = this.normalizeCategory(data.category);
      if (normalizedCategory !== data.category) {
        warnings.push(`Category normalized from "${data.category}" to "${normalizedCategory}"`);
      }
    }

    // URL validation
    if (data.url && !this.isValidUrl(data.url)) {
      errors.push('Invalid URL format');
    }

    if (data.image_url && !this.isValidUrl(data.image_url)) {
      errors.push('Invalid image URL format');
    }

    // Title quality check
    if (data.title && data.title.length < 3) {
      warnings.push('Event title is very short');
    }

    // Description quality check
    if (data.description && data.description.length < 10) {
      warnings.push('Event description is very short');
    }
  }

  /**
   * Validate update data
   */
  static validateUpdateData(data: unknown): {
    isValid: boolean;
    data?: UpdateEventData;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const UpdateEventSchema = z.object({
        title: z.string().min(1).max(500).optional(),
        description: z.string().max(2000).optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        city: z.string().min(1).max(100).optional(),
        venue: z.string().max(200).optional(),
        category: z.string().min(1).max(50).optional(),
        subcategory: z.string().max(50).optional(),
        expected_attendees: z.number().int().min(0).max(1000000).optional(),
        source: z.enum(['ticketmaster', 'predicthq', 'meetup', 'manual', 'brno']).optional(),
        source_id: z.string().max(100).optional(),
        url: z.string().url().max(500).optional(),
        image_url: z.string().url().max(500).optional(),
        updated_at: z.string().optional(),
      });

      const validatedData = UpdateEventSchema.parse(data);

      // Additional validation for update data
      if (validatedData.end_date && validatedData.date && validatedData.end_date < validatedData.date) {
        errors.push('End date cannot be before start date');
      }

      return {
        isValid: errors.length === 0,
        data: errors.length === 0 ? validatedData : undefined,
        errors,
        warnings
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(err => `${err.path.join('.')}: ${err.message}`));
      } else {
        errors.push('Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }

      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Validate search parameters
   */
  static validateSearchParams(params: unknown): {
    isValid: boolean;
    data?: any;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      const SearchParamsSchema = z.object({
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

      const validatedData = SearchParamsSchema.parse(params);

      // Additional validation
      if (validatedData.start_date && validatedData.end_date && validatedData.start_date > validatedData.end_date) {
        errors.push('Start date cannot be after end date');
      }

      if (validatedData.min_attendees && validatedData.max_attendees && validatedData.min_attendees > validatedData.max_attendees) {
        errors.push('Minimum attendees cannot be greater than maximum attendees');
      }

      return {
        isValid: errors.length === 0,
        data: errors.length === 0 ? validatedData : undefined,
        errors
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(err => `${err.path.join('.')}: ${err.message}`));
      } else {
        errors.push('Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }

      return {
        isValid: false,
        errors
      };
    }
  }

  /**
   * Validate conflict analysis parameters
   */
  static validateConflictAnalysisParams(params: unknown): {
    isValid: boolean;
    data?: any;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      const ConflictAnalysisSchema = z.object({
        city: z.string().min(1).max(100),
        category: z.string().min(1).max(50),
        preferred_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(10),
        expected_attendees: z.number().int().min(1).max(1000000).default(100),
        date_range: z.object({
          start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        }).optional(),
        enable_advanced_analysis: z.boolean().optional().default(false)
      });

      const validatedData = ConflictAnalysisSchema.parse(params);

      // Additional validation
      if (validatedData.date_range && validatedData.date_range.start > validatedData.date_range.end) {
        errors.push('Date range start cannot be after end');
      }

      // Validate that preferred dates are within date range if specified
      if (validatedData.date_range) {
        const invalidDates = validatedData.preferred_dates.filter(date => 
          date < validatedData.date_range!.start || date > validatedData.date_range!.end
        );
        if (invalidDates.length > 0) {
          errors.push(`Preferred dates must be within date range: ${invalidDates.join(', ')}`);
        }
      }

      return {
        isValid: errors.length === 0,
        data: errors.length === 0 ? validatedData : undefined,
        errors
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(err => `${err.path.join('.')}: ${err.message}`));
      } else {
        errors.push('Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }

      return {
        isValid: false,
        errors
      };
    }
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string, maxLength?: number): string {
    let sanitized = input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\s+/g, ' '); // Normalize whitespace

    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength).trim();
    }

    return sanitized;
  }

  /**
   * Validate and sanitize email
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate and sanitize URL
   */
  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate date string
   */
  static validateDate(dateString: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Validate date range
   */
  static validateDateRange(startDate: string, endDate: string): boolean {
    if (!this.validateDate(startDate) || !this.validateDate(endDate)) {
      return false;
    }

    return new Date(startDate) <= new Date(endDate);
  }

  /**
   * Normalize city name
   */
  private static normalizeCityName(city: string): string {
    const cityMap: Record<string, string> = {
      'praha': 'Prague',
      'brno': 'Brno',
      'ostrava': 'Ostrava',
      'olomouc': 'Olomouc',
      'plzen': 'Plzen',
      'pilsen': 'Plzen',
      'liberec': 'Liberec',
      'ceske budejovice': 'Ceske Budejovice',
      'budweis': 'Ceske Budejovice',
      'hradec kralove': 'Hradec Kralove',
      'pardubice': 'Pardubice',
      'zlin': 'Zlin',
      'gottwaldov': 'Zlin',
      'karlovy vary': 'Karlovy Vary',
      'karlsbad': 'Karlovy Vary',
    };

    const normalized = city.toLowerCase().trim();
    return cityMap[normalized] || city;
  }

  /**
   * Normalize category name
   */
  private static normalizeCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'technology': 'Technology',
      'tech': 'Technology',
      'business': 'Business',
      'marketing': 'Marketing',
      'healthcare': 'Healthcare',
      'health': 'Healthcare',
      'education': 'Education',
      'finance': 'Finance',
      'entertainment': 'Entertainment',
      'sports': 'Sports',
      'arts & culture': 'Arts & Culture',
      'arts and culture': 'Arts & Culture',
      'culture': 'Arts & Culture',
      'other': 'Other',
    };

    const normalized = category.toLowerCase().trim();
    return categoryMap[normalized] || category;
  }

  /**
   * Check if URL is valid
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate batch operation data
   */
  static validateBatchData(data: unknown[]): {
    isValid: boolean;
    validItems: unknown[];
    invalidItems: Array<{ index: number; errors: string[] }>;
  } {
    const validItems: unknown[] = [];
    const invalidItems: Array<{ index: number; errors: string[] }> = [];

    data.forEach((item, index) => {
      const validation = this.validateEventData(item);
      if (validation.isValid) {
        validItems.push(validation.data);
      } else {
        invalidItems.push({
          index,
          errors: validation.errors
        });
      }
    });

    return {
      isValid: invalidItems.length === 0,
      validItems,
      invalidItems
    };
  }

  /**
   * Validate pagination parameters
   */
  static validatePaginationParams(params: {
    page?: number;
    limit?: number;
    offset?: number;
  }): {
    isValid: boolean;
    data?: { page: number; limit: number; offset: number };
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      const PaginationSchema = z.object({
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(1000).default(50),
        offset: z.number().int().min(0).optional(),
      });

      const validatedData = PaginationSchema.parse(params);

      // Calculate offset from page if provided
      if (validatedData.page && validatedData.offset === undefined) {
        validatedData.offset = (validatedData.page - 1) * validatedData.limit;
      }

      return {
        isValid: true,
        data: {
          page: validatedData.page || Math.floor((validatedData.offset || 0) / validatedData.limit) + 1,
          limit: validatedData.limit,
          offset: validatedData.offset || 0
        },
        errors
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(err => `${err.path.join('.')}: ${err.message}`));
      } else {
        errors.push('Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }

      return {
        isValid: false,
        errors
      };
    }
  }
}
