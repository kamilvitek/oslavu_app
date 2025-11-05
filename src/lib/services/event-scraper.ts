// src/lib/services/event-scraper.ts
import { Event } from '@/types';
import { CreateEventData } from '@/lib/types/events';
import { dataTransformer } from './data-transformer';
import { eventStorageService } from './event-storage';
import { serverDatabaseService } from '@/lib/supabase';
import FirecrawlApp from '@mendable/firecrawl-js';
import OpenAI from 'openai';

interface ScraperSource {
  id: string;
  name: string;
  url: string;
  type: 'firecrawl' | 'agentql' | 'api';
  enabled: boolean;
  config: Record<string, any>;
  last_scraped_at?: string;
}

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

interface ScraperResult {
  created: number;
  skipped: number;
  errors: string[];
}

export class EventScraperService {
  private firecrawl: FirecrawlApp;
  private openai: OpenAI;
  private db = serverDatabaseService;
  
  // Enhanced rate limiting properties
  private lastRequestTime = 0;
  private readonly minRequestInterval = 8000; // 8 seconds = 7.5 requests per minute (more conservative)
  private requestCount = 0;
  private dailyRequestLimit = 50; // More conservative daily limit for Czech sources
  private readonly czechSourceDelay = 12000; // 12 seconds for Czech sources (Kudyznudy)

  constructor() {
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!firecrawlApiKey) {
      console.warn('🔍 Firecrawl API key not configured - web scraping will be disabled');
    }
    
    if (!openaiApiKey) {
      console.warn('🤖 OpenAI API key not configured - AI extraction will be disabled');
    }
    
    this.firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey });
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    
    console.log('🔍 EventScraperService initialized:', {
      firecrawlConfigured: !!firecrawlApiKey,
      openaiConfigured: !!openaiApiKey
    });
  }

  /**
   * Scrape events from a specific source
   */
  async scrapeSource(sourceId: string): Promise<CreateEventData[]> {
    console.log(`🔍 Scraping source: ${sourceId}`);
    
    try {
      // Get source configuration
      const source = await this.getScraperSource(sourceId);
      if (!source) {
        throw new Error(`Source not found: ${sourceId}`);
      }
      
      if (!source.enabled) {
        console.log(`🔍 Source ${sourceId} is disabled, skipping`);
        return [];
      }
      
      // Start sync log
      const syncLogId = await this.startSyncLog(source.name);
      
      try {
        let events: CreateEventData[] = [];
        
        switch (source.type) {
          case 'firecrawl':
            events = await this.scrapeWithFirecrawl(source);
            break;
          case 'agentql':
            events = await this.scrapeWithAgentQL(source);
            break;
          case 'api':
            events = await this.scrapeWithAPI(source);
            break;
          default:
            throw new Error(`Unsupported scraper type: ${source.type}`);
        }
        
        // Process and store events
        const result = await this.processScrapedEvents(events, source.name);
        
        // Complete sync log
        await this.completeSyncLog(syncLogId, 'success', {
          events_processed: events.length,
          events_created: result.created,
          events_skipped: result.skipped,
          errors: result.errors
        });
        
        console.log(`✅ Scraped ${events.length} events from ${source.name} (${result.created} created, ${result.skipped} skipped)`);
        return events;
        
      } catch (error) {
        // Mark sync log as failed
        await this.completeSyncLog(syncLogId, 'error', {
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
        throw error;
      }
      
    } catch (error) {
      console.error(`❌ Error scraping source ${sourceId}:`, error);
      throw error;
    }
  }

  /**
   * Scrape all enabled sources
   */
  async scrapeAllSources(): Promise<ScraperResult> {
    console.log('🔍 Starting scrape of all enabled sources');
    
    const result: ScraperResult = {
      created: 0,
      skipped: 0,
      errors: []
    };
    
    try {
      const sources = await this.getEnabledSources();
      console.log(`🔍 Found ${sources.length} enabled sources`);
      
      for (const source of sources) {
        try {
          console.log(`🔍 Scraping source: ${source.name}`);
          const events = await this.scrapeSource(source.id);
          
          // Count results
          const eventsToStore = events.filter(event => {
            const validation = dataTransformer.validateEventData(event);
            return validation.isValid;
          });
          
          result.created += eventsToStore.length;
          result.skipped += events.length - eventsToStore.length;
          
        } catch (error) {
          const errorMessage = `Failed to scrape ${source.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(`❌ ${errorMessage}`);
          result.errors.push(errorMessage);
        }
      }
      
      console.log(`✅ Scraping completed: ${result.created} created, ${result.skipped} skipped, ${result.errors.length} errors`);
      return result;
      
    } catch (error) {
      console.error('❌ Error in scrapeAllSources:', error);
      result.errors.push(`Scrape all sources failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Scrape events using Firecrawl
   * Uses crawlUrl for multi-page sites to discover all events
   */
  private async scrapeWithFirecrawl(source: ScraperSource): Promise<CreateEventData[]> {
    console.log(`🔍 Scraping with Firecrawl: ${source.url}`);
    
    try {
      // Rate limiting with source-specific delays
      await this.enforceRateLimit(source.name);
      
      // Check if source config prefers crawling for multi-page sites
      let useCrawl = source.config.useCrawl !== false; // Default to true for better coverage
      const maxPages = source.config.maxPages || 20; // Limit pages to avoid excessive costs
      
      let markdown = '';
      let crawlFailed = false;
      
      if (useCrawl) {
        // Use crawlUrl for better multi-page coverage
        console.log(`🔍 Starting crawl for ${source.url} (max ${maxPages} pages)`);
        
        try {
          // Type assertion to access crawlUrl method
          const firecrawlAny = this.firecrawl as any;
          const crawlResult: any = await firecrawlAny.crawlUrl(source.url, {
            limit: maxPages,
            maxDepth: source.config.maxDepth || 2,
            scrapeOptions: {
              formats: ['markdown'],
              onlyMainContent: source.config.onlyMainContent !== false,
              waitFor: source.config.waitFor || 3000, // Increased wait time for dynamic content
              timeout: 90000
            }
          }, 2000); // Poll every 2 seconds
          
          // Check if crawlResult is an error response
          if (crawlResult && crawlResult.success === false) {
            console.warn(`⚠️ Crawl returned error for ${source.url}:`, crawlResult.error || crawlResult.message);
            crawlFailed = true;
          } else if (crawlResult && crawlResult.status === 'completed' && crawlResult.data) {
            console.log(`🔍 Crawl result for ${source.url}:`, {
              status: crawlResult.status,
              completed: crawlResult.completed,
              total: crawlResult.total,
              creditsUsed: crawlResult.creditsUsed
            });
            // Combine markdown from all crawled pages
            const allPages = Array.isArray(crawlResult.data) ? crawlResult.data : [crawlResult.data];
            markdown = allPages
              .map((page: any) => page.markdown || '')
              .filter((md: string) => md.length > 0)
              .join('\n\n---PAGE BREAK---\n\n');
            
            console.log(`🔍 Crawled ${allPages.length} pages, total markdown length: ${markdown.length}`);
            
            if (markdown.length === 0) {
              console.warn(`⚠️ Crawl completed but no markdown content extracted from ${source.url}`);
              crawlFailed = true; // Try fallback scrape
            }
          } else if (crawlResult && crawlResult.status === 'failed') {
            console.warn(`⚠️ Crawl failed for ${source.url}, falling back to single-page scrape`);
            crawlFailed = true;
          } else if (crawlResult && crawlResult.status) {
            console.warn(`⚠️ Crawl incomplete for ${source.url} (status: ${crawlResult.status}), using available data`);
            console.log(`🔍 Crawl result details:`, {
              status: crawlResult.status,
              completed: crawlResult.completed,
              total: crawlResult.total,
              hasData: !!crawlResult.data
            });
            
            if (crawlResult.data) {
              const allPages = Array.isArray(crawlResult.data) ? crawlResult.data : [crawlResult.data];
              markdown = allPages
                .map((page: any) => page.markdown || '')
                .filter((md: string) => md.length > 0)
                .join('\n\n---PAGE BREAK---\n\n');
              
              if (markdown.length === 0) {
                console.warn(`⚠️ Crawl incomplete but no markdown content extracted from ${source.url}`);
                crawlFailed = true;
              }
            } else {
              console.warn(`⚠️ Crawl incomplete and no data available for ${source.url}`);
              crawlFailed = true;
            }
          } else {
            console.warn(`⚠️ Unexpected crawl result format for ${source.url}:`, crawlResult);
            crawlFailed = true;
          }
        } catch (crawlError) {
          console.warn(`⚠️ Crawl failed for ${source.url}, falling back to single-page scrape:`, crawlError);
          crawlFailed = true;
        }
      }
      
      // Fallback to single-page scrape if crawl wasn't used or failed
      if (crawlFailed || !markdown) {
        console.log(`🔍 Using single-page scrape for ${source.url}`);
        
        const scrapeResult: any = await this.firecrawl.scrape(source.url, {
          formats: ['markdown'],
          onlyMainContent: source.config.onlyMainContent !== false,
          waitFor: source.config.waitFor || 3000, // Increased wait time for dynamic content
          timeout: 90000
        });
        
        console.log(`🔍 Firecrawl scrape response for ${source.url}:`, {
          hasMarkdown: !!scrapeResult.markdown,
          hasMetadata: !!scrapeResult.metadata,
          statusCode: scrapeResult.metadata?.statusCode,
          creditsUsed: scrapeResult.metadata?.creditsUsed,
          markdownLength: scrapeResult.markdown?.length || 0
        });
        
        // Check if scraping was successful
        if (!scrapeResult.markdown) {
          const errorMsg = 'No markdown content returned from Firecrawl';
          console.error(`❌ Firecrawl API error:`, errorMsg);
          console.error(`❌ Full Firecrawl response:`, JSON.stringify(scrapeResult, null, 2));
          throw new Error(`Firecrawl scraping failed: ${errorMsg}`);
        }
        
        markdown = scrapeResult.markdown;
      }
      
      if (!markdown || markdown.length === 0) {
        console.warn(`🔍 No markdown content extracted from ${source.url}`);
        return [];
      }
      
      console.log(`🔍 Extracted markdown content (${markdown.length} characters) from ${source.name}`);
      
      // Extract events using configured LLM model
      const events = await this.extractEventsWithGPT(markdown, source.name);
      console.log(`🔍 Extracted ${events.length} events from ${source.name}`);
      
      // Transform to CreateEventData format
      return events.map(event => this.transformScrapedEvent(event, source.name));
      
    } catch (error) {
      console.error(`❌ Firecrawl scraping failed for ${source.url}:`, error);
      throw error;
    }
  }

  /**
   * Scrape events using AgentQL (placeholder for future implementation)
   */
  private async scrapeWithAgentQL(source: ScraperSource): Promise<CreateEventData[]> {
    console.log(`🔍 AgentQL scraping not yet implemented for ${source.name}`);
    return [];
  }

  /**
   * Scrape events using direct API (placeholder for future implementation)
   */
  private async scrapeWithAPI(source: ScraperSource): Promise<CreateEventData[]> {
    console.log(`🔍 API scraping not yet implemented for ${source.name}`);
    return [];
  }

  /**
   * Extract events from HTML content using configurable LLM model with Czech language support
   * Supports: gpt-4o-mini (default, cheapest), gpt-4o (better quality), gpt-4-turbo (best quality)
   */
  private async extractEventsWithGPT(content: string, sourceName: string): Promise<ScrapedEvent[]> {
    // Get model from environment variable or source config, default to gpt-4o-mini
    const modelFromEnv = process.env.OPENAI_EXTRACTION_MODEL;
    let model = modelFromEnv || 'gpt-4o-mini';
    
    // Validate model name (basic check)
    const validModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
    if (!validModels.some(m => model.includes(m))) {
      console.warn(`⚠️ Unknown model "${model}", defaulting to gpt-4o-mini`);
      model = 'gpt-4o-mini';
    }
    
    // Determine max_tokens based on model capabilities
    // gpt-4o-mini: 16k output tokens, gpt-4o: 16k output tokens, gpt-4-turbo: 16k output tokens
    // But we'll be conservative and allow up to 16k for better models, 12k for mini
    const maxTokens = model.includes('gpt-4o') && !model.includes('mini') 
      ? 16000  // Full GPT-4o/4-turbo can handle 16k output tokens
      : model.includes('gpt-4o-mini')
      ? 16000  // GPT-4o-mini also supports 16k output tokens
      : 12000; // Fallback for other models
    
    console.log(`🤖 Extracting events with ${model} from ${sourceName} (max_tokens: ${maxTokens})`);
    
    try {
      const currentDate = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
      const currentYear = new Date().getFullYear(); // Current year for date parsing
      const isCzechSource = sourceName.toLowerCase().includes('kudyznudy') || sourceName.toLowerCase().includes('czech');
      
      const prompt: string = `TASK: Extract ALL event information from the following web content. Today's date is ${currentDate} (year: ${currentYear}).

${isCzechSource ? 'LANGUAGE NOTE: This content is in Czech. Translate all titles and descriptions to English, but preserve Czech city names (Praha, Brno, Ostrava, Plzeň, etc.).' : ''}

EXTRACTION REQUIREMENTS:
1. Extract EVERY event that appears in the content (completeness is critical)
2. Only include events with dates on or after ${currentDate} (skip past events)
3. Parse dates carefully - handle formats like:
   - "4. prosince" / "4.12." → 2024-12-04
   - "6. listopadu" / "6.11." → 2024-11-06
   - "tomorrow", "next week", relative dates
   - Various separators: DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
4. If date is ambiguous or missing, try to infer from context (e.g., "upcoming", "next month")
5. If date cannot be determined, skip the event

OUTPUT FORMAT - Each event must have:
{
  "title": "Event title in English (translated from Czech if needed)",
  "description": "Event description in English (if available, translate from Czech)",
  "date": "YYYY-MM-DD (REQUIRED - must be >= ${currentDate})",
  "endDate": "YYYY-MM-DD (optional, only if event spans multiple days)",
  "city": "City name (preserve Czech names: Praha, Brno, Ostrava, Plzeň, etc.)",
  "venue": "Venue name (translate to English if Czech, e.g., 'Kongresové centrum' → 'Congress Center')",
  "category": "One of: Entertainment, Arts & Culture, Sports, Business, Education, Other",
  "subcategory": "More specific category if available (e.g., 'Concert', 'Theater', 'Festival')",
  "url": "Full URL to event page if available",
  "imageUrl": "URL to event image if available",
  "expectedAttendees": NUMBER (REQUIRED - see guidelines below)
}

CATEGORY MAPPING (Czech → English):
- "koncert", "hudba", "koncerty" → Entertainment
- "divadlo", "divadelní" → Arts & Culture
- "festival", "festivaly" → Arts & Culture
- "sport", "sportovní" → Sports
- "kultura", "kulturní" → Arts & Culture
- "vzdělávání", "přednáška" → Education
- "konference", "summit" → Business

ATTENDANCE EXTRACTION (CRITICAL - Always provide a number):
1. Explicit mentions: "kapacita 500", "500 míst", "500 návštěvníků", "sold out (2,000 tickets)"
2. Venue capacity: "Stadium capacity 15,000", "Arena holds 8,000", "Konferenční sál pro 200"
3. Venue type estimation:
   - Stadiums/Arenas: 5,000-50,000 (e.g., O2 Arena Prague: ~18,000)
   - Concert halls: 500-5,000 (e.g., Lucerna: ~1,200)
   - Theaters: 100-2,000 (e.g., National Theatre: ~1,000)
   - Clubs/Bars: 50-500 (e.g., small venues: 100-300)
   - Conference centers: 100-3,000
   - Outdoor festivals: 1,000-100,000
4. Event type estimation:
   - Major concerts/festivals: 5,000-50,000
   - Regular concerts: 500-5,000
   - Theater shows: 200-2,000
   - Small events: 50-500
5. If truly unknown: use minimum 100 for any public event

DATE PARSING EXAMPLES:
- "čtvrtek 4. prosince" / "4.12." → ${currentYear}-12-04 (current year is ${currentYear})
- "6. listopadu" / "6.11." → ${currentYear}-11-06
- "7. – 9. listopadu" → date: ${currentYear}-11-07, endDate: ${currentYear}-11-09
- If year is missing, assume current year (${currentYear}) or next year if date has passed

CONTENT TO EXTRACT FROM:
${(() => {
        // Truncate content if extremely long to avoid token limits
        // GPT-4o models have 128k input tokens (~512k characters)
        // We keep 400k chars (~100k tokens) for content, leaving room for prompt and output
        const maxContentLength = 400000;
        if (content.length > maxContentLength) {
          // Try to keep the beginning (often has event listings) and a sample from middle
          const firstHalf = content.substring(0, maxContentLength * 0.6);
          const middleStart = Math.floor(content.length * 0.4);
          const middleEnd = Math.min(middleStart + maxContentLength * 0.4, content.length);
          const middleSection = content.substring(middleStart, middleEnd);
          return `${firstHalf}\n\n[... middle section ...]\n\n${middleSection}\n\n[Content truncated from ${content.length.toLocaleString()} to ${(firstHalf.length + middleSection.length).toLocaleString()} characters - focus on events in visible portions]`;
        }
        return content;
      })()}

QUALITY CHECKLIST:
✓ Did I extract ALL events from the content?
✓ Are all dates >= ${currentDate}?
✓ Are all dates in YYYY-MM-DD format?
✓ Did I translate Czech titles/descriptions to English?
✓ Did I preserve Czech city names?
✓ Did I provide expectedAttendees for every event?
✓ Are categories correctly mapped?
✓ Are URLs and image URLs included when available?

Return a JSON object with an "events" key containing the array: {"events": [...]}`;

      // Use json_object mode for better reliability with GPT-4o models
      // Note: We'll request the events in a "events" key to work with json_object mode
      const promptWithJsonFormat = `${prompt}\n\nIMPORTANT: Return a JSON object with an "events" key containing the array, like: {"events": [...]}`;
      
      const response: any = await this.openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: `You are an expert event data extraction specialist with deep knowledge of:
- Event management systems and ticket platforms (Ticketmaster, Eventbrite, Smsticket, GoOut, etc.)
- Czech cultural events, venues, and terminology
- Multi-language content processing (Czech ↔ English)
- Structured data extraction from web pages, including HTML, markdown, and list formats

Your task is to extract structured event information from web content with high accuracy.

CRITICAL REQUIREMENTS:
1. Extract ALL events present in the content - do not skip any unless they are clearly historical
2. Parse dates accurately - handle various formats (DD.MM.YYYY, DD/MM/YYYY, "tomorrow", "next week", etc.)
3. Always provide expectedAttendees - use venue knowledge, capacity indicators, or reasonable estimates
4. Translate Czech content to English BUT preserve Czech city names (Praha, Brno, Ostrava, etc.)
5. Map categories correctly: koncert→Entertainment, divadlo→Arts & Culture, sport→Sports, festival→Arts & Culture
6. Extract URLs and image URLs when available
7. Return valid JSON only - no markdown code blocks, no explanations

QUALITY STANDARDS:
- Be thorough: extract every event, even if some fields are missing
- Be accurate: validate dates against ${currentDate}, skip past events
- Be consistent: use the same format for all dates (YYYY-MM-DD)
- Be smart: infer missing information from context (venue type, event category, location)
- Be precise: extract exact numbers for attendees when available, estimate intelligently when not`
          },
          {
            role: 'user',
            content: promptWithJsonFormat
          }
        ],
        temperature: 0.1,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' } // Force JSON output for better reliability
      });

      const responseContent = response.choices[0]?.message?.content;
      if (!responseContent) {
        console.error(`❌ No response from ${model} for ${sourceName}`);
        return [];
      }

      console.log(`🤖 ${model} raw response for ${sourceName}:`, responseContent.substring(0, 500) + '...');

      // Parse JSON response with comprehensive error handling
      let events;
      try {
        const parsedResponse = JSON.parse(responseContent.trim());
        
        // Handle both formats: direct array or wrapped in object
        if (Array.isArray(parsedResponse)) {
          events = parsedResponse;
        } else if (parsedResponse.events && Array.isArray(parsedResponse.events)) {
          events = parsedResponse.events;
        } else if (parsedResponse.data && Array.isArray(parsedResponse.data)) {
          events = parsedResponse.data;
        } else {
          // Try to extract array from any key
          const keys = Object.keys(parsedResponse);
          if (keys.length === 1 && Array.isArray(parsedResponse[keys[0]])) {
            events = parsedResponse[keys[0]];
          } else {
            throw new Error('No array found in response');
          }
        }
      } catch (parseError) {
        console.error(`❌ Failed to parse ${model} JSON response for ${sourceName}:`, parseError);
        console.error(`❌ Raw ${model} response:`, responseContent);
        return [];
      }

      if (!Array.isArray(events)) {
        console.error(`❌ ${model} response is not an array for ${sourceName}:`, events);
        console.error(`❌ Raw ${model} response:`, responseContent);
        return [];
      }

      console.log(`🤖 ${model} extracted ${events.length} events from ${sourceName}`);
      console.log(`🤖 Sample events:`, events.slice(0, 2));
      return events;

    } catch (error) {
      console.error(`❌ ${model} extraction failed for ${sourceName}:`, error);
      return [];
    }
  }

  /**
   * Generate embedding for semantic deduplication
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('❌ Failed to generate embedding:', error);
      return [];
    }
  }

  /**
   * Check for duplicate events using semantic similarity
   */
  private async checkForDuplicate(embedding: number[], title: string, date: string): Promise<boolean> {
    try {
      const { data, error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .rpc('match_events', {
            query_embedding: embedding,
            match_threshold: 0.85,
            match_count: 5
          });
        return result;
      });

      if (error) {
        console.warn('❌ Duplicate check failed:', error);
        return false;
      }

      // Check if any similar events exist
      const similarEvents = data || [];
      return similarEvents.length > 0;

    } catch (error) {
      console.error('❌ Error checking for duplicates:', error);
      return false;
    }
  }

  /**
   * Transform scraped event to CreateEventData format
   */
  private transformScrapedEvent(event: ScrapedEvent, sourceName: string): CreateEventData {
    return {
      title: event.title,
      description: event.description || '',
      date: event.date,
      end_date: event.endDate,
      city: event.city,
      venue: event.venue,
      category: event.category || 'Other',
      subcategory: event.subcategory,
      expected_attendees: event.expectedAttendees,
      source: 'scraper',
      source_id: `${sourceName}_${event.title}_${event.date}`.replace(/[^a-zA-Z0-9_]/g, '_'),
      url: event.url,
      image_url: event.imageUrl
    };
  }

  /**
   * Process scraped events with deduplication and storage
   */
  private async processScrapedEvents(events: CreateEventData[], sourceName: string): Promise<ScraperResult> {
    const result: ScraperResult = {
      created: 0,
      skipped: 0,
      errors: []
    };

    console.log(`🔍 Processing ${events.length} events from ${sourceName}`);

    for (const event of events) {
      try {
        console.log(`🔍 Processing event: ${event.title}`);
        console.log(`🔍 Event data:`, JSON.stringify(event, null, 2));
        
        // Validate event data
        const validation = dataTransformer.validateEventData(event);
        console.log(`🔍 Validation result:`, {
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings
        });
        
        if (!validation.isValid) {
          console.warn(`⚠️ Skipping invalid event "${event.title}": ${validation.errors.join(', ')}`);
          result.skipped++;
          continue;
        }

        // Generate embedding for deduplication
        const embeddingText = `${event.title} ${event.description} ${event.venue || ''}`;
        const embedding = await this.generateEmbedding(embeddingText);
        
        if (embedding.length > 0) {
          // Check for duplicates
          const isDuplicate = await this.checkForDuplicate(embedding, event.title, event.date);
          if (isDuplicate) {
            console.log(`🔍 Skipping duplicate event: ${event.title}`);
            result.skipped++;
            continue;
          }
        }

        // Store event with embedding
        const eventWithEmbedding = {
          ...validation.sanitizedData,
          embedding: embedding.length > 0 ? embedding : null
        };
        
        console.log(`🔍 Final event data for storage:`, JSON.stringify(eventWithEmbedding, null, 2));

        // Save to database
        console.log(`💾 Saving event to database: ${event.title}`);
        const saveResult = await eventStorageService.saveEvents([eventWithEmbedding]);
        console.log(`💾 Save result:`, saveResult);
        
        result.created += saveResult.created;
        result.skipped += saveResult.skipped;
        result.errors.push(...saveResult.errors);

      } catch (error) {
        const errorMessage = `Failed to process event "${event.title}": ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`❌ ${errorMessage}`);
        result.errors.push(errorMessage);
        result.skipped++;
      }
    }

    return result;
  }

  /**
   * Get scraper source by ID
   */
  private async getScraperSource(sourceId: string): Promise<ScraperSource | null> {
    try {
      const { data, error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('scraper_sources')
          .select('*')
          .eq('id', sourceId)
          .single();
        return result;
      });

      if (error) {
        console.error('❌ Error fetching scraper source:', error);
        return null;
      }

      return data as ScraperSource;
    } catch (error) {
      console.error('❌ Error fetching scraper source:', error);
      return null;
    }
  }

  /**
   * Get all enabled scraper sources
   */
  private async getEnabledSources(): Promise<ScraperSource[]> {
    try {
      const { data, error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('scraper_sources')
          .select('*')
          .eq('enabled', true)
          .order('name');
        return result;
      });

      if (error) {
        console.error('❌ Error fetching enabled sources:', error);
        return [];
      }

      return data as ScraperSource[] || [];
    } catch (error) {
      console.error('❌ Error fetching enabled sources:', error);
      return [];
    }
  }

  /**
   * Start sync log entry
   */
  private async startSyncLog(source: string): Promise<string> {
    try {
      const { data, error } = await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('sync_logs')
          .insert({
            source,
            status: 'in_progress',
            started_at: new Date().toISOString()
          })
          .select('id')
          .single();
        return result;
      });

      if (error) {
        console.error('❌ Error creating sync log:', error);
        return '';
      }

      return data.id;
    } catch (error) {
      console.error('❌ Error creating sync log:', error);
      return '';
    }
  }

  /**
   * Complete sync log entry
   */
  private async completeSyncLog(
    syncLogId: string, 
    status: 'success' | 'error', 
    metadata: Record<string, any>
  ): Promise<void> {
    if (!syncLogId) return;

    try {
      const completedAt = new Date().toISOString();
      const startedAt = new Date(metadata.started_at || completedAt);
      const durationMs = new Date(completedAt).getTime() - startedAt.getTime();

      await this.db.executeWithRetry(async () => {
        const result = await this.db.getClient()
          .from('sync_logs')
          .update({
            status,
            completed_at: completedAt,
            duration_ms: durationMs,
            ...metadata
          })
          .eq('id', syncLogId);
        return result;
      });

    } catch (error) {
      console.error('❌ Error updating sync log:', error);
    }
  }

  /**
   * Enforce rate limiting with Czech source support
   */
  private async enforceRateLimit(sourceName?: string): Promise<void> {
    // Check daily limit
    if (this.requestCount >= this.dailyRequestLimit) {
      throw new Error(`Daily API request limit of ${this.dailyRequestLimit} exceeded`);
    }

    // Determine delay based on source type
    const isCzechSource = sourceName && (
      sourceName.toLowerCase().includes('kudyznudy') || 
      sourceName.toLowerCase().includes('czech') ||
      sourceName.toLowerCase().includes('praha') ||
      sourceName.toLowerCase().includes('brno')
    );
    
    const requiredDelay = isCzechSource ? this.czechSourceDelay : this.minRequestInterval;

    // Implement rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < requiredDelay) {
      const waitTime = requiredDelay - timeSinceLastRequest;
      console.log(`🔍 Rate limiting - waiting ${waitTime}ms (${isCzechSource ? 'Czech source' : 'standard'})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
    
    console.log(`🔍 Making request ${this.requestCount}/${this.dailyRequestLimit} (${isCzechSource ? 'Czech source' : 'standard'})`);
  }

  /**
   * Test scraper connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🧪 Testing scraper connection...');
      
      // Test Firecrawl
      if (!process.env.FIRECRAWL_API_KEY) {
        return { success: false, message: 'Firecrawl API key not configured' };
      }
      
      // Test OpenAI
      if (!process.env.OPENAI_API_KEY) {
        return { success: false, message: 'OpenAI API key not configured' };
      }
      
      // Test database connection
      const sources = await this.getEnabledSources();
      
      return { 
        success: true, 
        message: `Scraper connection successful. Found ${sources.length} enabled sources.` 
      };
      
    } catch (error) {
      console.error('❌ Scraper connection test failed:', error);
      return { 
        success: false, 
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}

// Export singleton instance
export const eventScraperService = new EventScraperService();
