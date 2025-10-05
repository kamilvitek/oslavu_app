// src/lib/services/city-recognition.ts
import OpenAI from 'openai';

interface CityRecognitionResult {
  normalizedCity: string;
  confidence: number;
  alternatives: string[];
  isRecognized: boolean;
}

export class CityRecognitionService {
  private openai: OpenAI;

  constructor() {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.openai = new OpenAI({
      apiKey: openaiApiKey
    });
  }

  /**
   * Recognize and normalize city names using LLM
   * Handles typos, case variations, and alternative names
   */
  async recognizeCity(inputCity: string): Promise<CityRecognitionResult> {
    console.log(`🏙️ Recognizing city: "${inputCity}"`);
    
    try {
      const prompt = `You are a city recognition expert. Given an input city name, determine the most likely intended city and provide normalized alternatives.

Input: "${inputCity}"

Return a JSON object with this structure:
{
  "normalizedCity": "Standard city name (e.g., 'Prague', 'Brno', 'Vienna')",
  "confidence": 0.95,
  "alternatives": ["Alternative names", "Common variations"],
  "isRecognized": true
}

Guidelines:
- Handle typos, case variations, and alternative names
- For Czech cities, recognize both Czech and English names
- For international cities, use standard English names
- If the input is unclear or ambiguous, set isRecognized to false
- Provide confidence score (0-1) based on how certain you are
- Include common variations and alternative names in alternatives array

Examples:
- "prague" -> "Prague" (confidence: 0.95)
- "praha" -> "Prague" (confidence: 0.98)
- "brno" -> "Brno" (confidence: 0.95)
- "vienna" -> "Vienna" (confidence: 0.95)
- "wien" -> "Vienna" (confidence: 0.98)
- "xyz" -> isRecognized: false (confidence: 0.1)

Return only valid JSON.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at recognizing and normalizing city names. Always return valid JSON objects.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      const responseContent = response.choices[0]?.message?.content;
      if (!responseContent) {
        console.error(`❌ No response from OpenAI for city recognition: "${inputCity}"`);
        return this.createFallbackResult(inputCity);
      }

      console.log(`🤖 OpenAI city recognition response:`, responseContent);

      try {
        const result = JSON.parse(responseContent);
        
        // Validate the response structure
        if (typeof result.normalizedCity === 'string' && 
            typeof result.confidence === 'number' && 
            Array.isArray(result.alternatives) && 
            typeof result.isRecognized === 'boolean') {
          
          console.log(`✅ City recognized: "${inputCity}" -> "${result.normalizedCity}" (confidence: ${result.confidence})`);
          return result;
        } else {
          console.warn(`⚠️ Invalid response structure from OpenAI for city recognition: "${inputCity}"`);
          return this.createFallbackResult(inputCity);
        }
      } catch (parseError) {
        console.error(`❌ Failed to parse OpenAI response for city recognition:`, parseError);
        console.error(`❌ Raw response:`, responseContent);
        return this.createFallbackResult(inputCity);
      }

    } catch (error) {
      console.error(`❌ City recognition failed for "${inputCity}":`, error);
      return this.createFallbackResult(inputCity);
    }
  }

  /**
   * Create a fallback result when LLM recognition fails
   */
  private createFallbackResult(inputCity: string): CityRecognitionResult {
    const normalized = inputCity.trim();
    return {
      normalizedCity: normalized,
      confidence: 0.5,
      alternatives: [normalized],
      isRecognized: false
    };
  }

  /**
   * Batch recognize multiple cities
   */
  async recognizeCities(inputCities: string[]): Promise<CityRecognitionResult[]> {
    console.log(`🏙️ Batch recognizing ${inputCities.length} cities`);
    
    const results: CityRecognitionResult[] = [];
    
    // Process cities in parallel with rate limiting
    const batchSize = 5;
    for (let i = 0; i < inputCities.length; i += batchSize) {
      const batch = inputCities.slice(i, i + batchSize);
      const batchPromises = batch.map(city => this.recognizeCity(city));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Add small delay between batches to avoid rate limiting
        if (i + batchSize < inputCities.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`❌ Batch city recognition failed for batch starting at index ${i}:`, error);
        // Add fallback results for failed batch
        batch.forEach(city => results.push(this.createFallbackResult(city)));
      }
    }
    
    return results;
  }

  /**
   * Get city aliases for fuzzy matching
   */
  getCityAliases(normalizedCity: string): string[] {
    const aliases: string[] = [normalizedCity.toLowerCase()];
    
    // Add common variations for major cities
    const cityVariations: Record<string, string[]> = {
      'Prague': ['praha', 'prag', 'praque'],
      'Brno': ['brunn', 'brun'],
      'Vienna': ['wien', 'vienne', 'bécs'],
      'Berlin': ['berlín', 'berlim'],
      'Munich': ['münchen', 'monaco', 'monaco di baviera'],
      'Amsterdam': ['amstardam', 'amsterdam'],
      'Paris': ['paris', 'parís'],
      'London': ['londres', 'londýn'],
      'Rome': ['roma', 'rom'],
      'Madrid': ['madrid', 'madrit'],
      'Barcelona': ['barcelona', 'barcelone'],
      'Milan': ['milan', 'milano'],
      'Florence': ['firenze', 'florenz'],
      'Venice': ['venezia', 'venedig'],
      'Budapest': ['budapest', 'budimpešta'],
      'Warsaw': ['warszawa', 'varšava'],
      'Krakow': ['kraków', 'krakov'],
      'Bratislava': ['bratislava', 'pressburg'],
      'Ljubljana': ['ljubljana', 'laibach'],
      'Zagreb': ['zagreb', 'agrab'],
      'Sofia': ['sofia', 'sofija'],
      'Bucharest': ['bucharest', 'bucurești'],
      'Istanbul': ['istanbul', 'constantinople'],
      'Athens': ['athens', 'athény'],
      'Lisbon': ['lisbon', 'lisboa'],
      'Porto': ['porto', 'oporto'],
      'Dublin': ['dublin', 'baile átha cliath'],
      'Edinburgh': ['edinburgh', 'dún éideann'],
      'Glasgow': ['glasgow', 'glaschu'],
      'Manchester': ['manchester', 'manc'],
      'Liverpool': ['liverpool', 'liverpudlian'],
      'Birmingham': ['birmingham', 'brum'],
      'Leeds': ['leeds', 'leodis'],
      'Newcastle': ['newcastle', 'newcastle upon tyne'],
      'Bristol': ['bristol', 'brizzle'],
      'Cardiff': ['cardiff', 'caerdydd'],
      'Belfast': ['belfast', 'béal feirste'],
      'Copenhagen': ['copenhagen', 'københavn'],
      'Stockholm': ['stockholm', 'stockholms'],
      'Oslo': ['oslo', 'christiania'],
      'Helsinki': ['helsinki', 'helsingfors'],
      'Tallinn': ['tallinn', 'reval'],
      'Riga': ['riga', 'rīga'],
      'Vilnius': ['vilnius', 'wilno'],
      'Moscow': ['moscow', 'moskva'],
      'Saint Petersburg': ['saint petersburg', 'sankt peterburg', 'leningrad'],
      'Kiev': ['kiev', 'kyiv', 'kyjev'],
      'Minsk': ['minsk', 'miensk'],
      'Riga': ['riga', 'rīga'],
      'Vilnius': ['vilnius', 'wilno'],
      'Warsaw': ['warsaw', 'warszawa', 'varšava'],
      'Krakow': ['krakow', 'kraków', 'krakov'],
      'Gdansk': ['gdansk', 'gdańsk', 'danzig'],
      'Wroclaw': ['wroclaw', 'wrocław', 'breslau'],
      'Poznan': ['poznan', 'poznań', 'posen'],
      'Lodz': ['lodz', 'łódź', 'lodsch'],
      'Katowice': ['katowice', 'kattowitz'],
      'Lublin': ['lublin', 'lublin'],
      'Bialystok': ['bialystok', 'białystok', 'belostok'],
      'Szczecin': ['szczecin', 'stettin'],
      'Bydgoszcz': ['bydgoszcz', 'bromberg'],
      'Lublin': ['lublin', 'lublin'],
      'Rzeszow': ['rzeszow', 'rzeszów', 'reshov'],
      'Kielce': ['kielce', 'kielce'],
      'Olsztyn': ['olsztyn', 'allenstein'],
      'Zielona Gora': ['zielona gora', 'zielona góra', 'grünberg'],
      'Opole': ['opole', 'oppeln'],
      'Gorzow Wielkopolski': ['gorzow wielkopolski', 'gorzów wielkopolski', 'landsberg'],
      'Elblag': ['elblag', 'elbląg', 'elbing'],
      'Plock': ['plock', 'płock', 'plock'],
      'Walbrzych': ['walbrzych', 'wałbrzych', 'waldenburg'],
      'Wloclawek': ['wloclawek', 'włocławek', 'leslau'],
      'Tarnów': ['tarnów', 'tarnow', 'tarnau'],
      'Chorzów': ['chorzów', 'chorzow', 'königshütte'],
      'Kalisz': ['kalisz', 'kalisz', 'kalisch'],
      'Koszalin': ['koszalin', 'koszalin', 'köslin'],
      'Legnica': ['legnica', 'legnica', 'liegnitz'],
      'Grudziadz': ['grudziadz', 'grudziądz', 'graudenz'],
      'Slupsk': ['slupsk', 'słupsk', 'stolp'],
      'Jaworzno': ['jaworzno', 'jaworzno', 'jaworzno'],
      'Jastrzebie-Zdroj': ['jastrzebie-zdroj', 'jastrzębie-zdrój', 'jastrzebie-zdroj'],
      'Jelenia Gora': ['jelenia gora', 'jelenia góra', 'hirschberg'],
      'Nowy Sacz': ['nowy sacz', 'nowy sącz', 'neu sandez'],
      'Jaworzno': ['jaworzno', 'jaworzno', 'jaworzno'],
      'Jastrzebie-Zdroj': ['jastrzebie-zdroj', 'jastrzębie-zdrój', 'jastrzebie-zdroj'],
      'Jelenia Gora': ['jelenia gora', 'jelenia góra', 'hirschberg'],
      'Nowy Sacz': ['nowy sacz', 'nowy sącz', 'neu sandez'],
      'Jaworzno': ['jaworzno', 'jaworzno', 'jaworzno'],
      'Jastrzebie-Zdroj': ['jastrzebie-zdroj', 'jastrzębie-zdrój', 'jastrzebie-zdroj'],
      'Jelenia Gora': ['jelenia gora', 'jelenia góra', 'hirschberg'],
      'Nowy Sacz': ['nowy sacz', 'nowy sącz', 'neu sandez']
    };
    
    const variations = cityVariations[normalizedCity] || [];
    aliases.push(...variations.map(v => v.toLowerCase()));
    
    return [...new Set(aliases)]; // Remove duplicates
  }
}

// Export singleton instance
export const cityRecognitionService = new CityRecognitionService();
