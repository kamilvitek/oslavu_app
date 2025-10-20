#!/usr/bin/env node

/**
 * Compatibility check script for AI improvements
 * Tests for potential breaking changes and issues
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

async function checkAPICompatibility() {
  console.log('🔍 Checking API compatibility...');
  
  const issues = [];
  
  try {
    // Test scraped events API format
    const scrapedResponse = await makeRequest(`${BASE_URL}/api/events/scraped?city=Prague&limit=5`);
    if (scrapedResponse.status === 200 && scrapedResponse.data.success) {
      const events = scrapedResponse.data.data?.events || [];
      if (events.length > 0) {
        const event = events[0];
        
        // Check for required fields
        const requiredFields = ['id', 'title', 'date', 'city', 'category', 'source'];
        const missingFields = requiredFields.filter(field => !(field in event));
        
        if (missingFields.length > 0) {
          issues.push(`❌ Scraped events missing required fields: ${missingFields.join(', ')}`);
        }
        
        // Check for new optional fields
        const hasNewFields = 'confidence' in event || 'normalized' in event;
        if (hasNewFields) {
          console.log('✅ Scraped events API includes new AI fields (backward compatible)');
        }
      }
    } else {
      issues.push('❌ Scraped events API not responding correctly');
    }
    
    // Test PredictHQ API
    const phqResponse = await makeRequest(`${BASE_URL}/api/analyze/events/predicthq?city=Prague&startDate=2026-06-01&endDate=2026-06-30`);
    if (phqResponse.status === 200 && phqResponse.data.success) {
      console.log('✅ PredictHQ API responding correctly');
    } else {
      issues.push('❌ PredictHQ API not responding correctly');
    }
    
    // Test observability API
    const obsResponse = await makeRequest(`${BASE_URL}/api/observability?type=health`);
    if (obsResponse.status === 200 && obsResponse.data.success) {
      console.log('✅ Observability API responding correctly');
    } else {
      issues.push('❌ Observability API not responding correctly');
    }
    
  } catch (error) {
    issues.push(`❌ API compatibility check failed: ${error.message}`);
  }
  
  return issues;
}

async function checkDatabaseCompatibility() {
  console.log('🗄️ Checking database compatibility...');
  
  const issues = [];
  
  try {
    // Test if normalized fields exist (this would fail if migration not run)
    const testResponse = await makeRequest(`${BASE_URL}/api/observability?type=sources`);
    if (testResponse.status === 200 && testResponse.data.success) {
      console.log('✅ Database normalized fields accessible');
    } else {
      issues.push('❌ Database normalized fields not accessible - migration may be needed');
    }
    
  } catch (error) {
    issues.push(`❌ Database compatibility check failed: ${error.message}`);
  }
  
  return issues;
}

async function checkPerformanceImpact() {
  console.log('⚡ Checking performance impact...');
  
  const issues = [];
  
  try {
    const startTime = Date.now();
    
    // Test scraped events with AI normalization
    const scrapedResponse = await makeRequest(`${BASE_URL}/api/events/scraped?city=Prague&limit=10`);
    const scrapedTime = Date.now() - startTime;
    
    if (scrapedTime > 5000) {
      issues.push(`⚠️ Scraped events API slow: ${scrapedTime}ms (AI normalization overhead)`);
    } else {
      console.log(`✅ Scraped events API performance acceptable: ${scrapedTime}ms`);
    }
    
    // Test PredictHQ with new radius parameter
    const phqStartTime = Date.now();
    const phqResponse = await makeRequest(`${BASE_URL}/api/analyze/events/predicthq?city=Prague&startDate=2026-06-01&endDate=2026-06-30&radius=50km`);
    const phqTime = Date.now() - phqStartTime;
    
    if (phqTime > 10000) {
      issues.push(`⚠️ PredictHQ API slow: ${phqTime}ms (radius parameter overhead)`);
    } else {
      console.log(`✅ PredictHQ API performance acceptable: ${phqTime}ms`);
    }
    
  } catch (error) {
    issues.push(`❌ Performance check failed: ${error.message}`);
  }
  
  return issues;
}

async function checkDataConsistency() {
  console.log('🔄 Checking data consistency...');
  
  const issues = [];
  
  try {
    // Test that different endpoints return consistent data
    const scrapedResponse = await makeRequest(`${BASE_URL}/api/events/scraped?city=Prague&category=Entertainment&limit=5`);
    const phqResponse = await makeRequest(`${BASE_URL}/api/analyze/events/predicthq?city=Prague&startDate=2026-06-01&endDate=2026-06-30&category=Entertainment`);
    
    if (scrapedResponse.status === 200 && phqResponse.status === 200) {
      const scrapedEvents = scrapedResponse.data.data?.events || [];
      const phqEvents = phqResponse.data.data?.events || [];
      
      // Check for overlapping events (potential duplicates)
      const scrapedTitles = scrapedEvents.map(e => e.title.toLowerCase());
      const phqTitles = phqEvents.map(e => e.title.toLowerCase());
      const overlaps = scrapedTitles.filter(title => phqTitles.includes(title));
      
      if (overlaps.length > 0) {
        console.log(`⚠️ Found ${overlaps.length} potential duplicate events between sources`);
      } else {
        console.log('✅ No obvious duplicate events between sources');
      }
      
      // Check category consistency
      const scrapedCategories = [...new Set(scrapedEvents.map(e => e.category))];
      const phqCategories = [...new Set(phqEvents.map(e => e.category))];
      
      console.log(`📊 Scraped categories: ${scrapedCategories.join(', ')}`);
      console.log(`📊 PredictHQ categories: ${phqCategories.join(', ')}`);
      
    } else {
      issues.push('❌ Could not compare data consistency between sources');
    }
    
  } catch (error) {
    issues.push(`❌ Data consistency check failed: ${error.message}`);
  }
  
  return issues;
}

async function runCompatibilityCheck() {
  console.log('🚀 Running AI improvements compatibility check...\n');
  
  const allIssues = [];
  
  // Run all checks
  const apiIssues = await checkAPICompatibility();
  const dbIssues = await checkDatabaseCompatibility();
  const perfIssues = await checkPerformanceImpact();
  const consistencyIssues = await checkDataConsistency();
  
  allIssues.push(...apiIssues, ...dbIssues, ...perfIssues, ...consistencyIssues);
  
  console.log('\n📋 Compatibility Check Results:');
  
  if (allIssues.length === 0) {
    console.log('🎉 All compatibility checks passed! No breaking changes detected.');
  } else {
    console.log(`⚠️ Found ${allIssues.length} potential issues:`);
    allIssues.forEach(issue => console.log(`  ${issue}`));
    
    console.log('\n🔧 Recommended Actions:');
    if (allIssues.some(issue => issue.includes('migration'))) {
      console.log('  - Run database migration: npm run db:migrate');
    }
    if (allIssues.some(issue => issue.includes('slow'))) {
      console.log('  - Consider adding caching for AI normalization');
    }
    if (allIssues.some(issue => issue.includes('duplicate'))) {
      console.log('  - Review deduplication logic');
    }
  }
  
  return allIssues.length === 0;
}

// Run checks if called directly
if (require.main === module) {
  runCompatibilityCheck().catch(console.error);
}

module.exports = {
  checkAPICompatibility,
  checkDatabaseCompatibility,
  checkPerformanceImpact,
  checkDataConsistency,
  runCompatibilityCheck
};
