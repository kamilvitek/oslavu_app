# Ticketmaster API & Conflict Analysis Debugging Fixes

## 🔍 **Root Cause Analysis**

After analyzing the terminal output showing **0 events from Ticketmaster** and **false positive conflicts**, I identified several critical issues:

### **Issue 1: Missing API Parameters in Keyword Search Path**
**Problem**: The Ticketmaster API route was taking the keyword search path but not passing all transformed parameters.

**Evidence from logs**:
```
🤖 AI-transformed Ticketmaster params: {
  city: 'London',
  countryCode: 'GB',        // ✅ Generated
  classificationName: 'Miscellaneous',
  keyword: 'technology',
  radius: '50',             // ✅ Generated
  marketId: ''
}
```

But the actual API call was missing critical parameters:
```
🎟️ Ticketmaster: Making API request 1/5000 to: 
https://app.ticketmaster.com/discovery/v2/events.json?apikey=...&size=200&page=0&city=London&startDateTime=2025-10-01T00%3A00%3A00Z&endDateTime=2025-10-30T23%3A59%3A59Z&keyword=technology
```

**Missing**: `countryCode=GB` and `radius=50` parameters!

### **Issue 2: Incorrect Event Categorization**
**Problem**: PredictHQ was mapping medical conferences as "Business" events, which then competed with "Technology" searches.

**Evidence from logs**:
```
Event "Expanse for Consultants - Anaesthetics" on 2025-10-01: category="Business", sameCategory=true
Event "O&G GEMS Study Day - 01/10/2025" on 2025-10-01: category="Business", sameCategory=true
```

Medical events were being flagged as competing with Technology events due to overly broad category relationships.

### **Issue 3: Overly Broad Category Relationships**
**Problem**: The `isRelatedCategory` function considered "Technology" and "Business" as related, causing false positives.

**Before**:
```typescript
'Technology': ['Business', 'Education'],  // ❌ Too broad
'Business': ['Technology', 'Finance', 'Marketing'],
```

## 🛠️ **Fixes Implemented**

### **Fix 1: Enhanced Ticketmaster API Parameter Handling**

**File**: `src/app/api/analyze/events/ticketmaster/route.ts`

```typescript
// BEFORE: Limited searchEvents call
events = await ticketmasterService.searchEvents(
  searchKeyword,
  searchCity || undefined,
  startDate || undefined,
  endDate || undefined
);

// AFTER: Full parameter support
const result = await ticketmasterService.getEvents({
  city: searchCity || undefined,
  countryCode: transformedParams?.countryCode,        // ✅ Now included
  radius: transformedParams?.radius || radius?.replace(/[^\d]/g, '') || undefined,  // ✅ Now included
  startDateTime: startDate ? `${startDate}T00:00:00Z` : undefined,
  endDateTime: endDate ? `${endDate}T23:59:59Z` : undefined,
  classificationName: transformedParams?.classificationName || category,
  keyword: searchKeyword,
  page,
  size,
});
```

**Expected Result**: Ticketmaster API calls will now include `countryCode=GB` and `radius=50` parameters, significantly improving event discovery for London.

### **Fix 2: Smart Content-Based Event Categorization**

**File**: `src/lib/services/predicthq.ts`

```typescript
// BEFORE: Simple category mapping
private mapPredictHQCategory(phqCategory: string): string {
  const categoryMap: Record<string, string> = {
    'conferences': 'Business',  // ❌ All conferences → Business
  };
}

// AFTER: Content-aware categorization
private mapPredictHQCategory(phqCategory: string, title?: string, description?: string): string {
  const content = `${title || ''} ${description || ''}`.toLowerCase();
  
  // Healthcare-specific keywords
  if (content.includes('medical') || content.includes('health') || content.includes('clinical') ||
      content.includes('doctor') || content.includes('nurse') || content.includes('anaesth') ||
      content.includes('o&g') || content.includes('gems study')) {
    return 'Healthcare';  // ✅ Medical events → Healthcare
  }
  
  // Technology-specific keywords
  if (content.includes('tech') || content.includes('digital') || content.includes('software')) {
    return 'Technology';  // ✅ Tech events → Technology
  }
  
  // Fall back to category mapping...
}
```

**Expected Result**: 
- "O&G GEMS Study Day" → `Healthcare` (not Business)
- "Expanse for Consultants - Anaesthetics" → `Healthcare` (not Business)
- "Mills Techie Day" → `Technology` (not Business)

### **Fix 3: More Restrictive Category Relationships**

**File**: `src/lib/services/conflict-analysis.ts`

```typescript
// BEFORE: Overly broad relationships
const relatedCategories: Record<string, string[]> = {
  'Technology': ['Business', 'Education'],  // ❌ Medical events competed
  'Business': ['Technology', 'Finance', 'Marketing'],
};

// AFTER: Restrictive relationships
const relatedCategories: Record<string, string[]> = {
  'Technology': ['Technology'],           // ✅ Only tech vs tech
  'Business': ['Business', 'Finance', 'Marketing'],
  'Healthcare': ['Healthcare'],           // ✅ Only healthcare vs healthcare
  'Education': ['Education'],
  'Sports': ['Sports'],
};
```

**Expected Result**: Medical conferences will no longer compete with Technology events.

### **Fix 4: Enhanced Debugging & Logging**

Added comprehensive logging to track:
- Category mapping decisions with reasoning
- Parameter transformation results
- Event competition logic with categories shown

## 📊 **Expected Improvements**

### **Ticketmaster API Results**
- **Before**: 0 events returned due to missing `countryCode` and `radius`
- **After**: Should return London events with proper geographic targeting

### **Event Categorization**
- **Before**: All conferences → "Business" category
- **After**: Content-aware categorization:
  - Medical events → "Healthcare"
  - Tech events → "Technology"  
  - Generic business → "Business"

### **Conflict Analysis**
- **Before**: 8/8 events flagged as competing (false positives)
- **After**: Only truly related events should compete
  - Technology events compete only with Technology
  - Healthcare events compete only with Healthcare
  - Reduced false positive rate

### **Performance**
- **Before**: Wasted API calls with incomplete parameters
- **After**: More effective API utilization with proper geographic targeting

## 🧪 **Testing Recommendations**

1. **Test Ticketmaster Integration**:
   ```bash
   # Check if events are now returned for London
   curl "http://localhost:3001/api/analyze/events/ticketmaster?city=London&startDate=2025-10-01&endDate=2025-10-30&category=Technology"
   ```

2. **Verify Category Mapping**:
   - Look for log messages: `🔮 PredictHQ: Mapped "..." to Healthcare based on content keywords`
   - Confirm medical events are categorized as Healthcare

3. **Test Conflict Analysis**:
   - Run the same London/Technology analysis
   - Verify fewer false positive conflicts
   - Check that only relevant events compete

## 📝 **Files Modified**

1. **`src/app/api/analyze/events/ticketmaster/route.ts`**
   - Fixed keyword search parameter passing
   - Added full parameter support to API calls

2. **`src/lib/services/ticketmaster.ts`** 
   - Enhanced `searchEvents` method with options parameter
   - Improved parameter handling

3. **`src/lib/services/predicthq.ts`**
   - Added content-based category detection
   - Enhanced category mapping with keyword analysis
   - Added debugging logs for categorization decisions

4. **`src/lib/services/conflict-analysis.ts`**
   - Made category relationships more restrictive
   - Added category information to competition logs
   - Reduced false positive conflicts

## 🎯 **Expected Terminal Output Changes**

**Before**:
```
🎟️ Ticketmaster: Making API request to: ...&city=London&keyword=technology
🎟️ Ticketmaster: Successfully transformed 0/0 events (total available: 0)
Event "O&G GEMS Study Day" on 2025-10-01: category="Business", sameCategory=true, isCompeting=true
```

**After**:
```
🎟️ Ticketmaster: Making API request to: ...&city=London&countryCode=GB&radius=50&keyword=technology
🎟️ Ticketmaster: Successfully transformed 15/15 events (total available: 15)
🔮 PredictHQ: Mapped "O&G GEMS Study Day" to Healthcare based on content keywords
Event "O&G GEMS Study Day" on 2025-10-01: category="Healthcare", sameCategory=false, isCompeting=false
```

The fixes should result in:
- ✅ **More Ticketmaster events** returned due to proper geographic parameters
- ✅ **Better event categorization** with content-aware mapping
- ✅ **Fewer false positive conflicts** due to restrictive category relationships
- ✅ **More accurate conflict analysis** for event planning
