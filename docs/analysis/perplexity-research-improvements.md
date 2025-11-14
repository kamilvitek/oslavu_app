# Perplexity Research Service - Senior Engineering Analysis

## Executive Summary

This document identifies potential issues and improvements for the Perplexity Research Service from a senior startup founder/engineer perspective. Focus areas: cost optimization, reliability, scalability, and business logic.

---

## 🔴 Critical Issues

### 1. **In-Memory Cache Loss on Restart**
**Problem:** Cache is stored in a `Map` that's lost on server restart/deployment.
```typescript
private requestCache = new Map<string, { data: PerplexityConflictResearch; expiry: number }>();
```

**Impact:**
- Wasted API calls after deployments
- Higher costs
- Slower response times

**Solution:** Implement persistent database cache (similar to `audience_overlap_cache` pattern)
- Create `perplexity_research_cache` table
- Two-tier cache: memory (fast) + database (persistent)
- Cache key: `city:category:subcategory:date:expectedAttendees`

---

### 2. **Double API Cost on Empty Results**
**Problem:** Fallback prompt makes a second API call if first returns empty results.
```typescript
if (totalEventsFound === 0) {
  const simplePrompt = await this.generateSimplifiedPrompt(params);
  const fallbackResult = await this.callPerplexityAPI(simplePrompt);
}
```

**Impact:**
- 2x API cost for queries that return no results
- Could be 50% of queries (small cities, niche categories)

**Solution:**
- Add circuit breaker: Skip fallback if city is too small or category too niche
- Cache "no results" responses with shorter TTL (1 hour)
- Add configurable flag to disable fallback for cost-sensitive scenarios

---

### 3. **No Cost Tracking/Monitoring**
**Problem:** No visibility into API costs or usage patterns.

**Impact:**
- Can't optimize costs
- Can't detect anomalies
- Can't budget accurately

**Solution:**
- Track API calls in database: `perplexity_api_logs` table
- Log: timestamp, city, category, tokens used, cost estimate, success/failure
- Add metrics dashboard
- Set up alerts for cost spikes

---

### 4. **City Database Lookup Can Block**
**Problem:** `getNearbyCitiesForPrompt()` can take time (AI fallback), blocking prompt generation.

**Impact:**
- Slow response times
- Timeout risk
- Poor UX

**Solution:**
- Add timeout (5 seconds) for city lookup
- Use cached city relationships when available
- Fallback to hardcoded list immediately if timeout
- Consider async pre-warming for common cities

---

## 🟡 High Priority Issues

### 5. **Hardcoded Thresholds**
**Problem:** 1000 attendee threshold is hardcoded.
```typescript
const isLargeEvent = expectedAttendees >= 1000;
```

**Impact:**
- Not flexible for different event types
- Business conferences might compete differently than music festivals
- Can't A/B test different thresholds

**Solution:**
- Make threshold configurable per category/event type
- Business events: 500+ (more local competition)
- Music festivals: 1000+ (regional competition)
- Store in config table or environment variables

---

### 6. **No Retry Logic for API Failures**
**Problem:** Single API call attempt, no retry on transient failures.

**Impact:**
- Unnecessary failures
- Poor reliability
- Wasted user requests

**Solution:**
- Implement exponential backoff retry (3 attempts)
- Retry only on 5xx errors or network timeouts
- Don't retry on 4xx (invalid request) or rate limits

---

### 7. **No Rate Limit Handling**
**Problem:** No handling for Perplexity API rate limits.

**Impact:**
- Service breaks under load
- No graceful degradation

**Solution:**
- Check response headers for rate limit info
- Implement queue for rate-limited requests
- Return cached results if available during rate limit
- Add exponential backoff

---

### 8. **No Validation of Perplexity Results**
**Problem:** Results aren't validated for:
- Past dates (events in the past)
- Unrealistic attendance numbers
- Invalid locations (wrong country)
- Duplicate events

**Impact:**
- Bad data in system
- Poor user experience
- Wasted processing

**Solution:**
- Validate dates are in future (or within reasonable window)
- Validate attendance numbers are realistic (1-1,000,000)
- Validate locations match target country (Czech Republic)
- Deduplicate events by name+date+location

---

### 9. **No Confidence Scoring Based on Source Quality**
**Problem:** All Perplexity events treated equally, regardless of source quality.

**Impact:**
- Can't prioritize high-quality results
- Can't filter low-confidence events

**Solution:**
- Score confidence based on:
  - Source URL quality (official sites = higher)
  - Date specificity (exact date = higher)
  - Attendance data availability
  - Description completeness
- Filter events below confidence threshold

---

## 🟢 Medium Priority Improvements

### 10. **No Observability/Metrics**
**Problem:** Limited logging, no metrics on:
- Prompt effectiveness
- Success rates
- Average response times
- Cost per query

**Solution:**
- Add structured logging
- Track metrics: success rate, avg tokens, avg cost, cache hit rate
- Add Prometheus/DataDog integration
- Create dashboard for monitoring

---

### 11. **Prompt Not Optimized for Token Usage**
**Problem:** Prompt is verbose, could be optimized to reduce tokens.

**Impact:**
- Higher costs
- Slower responses

**Solution:**
- Review prompt for redundancy
- Use shorter, more direct instructions
- Test different prompt lengths
- Measure token usage vs. result quality

---

### 12. **No A/B Testing Capability**
**Problem:** Can't test different prompt strategies.

**Impact:**
- Can't optimize prompts
- Can't measure improvements

**Solution:**
- Add prompt versioning
- Track which version performs better
- Gradually roll out better versions

---

### 13. **Timezone Handling**
**Problem:** Dates might be interpreted in wrong timezone.

**Impact:**
- Events might be filtered incorrectly
- Date comparisons might be off

**Solution:**
- Explicitly specify timezone in prompts (Europe/Prague)
- Normalize all dates to UTC
- Validate date parsing

---

### 14. **Multi-Day Event Handling**
**Problem:** Prompt doesn't explicitly handle multi-day events well.

**Impact:**
- Might miss events that span multiple days
- Date filtering might exclude valid events

**Solution:**
- Update prompt to explicitly handle date ranges
- Update validation to check if event overlaps with target date range

---

## 🔵 Nice-to-Have Improvements

### 15. **Virtual/Hybrid Events**
**Problem:** No consideration for virtual events that don't have location constraints.

**Impact:**
- Virtual events might be incorrectly filtered by location

**Solution:**
- Detect virtual events in prompt
- Don't apply location filtering for virtual events
- Consider them as competing regardless of location

---

### 16. **Event Type-Specific Logic**
**Problem:** All event types treated the same.

**Impact:**
- Business conferences might compete differently than concerts
- Different temporal windows might be needed

**Solution:**
- Category-specific temporal windows
- Business: 3 days before/after
- Music: 7 days before/after
- Festivals: 14 days before/after

---

### 17. **Circuit Breaker Pattern**
**Problem:** No circuit breaker for repeated failures.

**Impact:**
- Continues making expensive calls when API is down
- Wastes resources

**Solution:**
- Implement circuit breaker
- Open circuit after 5 consecutive failures
- Half-open after 1 minute
- Use cached results when circuit is open

---

### 18. **Batch Processing for Multiple Dates**
**Problem:** Each date range requires separate API call.

**Impact:**
- High cost for date range queries
- Slow for multiple dates

**Solution:**
- Batch multiple dates in single prompt when possible
- Use date ranges instead of individual dates
- Optimize prompt to handle multiple dates efficiently

---

## 📊 Recommended Implementation Priority

### Phase 1 (Immediate - This Week)
1. ✅ Persistent database cache
2. ✅ Cost tracking/logging
3. ✅ City lookup timeout
4. ✅ Result validation (dates, locations)

### Phase 2 (Short-term - This Month)
5. ✅ Configurable thresholds
6. ✅ Retry logic
7. ✅ Rate limit handling
8. ✅ Confidence scoring

### Phase 3 (Medium-term - Next Quarter)
9. ✅ Observability/metrics
10. ✅ Prompt optimization
11. ✅ A/B testing framework
12. ✅ Circuit breaker

---

## 💰 Cost Optimization Estimate

**Current State:**
- Average cost per query: ~$0.01-0.02 (estimated)
- With fallback: ~$0.02-0.04 for empty results
- 1000 queries/month = $20-40

**With Improvements:**
- Persistent cache: 50% cache hit rate = 50% cost reduction
- Skip fallback for small cities: 30% reduction in double calls
- Result validation: Prevents bad data processing costs

**Estimated Savings: 40-60% reduction in API costs**

---

## 🎯 Success Metrics to Track

1. **Cost Metrics:**
   - Cost per query
   - Total monthly cost
   - Cache hit rate
   - API calls per analysis

2. **Quality Metrics:**
   - Events found per query
   - Confidence scores
   - User satisfaction (if available)
   - False positive rate

3. **Performance Metrics:**
   - Average response time
   - P95/P99 response times
   - Timeout rate
   - Error rate

4. **Business Metrics:**
   - Queries per user
   - Feature adoption rate
   - Impact on conflict analysis accuracy

---

## 🔧 Quick Wins (Can Implement Today)

1. **Add timeout to city lookup** (5 minutes)
2. **Cache "no results" responses** (15 minutes)
3. **Add basic cost logging** (30 minutes)
4. **Validate dates are in future** (15 minutes)
5. **Add configurable threshold** (30 minutes)

**Total: ~2 hours of work for significant improvements**

