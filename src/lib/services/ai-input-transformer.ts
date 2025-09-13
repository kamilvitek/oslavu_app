// src/lib/services/ai-input-transformer.ts
import { OpenAI } from 'openai';

interface TransformationParams {
  city: string;
  category: string;
  subcategory?: string;
  startDate: string;
  endDate: string;
  expectedAttendees?: number;
  venue?: string;
}

interface TicketmasterTransformation {
  city: string;
  countryCode?: string;
  marketId?: string;
  postalCode?: string;
  classificationName?: string;
  keyword?: string;
  radius?: string;
}

interface EventbriteTransformation {
  location: string;
  categories?: string;
  subcategories?: string;
  q?: string; // search query
  location_radius?: string;
}

export class AIInputTransformerService {
  private openai: OpenAI | null = null;
  private isAvailable = false;

  constructor() {
    try {
      if (process.env.OPENAI_API_KEY) {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        this.isAvailable = true;
        console.log('✅ OpenAI API initialized successfully');
      } else {
        console.warn('⚠️ OpenAI API key not found - using fallback transformations');
      }
    } catch (error) {
      console.error('❌ Error initializing OpenAI API:', error);
      console.warn('⚠️ Falling back to rule-based transformations');
    }
  }

  public isOpenAIAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Transform user inputs to be optimized for Ticketmaster API
   */
  async transformForTicketmaster(params: TransformationParams): Promise<TicketmasterTransformation> {
    if (!this.isAvailable || !this.openai) {
      console.log('🔧 Using fallback transformation for Ticketmaster (OpenAI not available)');
      return this.fallbackTicketmasterTransformation(params);
    }

    try {
      console.log('🤖 Using AI to transform inputs for Ticketmaster API');
      
      const prompt = `Transform the following event search parameters to be optimized for the Ticketmaster Discovery API:

Input Parameters:
- City: ${params.city}
- Category: ${params.category}
- Subcategory: ${params.subcategory || 'None'}
- Expected Attendees: ${params.expectedAttendees || 'Unknown'}
- Venue: ${params.venue || 'None'}
- Date Range: ${params.startDate} to ${params.endDate}

Please provide a JSON response with optimized parameters for Ticketmaster API:
{
  "city": "optimized city name (use English names for major cities)",
  "countryCode": "ISO country code (e.g., US, GB, DE, CZ)",
  "classificationName": "Ticketmaster classification (Music, Sports, Arts & Theatre, Film, Miscellaneous, or null for broader search)",
  "keyword": "additional search keywords to improve results (optional)",
  "radius": "search radius in miles (25, 50, 100, or 150)",
  "marketId": "Ticketmaster market ID if applicable (optional)"
}

Guidelines:
- Use standard English city names (Prague instead of Praha, Munich instead of München)
- Map categories to Ticketmaster's classification system: Technology/Business → Miscellaneous, Entertainment → Arts & Theatre, Music → Music, Sports → Sports
- For professional/business events, use broader search without classification
- Increase radius for smaller cities or niche categories
- Add relevant keywords for better discovery

Respond with only valid JSON.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at optimizing API search parameters. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const transformed = JSON.parse(response) as TicketmasterTransformation;
      console.log('🤖 AI-transformed Ticketmaster params:', transformed);
      
      return transformed;
    } catch (error) {
      console.error('🤖 Error in AI transformation for Ticketmaster:', error);
      console.log('🤖 Falling back to rule-based transformation');
      return this.fallbackTicketmasterTransformation(params);
    }
  }

  /**
   * Transform user inputs to be optimized for Eventbrite API
   */
  async transformForEventbrite(params: TransformationParams): Promise<EventbriteTransformation> {
    if (!this.isAvailable || !this.openai) {
      console.log('🔧 Using fallback transformation for Eventbrite (OpenAI not available)');
      return this.fallbackEventbriteTransformation(params);
    }

    try {
      console.log('🤖 Using AI to transform inputs for Eventbrite API');
      
      const prompt = `Transform the following event search parameters to be optimized for the Eventbrite API:

Input Parameters:
- City: ${params.city}
- Category: ${params.category}
- Subcategory: ${params.subcategory || 'None'}
- Expected Attendees: ${params.expectedAttendees || 'Unknown'}
- Venue: ${params.venue || 'None'}
- Date Range: ${params.startDate} to ${params.endDate}

Please provide a JSON response with optimized parameters for Eventbrite API:
{
  "location": "city name with country if needed for clarity",
  "categories": "Eventbrite category ID (101=Business, 102=Technology, 103=Music, 105=Arts, 108=Health, 110=Education, or null)",
  "q": "search query with relevant keywords",
  "location_radius": "search radius (25km, 50km, 100km, or 200km)"
}

Eventbrite Category Mapping:
- Business/Professional/Marketing/Finance → 101
- Technology/Science → 102  
- Music → 103
- Entertainment/Film → 104
- Arts & Culture → 105
- Sports/Health/Wellness → 108
- Education/Academic → 110
- Other → null (broader search)

Guidelines:
- Use clear location names (add country if city name is ambiguous)
- Map categories to Eventbrite's numeric IDs
- Create search queries that include synonyms and related terms
- Use larger radius for smaller cities or niche categories
- For business events, include terms like "conference", "networking", "professional"

Respond with only valid JSON.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at optimizing API search parameters. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const transformed = JSON.parse(response) as EventbriteTransformation;
      console.log('🤖 AI-transformed Eventbrite params:', transformed);
      
      return transformed;
    } catch (error) {
      console.error('🤖 Error in AI transformation for Eventbrite:', error);
      console.log('🤖 Falling back to rule-based transformation');
      return this.fallbackEventbriteTransformation(params);
    }
  }

  /**
   * Fallback transformation for Ticketmaster (rule-based)
   */
  private fallbackTicketmasterTransformation(params: TransformationParams): TicketmasterTransformation {
    console.log('🔧 Using rule-based transformation for Ticketmaster');
    
    // Normalize city name
    const cityMap: Record<string, string> = {
      'praha': 'Prague',
      'brno': 'Brno',
      'münchen': 'Munich',
      'köln': 'Cologne',
      'wien': 'Vienna',
    };
    
    const normalizedCity = cityMap[params.city.toLowerCase()] || params.city;
    
    // Get country code
    const countryMap: Record<string, string> = {
      'prague': 'CZ',
      'brno': 'CZ',
      'ostrava': 'CZ',
      'london': 'GB',
      'berlin': 'DE',
      'munich': 'DE',
      'paris': 'FR',
      'amsterdam': 'NL',
      'vienna': 'AT',
    };
    
    const countryCode = countryMap[normalizedCity.toLowerCase()];
    
    // Map category to Ticketmaster classification
    const categoryMap: Record<string, string | undefined> = {
      'Technology': 'Miscellaneous',
      'Business': 'Miscellaneous',
      'Marketing': 'Miscellaneous',
      'Finance': 'Miscellaneous',
      'Entertainment': 'Arts & Theatre',
      'Arts & Culture': 'Arts & Theatre',
      'Music': 'Music',
      'Sports': 'Sports',
      'Other': undefined,
    };
    
    const classificationName = categoryMap[params.category];
    
    // Determine radius based on city size and category
    let radius = '50';
    if (['Prague', 'London', 'Berlin', 'Paris'].includes(normalizedCity)) {
      radius = '25'; // Smaller radius for major cities
    } else if (params.category === 'Technology' || params.category === 'Business') {
      radius = '100'; // Larger radius for business events
    }
    
    // Generate keywords for better search
    let keyword = undefined;
    if (params.category === 'Technology') {
      keyword = 'tech conference summit';
    } else if (params.category === 'Business') {
      keyword = 'business conference networking';
    } else if (params.subcategory) {
      keyword = params.subcategory;
    }
    
    return {
      city: normalizedCity,
      countryCode,
      classificationName,
      keyword,
      radius,
    };
  }

  /**
   * Fallback transformation for Eventbrite (rule-based)
   */
  private fallbackEventbriteTransformation(params: TransformationParams): EventbriteTransformation {
    console.log('🔧 Using rule-based transformation for Eventbrite');
    
    // Normalize location
    let location = params.city;
    const czechCities = ['prague', 'brno', 'ostrava', 'olomouc'];
    if (czechCities.includes(params.city.toLowerCase())) {
      location = `${params.city}, Czech Republic`;
    }
    
    // Map category to Eventbrite category ID
    const categoryMap: Record<string, string | undefined> = {
      'Technology': '102',
      'Business': '101',
      'Marketing': '101',
      'Finance': '101',
      'Entertainment': '103',
      'Arts & Culture': '105',
      'Music': '103',
      'Sports': '108',
      'Education': '110',
      'Other': undefined,
    };
    
    const categories = categoryMap[params.category];
    
    // Generate search query
    let q = params.category.toLowerCase();
    if (params.subcategory) {
      q += ` ${params.subcategory.toLowerCase()}`;
    }
    if (params.category === 'Technology') {
      q += ' conference tech summit';
    } else if (params.category === 'Business') {
      q += ' conference networking professional';
    }
    
    // Determine radius
    let location_radius = '50km';
    if (params.category === 'Technology' || params.category === 'Business') {
      location_radius = '100km'; // Larger radius for business events
    }
    
    return {
      location,
      categories,
      q,
      location_radius,
    };
  }
}

export const aiInputTransformerService = new AIInputTransformerService();
