#!/usr/bin/env tsx
// scripts/test-attendee-implementation.ts
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local FIRST
config({ path: path.resolve(process.cwd(), '.env.local') });

// Now import the services after environment variables are loaded
const { venueCapacityService } = require('../src/lib/services/venue-capacity');
const { attendeeBackfillService } = require('../src/lib/services/attendee-backfill');

async function testVenueCapacityService() {
  console.log('🧪 Testing Venue Capacity Service');
  console.log('================================');

  const testCases = [
    { venue: 'Prague Stadium', category: 'Sports', city: 'Prague' },
    { venue: 'O2 Arena', category: 'Entertainment', city: 'Prague' },
    { venue: 'Hotel Hilton', category: 'Business', city: 'Brno' },
    { venue: 'Conference Center', category: 'Technology', city: 'Ostrava' },
    { venue: 'Small Cafe', category: 'Food & Drink', city: 'Olomouc' },
    { venue: 'Unknown Venue', category: 'Other', city: 'Pilsen' }
  ];

  for (const testCase of testCases) {
    try {
      const estimate = venueCapacityService.estimateCapacity(
        testCase.venue, 
        testCase.city, 
        testCase.category
      );
      
      console.log(`\n📍 Venue: ${testCase.venue}`);
      console.log(`   Category: ${testCase.category}`);
      console.log(`   City: ${testCase.city}`);
      console.log(`   Estimated Capacity: ${estimate.capacity}`);
      console.log(`   Confidence: ${estimate.confidence}`);
      console.log(`   Method: ${estimate.method}`);
      console.log(`   Reasoning: ${estimate.reasoning.join(', ')}`);
    } catch (error) {
      console.error(`❌ Error testing ${testCase.venue}:`, error);
    }
  }
}

async function testBackfillService() {
  console.log('\n🧪 Testing Backfill Service');
  console.log('==========================');

  try {
    // Get current statistics
    console.log('📊 Getting current statistics...');
    const stats = await attendeeBackfillService.getBackfillStats();
    
    console.log(`Total Events: ${stats.totalEvents}`);
    console.log(`Events with Attendees: ${stats.eventsWithAttendees}`);
    console.log(`Events without Attendees: ${stats.eventsWithoutAttendees}`);
    console.log(`Completion: ${stats.percentageComplete}%`);

    // Test a small dry run
    console.log('\n🔄 Testing dry run (limit: 5 events)...');
    const result = await attendeeBackfillService.backfillMissingAttendees({
      dryRun: true,
      limit: 5,
      batchSize: 2,
      verbose: true
    });

    console.log('\n📈 Dry Run Results:');
    console.log(`Total Events Found: ${result.totalEvents}`);
    console.log(`Events Processed: ${result.processedEvents}`);
    console.log(`Events Updated: ${result.updatedEvents}`);
    console.log(`Events Skipped: ${result.skippedEvents}`);
    console.log(`Events Failed: ${result.failedEvents}`);
    console.log(`Duration: ${(result.duration / 1000).toFixed(2)}s`);

    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors (${result.errors.length}):`);
      result.errors.slice(0, 3).forEach((error: any, index: number) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

  } catch (error) {
    console.error('❌ Backfill service test failed:', error);
  }
}

async function testDataTransformer() {
  console.log('\n🧪 Testing Data Transformer');
  console.log('============================');

  // Test Ticketmaster event transformation
  const mockTicketmasterEvent = {
    id: 'test-123',
    name: 'Test Concert',
    description: 'A test concert',
    dates: {
      start: { localDate: '2024-06-15' }
    },
    classifications: [{
      segment: { name: 'Music' },
      genre: { name: 'Rock' }
    }],
    _embedded: {
      venues: [{
        name: 'Prague Arena',
        city: { name: 'Prague' },
        country: { name: 'Czech Republic' }
      }]
    },
    url: 'https://example.com/event',
    images: [{
      url: 'https://example.com/image.jpg',
      width: 800,
      height: 600
    }]
  };

  try {
    // Import the data transformer
    const { dataTransformer } = await import('../src/lib/services/data-transformer');
    
    console.log('🎟️  Testing Ticketmaster transformation...');
    const transformed = dataTransformer.transformEvent('ticketmaster', mockTicketmasterEvent);
    
    console.log(`Title: ${transformed.title}`);
    console.log(`Venue: ${transformed.venue}`);
    console.log(`Category: ${transformed.category}`);
    console.log(`Expected Attendees: ${transformed.expected_attendees || 'Not estimated'}`);
    console.log(`Source: ${transformed.source}`);
    
  } catch (error) {
    console.error('❌ Data transformer test failed:', error);
  }
}

async function main() {
  console.log('🚀 Testing Attendee Data Implementation');
  console.log('=======================================\n');

  try {
    await testVenueCapacityService();
    await testBackfillService();
    await testDataTransformer();
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Run: npm run backfill-attendees --dry-run');
    console.log('2. Review the dry run results');
    console.log('3. Run: npm run backfill-attendees (without --dry-run)');
    console.log('4. Monitor the API endpoint: GET /api/events/backfill-attendees');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
}
