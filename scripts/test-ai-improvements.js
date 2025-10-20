#!/usr/bin/env node

/**
 * Test script for AI-first event normalization improvements
 * Tests PredictHQ radius fix, scraped category normalization, and observability
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    }).on('error', reject);
  });
}

async function testPredictHQRadius() {
  console.log('🔮 Testing PredictHQ radius fix...');
  
  try {
    const url = `${BASE_URL}/api/analyze/events/predicthq?city=Prague&startDate=2026-06-01&endDate=2026-07-31&category=Entertainment&radius=50km`;
    const response = await makeRequest(url);
    
    if (response.status === 200 && response.data.success) {
      const eventCount = response.data.data?.events?.length || 0;
      console.log(`✅ PredictHQ returned ${eventCount} events`);
      
      if (eventCount > 0) {
        console.log('🎉 PredictHQ radius fix working! Found summer events.');
        return true;
      } else {
        console.log('⚠️  PredictHQ returned 0 events - may need API key or data');
        return false;
      }
    } else {
      console.log(`❌ PredictHQ request failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ PredictHQ test error: ${error.message}`);
    return false;
  }
}

async function testScrapedNormalization() {
  console.log('🔍 Testing scraped events AI normalization...');
  
  try {
    const url = `${BASE_URL}/api/events/scraped?city=Prague&startDate=2026-06-01&endDate=2026-07-31&category=Entertainment`;
    const response = await makeRequest(url);
    
    if (response.status === 200 && response.data.success) {
      const eventCount = response.data.data?.events?.length || 0;
      console.log(`✅ Scraped events returned ${eventCount} events`);
      
      if (eventCount > 0) {
        const events = response.data.data.events;
        const normalizedCount = events.filter(e => e.normalized).length;
        const avgConfidence = events.reduce((sum, e) => sum + (e.confidence || 0), 0) / events.length;
        
        console.log(`🤖 AI Normalization: ${normalizedCount}/${eventCount} events normalized`);
        console.log(`📊 Average confidence: ${avgConfidence.toFixed(2)}`);
        
        if (normalizedCount > 0) {
          console.log('🎉 Scraped normalization working!');
          return true;
        }
      } else {
        console.log('⚠️  No scraped events found - may need data ingestion');
        return false;
      }
    } else {
      console.log(`❌ Scraped events request failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Scraped events test error: ${error.message}`);
    return false;
  }
}

async function testObservability() {
  console.log('📊 Testing observability endpoints...');
  
  try {
    const url = `${BASE_URL}/api/observability?type=all`;
    const response = await makeRequest(url);
    
    if (response.status === 200 && response.data.success) {
      const { sources, quality, health } = response.data.data;
      
      console.log(`✅ Observability data retrieved:`);
      console.log(`   - Sources: ${sources?.length || 0}`);
      console.log(`   - Quality: ${quality?.totalProcessed || 0} events processed`);
      console.log(`   - Health: ${health?.overall || 'unknown'}`);
      
      if (sources && sources.length > 0) {
        console.log('🎉 Observability working!');
        return true;
      }
    } else {
      console.log(`❌ Observability request failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Observability test error: ${error.message}`);
    return false;
  }
}

async function testFullAnalysis() {
  console.log('🎯 Testing full conflict analysis with improvements...');
  
  try {
    const analysisData = {
      city: 'Prague',
      category: 'Entertainment',
      expectedAttendees: 2000,
      dateRange: { start: '2026-06-04', end: '2026-07-05' },
      preferredDates: ['2026-06-19', '2026-06-20'],
      enableAdvancedAnalysis: true
    };
    
    const url = `${BASE_URL}/api/analyze`;
    const response = await makeRequest(url);
    
    if (response.status === 200 && response.data.success) {
      const { recommendations, highRisk, eventsConsidered } = response.data.data;
      
      console.log(`✅ Full analysis completed:`);
      console.log(`   - Recommendations: ${recommendations?.length || 0}`);
      console.log(`   - High risk dates: ${highRisk?.length || 0}`);
      console.log(`   - Events considered: ${eventsConsidered || 0}`);
      
      if (eventsConsidered > 4) {
        console.log('🎉 Analysis found more events than before! AI improvements working.');
        return true;
      } else {
        console.log('⚠️  Still limited events - may need data ingestion or API keys');
        return false;
      }
    } else {
      console.log(`❌ Analysis request failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Analysis test error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Running AI-first improvements test suite...\n');
  
  const results = {
    predictHQ: await testPredictHQRadius(),
    scraped: await testScrapedNormalization(),
    observability: await testObservability(),
    analysis: await testFullAnalysis()
  };
  
  console.log('\n📋 Test Results Summary:');
  console.log(`🔮 PredictHQ radius fix: ${results.predictHQ ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🔍 Scraped normalization: ${results.scraped ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`📊 Observability: ${results.observability ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🎯 Full analysis: ${results.analysis ? '✅ PASS' : '❌ FAIL'}`);
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎉 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎊 All AI improvements working perfectly!');
  } else if (passedTests > totalTests / 2) {
    console.log('👍 Most improvements working - some may need data/API keys');
  } else {
    console.log('⚠️  Some improvements need attention - check logs above');
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testPredictHQRadius,
  testScrapedNormalization,
  testObservability,
  testFullAnalysis,
  runAllTests
};
