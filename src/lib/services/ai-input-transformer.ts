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
  postalCode?: string;
  classificationName?: string;
  keyword?: string;
  radius?: string;
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
    
    // Map category to Ticketmaster classification - use undefined for better broader search
    const categoryMap: Record<string, string | undefined> = {
      'Technology': undefined, // Business events are often better found with broader search
      'Business': undefined,   // Business events vary widely in classification
      'Marketing': undefined,  // Marketing events could be in various segments
      'Finance': undefined,    // Finance events could be in various segments
      'Conferences': undefined, // Conferences span multiple segments
      'Entertainment': 'Arts & Theatre',
      'Arts & Culture': 'Arts & Theatre',
      'Music': 'Music',
      'Sports': 'Sports',
      'Film': 'Film',
      'Movies': 'Film',
      'Theater': 'Arts & Theatre',
      'Theatre': 'Arts & Theatre',
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
    
    // Generate keywords for better search - more specific and effective
    let keyword = undefined;
    if (params.category === 'Technology') {
      keyword = 'tech conference summit innovation startup digital';
    } else if (params.category === 'Business') {
      keyword = 'business conference summit networking professional';
    } else if (params.category === 'Marketing') {
      keyword = 'marketing conference summit advertising digital';
    } else if (params.category === 'Finance') {
      keyword = 'finance conference summit fintech banking investment';
    } else if (params.category === 'Conferences') {
      keyword = 'conference summit symposium meeting professional';
    } else if (params.category === 'Education') {
      keyword = 'education conference summit academic learning';
    } else if (params.category === 'Healthcare') {
      keyword = 'medical conference summit healthcare health';
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

}

export const aiInputTransformerService = new AIInputTransformerService();
