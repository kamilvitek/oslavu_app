// src/lib/services/category-testing.ts
import { ticketmasterService } from './ticketmaster';
import { eventbriteService } from './eventbrite';
import { predicthqService } from './predicthq';

export interface CategoryTestResult {
  service: string;
  category: string;
  withCategory: number;
  withoutCategory: number;
  effectiveness: number;
  categoryUsed: string | undefined;
  success: boolean;
  error?: string;
}

export interface CategoryComparisonResult {
  category: string;
  city: string;
  startDate: string;
  endDate: string;
  results: CategoryTestResult[];
  overallEffectiveness: number;
  bestService: string;
  worstService: string;
}

/**
 * Test category effectiveness across all event services
 */
export async function testCategoryEffectiveness(
  city: string,
  startDate: string,
  endDate: string,
  category: string
): Promise<CategoryComparisonResult> {
  const results: CategoryTestResult[] = [];
  
  // Test Ticketmaster
  try {
    const ticketmasterResult = await ticketmasterService.testCategoryEffectiveness(
      city,
      startDate,
      endDate,
      category
    );
    results.push({
      service: 'ticketmaster',
      category,
      ...ticketmasterResult,
      success: true,
    });
  } catch (error) {
    results.push({
      service: 'ticketmaster',
      category,
      withCategory: 0,
      withoutCategory: 0,
      effectiveness: 0,
      categoryUsed: undefined,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test Eventbrite
  try {
    const eventbriteResult = await eventbriteService.testCategoryEffectiveness(
      city,
      startDate,
      endDate,
      category
    );
    results.push({
      service: 'eventbrite',
      category,
      ...eventbriteResult,
      success: true,
    });
  } catch (error) {
    results.push({
      service: 'eventbrite',
      category,
      withCategory: 0,
      withoutCategory: 0,
      effectiveness: 0,
      categoryUsed: undefined,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test PredictHQ
  try {
    const predicthqResult = await predicthqService.testCategoryEffectiveness(
      city,
      startDate,
      endDate,
      category
    );
    results.push({
      service: 'predicthq',
      category,
      ...predicthqResult,
      success: true,
    });
  } catch (error) {
    results.push({
      service: 'predicthq',
      category,
      withCategory: 0,
      withoutCategory: 0,
      effectiveness: 0,
      categoryUsed: undefined,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Calculate overall effectiveness (average of successful tests)
  const successfulResults = results.filter(r => r.success);
  const overallEffectiveness = successfulResults.length > 0
    ? successfulResults.reduce((sum, r) => sum + r.effectiveness, 0) / successfulResults.length
    : 0;

  // Find best and worst performing services
  const bestService = successfulResults.reduce((best, current) => 
    current.effectiveness > best.effectiveness ? current : best, 
    successfulResults[0] || { service: 'none', effectiveness: 0 }
  ).service;

  const worstService = successfulResults.reduce((worst, current) => 
    current.effectiveness < worst.effectiveness ? current : worst, 
    successfulResults[0] || { service: 'none', effectiveness: 0 }
  ).service;

  const comparisonResult: CategoryComparisonResult = {
    category,
    city,
    startDate,
    endDate,
    results,
    overallEffectiveness,
    bestService,
    worstService,
  };

  // Log comprehensive results
  console.log(`\n📊 Category Effectiveness Test Results for "${category}" in ${city}:`);
  console.log(`📅 Date Range: ${startDate} to ${endDate}`);
  console.log(`📈 Overall Effectiveness: ${overallEffectiveness.toFixed(1)}%`);
  console.log(`🏆 Best Service: ${bestService}`);
  console.log(`📉 Worst Service: ${worstService}`);
  console.log('\n📋 Detailed Results:');
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const categoryInfo = result.categoryUsed ? ` (${result.categoryUsed})` : ' (no filter)';
    console.log(`  ${status} ${result.service}: ${result.effectiveness.toFixed(1)}%${categoryInfo}`);
    if (!result.success && result.error) {
      console.log(`    Error: ${result.error}`);
    }
  });

  return comparisonResult;
}

/**
 * Test multiple categories at once
 */
export async function testMultipleCategories(
  city: string,
  startDate: string,
  endDate: string,
  categories: string[]
): Promise<CategoryComparisonResult[]> {
  console.log(`\n🧪 Testing ${categories.length} categories in ${city}...`);
  
  const results: CategoryComparisonResult[] = [];
  
  for (const category of categories) {
    try {
      const result = await testCategoryEffectiveness(city, startDate, endDate, category);
      results.push(result);
      
      // Add a small delay between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Failed to test category "${category}":`, error);
    }
  }

  // Log summary
  console.log(`\n📊 Summary of ${categories.length} category tests:`);
  results.forEach(result => {
    console.log(`  ${result.category}: ${result.overallEffectiveness.toFixed(1)}% (best: ${result.bestService})`);
  });

  return results;
}

/**
 * Get events with fallback strategy across all services
 */
export async function getEventsWithFallback(
  city: string,
  startDate: string,
  endDate: string,
  category?: string
): Promise<{
  ticketmaster: any[];
  eventbrite: any[];
  predicthq: any[];
  total: number;
}> {
  console.log(`\n🔍 Fetching events with fallback strategy for "${category || 'all categories'}" in ${city}...`);

  const [ticketmasterEvents, eventbriteEvents, predicthqEvents] = await Promise.allSettled([
    ticketmasterService.getEventsWithFallback(city, startDate, endDate, category),
    eventbriteService.getEventsWithFallback(city, startDate, endDate, category),
    predicthqService.getEventsWithFallback(city, startDate, endDate, category),
  ]);

  const ticketmaster = ticketmasterEvents.status === 'fulfilled' ? ticketmasterEvents.value : [];
  const eventbrite = eventbriteEvents.status === 'fulfilled' ? eventbriteEvents.value : [];
  const predicthq = predicthqEvents.status === 'fulfilled' ? predicthqEvents.value : [];

  const total = ticketmaster.length + eventbrite.length + predicthq.length;

  console.log(`📊 Fallback Results:`);
  console.log(`  🎟️ Ticketmaster: ${ticketmaster.length} events`);
  console.log(`  🎫 Eventbrite: ${eventbrite.length} events`);
  console.log(`  🔮 PredictHQ: ${predicthq.length} events`);
  console.log(`  📈 Total: ${total} events`);

  return {
    ticketmaster,
    eventbrite,
    predicthq,
    total,
  };
}

/**
 * Business-focused categories for testing
 */
export const BUSINESS_CATEGORIES = [
  'Technology',
  'Business',
  'Marketing',
  'Finance',
  'Professional Development',
  'Networking',
  'Conferences',
  'Trade Shows',
  'Expos',
  'Healthcare',
  'Education',
  'Academic',
];

/**
 * All available categories for testing
 */
export const ALL_CATEGORIES = [
  ...BUSINESS_CATEGORIES,
  'Entertainment',
  'Music',
  'Arts & Culture',
  'Film',
  'Sports',
  'Other',
];
