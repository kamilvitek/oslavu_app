<!-- b4d0e99f-6693-4e67-8fa5-307daea9a0a1 4c6b7cef-0827-41e2-86dd-d3220af6d533 -->
# Scalable AI-First Pagination Detection and Fix

## Problem Analysis

The scraper is only finding 2 events from websites instead of tens of events visible on sites. This suggests:

1. Crawl mode may not be enabled (`use_crawl = false` or missing `crawl_config`)
2. Pagination links are not being detected/followed automatically
3. Only the first page is being processed
4. No intelligent detection of pagination patterns across different websites

## Implementation Steps

### Phase 1: AI-Powered Pagination Detection

**File: `src/lib/services/event-scraper.ts`**

1. **Create AI-based pagination detection function** (new function, ~line 1600+)

- Use GPT to analyze HTML and detect pagination patterns
- Extract pagination URLs, page numbers, and navigation patterns
- Return structured pagination data (page URLs, next buttons, page numbers)
- Handle multiple languages (Czech, English, etc.) via AI
- Detect pagination types: numbered pages, "load more", infinite scroll, next/prev buttons

2. **Add automatic pagination URL discovery** (around line 350-370)

- After initial crawl, analyze HTML from first page with AI
- Detect pagination links and patterns automatically
- Add discovered pagination URLs to crawl queue dynamically
- Log discovered pagination patterns for transparency

3. **Implement intelligent pagination following** (around line 280-350)

- Use AI to determine if more pages exist after each page crawl
- Automatically follow pagination links until no more events found
- Track pagination state to avoid infinite loops
- Handle different pagination types dynamically

### Phase 2: Enhanced Diagnostic Logging (Generic)

**File: `src/lib/services/event-scraper.ts`**

4. **Add comprehensive source configuration logging** (around line 200)

- Log `use_crawl`, `crawl_config`, and `max_pages_per_crawl` for any source
- Log which mode is being used (crawl vs scrape)
- Log the merged crawl configuration
- Warn if crawl mode is disabled when pagination is detected

5. **Add pagination detection logging** (around line 350-370)

- Log total pages found by Firecrawl
- Log page URLs discovered (first 20)
- Log pagination patterns detected by AI
- Log pagination URLs automatically discovered

6. **Add event extraction logging per page** (around line 403-424)

- Log events found per page URL
- Log if any pages returned 0 events despite having content
- Log content length per page to identify empty pages
- Track event discovery rate across pages

### Phase 3: Auto-Configuration with AI Assistance

**File: `src/lib/services/event-scraper.ts`**

7. **Add intelligent crawl mode detection** (around line 200)

- Use AI to analyze website structure and detect if pagination exists
- Automatically suggest enabling crawl mode if pagination detected
- Auto-configure `maxPages` based on detected pagination patterns
- Log recommendations for manual review (optional auto-enable flag)

8. **Implement adaptive pagination handling** (new function)

- Detect pagination type (numbered, infinite scroll, load more) via AI
- Apply appropriate actions based on pagination type dynamically
- Use AI to generate site-specific pagination actions
- Fallback to generic actions if AI detection fails

### Phase 4: Generic Pagination Actions (AI-Enhanced)

**File: `src/lib/services/event-scraper.ts`**

9. **Enhance buildGenericActions with AI assistance** (around line 1226-1268)

- Use AI to detect pagination terms in page language automatically
- Dynamically generate pagination click actions based on detected terms
- Support multiple languages automatically (no hardcoding)
- Include common pagination patterns (numbered, next/prev, load more)

10. **Add AI-powered pagination URL extraction** (new function)

- Use GPT to extract pagination URLs from HTML
- Handle various pagination formats (query params, path segments, etc.)
- Return normalized pagination URLs
- Log extraction confidence and patterns found

### Phase 5: Smart Crawl Configuration

**File: `src/lib/services/crawl-configuration.service.ts`**

11. **Enhance preset system with auto-detection** (around line 6-12)

- Keep existing hostname-based presets for known sites
- Add fallback to generic preset with AI-enhanced actions
- Allow AI to suggest optimizations based on site structure

12. **Improve generic preset with AI** (around line 66-72)

- Use AI to analyze site structure and suggest optimal settings
- Dynamically adjust `maxDepth` and `maxPages` based on site complexity
- Generate site-specific `allowList` patterns via AI analysis
- Include AI-detected pagination actions

### Phase 6: Enhanced Logging and Monitoring (Generic)

**File: `src/lib/services/event-scraper.ts`**

13. **Add comprehensive crawl summary logging** (around line 473)

- Log total pages crawled vs processed for any source
- Log events found per page
- Log pagination URLs discovered (AI and manual)
- Log pagination patterns detected
- Log if pagination was successfully followed

14. **Add intelligent warnings** (around line 1399-1600)

- If events found < expected (based on page count), log warning
- Use AI to analyze if pagination might have been missed
- Suggest specific fixes based on detected pagination patterns
- Log page URLs that returned 0 events with content analysis

### Phase 7: Auto-Remediation

**File: `src/lib/services/event-scraper.ts`**

15. **Implement automatic retry with pagination** (around line 530-600)

- If initial scrape finds few events, automatically retry with crawl mode
- Use AI to detect if pagination exists and was missed
- Auto-enable crawl mode if pagination detected but not followed
- Log auto-remediation actions taken

16. **Add pagination validation** (new function)

- After crawl, use AI to verify if all pagination was followed
- Check if event count matches expected based on page structure
- Suggest additional pages to crawl if pagination incomplete
- Log validation results and recommendations

## Expected Outcomes

After implementation:

- Diagnostic logs will show pagination detection for any website
- AI will automatically detect and follow pagination patterns
- Crawl mode will be intelligently enabled when needed
- Pagination links will be detected across languages and formats
- All pages of events will be crawled automatically
- Event count should match or exceed visible events on any website
- Solution works for JIC, GoOut, TicketPortal, and any future sources
- No manual configuration needed per website

## Files to Modify

1. `src/lib/services/event-scraper.ts` - Add AI pagination detection, improve logging, auto-configuration
2. `src/lib/services/crawl-configuration.service.ts` - Enhance generic preset with AI assistance

## AI Integration Points

1. **Pagination Pattern Detection**: GPT analyzes HTML to find pagination links
2. **Language Detection**: AI detects page language and generates appropriate pagination terms
3. **Pagination Type Detection**: AI identifies pagination style (numbered, infinite scroll, etc.)
4. **URL Extraction**: AI extracts and normalizes pagination URLs from various formats
5. **Configuration Suggestions**: AI suggests optimal crawl settings based on site analysis
6. **Validation**: AI verifies if all pagination was followed correctly

## Dependencies

- OpenAI API for pagination detection and analysis
- Firecrawl API must support pagination following
- Existing GPT extraction infrastructure

### To-dos

- [ ] Create AI-based pagination detection function using GPT to analyze HTML and detect pagination patterns across languages
- [ ] Add automatic pagination URL discovery that uses AI to find and add pagination links to crawl queue dynamically
- [ ] Implement intelligent pagination following that uses AI to determine if more pages exist and follows them automatically
- [ ] Add comprehensive diagnostic logging for source configuration, crawl mode, and pagination detection (generic for all sources)
- [ ] Add intelligent crawl mode detection using AI to analyze website structure and suggest enabling crawl mode
- [ ] Implement adaptive pagination handling that detects pagination type via AI and applies appropriate actions dynamically
- [ ] Enhance buildGenericActions with AI assistance to detect pagination terms in page language and generate actions dynamically
- [ ] Add AI-powered pagination URL extraction function that handles various pagination formats
- [ ] Improve generic preset in CrawlConfigurationService with AI to analyze site structure and suggest optimal settings
- [ ] Add comprehensive crawl summary logging for any source (pages, events per page, pagination URLs, patterns)
- [ ] Add intelligent warnings that use AI to analyze if pagination might have been missed and suggest fixes
- [ ] Implement automatic retry with pagination if initial scrape finds few events, using AI to detect missed pagination
- [ ] Add pagination validation using AI to verify if all pagination was followed and suggest additional pages if needed
- [ ] Test the scalable solution with multiple sources (JIC, GoOut, TicketPortal) to verify it works generically