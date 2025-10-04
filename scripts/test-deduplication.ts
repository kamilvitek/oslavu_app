import { eventDeduplicator } from '../src/lib/services/event-deduplicator.js';
import { Event } from '../src/types/index.js';

/**
 * Test script for event deduplication functionality
 * 
 * This script tests the semantic deduplication service with various scenarios:
 * - Exact duplicates across different sources
 * - Similar events with slight variations
 * - Different events that should not be deduplicated
 * - Performance testing with larger datasets
 */

async function testDeduplication() {
  console.log('🧪 Starting Event Deduplication Tests...\n');

  // Test 1: Exact duplicates across different sources
  console.log('📋 Test 1: Exact Duplicates Across Sources');
  const exactDuplicates: Event[] = [
    {
      id: 'test-1',
      title: 'Tech Conference 2025',
      date: '2025-11-15',
      city: 'Prague',
      category: 'Technology',
      source: 'ticketmaster',
      sourceId: 'tm-123',
      description: 'Annual technology conference',
      venue: 'Prague Congress Centre',
      url: 'https://ticketmaster.com/tech-conf-2025',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'test-2',
      title: 'Tech Conference 2025',
      date: '2025-11-15',
      city: 'Prague',
      category: 'Technology',
      source: 'predicthq',
      sourceId: 'phq-456',
      description: 'Annual technology conference',
      venue: 'Prague Congress Centre',
      url: 'https://predicthq.com/events/tech-conf-2025',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'test-3',
      title: 'Tech Conference 2025',
      date: '2025-11-15',
      city: 'Prague',
      category: 'Technology',
      source: 'brno',
      sourceId: 'go-789',
      description: 'Annual technology conference',
      venue: 'Prague Congress Centre',
      url: 'https://goout.net/tech-conf-2025',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const result1 = await eventDeduplicator.deduplicateEvents(exactDuplicates);
  console.log(`✅ Input: ${exactDuplicates.length} events`);
  console.log(`✅ Output: ${result1.uniqueEvents.length} unique events`);
  console.log(`✅ Duplicates removed: ${result1.duplicatesRemoved}`);
  console.log(`✅ Processing time: ${result1.processingTimeMs}ms`);
  console.log(`✅ Cache hits: ${result1.cacheHits}, Cache misses: ${result1.cacheMisses}\n`);

  // Test 2: Similar events with variations
  console.log('📋 Test 2: Similar Events with Variations');
  const similarEvents: Event[] = [
    {
      id: 'test-4',
      title: 'AI Summit Prague',
      date: '2025-11-16',
      city: 'Prague',
      category: 'Technology',
      source: 'ticketmaster',
      sourceId: 'tm-ai-001',
      description: 'Artificial Intelligence conference',
      venue: 'Prague Convention Centre',
      url: 'https://ticketmaster.com/ai-summit-2025',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'test-5',
      title: 'AI Summit Prague 2025',
      date: '2025-11-16',
      city: 'Prague',
      category: 'Technology',
      source: 'predicthq',
      sourceId: 'phq-ai-002',
      description: 'Artificial Intelligence conference and exhibition',
      venue: 'Prague Convention Centre',
      url: 'https://predicthq.com/events/ai-summit-2025',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'test-6',
      title: 'Machine Learning Conference',
      date: '2025-11-17',
      city: 'Prague',
      category: 'Technology',
      source: 'brno',
      sourceId: 'go-ml-003',
      description: 'Machine Learning and AI conference',
      venue: 'Prague Convention Centre',
      url: 'https://goout.net/ml-conf-2025',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const result2 = await eventDeduplicator.deduplicateEvents(similarEvents);
  console.log(`✅ Input: ${similarEvents.length} events`);
  console.log(`✅ Output: ${result2.uniqueEvents.length} unique events`);
  console.log(`✅ Duplicates removed: ${result2.duplicatesRemoved}`);
  console.log(`✅ Processing time: ${result2.processingTimeMs}ms\n`);

  // Test 3: Different events (should not be deduplicated)
  console.log('📋 Test 3: Different Events (No Duplicates Expected)');
  const differentEvents: Event[] = [
    {
      id: 'test-7',
      title: 'Jazz Concert',
      date: '2025-11-20',
      city: 'Prague',
      category: 'Music',
      source: 'ticketmaster',
      sourceId: 'tm-jazz-001',
      description: 'Evening jazz performance',
      venue: 'Rudolfinum',
      url: 'https://ticketmaster.com/jazz-concert',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'test-8',
      title: 'Tech Workshop',
      date: '2025-11-21',
      city: 'Prague',
      category: 'Technology',
      source: 'predicthq',
      sourceId: 'phq-workshop-001',
      description: 'Hands-on coding workshop',
      venue: 'Tech Hub Prague',
      url: 'https://predicthq.com/events/tech-workshop',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'test-9',
      title: 'Art Exhibition',
      date: '2025-11-22',
      city: 'Prague',
      category: 'Arts',
      source: 'brno',
      sourceId: 'go-art-001',
      description: 'Contemporary art exhibition',
      venue: 'National Gallery',
      url: 'https://goout.net/art-exhibition',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const result3 = await eventDeduplicator.deduplicateEvents(differentEvents);
  console.log(`✅ Input: ${differentEvents.length} events`);
  console.log(`✅ Output: ${result3.uniqueEvents.length} unique events`);
  console.log(`✅ Duplicates removed: ${result3.duplicatesRemoved}`);
  console.log(`✅ Processing time: ${result3.processingTimeMs}ms\n`);

  // Test 4: Performance test with larger dataset
  console.log('📋 Test 4: Performance Test (Larger Dataset)');
  const largeDataset: Event[] = [];
  
  // Generate 50 events with some duplicates
  for (let i = 0; i < 50; i++) {
    const isDuplicate = i % 3 === 0 && i > 0; // Every 3rd event is a duplicate
    const baseTitle = isDuplicate ? 'Tech Conference 2025' : `Event ${i + 1}`;
    const baseDate = isDuplicate ? '2025-11-15' : `2025-11-${15 + (i % 10)}`;
    
    largeDataset.push({
      id: `test-large-${i}`,
      title: baseTitle,
      date: baseDate,
      city: 'Prague',
      category: 'Technology',
      source: ['ticketmaster', 'predicthq', 'goout'][i % 3] as any,
      sourceId: `test-${i}`,
      description: `Event description ${i + 1}`,
      venue: `Venue ${i + 1}`,
      url: `https://example.com/event-${i + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  const startTime = Date.now();
  const result4 = await eventDeduplicator.deduplicateEvents(largeDataset);
  const endTime = Date.now();

  console.log(`✅ Input: ${largeDataset.length} events`);
  console.log(`✅ Output: ${result4.uniqueEvents.length} unique events`);
  console.log(`✅ Duplicates removed: ${result4.duplicatesRemoved}`);
  console.log(`✅ Processing time: ${result4.processingTimeMs}ms`);
  console.log(`✅ Total time: ${endTime - startTime}ms`);
  console.log(`✅ Performance: ${(largeDataset.length / result4.processingTimeMs * 1000).toFixed(2)} events/second\n`);

  // Test 5: Cache performance test
  console.log('📋 Test 5: Cache Performance Test');
  const cacheTestEvents = exactDuplicates.slice(0, 2); // Use first 2 events from test 1
  
  // First run (cache miss)
  const cacheResult1 = await eventDeduplicator.deduplicateEvents(cacheTestEvents);
  console.log(`✅ First run - Cache hits: ${cacheResult1.cacheHits}, Cache misses: ${cacheResult1.cacheMisses}`);
  
  // Second run (cache hit)
  const cacheResult2 = await eventDeduplicator.deduplicateEvents(cacheTestEvents);
  console.log(`✅ Second run - Cache hits: ${cacheResult2.cacheHits}, Cache misses: ${cacheResult2.cacheMisses}`);
  
  // Test cache stats
  const cacheStats = eventDeduplicator.getCacheStats();
  console.log(`✅ Cache size: ${cacheStats.size}/${cacheStats.limit}\n`);

  // Test 6: Duplicate groups analysis
  console.log('📋 Test 6: Duplicate Groups Analysis');
  const duplicateGroupsTest: Event[] = [
    {
      id: 'test-10',
      title: 'Conference A',
      date: '2025-11-15',
      city: 'Prague',
      category: 'Technology',
      source: 'ticketmaster',
      sourceId: 'tm-a-001',
      description: 'Best description',
      venue: 'Best Venue',
      url: 'https://ticketmaster.com/conference-a',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'test-11',
      title: 'Conference A',
      date: '2025-11-15',
      city: 'Prague',
      category: 'Technology',
      source: 'predicthq',
      sourceId: 'phq-a-002',
      description: 'Basic description',
      venue: 'Basic Venue',
      url: 'https://predicthq.com/conference-a',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'test-12',
      title: 'Conference B',
      date: '2025-11-16',
      city: 'Prague',
      category: 'Technology',
      source: 'ticketmaster',
      sourceId: 'tm-b-001',
      description: 'Different conference',
      venue: 'Different Venue',
      url: 'https://ticketmaster.com/conference-b',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const result6 = await eventDeduplicator.deduplicateEvents(duplicateGroupsTest);
  console.log(`✅ Input: ${duplicateGroupsTest.length} events`);
  console.log(`✅ Output: ${result6.uniqueEvents.length} unique events`);
  console.log(`✅ Duplicate groups: ${result6.duplicateGroups.length}`);
  
  result6.duplicateGroups.forEach((group, index) => {
    console.log(`  Group ${index + 1}:`);
    console.log(`    Primary: ${group.primary.title} (${group.primary.source})`);
    console.log(`    Duplicates: ${group.duplicates.length}`);
    group.duplicates.forEach(dup => {
      console.log(`      - ${dup.event.title} (${dup.event.source}) - Similarity: ${dup.similarity.toFixed(3)}`);
    });
  });

  // Test 7: Metrics test
  console.log('\n📋 Test 7: Metrics Test');
  const metrics = eventDeduplicator.getMetrics(result6);
  console.log(`✅ Total events: ${metrics.totalEvents}`);
  console.log(`✅ Unique events: ${metrics.uniqueEvents}`);
  console.log(`✅ Duplicates removed: ${metrics.duplicatesRemoved}`);
  console.log(`✅ Duplicate groups: ${metrics.duplicateGroups}`);
  console.log(`✅ Sources with duplicates: ${metrics.sourcesWithDuplicates.join(', ')}`);
  console.log(`✅ Processing time: ${metrics.processingTimeMs}ms`);
  console.log(`✅ Cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);

  console.log('\n🎉 All deduplication tests completed successfully!');
  
  // Clean up cache
  eventDeduplicator.clearCache();
  console.log('🧹 Cache cleared');
}

// Run the tests
if (require.main === module) {
  testDeduplication().catch(console.error);
}

export { testDeduplication };
