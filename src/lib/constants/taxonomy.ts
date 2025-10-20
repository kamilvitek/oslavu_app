// Unified event taxonomy with synonyms for AI-first normalization
export const UNIFIED_TAXONOMY = {
  'Entertainment': {
    primary: 'Entertainment',
    synonyms: [
      'Entertainment', 'Entertainment & Nightlife', 'Nightlife', 'Fun',
      'Hudba', 'Zábava', 'Kultura', 'Kulturní', 'Zábavní',
      'Music', 'Concerts', 'Live Music', 'Musical Events',
      'Arts & Culture', 'Arts & Theatre', 'Arts', 'Culture', 'Cultural',
      'Performing Arts', 'Theatre', 'Theater', 'Drama', 'Dance',
      'Comedy', 'Stand-up', 'Humor', 'Comedy Shows',
      'Film', 'Cinema', 'Movies', 'Film Events', 'Screenings',
      'Festivals', 'Music Festivals', 'Cultural Festivals',
      'Parties', 'Social Events', 'Community Events'
    ],
    providerMappings: {
      ticketmaster: ['Music', 'Arts & Theatre', 'Film'],
      predicthq: ['concerts', 'nightlife', 'performing-arts', 'festivals'],
      scraped: ['Hudba', 'Zábava', 'Kultura', 'Divadlo', 'Humor']
    }
  },
  'Sports': {
    primary: 'Sports',
    synonyms: [
      'Sports', 'Sport', 'Athletic', 'Fitness', 'Exercise',
      'Sportovní', 'Sport', 'Atletika', 'Fitness',
      'Football', 'Soccer', 'Basketball', 'Tennis', 'Hockey',
      'Championship', 'Tournament', 'League', 'Match', 'Game',
      'Fotbal', 'Basketbal', 'Tenis', 'Hokej', 'Liga'
    ],
    providerMappings: {
      ticketmaster: ['Sports'],
      predicthq: ['sports'],
      scraped: ['Sport', 'Sportovní']
    }
  },
  'Business': {
    primary: 'Business',
    synonyms: [
      'Business', 'Professional', 'Corporate', 'Enterprise',
      'Obchodní', 'Profesionální', 'Korporátní',
      'Conferences', 'Meetings', 'Seminars', 'Workshops',
      'Networking', 'Professional Development', 'Training',
      'Konference', 'Semináře', 'Workshopy', 'Setkání'
    ],
    providerMappings: {
      ticketmaster: ['Business'],
      predicthq: ['conferences'],
      scraped: ['Obchodní', 'Profesionální', 'Konference']
    }
  },
  'Technology': {
    primary: 'Technology',
    synonyms: [
      'Technology', 'Tech', 'Digital', 'Software', 'IT',
      'Technologie', 'Tech', 'Digitální', 'Software',
      'AI', 'Artificial Intelligence', 'Machine Learning',
      'Programming', 'Coding', 'Development', 'Startup',
      'Innovation', 'Digital Transformation'
    ],
    providerMappings: {
      ticketmaster: ['Technology'],
      predicthq: ['conferences'], // Tech events often categorized as conferences
      scraped: ['Technologie', 'Tech', 'IT']
    }
  },
  'Education': {
    primary: 'Education',
    synonyms: [
      'Education', 'Learning', 'Training', 'Academic',
      'Vzdělávání', 'Učení', 'Školení', 'Akademické',
      'Courses', 'Workshops', 'Seminars', 'Lectures',
      'Kurzy', 'Workshopy', 'Semináře', 'Přednášky'
    ],
    providerMappings: {
      ticketmaster: ['Education'],
      predicthq: ['academic'],
      scraped: ['Vzdělávání', 'Školení', 'Kurzy']
    }
  },
  'Healthcare': {
    primary: 'Healthcare',
    synonyms: [
      'Healthcare', 'Medical', 'Health', 'Clinical',
      'Zdravotnictví', 'Lékařské', 'Zdraví', 'Klinické',
      'Medical Conferences', 'Health Seminars', 'Clinical Training',
      'Lékařské konference', 'Zdravotní semináře'
    ],
    providerMappings: {
      ticketmaster: ['Healthcare'],
      predicthq: ['conferences'],
      scraped: ['Zdravotnictví', 'Lékařské']
    }
  },
  'Finance': {
    primary: 'Finance',
    synonyms: [
      'Finance', 'Financial', 'Banking', 'Investment',
      'Finanční', 'Bankovnictví', 'Investice',
      'Financial Services', 'Investment Banking',
      'Finanční služby', 'Bankovní služby'
    ],
    providerMappings: {
      ticketmaster: ['Finance'],
      predicthq: ['conferences'],
      scraped: ['Finanční', 'Bankovnictví']
    }
  }
} as const;

export type TaxonomyCategory = keyof typeof UNIFIED_TAXONOMY;

// Helper functions for category normalization
export function getCategorySynonyms(category: string): string[] {
  const normalizedCategory = Object.keys(UNIFIED_TAXONOMY).find(
    key => key.toLowerCase() === category.toLowerCase()
  ) as TaxonomyCategory;
  
  if (normalizedCategory) {
    return [...UNIFIED_TAXONOMY[normalizedCategory].synonyms];
  }
  
  return [category]; // Return original if not found
}

export function normalizeCategory(inputCategory: string): string {
  const lowerInput = inputCategory.toLowerCase().trim();
  
  for (const [primary, config] of Object.entries(UNIFIED_TAXONOMY)) {
    if (config.synonyms.some(synonym => 
      synonym.toLowerCase() === lowerInput
    )) {
      return primary;
    }
  }
  
  return inputCategory; // Return original if no match
}

export function getProviderCategories(category: string, provider: 'ticketmaster' | 'predicthq' | 'scraped'): string[] {
  const normalizedCategory = normalizeCategory(category);
  const config = UNIFIED_TAXONOMY[normalizedCategory as TaxonomyCategory];
  
  if (config && config.providerMappings[provider]) {
    return [...config.providerMappings[provider]];
  }
  
  return [category]; // Fallback to original
}
