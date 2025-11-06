// src/lib/services/event-cleaning.service.ts
import { createHash } from 'crypto';

interface ScrapedEvent {
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  city: string;
  venue?: string;
  category?: string;
  subcategory?: string;
  url?: string;
  imageUrl?: string;
  expectedAttendees?: number;
}

/**
 * Service for cleaning and normalizing scraped event data
 */
export class EventCleaningService {
  /**
   * Clean title by removing markdown, URLs, images, and HTML artifacts
   */
  cleanTitle(title: string): string {
    if (!title) return '';

    let cleaned = title;

    // Remove markdown images: ![alt](url) or ![alt](url "title")
    cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');

    // Remove markdown links: [text](url) but keep the text
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Remove markdown bold/italic: **text**, *text*, __text__, _text_
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
    cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
    cleaned = cleaned.replace(/_([^_]+)_/g, '$1');

    // Remove markdown headers: # text, ## text, etc.
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

    // Remove URLs (http://, https://, www.)
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
    cleaned = cleaned.replace(/www\.[^\s]+/g, '');

    // Remove email addresses
    cleaned = cleaned.replace(/[^\s]+@[^\s]+/g, '');

    // Remove HTML tags
    cleaned = cleaned.replace(/<[^>]+>/g, '');

    // Remove HTML entities
    cleaned = cleaned.replace(/&[#\w]+;/g, '');

    // Remove extra whitespace and trim
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Remove trailing backslashes and special characters
    cleaned = cleaned.replace(/\\+$/g, '').trim();

    // Remove leading/trailing special characters
    cleaned = cleaned.replace(/^[^\w]+|[^\w]+$/g, '').trim();

    return cleaned || title; // Fallback to original if empty
  }

  /**
   * Extract city from venue name
   */
  extractCityFromVenueName(venueName?: string): string | null {
    if (!venueName) return null;

    const venueLower = venueName.toLowerCase();

    const cityPatterns = [
      { pattern: /prague|praha/i, city: 'Prague' },
      { pattern: /brno/i, city: 'Brno' },
      { pattern: /ostrava/i, city: 'Ostrava' },
      { pattern: /olomouc/i, city: 'Olomouc' },
      { pattern: /plzen|pilsen/i, city: 'Plzen' },
      { pattern: /liberec/i, city: 'Liberec' },
      { pattern: /ceske budejovice|budweis/i, city: 'Ceske Budejovice' },
      { pattern: /hradec kralove/i, city: 'Hradec Kralove' },
      { pattern: /pardubice/i, city: 'Pardubice' },
      { pattern: /zlin|gottwaldov/i, city: 'Zlin' },
      { pattern: /karlovy vary|karlsbad/i, city: 'Karlovy Vary' },
      { pattern: /jihlava/i, city: 'Jihlava' },
      { pattern: /kladno/i, city: 'Kladno' },
      { pattern: /most/i, city: 'Most' },
      { pattern: /havirov/i, city: 'Havirov' },
      { pattern: /karvina/i, city: 'Karvina' },
      { pattern: /frydek-mistek/i, city: 'Frydek-Mistek' },
      { pattern: /opava/i, city: 'Opava' },
      { pattern: /decín|decin/i, city: 'Decin' },
      { pattern: /chomutov/i, city: 'Chomutov' },
      { pattern: /teplice/i, city: 'Teplice' },
      { pattern: /jablonec nad nisou/i, city: 'Jablonec nad Nisou' },
      { pattern: /prostejov/i, city: 'Prostejov' },
      { pattern: /prerov/i, city: 'Prerov' },
      { pattern: /melnik/i, city: 'Melnik' },
      { pattern: /trutnov/i, city: 'Trutnov' },
      { pattern: /pribram/i, city: 'Pribram' },
      { pattern: /cheb/i, city: 'Cheb' },
      { pattern: /modrany/i, city: 'Modrany' },
      { pattern: /kromeriz/i, city: 'Kromeriz' },
      { pattern: /sumperk/i, city: 'Sumperk' },
      { pattern: /vsetin/i, city: 'Vsetin' },
      { pattern: /uherske hradiste/i, city: 'Uherske Hradiste' },
      { pattern: /novy jicin/i, city: 'Novy Jicin' },
      { pattern: /chrudim/i, city: 'Chrudim' },
      { pattern: /ceska trebova/i, city: 'Ceska Trebova' },
      { pattern: /trebic/i, city: 'Trebic' },
      { pattern: /zdar nad sazavou/i, city: 'Zdar nad Sazavou' },
      { pattern: /sokolov/i, city: 'Sokolov' },
      { pattern: /havlickuv brod/i, city: 'Havlickuv Brod' },
      { pattern: /kutna hora/i, city: 'Kutna Hora' },
      { pattern: /steti/i, city: 'Steti' },
      { pattern: /louny/i, city: 'Louny' },
      { pattern: /kralupy nad vltavou/i, city: 'Kralupy nad Vltavou' },
      { pattern: /kadan/i, city: 'Kadan' },
      { pattern: /ceska lipa/i, city: 'Ceska Lipa' },
      { pattern: /litomerice/i, city: 'Litomerice' },
      { pattern: /usti nad labem/i, city: 'Usti nad Labem' },
    ];

    for (const { pattern, city } of cityPatterns) {
      if (pattern.test(venueLower)) {
        return city;
      }
    }

    return null;
  }

  /**
   * Extract city from URL path
   */
  extractCityFromUrl(url?: string): string | null {
    if (!url) return null;

    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.toLowerCase();

      // Common URL patterns: /brno/, /praha/, /ostrava/, etc.
      const cityPatterns = [
        { pattern: /\/brno\//i, city: 'Brno' },
        { pattern: /\/praha|prague\//i, city: 'Prague' },
        { pattern: /\/ostrava\//i, city: 'Ostrava' },
        { pattern: /\/olomouc\//i, city: 'Olomouc' },
        { pattern: /\/plzen|pilsen\//i, city: 'Plzen' },
        { pattern: /\/liberec\//i, city: 'Liberec' },
        { pattern: /\/ceske-budejovice|budweis\//i, city: 'Ceske Budejovice' },
        { pattern: /\/hradec-kralove\//i, city: 'Hradec Kralove' },
        { pattern: /\/pardubice\//i, city: 'Pardubice' },
        { pattern: /\/zlin\//i, city: 'Zlin' },
        { pattern: /\/karlovy-vary|karlsbad\//i, city: 'Karlovy Vary' },
      ];

      for (const { pattern, city } of cityPatterns) {
        if (pattern.test(path)) {
          return city;
        }
      }
    } catch {
      // Invalid URL, try simple pattern matching
      const cityPatterns = [
        { pattern: /\/brno\//i, city: 'Brno' },
        { pattern: /\/praha|prague\//i, city: 'Prague' },
        { pattern: /\/ostrava\//i, city: 'Ostrava' },
      ];

      for (const { pattern, city } of cityPatterns) {
        if (pattern.test(url)) {
          return city;
        }
      }
    }

    return null;
  }

  /**
   * Extract city from event title
   */
  extractCityFromTitle(title?: string): string | null {
    if (!title) return null;

    const titleLower = title.toLowerCase();

    const cityPatterns = [
      { pattern: /in prague|at prague|prague/i, city: 'Prague' },
      { pattern: /in brno|at brno|brno/i, city: 'Brno' },
      { pattern: /in ostrava|at ostrava|ostrava/i, city: 'Ostrava' },
      { pattern: /in olomouc|at olomouc|olomouc/i, city: 'Olomouc' },
      { pattern: /in plzen|at plzen|plzen|pilsen/i, city: 'Plzen' },
      { pattern: /v praze|v brne|v ostrave|v olomouci/i, city: 'Prague' }, // Czech: "v Praze" = "in Prague"
    ];

    for (const { pattern, city } of cityPatterns) {
      if (pattern.test(titleLower)) {
        // More specific patterns for Czech
        if (pattern.source.includes('v praze')) {
          if (/v praze/i.test(titleLower)) return 'Prague';
          if (/v brne/i.test(titleLower)) return 'Brno';
          if (/v ostrave/i.test(titleLower)) return 'Ostrava';
          if (/v olomouci/i.test(titleLower)) return 'Olomouc';
        }
        return city;
      }
    }

    return null;
  }

  /**
   * Extract city with fallback chain: venue → URL → title → source default
   */
  extractCityFallback(
    event: ScrapedEvent,
    sourceName: string,
    defaultCity?: string
  ): string {
    // If city already exists and is valid, return it
    if (event.city && event.city.trim().length > 0) {
      return event.city.trim();
    }

    // Try venue name
    const cityFromVenue = this.extractCityFromVenueName(event.venue);
    if (cityFromVenue) {
      return cityFromVenue;
    }

    // Try URL
    const cityFromUrl = this.extractCityFromUrl(event.url);
    if (cityFromUrl) {
      return cityFromUrl;
    }

    // Try title
    const cityFromTitle = this.extractCityFromTitle(event.title);
    if (cityFromTitle) {
      return cityFromTitle;
    }

    // Use default city if provided
    if (defaultCity) {
      return defaultCity;
    }

    // Last resort: infer from source domain
    if (sourceName.toLowerCase().includes('brno')) return 'Brno';
    if (sourceName.toLowerCase().includes('praha') || sourceName.toLowerCase().includes('prague')) return 'Prague';
    if (sourceName.toLowerCase().includes('ostrava')) return 'Ostrava';

    // Default fallback - return empty string (will be caught by validation)
    return '';
  }

  /**
   * Normalize source_id using URL hash instead of full title
   * Handles undefined date gracefully by using a fallback value
   */
  normalizeSourceId(sourceName: string, url: string | undefined, date: string | undefined): string {
    // Ensure date is a valid string - use fallback if undefined
    const dateForHash = date || 'no-date';
    
    // Use URL hash if available (most reliable)
    if (url) {
      try {
        const normalizedUrl = url.split('?')[0]; // Remove query params
        const hash = createHash('sha256')
          .update(`${sourceName}_${normalizedUrl}_${dateForHash}`)
          .digest('hex')
          .substring(0, 16); // Use first 16 chars of hash
        return `${sourceName}_${hash}`.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 100);
      } catch {
        // Fallback if URL parsing fails
      }
    }

    // Fallback: use date + short hash if URL not available
    const titleHash = createHash('sha256')
      .update(`${sourceName}_${dateForHash}`)
      .digest('hex')
      .substring(0, 16);
    return `${sourceName}_${titleHash}`.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 100);
  }

  /**
   * Clean venue name
   */
  cleanVenueName(venue?: string): string | undefined {
    if (!venue) return undefined;

    let cleaned = venue;

    // Remove common location suffixes that might be redundant
    cleaned = cleaned.replace(/\s*,\s*(Praha|Prague|Brno|Ostrava|Plzen|Olomouc).*$/i, '');
    cleaned = cleaned.replace(/\s*-\s*(Praha|Prague|Brno|Ostrava|Plzen|Olomouc).*$/i, '');

    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned || undefined;
  }

  /**
   * Clean entire event object
   */
  cleanEvent(event: ScrapedEvent, sourceName: string, defaultCity?: string): ScrapedEvent {
    return {
      ...event,
      title: this.cleanTitle(event.title),
      venue: this.cleanVenueName(event.venue),
      city: this.extractCityFallback(event, sourceName, defaultCity),
    };
  }
}

// Export singleton instance
export const eventCleaningService = new EventCleaningService();

