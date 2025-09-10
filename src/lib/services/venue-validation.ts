// src/lib/services/venue-validation.ts
export interface VenueSuggestion {
  name: string;
  confidence: number;
  reason: string;
}

export interface VenueValidationResult {
  isValid: boolean;
  suggestions: VenueSuggestion[];
  normalizedName?: string;
  warnings: string[];
}

export class VenueValidationService {
  private readonly commonVenues: Record<string, string[]> = {
    'prague': [
      'prague conference centre', 'prague conference center', 'prague congress centre',
      'prague castle', 'prague exhibition grounds', 'prague hotel', 'prague university',
      'charles university', 'czech technical university', 'prague city hall',
      'national theatre', 'state opera', 'rudolfinum', 'forum karlin',
      'prague marriott', 'hilton prague', 'intercontinental prague'
    ],
    'london': [
      'excel london', 'olympia london', 'barbican centre', 'royal festival hall',
      'southbank centre', 'london convention centre', 'business design centre',
      'london marriott', 'hilton london', 'intercontinental london',
      'london university', 'imperial college', 'lse', 'ucl'
    ],
    'berlin': [
      'messe berlin', 'berlin congress centre', 'berlin exhibition grounds',
      'berlin university', 'humboldt university', 'free university berlin',
      'berlin marriott', 'hilton berlin', 'intercontinental berlin'
    ],
    'paris': [
      'porte de versailles', 'paris expo', 'palais des congrès',
      'sorbonne', 'paris university', 'paris marriott', 'hilton paris'
    ],
    'amsterdam': [
      'rai amsterdam', 'amsterdam convention centre', 'amsterdam university',
      'amsterdam marriott', 'hilton amsterdam'
    ]
  };

  /**
   * Validate and suggest corrections for venue input
   */
  validateVenue(venueInput: string, city: string): VenueValidationResult {
    const normalizedInput = venueInput.toLowerCase().trim();
    const cityKey = city.toLowerCase();
    
    if (!normalizedInput) {
      return {
        isValid: false,
        suggestions: [],
        warnings: ['Venue name is required']
      };
    }

    const suggestions: VenueSuggestion[] = [];
    const warnings: string[] = [];
    let normalizedName: string | undefined;

    // Check for exact matches
    const cityVenues = this.commonVenues[cityKey] || [];
    const exactMatch = cityVenues.find(venue => 
      venue.toLowerCase() === normalizedInput
    );

    if (exactMatch) {
      return {
        isValid: true,
        suggestions: [],
        normalizedName: exactMatch,
        warnings: []
      };
    }

    // Check for partial matches and typos
    for (const venue of cityVenues) {
      const similarity = this.calculateSimilarity(normalizedInput, venue.toLowerCase());
      
      if (similarity > 0.7) {
        suggestions.push({
          name: venue,
          confidence: similarity,
          reason: this.getSuggestionReason(normalizedInput, venue.toLowerCase(), similarity)
        });
      }
    }

    // Sort suggestions by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);

    // Check for common typos
    const typoCorrections = this.checkCommonTypos(normalizedInput, cityVenues);
    suggestions.push(...typoCorrections);

    // Remove duplicates and sort again
    const uniqueSuggestions = this.removeDuplicateSuggestions(suggestions);
    uniqueSuggestions.sort((a, b) => b.confidence - a.confidence);

    // Add warnings for potential issues
    if (normalizedInput.length < 3) {
      warnings.push('Venue name seems too short');
    }

    if (normalizedInput.length > 100) {
      warnings.push('Venue name seems too long');
    }

    if (!/^[a-zA-Z0-9\s\-&.,()]+$/.test(normalizedInput)) {
      warnings.push('Venue name contains unusual characters');
    }

    // Check if it looks like a generic input
    if (this.isGenericInput(normalizedInput)) {
      warnings.push('Please provide a specific venue name');
    }

    return {
      isValid: suggestions.length > 0 && suggestions[0].confidence > 0.8,
      suggestions: uniqueSuggestions.slice(0, 3), // Top 3 suggestions
      normalizedName: suggestions.length > 0 && suggestions[0].confidence > 0.9 
        ? suggestions[0].name 
        : undefined,
      warnings
    };
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Get reason for suggestion
   */
  private getSuggestionReason(input: string, suggestion: string, confidence: number): string {
    if (confidence > 0.9) {
      return 'Exact match found';
    } else if (confidence > 0.8) {
      return 'Very similar venue name';
    } else if (confidence > 0.7) {
      return 'Possible match with minor differences';
    } else {
      return 'Similar venue name';
    }
  }

  /**
   * Check for common typos and provide corrections
   */
  private checkCommonTypos(input: string, venues: string[]): VenueSuggestion[] {
    const suggestions: VenueSuggestion[] = [];
    
    // Common typo patterns
    const typoPatterns = [
      { pattern: /centre/g, replacement: 'center' },
      { pattern: /center/g, replacement: 'centre' },
      { pattern: /university/g, replacement: 'univercity' },
      { pattern: /conference/g, replacement: 'conferance' },
      { pattern: /exhibition/g, replacement: 'exibition' }
    ];

    for (const pattern of typoPatterns) {
      const corrected = input.replace(pattern.pattern, pattern.replacement);
      if (corrected !== input) {
        for (const venue of venues) {
          const similarity = this.calculateSimilarity(corrected, venue.toLowerCase());
          if (similarity > 0.8) {
            suggestions.push({
              name: venue,
              confidence: similarity,
              reason: `Corrected typo: "${pattern.pattern}" → "${pattern.replacement}"`
            });
          }
        }
      }
    }

    return suggestions;
  }

  /**
   * Remove duplicate suggestions
   */
  private removeDuplicateSuggestions(suggestions: VenueSuggestion[]): VenueSuggestion[] {
    const seen = new Set<string>();
    return suggestions.filter(suggestion => {
      if (seen.has(suggestion.name)) {
        return false;
      }
      seen.add(suggestion.name);
      return true;
    });
  }

  /**
   * Check if input looks generic
   */
  private isGenericInput(input: string): boolean {
    const genericPatterns = [
      /^venue$/i,
      /^location$/i,
      /^place$/i,
      /^hall$/i,
      /^room$/i,
      /^building$/i,
      /^center$/i,
      /^centre$/i,
      /^conference$/i,
      /^hotel$/i
    ];

    return genericPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Get popular venues for a city
   */
  getPopularVenues(city: string): string[] {
    const cityKey = city.toLowerCase();
    return this.commonVenues[cityKey] || [];
  }

  /**
   * Add a new venue to the database
   */
  addVenue(city: string, venueName: string): void {
    const cityKey = city.toLowerCase();
    if (!this.commonVenues[cityKey]) {
      this.commonVenues[cityKey] = [];
    }
    
    if (!this.commonVenues[cityKey].includes(venueName)) {
      this.commonVenues[cityKey].push(venueName);
    }
  }
}

export const venueValidationService = new VenueValidationService();
