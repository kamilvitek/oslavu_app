/**
 * Tests for Input Sanitization Utilities
 */

import {
  sanitizeString,
  sanitizeCityName,
  sanitizeVenueName,
  sanitizeNumber,
  sanitizeDateString,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeSearchKeyword,
  sanitizeCategory,
  sanitizeRadius,
  sanitizeCountryCode,
  sanitizePostalCode,
  sanitizeApiParameters
} from '../input-sanitization';

describe('Input Sanitization', () => {
  describe('sanitizeString', () => {
    it('should sanitize basic string input', () => {
      const result = sanitizeString('  Hello World  ');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('Hello World');
      expect(result.errors).toHaveLength(0);
    });

    it('should remove HTML tags', () => {
      const result = sanitizeString('<script>alert("xss")</script>Hello');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('alert("xss")Hello');
      expect(result.warnings).toContain('HTML tags removed from input');
    });

    it('should handle empty input when allowed', () => {
      const result = sanitizeString('', { allowEmpty: true });
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('');
    });

    it('should reject empty input when not allowed', () => {
      const result = sanitizeString('', { allowEmpty: false });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value cannot be empty');
    });

    it('should enforce length limits', () => {
      const longString = 'a'.repeat(1001);
      const result = sanitizeString(longString, { maxLength: 1000 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value must be no more than 1000 characters long');
      expect(result.sanitizedValue).toHaveLength(1000);
    });
  });

  describe('sanitizeCityName', () => {
    it('should sanitize valid city names', () => {
      const result = sanitizeCityName('Prague');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('Prague');
    });

    it('should reject city names with invalid characters', () => {
      const result = sanitizeCityName('Prague<script>');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('City name contains invalid characters');
    });

    it('should reject suspicious city names', () => {
      const result = sanitizeCityName('javascript');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid city name');
    });

    it('should handle city names with spaces and hyphens', () => {
      const result = sanitizeCityName('New York');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('New York');
    });
  });

  describe('sanitizeVenueName', () => {
    it('should sanitize valid venue names', () => {
      const result = sanitizeVenueName('Prague Conference Center');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('Prague Conference Center');
    });

    it('should allow venue names with special characters', () => {
      const result = sanitizeVenueName('Hotel & Conference Center (Prague)');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('Hotel & Conference Center (Prague)');
    });

    it('should reject venue names with invalid characters', () => {
      const result = sanitizeVenueName('Venue<script>');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Venue name contains invalid characters');
    });
  });

  describe('sanitizeNumber', () => {
    it('should sanitize valid numbers', () => {
      const result = sanitizeNumber('123');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe(123);
    });

    it('should handle float numbers when allowed', () => {
      const result = sanitizeNumber('123.45', { allowFloat: true });
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe(123.45);
    });

    it('should reject float numbers when not allowed', () => {
      const result = sanitizeNumber('123.45', { allowFloat: false });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value must be a whole number');
    });

    it('should enforce min/max limits', () => {
      const result = sanitizeNumber('150', { min: 100, max: 200 });
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe(150);
    });

    it('should reject numbers outside limits', () => {
      const result = sanitizeNumber('50', { min: 100, max: 200 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value must be at least 100');
    });
  });

  describe('sanitizeDateString', () => {
    it('should sanitize valid date strings', () => {
      const result = sanitizeDateString('2024-12-25');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('2024-12-25');
    });

    it('should reject invalid date formats', () => {
      const result = sanitizeDateString('25/12/2024');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Date must be in YYYY-MM-DD format');
    });

    it('should reject invalid dates', () => {
      const result = sanitizeDateString('2024-13-01');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid date');
    });

    it('should warn about dates far in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 3);
      const result = sanitizeDateString(futureDate.toISOString().split('T')[0]);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Date is more than two years in the future');
    });
  });

  describe('sanitizeEmail', () => {
    it('should sanitize valid email addresses', () => {
      const result = sanitizeEmail('user@example.com');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('user@example.com');
    });

    it('should reject invalid email formats', () => {
      const result = sanitizeEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });
  });

  describe('sanitizeUrl', () => {
    it('should sanitize valid URLs', () => {
      const result = sanitizeUrl('https://example.com');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('https://example.com/');
    });

    it('should reject invalid URLs', () => {
      const result = sanitizeUrl('not-a-url');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid URL format');
    });

    it('should reject non-http protocols', () => {
      const result = sanitizeUrl('ftp://example.com');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('URL must use http or https protocol');
    });
  });

  describe('sanitizeSearchKeyword', () => {
    it('should sanitize valid search keywords', () => {
      const result = sanitizeSearchKeyword('music concert');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('music concert');
    });

    it('should reject dangerous search patterns', () => {
      const result = sanitizeSearchKeyword('javascript:alert(1)');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Search keyword contains invalid content');
    });
  });

  describe('sanitizeCategory', () => {
    it('should sanitize valid categories', () => {
      const result = sanitizeCategory('Music');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('Music');
    });

    it('should allow categories with spaces and ampersands', () => {
      const result = sanitizeCategory('Arts & Culture');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('Arts & Culture');
    });

    it('should reject categories with invalid characters', () => {
      const result = sanitizeCategory('Music<script>');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Category contains invalid characters');
    });
  });

  describe('sanitizeRadius', () => {
    it('should sanitize valid radius values', () => {
      const result = sanitizeRadius('50');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('50');
    });

    it('should convert km to miles', () => {
      const result = sanitizeRadius('100km');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('62');
      expect(result.warnings).toContain('Converted 100km to 62 miles');
    });

    it('should reject radius values outside valid range', () => {
      const result = sanitizeRadius('25000');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Radius cannot exceed 19,999');
    });
  });

  describe('sanitizeCountryCode', () => {
    it('should sanitize valid country codes', () => {
      const result = sanitizeCountryCode('US');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('US');
    });

    it('should reject invalid country code formats', () => {
      const result = sanitizeCountryCode('USA');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Country code must be a 2-letter ISO code (e.g., US, GB, CZ)');
    });
  });

  describe('sanitizePostalCode', () => {
    it('should sanitize valid postal codes', () => {
      const result = sanitizePostalCode('12345');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('12345');
    });

    it('should allow postal codes with spaces and hyphens', () => {
      const result = sanitizePostalCode('12345-6789');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('12345-6789');
    });

    it('should reject postal codes with invalid characters', () => {
      const result = sanitizePostalCode('12345<script>');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Postal code contains invalid characters');
    });
  });

  describe('sanitizeApiParameters', () => {
    it('should sanitize a complete set of API parameters', () => {
      const params = {
        city: 'Prague',
        category: 'Music',
        radius: '50km',
        startDate: '2024-12-25',
        size: 100,
        keyword: 'concert'
      };

      const result = sanitizeApiParameters(params);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedParams.city).toBe('Prague');
      expect(result.sanitizedParams.category).toBe('Music');
      expect(result.sanitizedParams.radius).toBe('31'); // 50km converted to miles
      expect(result.sanitizedParams.startDate).toBe('2024-12-25');
      expect(result.sanitizedParams.size).toBe(100);
      expect(result.sanitizedParams.keyword).toBe('concert');
    });

    it('should handle mixed valid and invalid parameters', () => {
      const params = {
        city: 'Prague<script>',
        category: 'Music',
        radius: '50000', // Too large
        startDate: 'invalid-date'
      };

      const result = sanitizeApiParameters(params);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle unknown parameters with basic sanitization', () => {
      const params = {
        customParam: '<script>alert("xss")</script>',
        anotherParam: 'normal value'
      };

      const result = sanitizeApiParameters(params);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedParams.customParam).toBe('alert("xss")');
      expect(result.sanitizedParams.anotherParam).toBe('normal value');
    });
  });
});


