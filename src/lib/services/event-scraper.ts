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
  
  // Rate limiting properties (max 10 requests/minute to Firecrawl)
  private lastRequestTime = 0;
  private readonly minRequestInterval = 6000; // 6 seconds = 10 requests per minute
  private requestCount = 0;
  private dailyRequestLimit = 100; // Conservative daily limit

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
   */
  private async scrapeWithFirecrawl(source: ScraperSource): Promise<CreateEventData[]> {
    console.log(`🔍 Scraping with Firecrawl: ${source.url}`);
    
    try {
      // Rate limiting
      await this.enforceRateLimit();
      
      const scrapeResult: any = await this.firecrawl.scrape(source.url, {
        formats: ['markdown'],
        onlyMainContent: source.config.onlyMainContent || true,
        waitFor: source.config.waitFor || 2000,
        timeout: 30000
      });
      
      if (!scrapeResult.success) {
        throw new Error(`Firecrawl scraping failed: ${scrapeResult.error}`);
      }
      
      const markdown = scrapeResult.data?.markdown;
      if (!markdown) {
        console.warn(`🔍 No markdown content extracted from ${source.url}`);
        return [];
      }
      
      // Extract events using GPT-4
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
   * Extract events from HTML content using GPT-4
   */
  private async extractEventsWithGPT(content: string, sourceName: string): Promise<ScrapedEvent[]> {
    console.log(`🤖 Extracting events with GPT-4 from ${sourceName}`);
    
    try {
      const prompt: string = `Extract event information from the following content. Return a JSON array of events with this structure:
{
  "title": "Event title",
  "description": "Event description",
  "date": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD (optional)",
  "city": "City name",
  "venue": "Venue name (optional)",
  "category": "Event category",
  "subcategory": "Event subcategory (optional)",
  "url": "Event URL (optional)",
  "imageUrl": "Image URL (optional)",
  "expectedAttendees": "Number of expected attendees (optional)"
}

Content to extract from:
${content.substring(0, 8000)} // Limit content to avoid token limits

Return only valid JSON array. If no events found, return empty array [].`;

      const response: any = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting structured event data from web content. Always return valid JSON arrays.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      });

      const responseContent = response.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from GPT-4');
      }

      // Parse JSON response
      const events = JSON.parse(responseContent);
      if (!Array.isArray(events)) {
        throw new Error('GPT-4 response is not an array');
      }

      console.log(`🤖 GPT-4 extracted ${events.length} events from ${sourceName}`);
      return events;

    } catch (error) {
      console.error(`❌ GPT-4 extraction failed for ${sourceName}:`, error);
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
        // Validate event data
        const validation = dataTransformer.validateEventData(event);
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

        // Save to database
        const saveResult = await eventStorageService.saveEvents([eventWithEmbedding]);
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
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    // Check daily limit
    if (this.requestCount >= this.dailyRequestLimit) {
      throw new Error(`Daily API request limit of ${this.dailyRequestLimit} exceeded`);
    }

    // Implement rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      console.log(`🔍 Rate limiting - waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
    
    console.log(`🔍 Making request ${this.requestCount}/${this.dailyRequestLimit}`);
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
