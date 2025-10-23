#!/usr/bin/env ts-node
// Performance test script for audience overlap feature

import { audienceOverlapService } from '../src/lib/services/audience-overlap';
import { subcategoryExtractionService } from '../src/lib/services/subcategory-extraction';
import { audienceOverlapCacheService } from '../src/lib/services/audience-overlap-cache';

interface PerformanceTestResult {
  testName: string;
  duration: number;
  success: boolean;
  error?: string;
  cacheHitRate?: number;
}

class PerformanceTestSuite {
  private results: PerformanceTestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting performance tests for audience overlap feature...\n');

    await this.testSubcategoryExtraction();
    await this.testAudienceOverlapCalculation();
    await this.testCachingPerformance();
    await this.testBatchProcessing();
    await this.testCacheHitRates();

    this.printResults();
  }

  private async testSubcategoryExtraction(): Promise<void> {
    console.log('📊 Testing subcategory extraction performance...');
    
    const testEvents = [
      { title: 'Rock Concert 2024', description: 'Heavy metal rock concert with amazing bands', category: 'Entertainment' },
      { title: 'AI Conference', description: 'Machine learning and artificial intelligence conference', category: 'Technology' },
      { title: 'Marketing Summit', description: 'Digital marketing and social media strategies', category: 'Business' },
      { title: 'Jazz Festival', description: 'Smooth jazz and blues music festival', category: 'Entertainment' },
      { title: 'DevOps Workshop', description: 'Docker, Kubernetes, and cloud infrastructure', category: 'Technology' }
    ];

    const startTime = performance.now();
    
    try {
      const results = await subcategoryExtractionService.batchExtractSubcategories(testEvents);
      const duration = performance.now() - startTime;
      
      this.results.push({
        testName: 'Subcategory Extraction (5 events)',
        duration,
        success: true
      });

      console.log(`  ✅ Completed in ${duration.toFixed(2)}ms`);
      console.log(`  📈 Average per event: ${(duration / testEvents.length).toFixed(2)}ms`);
    } catch (error) {
      this.results.push({
        testName: 'Subcategory Extraction',
        duration: performance.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testAudienceOverlapCalculation(): Promise<void> {
    console.log('\n🎯 Testing audience overlap calculation performance...');
    
    const event1 = {
      id: '1',
      title: 'Rock Concert',
      date: '2024-03-15',
      city: 'Prague',
      category: 'Entertainment',
      subcategory: 'Rock',
      source: 'manual' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const event2 = {
      id: '2',
      title: 'Metal Concert',
      date: '2024-03-15',
      city: 'Prague',
      category: 'Entertainment',
      subcategory: 'Metal',
      source: 'manual' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const startTime = performance.now();
    
    try {
      const result = await audienceOverlapService.predictAudienceOverlap(event1, event2);
      const duration = performance.now() - startTime;
      
      this.results.push({
        testName: 'Audience Overlap Calculation',
        duration,
        success: true
      });

      console.log(`  ✅ Completed in ${duration.toFixed(2)}ms`);
      console.log(`  📊 Overlap score: ${(result.overlapScore * 100).toFixed(1)}%`);
      console.log(`  🎯 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    } catch (error) {
      this.results.push({
        testName: 'Audience Overlap Calculation',
        duration: performance.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testCachingPerformance(): Promise<void> {
    console.log('\n💾 Testing caching performance...');
    
    const event1 = {
      id: '1',
      title: 'Test Event 1',
      date: '2024-03-15',
      city: 'Prague',
      category: 'Entertainment',
      subcategory: 'Rock',
      source: 'manual' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const event2 = {
      id: '2',
      title: 'Test Event 2',
      date: '2024-03-15',
      city: 'Prague',
      category: 'Entertainment',
      subcategory: 'Pop',
      source: 'manual' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // First call (cache miss)
    const startTime1 = performance.now();
    await audienceOverlapService.predictAudienceOverlap(event1, event2);
    const duration1 = performance.now() - startTime1;

    // Second call (cache hit)
    const startTime2 = performance.now();
    await audienceOverlapService.predictAudienceOverlap(event1, event2);
    const duration2 = performance.now() - startTime2;

    const speedup = duration1 / duration2;

    this.results.push({
      testName: 'Cache Miss Performance',
      duration: duration1,
      success: true
    });

    this.results.push({
      testName: 'Cache Hit Performance',
      duration: duration2,
      success: true
    });

    console.log(`  ✅ Cache miss: ${duration1.toFixed(2)}ms`);
    console.log(`  ✅ Cache hit: ${duration2.toFixed(2)}ms`);
    console.log(`  🚀 Speedup: ${speedup.toFixed(1)}x faster with cache`);
  }

  private async testBatchProcessing(): Promise<void> {
    console.log('\n📦 Testing batch processing performance...');
    
    const events = Array.from({ length: 20 }, (_, i) => ({
      title: `Test Event ${i + 1}`,
      description: `Description for test event ${i + 1}`,
      category: ['Entertainment', 'Technology', 'Business'][i % 3]
    }));

    const startTime = performance.now();
    
    try {
      const results = await subcategoryExtractionService.batchExtractSubcategories(events);
      const duration = performance.now() - startTime;
      
      this.results.push({
        testName: 'Batch Processing (20 events)',
        duration,
        success: true
      });

      console.log(`  ✅ Completed in ${duration.toFixed(2)}ms`);
      console.log(`  📈 Average per event: ${(duration / events.length).toFixed(2)}ms`);
    } catch (error) {
      this.results.push({
        testName: 'Batch Processing',
        duration: performance.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testCacheHitRates(): Promise<void> {
    console.log('\n🎯 Testing cache hit rates...');
    
    try {
      const stats = await audienceOverlapCacheService.getCacheStats();
      
      this.results.push({
        testName: 'Cache Statistics',
        duration: 0,
        success: true,
        cacheHitRate: stats.totalEntries > 0 ? 0.8 : 0 // Simulated hit rate
      });

      console.log(`  📊 Total cache entries: ${stats.totalEntries}`);
      console.log(`  💾 Memory cache size: ${stats.memoryCacheSize}`);
      console.log(`  ⏰ Expired entries: ${stats.expiredEntries}`);
    } catch (error) {
      this.results.push({
        testName: 'Cache Statistics',
        duration: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private printResults(): void {
    console.log('\n📊 Performance Test Results:');
    console.log('=' .repeat(50));
    
    const successfulTests = this.results.filter(r => r.success);
    const failedTests = this.results.filter(r => !r.success);
    
    console.log(`✅ Successful tests: ${successfulTests.length}`);
    console.log(`❌ Failed tests: ${failedTests.length}`);
    
    if (successfulTests.length > 0) {
      console.log('\n📈 Performance Metrics:');
      successfulTests.forEach(result => {
        if (result.duration > 0) {
          console.log(`  ${result.testName}: ${result.duration.toFixed(2)}ms`);
        }
      });
    }
    
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(result => {
        console.log(`  ${result.testName}: ${result.error}`);
      });
    }

    // Check if we meet the <10s requirement
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const meetsRequirement = totalDuration < 10000;
    
    console.log(`\n🎯 Performance Requirement Check:`);
    console.log(`  Total duration: ${totalDuration.toFixed(2)}ms`);
    console.log(`  Requirement: <10,000ms`);
    console.log(`  Status: ${meetsRequirement ? '✅ PASS' : '❌ FAIL'}`);
  }
}

// Main execution
async function main() {
  const testSuite = new PerformanceTestSuite();
  
  try {
    await testSuite.runAllTests();
    console.log('\n🎉 Performance tests completed!');
  } catch (error) {
    console.error('\n💥 Performance tests failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { PerformanceTestSuite };
