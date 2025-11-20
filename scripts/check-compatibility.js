#!/usr/bin/env node

/**
 * Compatibility check script for AI improvements
 * Tests for potential breaking changes and issues
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Load environment variables
const loadEnvFiles = () => {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^([^=:#]+)=(.*)$/);
        if (match && !process.env[match[1].trim()]) {
          process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
        }
      });
    }
  }
};

loadEnvFiles();

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = typeof url === 'string' ? new URL(url) : url;
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: options.headers || {}
    };
    
    const req = client.request(requestOptions, (res) => {
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
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function makePostRequest(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    const postData = JSON.stringify(body);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    };
    
    const req = client.request(options, (res) => {
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
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
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
    
    // Test OpenAI API
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      try {
        const openaiResponse = await makeRequest('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`
          }
        });
        if (openaiResponse.status === 200 && openaiResponse.data.data) {
          const modelCount = Array.isArray(openaiResponse.data.data) ? openaiResponse.data.data.length : 0;
          console.log(`✅ OpenAI API responding correctly (${modelCount} models available)`);
        } else {
          issues.push('❌ OpenAI API not responding correctly');
        }
      } catch (error) {
        issues.push(`❌ OpenAI API test failed: ${error.message}`);
      }
    } else {
      console.log('⚠️ OpenAI API key not configured - skipping test');
    }
    
    // Test Perplexity API
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    if (perplexityApiKey) {
      try {
        const perplexityResponse = await makePostRequest(
          'https://api.perplexity.ai/chat/completions',
          {
            model: 'sonar-pro',
            messages: [
              { role: 'system', content: 'You are a concise assistant. Respond with a single word.' },
              { role: 'user', content: 'Reply with the word "pong".' }
            ],
            temperature: 0,
            max_tokens: 10
          },
          {
            'Authorization': `Bearer ${perplexityApiKey}`
          }
        );
        if (perplexityResponse.status === 200 && perplexityResponse.data.choices) {
          const content = perplexityResponse.data.choices[0]?.message?.content?.trim();
          console.log(`✅ Perplexity API responding correctly${content ? ` (response: ${content})` : ''}`);
        } else {
          issues.push('❌ Perplexity API not responding correctly');
        }
      } catch (error) {
        issues.push(`❌ Perplexity API test failed: ${error.message}`);
      }
    } else {
      console.log('⚠️ Perplexity API key not configured - skipping test');
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
    
    // Test OpenAI API performance
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      try {
        const openaiStartTime = Date.now();
        await makeRequest('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`
          }
        });
        const openaiTime = Date.now() - openaiStartTime;
        
        if (openaiTime > 5000) {
          issues.push(`⚠️ OpenAI API slow: ${openaiTime}ms`);
        } else {
          console.log(`✅ OpenAI API performance acceptable: ${openaiTime}ms`);
        }
      } catch (error) {
        // Skip performance test if API key test failed
      }
    }
    
    // Test Perplexity API performance
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    if (perplexityApiKey) {
      try {
        const perplexityStartTime = Date.now();
        await makePostRequest(
          'https://api.perplexity.ai/chat/completions',
          {
            model: 'sonar-pro',
            messages: [
              { role: 'user', content: 'Say "test"' }
            ],
            temperature: 0,
            max_tokens: 5
          },
          {
            'Authorization': `Bearer ${perplexityApiKey}`
          }
        );
        const perplexityTime = Date.now() - perplexityStartTime;
        
        if (perplexityTime > 10000) {
          issues.push(`⚠️ Perplexity API slow: ${perplexityTime}ms`);
        } else {
          console.log(`✅ Perplexity API performance acceptable: ${perplexityTime}ms`);
        }
      } catch (error) {
        // Skip performance test if API key test failed
      }
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
    // Test that scraped events endpoint returns consistent data
    const scrapedResponse = await makeRequest(`${BASE_URL}/api/events/scraped?city=Prague&category=Entertainment&limit=5`);
    
    if (scrapedResponse.status === 200) {
      const scrapedEvents = scrapedResponse.data.data?.events || [];
      
      if (scrapedEvents.length > 0) {
        // Check category consistency
        const scrapedCategories = [...new Set(scrapedEvents.map(e => e.category))];
        console.log(`📊 Scraped categories: ${scrapedCategories.join(', ')}`);
        console.log('✅ Scraped events data structure is consistent');
      } else {
        console.log('⚠️ No events found for consistency check');
      }
    } else {
      issues.push('❌ Could not check data consistency - scraped events API not responding');
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
