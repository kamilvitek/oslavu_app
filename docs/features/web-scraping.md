# Web Scraper Infrastructure Setup

This document explains how to set up and use the web scraper infrastructure for Oslavu.

## Overview

The web scraper infrastructure allows Oslavu to supplement API data (Ticketmaster, PredictHQ) with local event data scraped from Czech websites. It uses:

- **Firecrawl** for web scraping (supports multi-page crawling)
- **OpenAI LLM** for content extraction (configurable model: gpt-4o-mini, gpt-4o, or gpt-4-turbo)
- **OpenAI Embeddings** for semantic deduplication
- **Supabase** for data storage and vector similarity search

## Setup Instructions

### 1. Environment Variables

Add these to your `.env.local` file:

```bash
# Scraping Services
FIRECRAWL_API_KEY=your-firecrawl-key
OPENAI_API_KEY=your-openai-key
# Optional: Choose extraction model (default: gpt-4o-mini)
# Options: gpt-4o-mini (cheapest), gpt-4o (better quality), gpt-4-turbo (best quality)
OPENAI_EXTRACTION_MODEL=gpt-4o-mini

# Optional (for advanced scraping)
AGENTQL_API_KEY=your-agentql-key
BROWSERBASE_API_KEY=your-browserbase-key
BROWSERBASE_PROJECT_ID=your-project-id

# Cron authentication
CRON_SECRET=generate-random-secret-here
```

### 2. Database Migration

Run the Supabase migration to create the required tables:

```bash
supabase db push
```

This creates:
- `scraper_sources` - Configuration for scraping sources
- `sync_logs` - Tracking of scraper runs
- `events.embedding` - Vector embeddings for deduplication
- `match_events()` function - Semantic similarity search

### 3. Test the Setup

```bash
# Test the scraper infrastructure
npm run scrape

# Test via API (requires dev server running)
npm run scrape:test
npm run scrape:run
```

## Architecture

### Services

- **`EventScraperService`** - Main scraper service
- **`DataTransformer`** - Handles scraped event transformation
- **`EventStorageService`** - Stores events with embeddings

### Data Flow

1. **Scraping**: Firecrawl extracts HTML content from configured sources
2. **Extraction**: GPT-4 extracts structured event data from HTML
3. **Deduplication**: OpenAI embeddings detect semantic duplicates
4. **Storage**: Events stored in Supabase with vector embeddings
5. **Integration**: Scraped events automatically included in conflict analysis

### Rate Limiting

- **Firecrawl**: 10 requests/minute (6-second intervals)
- **OpenAI**: Batch processing for embeddings (10 events at a time)
- **Daily Limits**: 100 requests/day (configurable)

## Usage

### API Endpoints

```bash
# Test connection
GET /api/scraper?action=test

# Scrape all sources
GET /api/scraper?action=scrape

# Scrape specific source
POST /api/scraper
{
  "action": "scrape-source",
  "sourceId": "source-uuid"
}
```

### Programmatic Usage

```typescript
import { eventScraperService } from '@/lib/services/event-scraper';

// Test connection
const testResult = await eventScraperService.testConnection();

// Scrape all sources
const result = await eventScraperService.scrapeAllSources();

// Scrape specific source
const events = await eventScraperService.scrapeSource('source-id');
```

### Web Interface

Visit `/test-scraper` to test the scraper functionality with a web interface.

## Configuration

### Adding New Sources

Insert new sources into the `scraper_sources` table:

```sql
INSERT INTO scraper_sources (name, url, type, config) VALUES
  ('NewSource', 'https://example.com/events/', 'firecrawl', 
   '{"waitFor": 2000, "onlyMainContent": true}'::jsonb);
```

### Source Types

- **`firecrawl`** - Uses Firecrawl for web scraping
- **`agentql`** - Uses AgentQL for advanced scraping (future)
- **`api`** - Direct API integration (future)

## Monitoring

### Sync Logs

Check scraping status in the `sync_logs` table:

```sql
SELECT * FROM sync_logs 
ORDER BY started_at DESC 
LIMIT 10;
```

### Event Statistics

```sql
-- Events by source
SELECT source, COUNT(*) as count 
FROM events 
WHERE source = 'scraper' 
GROUP BY source;

-- Recent scraping activity
SELECT source, status, events_created, started_at 
FROM sync_logs 
WHERE started_at > NOW() - INTERVAL '24 hours';
```

## Troubleshooting

### Common Issues

1. **API Key Errors**
   - Check environment variables are set correctly
   - Verify API keys are valid and have sufficient credits

2. **Database Errors**
   - Ensure Supabase migration has been run
   - Check database connection and permissions

3. **Rate Limiting**
   - Scraper respects rate limits automatically
   - Adjust `dailyRequestLimit` if needed

4. **No Events Found**
   - Check if sources are enabled in `scraper_sources` table
   - Verify website URLs are accessible
   - Check GPT-4 extraction is working

### Debug Mode

Enable detailed logging by setting:

```bash
NODE_ENV=development
```

This will show detailed console output for debugging.

## Performance

### Optimization Tips

1. **Batch Processing**: Events are processed in batches of 100
2. **Embedding Caching**: Similar events reuse embeddings
3. **Rate Limiting**: Prevents API quota exhaustion
4. **Error Handling**: Individual event failures don't stop the process

### Scaling

- Increase `dailyRequestLimit` for more sources
- Add more sources to `scraper_sources` table
- Consider background job processing for large-scale scraping

## Security

- API keys stored in environment variables
- Rate limiting prevents abuse
- Input sanitization for all scraped data
- Database queries use parameterized statements

## Future Enhancements

- **AgentQL Integration**: For more complex scraping scenarios
- **Scheduled Scraping**: Automated cron jobs
- **Advanced Deduplication**: Machine learning-based similarity
- **Multi-language Support**: Czech and English content extraction
- **Real-time Updates**: WebSocket notifications for new events
