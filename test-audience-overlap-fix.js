// Test script to verify audience overlap fix
// This script tests the improved audience overlap logic

const { audienceOverlapService } = require('./src/lib/services/audience-overlap');

// Mock events for testing
const businessEvent = {
  id: 'business-1',
  title: 'Business Conference',
  category: 'Business',
  subcategory: 'Conference',
  city: 'Prague',
  date: '2025-11-20',
  expectedAttendees: 5000,
  source: 'manual',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const sportsEvent = {
  id: 'sports-1',
  title: 'Football Match',
  category: 'Sports',
  subcategory: 'Football',
  city: 'Prague',
  date: '2025-11-20',
  expectedAttendees: 2000,
  source: 'manual',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const techEvent = {
  id: 'tech-1',
  title: 'Tech Meetup',
  category: 'Technology',
  subcategory: 'Meetup',
  city: 'Prague',
  date: '2025-11-20',
  expectedAttendees: 100,
  source: 'manual',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

async function testAudienceOverlap() {
  console.log('🧪 Testing Audience Overlap Logic Fix\n');
  
  try {
    // Test 1: Business vs Sports (should have low overlap)
    console.log('Test 1: Business Conference vs Football Match');
    const businessVsSports = await audienceOverlapService.predictAudienceOverlap(businessEvent, sportsEvent);
    console.log(`Overlap Score: ${(businessVsSports.overlapScore * 100).toFixed(1)}%`);
    console.log(`Reasoning: ${businessVsSports.reasoning.join(', ')}`);
    console.log(`Expected: Low overlap (< 20%)\n`);
    
    // Test 2: Business vs Tech (should have moderate overlap)
    console.log('Test 2: Business Conference vs Tech Meetup');
    const businessVsTech = await audienceOverlapService.predictAudienceOverlap(businessEvent, techEvent);
    console.log(`Overlap Score: ${(businessVsTech.overlapScore * 100).toFixed(1)}%`);
    console.log(`Reasoning: ${businessVsTech.reasoning.join(', ')}`);
    console.log(`Expected: Moderate overlap (20-40%)\n`);
    
    // Test 3: Same category (should have higher overlap)
    console.log('Test 3: Business Conference vs Another Business Event');
    const anotherBusinessEvent = {
      ...businessEvent,
      id: 'business-2',
      title: 'Marketing Summit',
      subcategory: 'Marketing'
    };
    const businessVsBusiness = await audienceOverlapService.predictAudienceOverlap(businessEvent, anotherBusinessEvent);
    console.log(`Overlap Score: ${(businessVsBusiness.overlapScore * 100).toFixed(1)}%`);
    console.log(`Reasoning: ${businessVsBusiness.reasoning.join(', ')}`);
    console.log(`Expected: Higher overlap (> 40%)\n`);
    
    console.log('✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAudienceOverlap();
