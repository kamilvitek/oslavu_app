// Example usage of enhanced location-based searching
// This file demonstrates how to use the new radius and fallback features

import { ticketmasterService } from './ticketmaster';
import { eventbriteService } from './eventbrite';
import { predicthqService } from './predicthq';
import { conflictAnalysisService } from './conflict-analysis';

/**
 * Example: Basic radius search for events
 */
export async function exampleBasicRadiusSearch() {
  const city = 'Prague';
  const startDate = '2024-06-01';
  const endDate = '2024-06-30';
  const category = 'Technology';
  const radius = '50km';

  console.log(`🔍 Searching for ${category} events in ${city} within ${radius}`);

  // Ticketmaster with radius
  const ticketmasterEvents = await ticketmasterService.getEventsWithRadius(
    city, startDate, endDate, '50', category
  );
  console.log(`🎟️ Ticketmaster: Found ${ticketmasterEvents.length} events`);

  // Eventbrite with radius
  const eventbriteEvents = await eventbriteService.getEventsWithRadius(
    city, startDate, endDate, '50km', category
  );
  console.log(`🎫 Eventbrite: Found ${eventbriteEvents.length} events`);

  // PredictHQ with radius
  const predicthqEvents = await predicthqService.getEventsWithRadius(
    city, startDate, endDate, '50km', category
  );
  console.log(`🔮 PredictHQ: Found ${predicthqEvents.length} events`);

  return {
    ticketmaster: ticketmasterEvents,
    eventbrite: eventbriteEvents,
    predicthq: predicthqEvents
  };
}

/**
 * Example: Comprehensive fallback search
 */
export async function exampleComprehensiveFallback() {
  const city = 'Brno';
  const startDate = '2024-07-01';
  const endDate = '2024-07-31';
  const category = 'Business';
  const radius = '25km';

  console.log(`🔍 Comprehensive fallback search for ${category} events in ${city}`);

  // Ticketmaster comprehensive fallback
  const ticketmasterEvents = await ticketmasterService.getEventsWithComprehensiveFallback(
    city, startDate, endDate, category, '25'
  );
  console.log(`🎟️ Ticketmaster: Found ${ticketmasterEvents.length} events with comprehensive fallback`);

  // Eventbrite comprehensive fallback
  const eventbriteEvents = await eventbriteService.getEventsWithComprehensiveFallback(
    city, startDate, endDate, category, '25km'
  );
  console.log(`🎫 Eventbrite: Found ${eventbriteEvents.length} events with comprehensive fallback`);

  // PredictHQ comprehensive fallback
  const predicthqEvents = await predicthqService.getEventsWithComprehensiveFallback(
    city, startDate, endDate, category, '25km'
  );
  console.log(`🔮 PredictHQ: Found ${predicthqEvents.length} events with comprehensive fallback`);

  return {
    ticketmaster: ticketmasterEvents,
    eventbrite: eventbriteEvents,
    predicthq: predicthqEvents
  };
}

/**
 * Example: Conflict analysis with radius parameters
 */
export async function exampleConflictAnalysisWithRadius() {
  const analysisParams = {
    city: 'Prague',
    category: 'Technology',
    expectedAttendees: 500,
    startDate: '2024-08-15',
    endDate: '2024-08-17',
    dateRangeStart: '2024-08-01',
    dateRangeEnd: '2024-08-31',
    venue: 'Prague Congress Centre',
    enableAdvancedAnalysis: true,
    searchRadius: '50km', // Search within 50km radius
    useComprehensiveFallback: true // Use all fallback strategies
  };

  console.log(`🎯 Running conflict analysis with radius search for ${analysisParams.city}`);

  const result = await conflictAnalysisService.analyzeConflicts(analysisParams);

  console.log(`📊 Analysis Results:`);
  console.log(`  - Total events found: ${result.allEvents.length}`);
  console.log(`  - Recommended dates: ${result.recommendedDates.length}`);
  console.log(`  - High risk dates: ${result.highRiskDates.length}`);

  return result;
}

/**
 * Example: Different radius sizes for different event types
 */
export async function exampleAdaptiveRadiusSearch() {
  const city = 'London';
  const startDate = '2024-09-01';
  const endDate = '2024-09-30';

  // Small events: 25km radius
  const smallEvents = await ticketmasterService.getEventsWithRadius(
    city, startDate, endDate, '25', 'Networking'
  );
  console.log(`🎟️ Small events (25km): ${smallEvents.length} events`);

  // Medium events: 50km radius
  const mediumEvents = await ticketmasterService.getEventsWithRadius(
    city, startDate, endDate, '50', 'Business'
  );
  console.log(`🎟️ Medium events (50km): ${mediumEvents.length} events`);

  // Large events: 100km radius
  const largeEvents = await ticketmasterService.getEventsWithRadius(
    city, startDate, endDate, '100', 'Conferences'
  );
  console.log(`🎟️ Large events (100km): ${largeEvents.length} events`);

  return {
    small: smallEvents,
    medium: mediumEvents,
    large: largeEvents
  };
}

/**
 * Example: Market-based search for major cities
 */
export async function exampleMarketBasedSearch() {
  const city = 'Berlin';
  const startDate = '2024-10-01';
  const endDate = '2024-10-31';
  const category = 'Entertainment';

  console.log(`🏙️ Market-based search for ${category} events in ${city}`);

  // This will use the market ID for Berlin (DE-BER)
  const events = await ticketmasterService.getEvents({
    marketId: 'DE-BER',
    startDateTime: `${startDate}T00:00:00Z`,
    endDateTime: `${endDate}T23:59:59Z`,
    classificationName: 'Arts & Theatre',
    size: 200
  });

  console.log(`🎟️ Market-based search: Found ${events.events.length} events`);
  return events.events;
}

/**
 * Example: Postal code search for precise location targeting
 */
export async function examplePostalCodeSearch() {
  const city = 'Prague';
  const startDate = '2024-11-01';
  const endDate = '2024-11-30';
  const category = 'Arts & Culture';

  console.log(`📮 Postal code search for ${category} events in ${city}`);

  // This will use the postal code for Prague (11000)
  const events = await ticketmasterService.getEvents({
    postalCode: '11000',
    countryCode: 'CZ',
    startDateTime: `${startDate}T00:00:00Z`,
    endDateTime: `${endDate}T23:59:59Z`,
    classificationName: 'Arts & Theatre',
    size: 200
  });

  console.log(`🎟️ Postal code search: Found ${events.events.length} events`);
  return events.events;
}

// Export all examples for easy testing
export const locationSearchExamples = {
  basicRadiusSearch: exampleBasicRadiusSearch,
  comprehensiveFallback: exampleComprehensiveFallback,
  conflictAnalysisWithRadius: exampleConflictAnalysisWithRadius,
  adaptiveRadiusSearch: exampleAdaptiveRadiusSearch,
  marketBasedSearch: exampleMarketBasedSearch,
  postalCodeSearch: examplePostalCodeSearch
};
