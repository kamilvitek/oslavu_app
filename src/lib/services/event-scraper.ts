// src/lib/services/event-scraper.ts
import { Event } from '@/types';
import { CreateEventData } from '@/lib/types/events';
import { dataTransformer } from './data-transformer';
import { eventStorageService } from './event-storage';
import { serverDatabaseService } from '@/lib/supabase';
import FirecrawlApp from '@mendable/firecrawl-js';
import { CrawlConfigurationService } from '@/lib/services/crawl-configuration.service';
import { CrawlConfig } from '@/lib/types/crawl';
import OpenAI from 'openai';

interface ScraperSource {
  id: string;
  name: string;
  url: string;
  type: 'firecrawl' | 'agentql' | 'api';
  enabled: boolean;
  config: Record<string, any>;
  last_scraped_at?: string;
  // Crawl fields (nullable for legacy sources)
  crawl_config?: Record<string, any> | null;
  max_pages_per_crawl?: number | null;
  crawl_frequency?: string | null; // INTERVAL as text
  use_crawl?: boolean;
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
   */
  private async scrapeWithFirecrawl(source: ScraperSource): Promise<CreateEventData[]> {
    const useCrawl = !!source.use_crawl && !!source.crawl_config;
    console.log(`🔍 Scraping with Firecrawl (${useCrawl ? 'crawl' : 'scrape'}): ${source.url}`);

    try {
      await this.enforceRateLimit(source.name);

      if (useCrawl) {
        const hostname = new URL(source.url).hostname;
        const presetKey = CrawlConfigurationService.getPresetForHost(hostname);
        const preset = CrawlConfigurationService.buildPreset(presetKey);
        const merged: CrawlConfig = CrawlConfigurationService.mergeConfig(
          (source.crawl_config as any) ?? null,
          preset
        );
        if (!merged.startUrls || merged.startUrls.length === 0) {
          merged.startUrls = [source.url];
        }
        merged.maxPages = merged.maxPages ?? source.max_pages_per_crawl ?? undefined;

        // Crawl each start URL individually (SDK expects a single string `url`)
        const startUrls = (merged.startUrls || []).filter(u => typeof u === 'string' && u.trim().length > 0);
        if (startUrls.length === 0) startUrls.push(source.url);

        let totalEvents: CreateEventData[] = [];
        let pagesProcessed = 0;
        let pagesCrawled = 0;
        const detailMatchers = (merged.detailUrlPatterns ?? []).map((p) => new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

        const perUrlPageCap = merged.maxPages && startUrls.length > 0
          ? Math.max(1, Math.floor(merged.maxPages / startUrls.length))
          : undefined;

        const crawlStartedAt = Date.now();

        for (const url of startUrls) {
          const startedAt = Date.now();
          // Use SDK signature: crawl(url: string, options?: object)
          const res: any = await (this.firecrawl as any).crawl(
            url,
            {
              maxDepth: merged.maxDepth,
              allowList: merged.allowList,
              denyList: merged.denyList,
              limit: perUrlPageCap ?? merged.maxPages,
              actions: merged.actions as any,
              waitFor: merged.waitFor as any,
            }
          );

          const pages: Array<{ url: string; markdown?: string; content?: string; html?: string; }> =
            Array.isArray(res?.data) ? res.data : [];
          pagesCrawled += pages.length;

          // Prioritize detail pages over listings
          const detailPages = pages.filter(p => detailMatchers.some(rx => rx.test(p.url)));
          const otherPages = pages.filter(p => !detailMatchers.some(rx => rx.test(p.url)));

          for (const page of [...detailPages, ...otherPages]) {
            const markdown = (page as any).markdown || (page as any).content || '';
            const html = (page as any).html || '';
            if (!markdown && !html) continue;
            pagesProcessed++;
            const events = await this.extractEventsGeneric({ markdown, html }, source.name);
            totalEvents.push(...events.map(e => this.transformScrapedEvent(e, source.name)));
            if (merged.maxPages && pagesProcessed >= merged.maxPages) break;
          }
          console.log(`🔍 Crawled ${pages.length} pages from ${url} in ${Date.now() - startedAt}ms`);
          if (merged.maxPages && pagesProcessed >= merged.maxPages) break;
        }

        const durationMs = Date.now() - crawlStartedAt;

        // Attach crawl metrics into sync log via metadata on caller
        await this.db.executeWithRetry(async () => {
          return await this.db.getClient()
            .from('sync_logs')
            .update({
              pages_crawled: pagesCrawled,
              pages_processed: pagesProcessed,
              crawl_duration_ms: durationMs,
            })
            .order('started_at', { ascending: false })
            .limit(1);
        });

        console.log(`✅ Crawl processed ${pagesProcessed}/${pagesCrawled} pages, extracted ${totalEvents.length} events`);
        return totalEvents;
      }

      // Adaptive single-page scrape with retries and HTML support
      let attempt = 0;
      const maxAttempts = 3;
      let onlyMainContent = source.config.onlyMainContent !== undefined ? !!source.config.onlyMainContent : true;
      let waitFor = source.config.waitFor || 4000;
      let lastEvents: CreateEventData[] = [];

      while (attempt < maxAttempts) {
        attempt++;
        console.log(`🔍 Single-page scrape attempt ${attempt}/${maxAttempts} (onlyMainContent=${onlyMainContent}, waitFor=${waitFor})`);

        const scrapeResult: any = await this.firecrawl.scrape(source.url, {
          formats: ['markdown', 'html'],
          onlyMainContent,
          waitFor,
          timeout: 60000
        });

        const markdown: string = (scrapeResult?.markdown) || (scrapeResult?.data?.markdown) || '';
        const html: string = (scrapeResult?.html) || (scrapeResult?.data?.html) || '';

        if (!markdown && !html) {
          console.warn('⚠️ Firecrawl returned no content (markdown/html)');
        }

        const extracted = await this.extractEventsGeneric({ markdown, html }, source.name);
        lastEvents = extracted.map(event => this.transformScrapedEvent(event, source.name));
        if (lastEvents.length > 0) {
          return lastEvents;
        }

        // Adaptive tuning for next attempt
        if (attempt === 1) {
          onlyMainContent = false; // broaden content area
          waitFor = Math.min(waitFor + 2000, 8000);
        } else if (attempt === 2) {
          // Switch to shallow crawl fallback with generic defaults
          console.log('🔍 Switching to shallow crawl fallback after empty single-page results');
          const url = new URL(source.url);
          const allowList = [url.origin, url.origin + '/*'];
          const res: any = await (this.firecrawl as any).crawl(source.url, {
            limit: 12,
            maxDepth: 2,
            allowList,
            waitFor: 3000,
            actions: [
              { type: 'scroll', target: 'window', count: 8, delay: 400 }
            ]
          });
          const pages: Array<{ url: string; markdown?: string; content?: string; html?: string; }> = Array.isArray(res?.data) ? res.data : [];
          let aggregated: CreateEventData[] = [];
          for (const page of pages) {
            const md = (page as any).markdown || (page as any).content || '';
            const h = (page as any).html || '';
            if (!md && !h) continue;
            const evts = await this.extractEventsGeneric({ markdown: md, html: h }, source.name);
            aggregated.push(...evts.map(e => this.transformScrapedEvent(e, source.name)));
            if (aggregated.length >= 5) break; // early success criterion
          }
          if (aggregated.length > 0) return aggregated;
          console.log('🚨 Shallow crawl produced 0 events; consider increasing crawl caps for this host.');
        }
      }

      return lastEvents;

    } catch (error) {
      console.error(`❌ Firecrawl ${useCrawl ? 'crawl' : 'scrape'} failed for ${source.url}:`, error);
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
   * Extract events from HTML content using GPT-4o-mini (cheapest model) with Czech language support
   */
  private async extractEventsWithGPT(content: string, sourceName: string): Promise<ScrapedEvent[]> {
    console.log(`🤖 Extracting events with GPT-4o-mini from ${sourceName}`);
    
    try {
      const currentDate = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
      const isCzechSource = sourceName.toLowerCase().includes('kudyznudy') || sourceName.toLowerCase().includes('czech');
      
      const prompt: string = `Extract event information from the following content. IMPORTANT: Only extract events that are happening on or after ${currentDate} (today is ${currentDate}). Do NOT extract historical events.

${isCzechSource ? 'NOTE: This content is in Czech language. Extract events and translate titles/descriptions to English, but keep Czech city names as they are.' : ''}

Prefer data from event detail pages if present. If JSON-LD or microdata with schema.org/Event is available, extract from it first and merge with page text.

Return a JSON array of events with this structure (unknown fields may be omitted):
{
  "title": "Event title (translate to English if Czech)",
  "description": "Event description (translate to English if Czech)",
  "date": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD (optional)",
  "city": "City name (keep original Czech names like Praha, Brno, Ostrava)",
  "venue": "Venue name (optional, translate to English if Czech)",
  "category": "Event category (translate to English: festival, koncert->concert, divadlo->theater, sport->sports, kultura->culture)",
  "subcategory": "Event subcategory (optional, translate to English if Czech)",
  "url": "Event detail page URL (preferred)",
  "imageUrl": "Primary image URL (optional)",
  "imageUrls": ["Additional image URLs (optional)"],
  "priceMin": "Minimum price numeric (optional)",
  "priceMax": "Maximum price numeric (optional)",
  "organizer": "Organizer/Promoter (optional)",
  "expectedAttendees": "Number of expected attendees (CRITICAL: Try to extract this information)"
}

ATTENDANCE EXTRACTION GUIDELINES:
- Look for explicit numbers: "Expected attendance: 500", "Capacity: 1000", "X people expected"
- Look for venue capacity mentions: "Stadium capacity 15,000", "Arena holds 8,000"
- Look for sold-out indicators: "Sold out (2,000 tickets)", "Fully booked (500 seats)"
- Look for venue size indicators in names: "Stadium", "Arena", "Convention Center", "Hotel"
- If venue name suggests size (e.g., "Prague Stadium", "O2 Arena"), estimate based on venue type
- If no explicit numbers, provide your best estimate based on venue type and event category
- For Czech content: look for "kapacita", "míst", "návštěvníků", "účastníků"

Content to extract from:
${content}

IMPORTANT FILTERING RULES:
- Only extract events with dates >= ${currentDate}
- Skip any events from previous years or months
- Focus on current and future events only
- If an event has no clear date or is clearly historical, skip it
- For Czech content: translate titles and descriptions to English but keep city names in Czech
- Map Czech categories: festival->Arts & Culture, koncert->Entertainment, divadlo->Arts & Culture, sport->Sports, kultura->Arts & Culture
- ALWAYS provide expectedAttendees - use venue-based estimation if no explicit data found

Return only valid JSON array. If no current/future events found, return empty array [].`;

      const response: any = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Cheapest OpenAI model
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting structured event data from web content in multiple languages. Always return valid JSON arrays. For Czech content, translate titles and descriptions to English but preserve Czech city names.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 3000 // Reduced token limit for cost savings
      });

      const responseContent = response.choices[0]?.message?.content;
      if (!responseContent) {
        console.error(`❌ No response from GPT-4 for ${sourceName}`);
        return [];
      }

      console.log(`🤖 GPT-4 raw response for ${sourceName}:`, responseContent);

      // Parse JSON response with comprehensive error handling
      let events;
      try {
        // Clean up markdown formatting if present
        let cleanedResponse = responseContent.trim();
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        }
        if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        events = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.warn(`⚠️ First parse failed, retrying with stricter JSON-only instruction for ${sourceName}`);
        const retry: any = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Return ONLY a valid JSON array. No prose, no code fences.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 2800
        });
        const retryContent = retry.choices[0]?.message?.content || '';
        let cleaned = retryContent.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
        try {
          events = JSON.parse(cleaned);
        } catch (e) {
          console.error(`❌ Failed to parse GPT-4 JSON (retry) for ${sourceName}:`, e);
          console.error(`❌ Raw retry response:`, retryContent);
          return [];
        }
      }

      if (!Array.isArray(events)) {
        console.error(`❌ GPT-4 response is not an array for ${sourceName}:`, events);
        console.error(`❌ Raw GPT-4 response:`, responseContent);
        return [];
      }

      console.log(`🤖 GPT-4 extracted ${events.length} events from ${sourceName}`);
      console.log(`🤖 Sample events:`, events.slice(0, 2));
      return events;

    } catch (error) {
      console.error(`❌ GPT-4 extraction failed for ${sourceName}:`, error);
      return [];
    }
  }

  /**
   * Generic extraction flow: structured-data first, then chunked LLM
   */
  private async extractEventsGeneric(
    content: { markdown: string; html: string },
    sourceName: string
  ): Promise<ScrapedEvent[]> {
    const { markdown, html } = content;
    const structured = this.extractEventsFromStructuredData(html || markdown || '');
    if (structured.length > 0) {
      console.log(`🔍 Structured data extraction found ${structured.length} events`);
      return this.postNormalizeAndFilter(structured);
    }

    const text = markdown || html || '';
    if (!text) return [];

    // Chunked LLM extraction
    const maxChunk = 20000;
    const overlap = 1000;
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += (maxChunk - overlap)) {
      const slice = text.slice(i, Math.min(text.length, i + maxChunk));
      chunks.push(slice);
      if (i + maxChunk >= text.length) break;
    }

    const allEvents: ScrapedEvent[] = [];
    const seen = new Set<string>();
    for (const chunk of chunks) {
      const events = await this.extractEventsWithGPT(chunk, sourceName);
      for (const e of events) {
        const key = `${(e.title||'').toLowerCase()}|${e.date||''}|${(this.normalizeUrl(e.url)||'').toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          allEvents.push(e);
        }
      }
      // Early exit if we already have some future events
      if (allEvents.length >= 10) break;
    }

    console.log(`🔍 Chunked extraction yielded ${allEvents.length} raw events`);
    return this.postNormalizeAndFilter(allEvents);
  }

  /**
   * Extract schema.org/Event from JSON-LD or Microdata in HTML/Markdown string
   */
  private extractEventsFromStructuredData(doc: string): ScrapedEvent[] {
    try {
      const events: ScrapedEvent[] = [];
      // JSON-LD blocks
      const ldMatches = [...doc.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
      for (const m of ldMatches) {
        const raw = (m[1] || '').trim();
        try {
          const json = JSON.parse(raw);
          const nodes = this.flattenJsonLd(json);
          for (const node of nodes) {
            this.collectEventNodes(node, events);
          }
        } catch {
          // ignore malformed blocks
        }
      }
      return events;
    } catch (e) {
      return [];
    }
  }

  private flattenJsonLd(json: any): any[] {
    const out: any[] = [];
    const stack = Array.isArray(json) ? [...json] : [json];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== 'object') continue;
      if (node['@graph']) {
        const graph = Array.isArray(node['@graph']) ? node['@graph'] : [node['@graph']];
        stack.push(...graph);
      } else {
        out.push(node);
      }
    }
    return out;
  }

  private collectEventNodes(node: any, out: ScrapedEvent[]) {
    if (!node || typeof node !== 'object') return;
    const type = (node['@type'] || node.type);
    const isEvent = (typeof type === 'string' && /event/i.test(type)) || (Array.isArray(type) && type.some((t: any) => /event/i.test(t)));
    if (isEvent) {
      const startDate = node.startDate || node.start_time || node.date || node.start_date;
      const endDate = node.endDate || node.end_date;
      const location = node.location || {};
      const address = location.address || {};
      const city = address.addressLocality || address.city || '';
      const url = node.url || (node['@id'] || '');
      const image = Array.isArray(node.image) ? node.image[0] : node.image;
      out.push({
        title: node.name || '',
        description: node.description || '',
        date: startDate || '',
        endDate: endDate || undefined,
        city: city || '',
        venue: (location.name || ''),
        category: undefined,
        subcategory: undefined,
        url: typeof url === 'string' ? url : '',
        imageUrl: typeof image === 'string' ? image : undefined,
        expectedAttendees: undefined
      });
    }
    for (const k of Object.keys(node)) {
      const val = (node as any)[k];
      if (val && typeof val === 'object') this.collectEventNodes(val, out);
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item === 'object') this.collectEventNodes(item, out);
        }
      }
    }
  }

  private postNormalizeAndFilter(events: ScrapedEvent[]): ScrapedEvent[] {
    const todayIso = new Date().toISOString().split('T')[0];
    const normalized: ScrapedEvent[] = [];
    for (const e of events) {
      let primary = e.date || '';
      if (/\d/.test(primary) && /\d+\s*[.–-]\s*\d+/.test(primary)) {
        const parts = primary.split(/[–-]/).map(s => s.trim());
        if (parts.length >= 2) {
          const tail = parts[parts.length - 1];
          const day = parts[0].replace(/\D/g, '');
          primary = `${day}.${tail}`;
        }
      }
      const iso = this.parseDateFlexible(primary);
      if (!iso) continue;
      if (iso < todayIso) continue;
      normalized.push({
        ...e,
        date: iso,
        endDate: this.parseDateFlexible(e.endDate || '') || undefined,
        url: this.normalizeUrl(e.url || '') || e.url
      });
    }
    return normalized;
  }

  private normalizeUrl(url?: string): string | undefined {
    if (!url) return undefined;
    try {
      const u = new URL(url, 'http://local');
      const isRelative = !/^https?:/i.test(url);
      const host = (u.host || '').toLowerCase();
      const protocol = (u.protocol || '').toLowerCase();
      const pathname = u.pathname.replace(/\/$/, '');
      const params = new URLSearchParams(u.search);
      const keep = new URLSearchParams();
      for (const [k, v] of params.entries()) {
        if (!/^utm_/i.test(k) && k.toLowerCase() !== 'fbclid') keep.append(k, v);
      }
      const query = keep.toString();
      if (isRelative) return pathname + (query ? `?${query}` : '');
      return `${protocol}//${host}${pathname}${query ? `?${query}` : ''}`;
    } catch {
      return url;
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
    const normalize = (s?: string): string | undefined => {
      if (!s) return undefined;
      const iso = this.parseDateFlexible(s);
      return iso || undefined;
    };

    const normalizedDate = normalize(event.date) as string;
    const normalizedEnd = normalize(event.endDate);

    return {
      title: event.title,
      description: event.description || '',
      date: normalizedDate,
      end_date: normalizedEnd,
      city: event.city,
      venue: event.venue,
      category: event.category || 'Other',
      subcategory: event.subcategory,
      expected_attendees: event.expectedAttendees,
      source: 'scraper',
      source_id: `${sourceName}_${event.title}_${event.date}`.replace(/[^a-zA-Z0-9_]/g, '_'),
      url: this.normalizeUrl(event.url) || event.url,
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

    // Filter strictly to current/future dates to avoid storing past items
    const todayIso = new Date().toISOString().split('T')[0];
    const upcoming = events.filter(e => {
      try {
        const d = new Date(e.date);
        return !isNaN(d.getTime()) && e.date >= todayIso;
      } catch {
        return false;
      }
    });

    console.log(`🔍 Processing ${upcoming.length}/${events.length} future events from ${sourceName}`);

    for (const event of upcoming) {
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
   * Parse various common date formats to ISO YYYY-MM-DD
   * Supports: ISO, dd.mm.yyyy, d.m.yyyy, dd/mm/yyyy, d/m/yyyy, yyyy.mm.dd, yyyy/mm/dd
   */
  private parseDateFlexible(input: string): string | null {
    const trimmed = (input || '').toString().trim();
    if (!trimmed) return null;

    // Already ISO date
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    // Czech month names (short and full)
    const czMonths: Record<string, string> = {
      'led': '01', 'leden': '01',
      'úno': '02', 'únor': '02', 'unor': '02',
      'bře': '03', 'březen': '03', 'brezen': '03',
      'dub': '04', 'duben': '04',
      'kvě': '05', 'květen': '05', 'kveten': '05',
      'čer': '06', 'červen': '06', 'cerven': '06',
      'čvc': '07', 'červenec': '07', 'cervenec': '07',
      'srp': '08', 'srpen': '08',
      'zář': '09', 'září': '09', 'zari': '09',
      'říj': '10', 'říjen': '10', 'rijen': '10',
      'lis': '11', 'listopad': '11',
      'pro': '12', 'prosinec': '12'
    };
    const czMonthRegex = new RegExp(`^\\s*(\\d{1,2})\\.?(?:\\s*)(` + Object.keys(czMonths).join('|') + `)(?:\\s*)(\\d{4})\\s*$`, 'i');
    let mcz = trimmed.match(czMonthRegex);
    if (mcz) {
      const day = mcz[1].padStart(2, '0');
      const mon = czMonths[mcz[2].toLowerCase()];
      const year = mcz[3];
      return `${year}-${mon}-${day}`;
    }

    // dd.mm.yyyy or d.m.yyyy
    let m = trimmed.match(/^(\d{1,2})[\.](\d{1,2})[\.](\d{4})$/);
    if (m) {
      const [_, d, mo, y] = m;
      const day = d.padStart(2, '0');
      const month = mo.padStart(2, '0');
      return `${y}-${month}-${day}`;
    }

    // dd/mm/yyyy or d/m/yyyy
    m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const [_, d, mo, y] = m;
      const day = d.padStart(2, '0');
      const month = mo.padStart(2, '0');
      return `${y}-${month}-${day}`;
    }

    // yyyy.mm.dd or yyyy/mm/dd
    m = trimmed.match(/^(\d{4})[\.\/]?(\d{1,2})[\.\/]?(\d{1,2})$/);
    if (m && trimmed.includes('.') || trimmed.includes('/')) {
      const [_, y, mo, d] = m as any;
      const day = String(d).padStart(2, '0');
      const month = String(mo).padStart(2, '0');
      return `${y}-${month}-${day}`;
    }

    // Fallback to Date parser if it produces a valid ISO date
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return null;
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
