// src/lib/services/event-validation.ts
import { DatabaseEvent } from '@/lib/types/events';
import { venueDatabaseService } from './venue-database';
import { serverDatabaseService } from '@/lib/supabase';

export interface ValidationIssue {
  type: 'capacity_exceeded' | 'category_outlier' | 'venue_mismatch' | 'confidence_low' | 'suspicious_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestedAction?: string;
  confidence?: number;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  overallScore: number; // 0-100, higher is better
  recommendations: string[];
}

export interface CategoryStatistics {
  category: string;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  sampleSize: number;
  lastUpdated: string;
}

export class EventValidationService {
  private db = serverDatabaseService;
  private categoryStatsCache: Map<string, CategoryStatistics> = new Map();
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Validate attendee estimate for an event
   */
  async validateAttendeeEstimate(event: DatabaseEvent): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];

    if (!event.expected_attendees || event.expected_attendees <= 0) {
      return {
        valid: false,
        issues: [{
          type: 'suspicious_pattern',
          severity: 'high',
          message: 'Event has no attendee estimate',
          suggestedAction: 'Estimate attendees based on venue capacity'
        }],
        overallScore: 0,
        recommendations: ['Add attendee estimate using venue capacity service']
      };
    }

    // Check venue capacity constraints
    if (event.venue) {
      const venueIssue = await this.validateVenueCapacity(event);
      if (venueIssue) {
        issues.push(venueIssue);
      }
    }

    // Check category statistics
    const categoryIssue = await this.validateCategoryNorms(event);
    if (categoryIssue) {
      issues.push(categoryIssue);
    }

    // Check confidence levels
    const confidenceIssue = this.validateConfidenceLevel(event);
    if (confidenceIssue) {
      issues.push(confidenceIssue);
    }

    // Check for suspicious patterns
    const patternIssues = this.detectSuspiciousPatterns(event);
    issues.push(...patternIssues);

    // Generate recommendations
    if (issues.length > 0) {
      recommendations.push('Review attendee estimate for accuracy');
    }
    if (event.attendee_confidence && event.attendee_confidence < 0.5) {
      recommendations.push('Consider manual verification of attendee estimate');
    }
    if (event.venue && !event.attendee_verified) {
      recommendations.push('Verify venue capacity data');
    }

    // Calculate overall score
    const overallScore = this.calculateOverallScore(issues);

    return {
      valid: issues.filter(issue => issue.severity === 'critical').length === 0,
      issues,
      overallScore,
      recommendations
    };
  }

  /**
   * Validate venue capacity constraints
   */
  private async validateVenueCapacity(event: DatabaseEvent): Promise<ValidationIssue | null> {
    if (!event.venue || !event.expected_attendees) {
      return null;
    }

    try {
      const venue = await venueDatabaseService.lookupVenue(event.venue, event.city);
      
      if (!venue) {
        return {
          type: 'venue_mismatch',
          severity: 'medium',
          message: `Venue "${event.venue}" not found in database`,
          suggestedAction: 'Add venue to database or verify venue name'
        };
      }

      const capacityRatio = event.expected_attendees / venue.capacity;
      
      if (capacityRatio > 1.2) {
        return {
          type: 'capacity_exceeded',
          severity: 'critical',
          message: `Estimate (${event.expected_attendees}) exceeds venue capacity (${venue.capacity}) by ${Math.round((capacityRatio - 1) * 100)}%`,
          suggestedAction: 'Review attendee estimate or venue capacity data'
        };
      }

      if (capacityRatio > 1.0) {
        return {
          type: 'capacity_exceeded',
          severity: 'high',
          message: `Estimate (${event.expected_attendees}) exceeds venue capacity (${venue.capacity})`,
          suggestedAction: 'Verify if venue can accommodate overflow'
        };
      }

      if (capacityRatio < 0.1) {
        return {
          type: 'suspicious_pattern',
          severity: 'medium',
          message: `Estimate (${event.expected_attendees}) is very low for venue capacity (${venue.capacity})`,
          suggestedAction: 'Verify if this is a small event or check venue data'
        };
      }

    } catch (error) {
      console.warn('Error validating venue capacity:', error);
    }

    return null;
  }

  /**
   * Validate against category norms
   */
  private async validateCategoryNorms(event: DatabaseEvent): Promise<ValidationIssue | null> {
    if (!event.expected_attendees || !event.category) {
      return null;
    }

    try {
      const categoryStats = await this.getCategoryStatistics(event.category);
      
      if (event.expected_attendees > categoryStats.p99) {
        return {
          type: 'category_outlier',
          severity: 'high',
          message: `Estimate (${event.expected_attendees}) is in top 1% for ${event.category} category (p99: ${categoryStats.p99})`,
          suggestedAction: 'Verify if this is an unusually large event'
        };
      }

      if (event.expected_attendees > categoryStats.p95) {
        return {
          type: 'category_outlier',
          severity: 'medium',
          message: `Estimate (${event.expected_attendees}) is in top 5% for ${event.category} category (p95: ${categoryStats.p95})`,
          suggestedAction: 'Review if estimate is realistic for category'
        };
      }

    } catch (error) {
      console.warn('Error validating category norms:', error);
    }

    return null;
  }

  /**
   * Validate confidence levels
   */
  private validateConfidenceLevel(event: DatabaseEvent): ValidationIssue | null {
    if (!event.attendee_confidence) {
      return {
        type: 'confidence_low',
        severity: 'low',
        message: 'No confidence score available for attendee estimate',
        suggestedAction: 'Add confidence tracking to attendee estimate'
      };
    }

    if (event.attendee_confidence < 0.3) {
      return {
        type: 'confidence_low',
        severity: 'high',
        message: `Very low confidence score (${event.attendee_confidence}) for attendee estimate`,
        suggestedAction: 'Manual verification recommended'
      };
    }

    if (event.attendee_confidence < 0.5) {
      return {
        type: 'confidence_low',
        severity: 'medium',
        message: `Low confidence score (${event.attendee_confidence}) for attendee estimate`,
        suggestedAction: 'Consider additional verification'
      };
    }

    return null;
  }

  /**
   * Detect suspicious patterns in event data
   */
  private detectSuspiciousPatterns(event: DatabaseEvent): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for round numbers (might be estimates)
    if (event.expected_attendees && this.isRoundNumber(event.expected_attendees)) {
      issues.push({
        type: 'suspicious_pattern',
        severity: 'low',
        message: `Attendee estimate (${event.expected_attendees}) is a round number, might be an estimate`,
        suggestedAction: 'Verify if this is an actual count or estimate'
      });
    }

    // Check for very large numbers
    if (event.expected_attendees && event.expected_attendees > 50000) {
      issues.push({
        type: 'suspicious_pattern',
        severity: 'medium',
        message: `Very large attendee estimate (${event.expected_attendees})`,
        suggestedAction: 'Verify venue capacity and event scale'
      });
    }

    // Check for very small numbers for large venues
    if (event.expected_attendees && event.expected_attendees < 10 && event.venue) {
      issues.push({
        type: 'suspicious_pattern',
        severity: 'low',
        message: `Very small attendee estimate (${event.expected_attendees}) for venue "${event.venue}"`,
        suggestedAction: 'Verify if this is a private or small event'
      });
    }

    return issues;
  }

  /**
   * Get category statistics from database
   */
  private async getCategoryStatistics(category: string): Promise<CategoryStatistics> {
    // Check cache first
    const cached = this.categoryStatsCache.get(category);
    if (cached && Date.now() - new Date(cached.lastUpdated).getTime() < this.cacheExpiry) {
      return cached;
    }

    try {
      const { data, error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('events')
          .select('expected_attendees')
          .eq('category', category)
          .not('expected_attendees', 'is', null)
          .gt('expected_attendees', 0);
        return result;
      });

      if (error) {
        console.warn('Error fetching category statistics:', error);
        return this.getDefaultCategoryStats(category);
      }

      const attendances = (data || [])
        .map(event => event.expected_attendees)
        .filter(attendance => attendance && attendance > 0)
        .sort((a, b) => a - b);

      if (attendances.length === 0) {
        return this.getDefaultCategoryStats(category);
      }

      const mean = attendances.reduce((sum, val) => sum + val, 0) / attendances.length;
      const median = attendances[Math.floor(attendances.length / 2)];
      const p95 = attendances[Math.floor(attendances.length * 0.95)];
      const p99 = attendances[Math.floor(attendances.length * 0.99)];

      const stats: CategoryStatistics = {
        category,
        mean: Math.round(mean),
        median: Math.round(median),
        p95: Math.round(p95),
        p99: Math.round(p99),
        sampleSize: attendances.length,
        lastUpdated: new Date().toISOString()
      };

      // Cache the results
      this.categoryStatsCache.set(category, stats);
      return stats;

    } catch (error) {
      console.warn('Error calculating category statistics:', error);
      return this.getDefaultCategoryStats(category);
    }
  }

  /**
   * Get default category statistics when data is unavailable
   */
  private getDefaultCategoryStats(category: string): CategoryStatistics {
    const defaults: Record<string, { mean: number; p95: number; p99: number }> = {
      'Sports': { mean: 5000, p95: 15000, p99: 25000 },
      'Entertainment': { mean: 2000, p95: 8000, p99: 15000 },
      'Arts & Culture': { mean: 500, p95: 2000, p99: 5000 },
      'Business': { mean: 200, p95: 1000, p99: 3000 },
      'Technology': { mean: 300, p95: 1500, p99: 5000 },
      'Education': { mean: 100, p95: 500, p99: 2000 },
      'Health & Wellness': { mean: 50, p95: 200, p99: 500 },
      'Food & Drink': { mean: 100, p95: 500, p99: 1000 }
    };

    const defaultStats = defaults[category] || { mean: 200, p95: 1000, p99: 3000 };

    return {
      category,
      mean: defaultStats.mean,
      median: defaultStats.mean,
      p95: defaultStats.p95,
      p99: defaultStats.p99,
      sampleSize: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Calculate overall validation score
   */
  private calculateOverallScore(issues: ValidationIssue[]): number {
    if (issues.length === 0) return 100;

    let score = 100;
    
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 30;
          break;
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    return Math.max(0, score);
  }

  /**
   * Check if number is suspiciously round
   */
  private isRoundNumber(num: number): boolean {
    const str = num.toString();
    return str.endsWith('00') || str.endsWith('000') || str.endsWith('0000');
  }

  /**
   * Validate multiple events in batch
   */
  async validateBatch(events: DatabaseEvent[]): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();

    for (const event of events) {
      try {
        const result = await this.validateAttendeeEstimate(event);
        results.set(event.id, result);
      } catch (error) {
        console.error(`Error validating event ${event.id}:`, error);
        results.set(event.id, {
          valid: false,
          issues: [{
            type: 'suspicious_pattern',
            severity: 'high',
            message: 'Validation failed due to system error',
            suggestedAction: 'Manual review required'
          }],
          overallScore: 0,
          recommendations: ['Manual review required due to validation error']
        });
      }
    }

    return results;
  }

  /**
   * Get validation summary for multiple events
   */
  async getValidationSummary(events: DatabaseEvent[]): Promise<{
    totalEvents: number;
    validEvents: number;
    averageScore: number;
    criticalIssues: number;
    recommendations: string[];
  }> {
    const results = await this.validateBatch(events);
    
    let validEvents = 0;
    let totalScore = 0;
    let criticalIssues = 0;
    const allRecommendations: string[] = [];

    for (const result of results.values()) {
      if (result.valid) validEvents++;
      totalScore += result.overallScore;
      criticalIssues += result.issues.filter(issue => issue.severity === 'critical').length;
      allRecommendations.push(...result.recommendations);
    }

    return {
      totalEvents: events.length,
      validEvents,
      averageScore: events.length > 0 ? Math.round(totalScore / events.length) : 0,
      criticalIssues,
      recommendations: [...new Set(allRecommendations)]
    };
  }
}

// Export singleton instance
export const eventValidationService = new EventValidationService();
