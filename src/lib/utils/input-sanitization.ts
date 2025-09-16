/**
 * Comprehensive Input Sanitization Utilities
 * 
 * This module provides robust input sanitization and validation functions
 * to prevent security vulnerabilities and ensure data integrity across the application.
 */

export interface SanitizationResult<T = any> {
  isValid: boolean;
  sanitizedValue: T;
  errors: string[];
  warnings: string[];
}

export interface ValidationOptions {
  maxLength?: number;
  minLength?: number;
  allowEmpty?: boolean;
  trimWhitespace?: boolean;
  removeHtml?: boolean;
  normalizeUnicode?: boolean;
}

/**
 * Sanitize and validate string input
 */
export function sanitizeString(
  input: unknown,
  options: ValidationOptions = {}
): SanitizationResult<string> {
  const {
    maxLength = 1000,
    minLength = 0,
    allowEmpty = true,
    trimWhitespace = true,
    removeHtml = true,
    normalizeUnicode = true
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];
  let sanitizedValue = '';

  // Type validation
  if (typeof input !== 'string') {
    if (input === null || input === undefined) {
      if (allowEmpty) {
        return { isValid: true, sanitizedValue: '', errors: [], warnings: [] };
      } else {
        errors.push('Value is required');
        return { isValid: false, sanitizedValue: '', errors, warnings };
      }
    }
    sanitizedValue = String(input);
  } else {
    sanitizedValue = input;
  }

  // Trim whitespace
  if (trimWhitespace) {
    sanitizedValue = sanitizedValue.trim();
  }

  // Check if empty after trimming
  if (!allowEmpty && sanitizedValue.length === 0) {
    errors.push('Value cannot be empty');
    return { isValid: false, sanitizedValue: '', errors, warnings };
  }

  // Length validation
  if (sanitizedValue.length < minLength) {
    errors.push(`Value must be at least ${minLength} characters long`);
  }
  if (sanitizedValue.length > maxLength) {
    errors.push(`Value must be no more than ${maxLength} characters long`);
    sanitizedValue = sanitizedValue.substring(0, maxLength);
    warnings.push(`Value truncated to ${maxLength} characters`);
  }

  // Remove HTML tags
  if (removeHtml) {
    const originalLength = sanitizedValue.length;
    sanitizedValue = sanitizedValue.replace(/<[^>]*>/g, '');
    if (sanitizedValue.length !== originalLength) {
      warnings.push('HTML tags removed from input');
    }
  }

  // Normalize Unicode
  if (normalizeUnicode) {
    sanitizedValue = sanitizedValue.normalize('NFC');
  }

  // Remove potentially dangerous characters
  sanitizedValue = sanitizedValue.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return {
    isValid: errors.length === 0,
    sanitizedValue,
    errors,
    warnings
  };
}

/**
 * Sanitize and validate city names
 */
export function sanitizeCityName(input: unknown): SanitizationResult<string> {
  const result = sanitizeString(input, {
    maxLength: 100,
    minLength: 2,
    allowEmpty: false,
    trimWhitespace: true,
    removeHtml: true,
    normalizeUnicode: true
  });

  if (!result.isValid) {
    return result;
  }

  // Additional city-specific validation
  const cityPattern = /^[a-zA-Z\s\-'\.]+$/;
  if (!cityPattern.test(result.sanitizedValue)) {
    result.errors.push('City name contains invalid characters');
    result.isValid = false;
  }

  // Check for common city name patterns
  const normalizedCity = result.sanitizedValue.toLowerCase();
  if (normalizedCity.includes('script') || normalizedCity.includes('javascript')) {
    result.errors.push('Invalid city name');
    result.isValid = false;
  }

  return result;
}

/**
 * Sanitize and validate venue names
 */
export function sanitizeVenueName(input: unknown): SanitizationResult<string> {
  const result = sanitizeString(input, {
    maxLength: 200,
    minLength: 2,
    allowEmpty: true,
    trimWhitespace: true,
    removeHtml: true,
    normalizeUnicode: true
  });

  if (!result.isValid) {
    return result;
  }

  // Additional venue-specific validation
  const venuePattern = /^[a-zA-Z0-9\s\-'\.&,()]+$/;
  if (result.sanitizedValue && !venuePattern.test(result.sanitizedValue)) {
    result.errors.push('Venue name contains invalid characters');
    result.isValid = false;
  }

  return result;
}

/**
 * Sanitize and validate numeric input
 */
export function sanitizeNumber(
  input: unknown,
  options: { min?: number; max?: number; allowFloat?: boolean } = {}
): SanitizationResult<number> {
  const { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, allowFloat = true } = options;
  const errors: string[] = [];
  const warnings: string[] = [];

  let sanitizedValue: number;

  if (typeof input === 'number') {
    sanitizedValue = input;
  } else if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed === '') {
      errors.push('Number is required');
      return { isValid: false, sanitizedValue: 0, errors, warnings };
    }
    
    sanitizedValue = allowFloat ? parseFloat(trimmed) : parseInt(trimmed, 10);
    
    if (isNaN(sanitizedValue)) {
      errors.push('Invalid number format');
      return { isValid: false, sanitizedValue: 0, errors, warnings };
    }
  } else {
    errors.push('Value must be a number');
    return { isValid: false, sanitizedValue: 0, errors, warnings };
  }

  // Range validation
  if (sanitizedValue < min) {
    errors.push(`Value must be at least ${min}`);
  }
  if (sanitizedValue > max) {
    errors.push(`Value must be no more than ${max}`);
  }

  // Check for integer requirement
  if (!allowFloat && !Number.isInteger(sanitizedValue)) {
    errors.push('Value must be a whole number');
  }

  return {
    isValid: errors.length === 0,
    sanitizedValue,
    errors,
    warnings
  };
}

/**
 * Sanitize and validate date strings
 */
export function sanitizeDateString(input: unknown): SanitizationResult<string> {
  const result = sanitizeString(input, {
    maxLength: 10,
    minLength: 10,
    allowEmpty: false,
    trimWhitespace: true,
    removeHtml: true,
    normalizeUnicode: false
  });

  if (!result.isValid) {
    return result;
  }

  // Validate date format (YYYY-MM-DD)
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(result.sanitizedValue)) {
    result.errors.push('Date must be in YYYY-MM-DD format');
    result.isValid = false;
    return result;
  }

  // Validate that it's a real date
  const date = new Date(result.sanitizedValue);
  if (isNaN(date.getTime())) {
    result.errors.push('Invalid date');
    result.isValid = false;
    return result;
  }

  // Check if date is reasonable (not too far in past/future)
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const twoYearsFromNow = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());

  if (date < oneYearAgo) {
    result.warnings.push('Date is more than one year in the past');
  }
  if (date > twoYearsFromNow) {
    result.warnings.push('Date is more than two years in the future');
  }

  return result;
}

/**
 * Sanitize and validate email addresses
 */
export function sanitizeEmail(input: unknown): SanitizationResult<string> {
  const result = sanitizeString(input, {
    maxLength: 254,
    minLength: 5,
    allowEmpty: false,
    trimWhitespace: true,
    removeHtml: true,
    normalizeUnicode: false
  });

  if (!result.isValid) {
    return result;
  }

  // Basic email validation
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(result.sanitizedValue)) {
    result.errors.push('Invalid email format');
    result.isValid = false;
  }

  return result;
}

/**
 * Sanitize and validate URL strings
 */
export function sanitizeUrl(input: unknown): SanitizationResult<string> {
  const result = sanitizeString(input, {
    maxLength: 2048,
    minLength: 4,
    allowEmpty: true,
    trimWhitespace: true,
    removeHtml: true,
    normalizeUnicode: false
  });

  if (!result.isValid || !result.sanitizedValue) {
    return result;
  }

  try {
    const url = new URL(result.sanitizedValue);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      result.errors.push('URL must use http or https protocol');
      result.isValid = false;
    }

    // Normalize the URL
    result.sanitizedValue = url.toString();
  } catch {
    result.errors.push('Invalid URL format');
    result.isValid = false;
  }

  return result;
}

/**
 * Sanitize and validate search keywords
 */
export function sanitizeSearchKeyword(input: unknown): SanitizationResult<string> {
  const result = sanitizeString(input, {
    maxLength: 100,
    minLength: 2,
    allowEmpty: false,
    trimWhitespace: true,
    removeHtml: true,
    normalizeUnicode: true
  });

  if (!result.isValid) {
    return result;
  }

  // Remove potentially dangerous search patterns
  const dangerousPatterns = [
    /script/i,
    /javascript/i,
    /onload/i,
    /onerror/i,
    /eval/i,
    /expression/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(result.sanitizedValue)) {
      result.errors.push('Search keyword contains invalid content');
      result.isValid = false;
      break;
    }
  }

  return result;
}

/**
 * Sanitize and validate category names
 */
export function sanitizeCategory(input: unknown): SanitizationResult<string> {
  const result = sanitizeString(input, {
    maxLength: 50,
    minLength: 1,
    allowEmpty: false,
    trimWhitespace: true,
    removeHtml: true,
    normalizeUnicode: true
  });

  if (!result.isValid) {
    return result;
  }

  // Validate category format
  const categoryPattern = /^[a-zA-Z\s&]+$/;
  if (!categoryPattern.test(result.sanitizedValue)) {
    result.errors.push('Category contains invalid characters');
    result.isValid = false;
  }

  return result;
}

/**
 * Sanitize and validate radius values
 */
export function sanitizeRadius(input: unknown): SanitizationResult<string> {
  const result = sanitizeString(input, {
    maxLength: 10,
    minLength: 1,
    allowEmpty: false,
    trimWhitespace: true,
    removeHtml: true,
    normalizeUnicode: false
  });

  if (!result.isValid) {
    return result;
  }

  // Extract numeric value
  const radiusMatch = result.sanitizedValue.match(/(\d+)/);
  if (!radiusMatch) {
    result.errors.push('Radius must contain a number');
    result.isValid = false;
    return result;
  }

  const radiusValue = parseInt(radiusMatch[1]);
  
  // Validate range (0-19,999 for Ticketmaster API)
  if (radiusValue < 0) {
    result.errors.push('Radius cannot be negative');
    result.isValid = false;
  } else if (radiusValue > 19999) {
    result.errors.push('Radius cannot exceed 19,999');
    result.isValid = false;
  }

  // Convert km to miles if needed
  if (result.sanitizedValue.toLowerCase().includes('km')) {
    const miles = Math.round(radiusValue * 0.621371);
    result.sanitizedValue = miles.toString();
    result.warnings.push(`Converted ${radiusValue}km to ${miles} miles`);
  } else {
    result.sanitizedValue = radiusValue.toString();
  }

  return result;
}

/**
 * Sanitize and validate country codes
 */
export function sanitizeCountryCode(input: unknown): SanitizationResult<string> {
  const result = sanitizeString(input, {
    maxLength: 2,
    minLength: 2,
    allowEmpty: false,
    trimWhitespace: true,
    removeHtml: true,
    normalizeUnicode: false
  });

  if (!result.isValid) {
    return result;
  }

  // Validate ISO country code format
  const countryCodePattern = /^[A-Z]{2}$/;
  if (!countryCodePattern.test(result.sanitizedValue)) {
    result.errors.push('Country code must be a 2-letter ISO code (e.g., US, GB, CZ)');
    result.isValid = false;
  }

  return result;
}

/**
 * Sanitize and validate postal codes
 */
export function sanitizePostalCode(input: unknown): SanitizationResult<string> {
  const result = sanitizeString(input, {
    maxLength: 10,
    minLength: 3,
    allowEmpty: true,
    trimWhitespace: true,
    removeHtml: true,
    normalizeUnicode: false
  });

  if (!result.isValid || !result.sanitizedValue) {
    return result;
  }

  // Basic postal code validation (alphanumeric with spaces and hyphens)
  const postalCodePattern = /^[A-Z0-9\s\-]{3,10}$/i;
  if (!postalCodePattern.test(result.sanitizedValue)) {
    result.errors.push('Postal code contains invalid characters');
    result.isValid = false;
  }

  return result;
}

/**
 * Comprehensive input sanitization for API parameters
 */
export function sanitizeApiParameters(params: Record<string, unknown>): {
  isValid: boolean;
  sanitizedParams: Record<string, any>;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sanitizedParams: Record<string, any> = {};

  // Sanitize each parameter based on its name and type
  for (const [key, value] of Object.entries(params)) {
    try {
      switch (key.toLowerCase()) {
        case 'city':
          const cityResult = sanitizeCityName(value);
          if (!cityResult.isValid) errors.push(...cityResult.errors);
          if (cityResult.warnings.length > 0) warnings.push(...cityResult.warnings);
          sanitizedParams[key] = cityResult.sanitizedValue;
          break;

        case 'venue':
          const venueResult = sanitizeVenueName(value);
          if (!venueResult.isValid) errors.push(...venueResult.errors);
          if (venueResult.warnings.length > 0) warnings.push(...venueResult.warnings);
          sanitizedParams[key] = venueResult.sanitizedValue;
          break;

        case 'category':
        case 'classificationname':
          const categoryResult = sanitizeCategory(value);
          if (!categoryResult.isValid) errors.push(...categoryResult.errors);
          if (categoryResult.warnings.length > 0) warnings.push(...categoryResult.warnings);
          sanitizedParams[key] = categoryResult.sanitizedValue;
          break;

        case 'keyword':
          const keywordResult = sanitizeSearchKeyword(value);
          if (!keywordResult.isValid) errors.push(...keywordResult.errors);
          if (keywordResult.warnings.length > 0) warnings.push(...keywordResult.warnings);
          sanitizedParams[key] = keywordResult.sanitizedValue;
          break;

        case 'radius':
          const radiusResult = sanitizeRadius(value);
          if (!radiusResult.isValid) errors.push(...radiusResult.errors);
          if (radiusResult.warnings.length > 0) warnings.push(...radiusResult.warnings);
          sanitizedParams[key] = radiusResult.sanitizedValue;
          break;

        case 'countrycode':
          const countryResult = sanitizeCountryCode(value);
          if (!countryResult.isValid) errors.push(...countryResult.errors);
          if (countryResult.warnings.length > 0) warnings.push(...countryResult.warnings);
          sanitizedParams[key] = countryResult.sanitizedValue;
          break;

        case 'postalcode':
          const postalResult = sanitizePostalCode(value);
          if (!postalResult.isValid) errors.push(...postalResult.errors);
          if (postalResult.warnings.length > 0) warnings.push(...postalResult.warnings);
          sanitizedParams[key] = postalResult.sanitizedValue;
          break;

        case 'startdate':
        case 'enddate':
        case 'startdatetime':
        case 'enddatetime':
          const dateResult = sanitizeDateString(value);
          if (!dateResult.isValid) errors.push(...dateResult.errors);
          if (dateResult.warnings.length > 0) warnings.push(...dateResult.warnings);
          sanitizedParams[key] = dateResult.sanitizedValue;
          break;

        case 'size':
        case 'page':
        case 'expectedattendees':
          const numberResult = sanitizeNumber(value, { min: 0, max: 10000, allowFloat: false });
          if (!numberResult.isValid) errors.push(...numberResult.errors);
          if (numberResult.warnings.length > 0) warnings.push(...numberResult.warnings);
          sanitizedParams[key] = numberResult.sanitizedValue;
          break;

        case 'url':
          const urlResult = sanitizeUrl(value);
          if (!urlResult.isValid) errors.push(...urlResult.errors);
          if (urlResult.warnings.length > 0) warnings.push(...urlResult.warnings);
          sanitizedParams[key] = urlResult.sanitizedValue;
          break;

        default:
          // For unknown parameters, apply basic string sanitization
          const stringResult = sanitizeString(value, { maxLength: 500 });
          if (!stringResult.isValid) errors.push(...stringResult.errors);
          if (stringResult.warnings.length > 0) warnings.push(...stringResult.warnings);
          sanitizedParams[key] = stringResult.sanitizedValue;
          break;
      }
    } catch (error) {
      errors.push(`Error sanitizing parameter '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    isValid: errors.length === 0,
    sanitizedParams,
    errors,
    warnings
  };
}

/**
 * Log sanitization results for debugging
 */
export function logSanitizationResults(
  originalParams: Record<string, unknown>,
  sanitizationResult: ReturnType<typeof sanitizeApiParameters>,
  context: string = 'Input Sanitization'
): void {
  console.log(`🔒 ${context}:`, {
    originalParams,
    sanitizedParams: sanitizationResult.sanitizedParams,
    isValid: sanitizationResult.isValid,
    errors: sanitizationResult.errors,
    warnings: sanitizationResult.warnings
  });
}
