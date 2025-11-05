# Event Crawling Fixes Summary

## Problem Identified

Your event scraper was only finding a few events (e.g., 9 events from smsticket.cz) despite sources having many more events. Root causes were identified:

## Root Causes

### 1. **Content Truncation (CRITICAL)**
- **Issue**: Line 293 was truncating scraped content to only 6000 characters: `content.substring(0, 6000)`
- **Impact**: GPT-4o-mini only saw a tiny portion of the page content, missing most events
- **Fix**: Removed truncation - now passes full content to GPT

### 2. **Using `scrape()` Instead of `crawlUrl()` (CRITICAL)**
- **Issue**: The code was using `firecrawl.scrape()` which only scrapes a single page
- **Impact**: For sites with pagination or multiple event sections, only the first page was scraped
- **Fix**: Implemented `crawlUrl()` with fallback to `scrape()` for better multi-page coverage

### 3. **GPT Token Limit Too Low**
- **Issue**: `max_tokens: 3000` was limiting the number of events GPT could extract
- **Impact**: Even if content was provided, GPT couldn't extract all events due to token limits
- **Fix**: Increased to `max_tokens: 8000` to handle more events

### 4. **Insufficient Wait Time for Dynamic Content**
- **Issue**: `waitFor: 2000ms` might not be enough for JavaScript-heavy sites
- **Impact**: Dynamic content might not load before scraping
- **Fix**: Increased to `waitFor: 3000ms` and `timeout: 90000ms`

## Changes Made

### File: `src/lib/services/event-scraper.ts`

1. **Removed Content Truncation** (Line ~293)
   ```typescript
   // BEFORE: ${content.substring(0, 6000)}
   // AFTER: ${content}
   ```

2. **Increased GPT Token Limit** (Line ~402)
   ```typescript
   // BEFORE: max_tokens: 3000
   // AFTER: max_tokens: 16000 (for GPT-4o models)
   //        max_tokens: 16000 (for GPT-4o-mini)
   //        max_tokens: 12000 (fallback for other models)
   ```

3. **Implemented Multi-Page Crawling** (Lines ~190-302)
   - Added `crawlUrl()` support with automatic fallback to `scrape()`
   - Crawls up to 20 pages by default (configurable via `source.config.maxPages`)
   - Combines markdown from all crawled pages
   - Falls back gracefully to single-page scrape if crawl fails

4. **Improved Wait Times** (Lines ~214, ~261)
   - Increased `waitFor` from 2000ms to 3000ms
   - Increased `timeout` from 60000ms to 90000ms

5. **Made LLM Model Configurable** (Lines ~327-404)
   - Added support for configurable OpenAI models via `OPENAI_EXTRACTION_MODEL` env variable
   - Default: `gpt-4o-mini` (cheapest, good quality)
   - Options: `gpt-4o` (better quality), `gpt-4-turbo` (best quality)
   - Automatically sets appropriate `max_tokens` based on model capabilities
   - Added `response_format: { type: 'json_object' }` for better JSON reliability

### File: `env-template.txt`

6. **Added Model Configuration** (Line ~12)
   - Added `OPENAI_EXTRACTION_MODEL` environment variable
   - Documented model options and pricing trade-offs

### File: `docs/features/web-scraping.md`

7. **Updated Documentation** (Lines ~9-26)
   - Updated to reflect multi-page crawling support
   - Added documentation for configurable LLM models
   - Added environment variable configuration instructions

## Configuration Options

### Environment Variables

You can configure the LLM model globally via environment variable:

```bash
# In .env.local
OPENAI_EXTRACTION_MODEL=gpt-4o-mini  # Default: cheapest
# OPENAI_EXTRACTION_MODEL=gpt-4o      # Better quality
# OPENAI_EXTRACTION_MODEL=gpt-4-turbo # Best quality
```

### Per-Source Configuration

You can configure crawling behavior per source in the `scraper_sources` table:

```sql
UPDATE scraper_sources 
SET config = jsonb_set(
  config, 
  '{useCrawl}', 
  'true'::jsonb
) 
WHERE name = 'smsticket cz';

-- Or disable crawling for specific sources:
UPDATE scraper_sources 
SET config = jsonb_set(
  config, 
  '{useCrawl}', 
  'false'::jsonb
) 
WHERE name = 'Some Source Name';

-- Configure max pages to crawl:
UPDATE scraper_sources 
SET config = jsonb_set(
  config, 
  '{maxPages}', 
  '50'::jsonb
) 
WHERE name = 'smsticket cz';

-- Configure max depth:
UPDATE scraper_sources 
SET config = jsonb_set(
  config, 
  '{maxDepth}', 
  '3'::jsonb
) 
WHERE name = 'smsticket cz';
```

## Testing the Fixes

### 1. Test Single Source Scraping

```bash
# Test scraping smsticket.cz specifically
npm run scrape
```

Or via API:
```bash
curl -X POST http://localhost:3000/api/scraper \
  -H "Content-Type: application/json" \
  -d '{"action": "scrape-source", "sourceId": "YOUR_SOURCE_ID"}'
```

### 2. Test All Sources

```bash
# Test all enabled sources
npm run scrape:run
```

Or via API:
```bash
curl -X POST http://localhost:3000/api/scraper/sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

### 3. Check Results

Query Supabase to see how many events were found:
```sql
SELECT 
  source,
  COUNT(*) as event_count,
  MIN(date) as earliest_event,
  MAX(date) as latest_event
FROM events
WHERE source = 'scraper'
GROUP BY source
ORDER BY event_count DESC;
```

## Expected Improvements

1. **More Events Found**: Should now find significantly more events per source
2. **Multi-Page Coverage**: Crawling will discover events across multiple pages
3. **Better Content Extraction**: Full content is passed to GPT, not truncated
4. **More Events Extracted**: Higher token limit allows GPT to extract more events

## Monitoring

Watch the logs for:
- `🔍 Crawled X pages, total markdown length: Y` - Shows how many pages were crawled
- `🔍 Extracted X events from SOURCE_NAME` - Shows how many events were extracted
- `⚠️ Crawl failed, falling back to single-page scrape` - Crawl failed but scrape should still work

## Cost Considerations

- **Crawling**: Crawling multiple pages uses more Firecrawl credits than single-page scraping
- **GPT Tokens**: Increased `max_tokens` from 3000 to 16000 will increase OpenAI costs per extraction
- **Model Selection**: 
  - `gpt-4o-mini`: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens (cheapest)
  - `gpt-4o`: ~$2.50 per 1M input tokens, ~$10.00 per 1M output tokens (better quality)
  - `gpt-4-turbo`: ~$10.00 per 1M input tokens, ~$30.00 per 1M output tokens (best quality)
- **Recommendation**: 
  - Start with `gpt-4o-mini` for cost efficiency
  - Upgrade to `gpt-4o` if extraction quality is insufficient
  - Monitor costs and adjust `maxPages` per source based on needs

## Next Steps

1. **Run a test scrape** on smsticket.cz to verify improvements
2. **Monitor the logs** to see how many pages are being crawled
3. **Check Supabase** to verify more events are being stored
4. **Adjust `maxPages`** per source if needed (some sources may need more/less pages)
5. **Consider disabling crawling** for sources that don't need it (single-page sites)

## Troubleshooting

### If crawling fails:
- Check Firecrawl API key is valid
- Check Firecrawl credits are available
- The code will automatically fall back to single-page scraping

### If still seeing few events:
- Check the markdown length in logs - if it's still short, the site might need different configuration
- Try increasing `waitFor` time for JavaScript-heavy sites
- Check if the site requires authentication or has anti-bot protection
- Review the scraped markdown content to see if events are actually in the content

### If GPT extraction fails:
- Check OpenAI API key is valid
- Check OpenAI credits are available
- Review the GPT response logs to see what's being returned

## Files Modified

- `src/lib/services/event-scraper.ts` - Main scraping logic with all fixes

## Branch Status

The Firecrawl implementation is already in the main branch. No branch merging needed - all fixes are in the current codebase.

