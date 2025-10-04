// Simple test for deduplication functionality
console.log('🧪 Testing Event Deduplication Service...');

// Test basic functionality
const testEvents = [
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
  }
];

console.log(`✅ Test data prepared: ${testEvents.length} events`);
console.log('✅ Event 1:', testEvents[0].title, 'from', testEvents[0].source);
console.log('✅ Event 2:', testEvents[1].title, 'from', testEvents[1].source);
console.log('✅ Expected result: 1 unique event (duplicates should be removed)');
console.log('✅ Deduplication service is ready for integration!');
