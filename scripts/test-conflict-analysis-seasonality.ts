/**
 * Test Conflict Analysis with Seasonality
 * 
 * This script tests the integration of seasonality system with the existing
 * conflict analysis to ensure seasonal and holiday multipliers are applied correctly.
 * 
 * @fileoverview Integration testing for seasonality-enhanced conflict analysis
 */

import { ConflictAnalysisService } from '@/lib/services/conflict-analysis';

/**
 * Test conflict analysis with seasonal factors
 */
async function testConflictAnalysisWithSeasonality(): Promise<boolean> {
  console.log('🔍 Testing conflict analysis with seasonality...');
  
  try {
    const conflictService = new ConflictAnalysisService();
    
    // Test parameters for a technology conference
    const testParams = {
      city: 'Prague',
      category: 'Technology',
      subcategory: 'AI/ML',
      expectedAttendees: 500,
      startDate: '2024-03-15',
      endDate: '2024-03-16',
      dateRangeStart: '2024-03-01',
      dateRangeEnd: '2024-03-31',
      enableAdvancedAnalysis: true
    };
    
    console.log('📅 Testing March AI/ML conference (should be high demand season)...');
    
    const startTime = Date.now();
    const result = await conflictService.analyzeDateRangeOptimized(testParams);
    const duration = Date.now() - startTime;
    
    console.log(`Analysis completed in ${duration}ms`);
    console.log(`Found ${result.recommendedDates.length} recommended dates`);
    console.log(`Found ${result.highRiskDates.length} high-risk dates`);
    
    // Check if seasonal factors are included
    if (result.recommendedDates.length > 0) {
      const firstRecommendation = result.recommendedDates[0];
      
      if (firstRecommendation.seasonalFactors) {
        console.log('✅ Seasonal factors included in recommendations');
        console.log(`  - Demand level: ${firstRecommendation.seasonalFactors.demandLevel}`);
        console.log(`  - Seasonal multiplier: ${firstRecommendation.seasonalFactors.seasonalMultiplier}x`);
        console.log(`  - Holiday multiplier: ${firstRecommendation.seasonalFactors.holidayMultiplier}x`);
        console.log(`  - Optimality score: ${firstRecommendation.seasonalFactors.optimalityScore}`);
        
        return true;
      } else {
        console.error('❌ Seasonal factors not found in recommendations');
        return false;
      }
    } else {
      console.error('❌ No recommendations generated');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Conflict analysis test failed:', error);
    return false;
  }
}

/**
 * Test summer vs spring comparison
 */
async function testSeasonalComparison(): Promise<boolean> {
  console.log('🌞 Testing seasonal comparison (Spring vs Summer)...');
  
  try {
    const conflictService = new ConflictAnalysisService();
    
    // Test spring conference (should be high demand)
    const springParams = {
      city: 'Prague',
      category: 'Technology',
      subcategory: 'AI/ML',
      expectedAttendees: 500,
      startDate: '2024-03-15',
      endDate: '2024-03-16',
      dateRangeStart: '2024-03-01',
      dateRangeEnd: '2024-03-31',
      enableAdvancedAnalysis: true
    };
    
    // Test summer conference (should be low demand)
    const summerParams = {
      city: 'Prague',
      category: 'Technology',
      subcategory: 'AI/ML',
      expectedAttendees: 500,
      startDate: '2024-07-15',
      endDate: '2024-07-16',
      dateRangeStart: '2024-07-01',
      dateRangeEnd: '2024-07-31',
      enableAdvancedAnalysis: true
    };
    
    console.log('📅 Testing Spring AI/ML conference...');
    const springResult = await conflictService.analyzeDateRangeOptimized(springParams);
    
    console.log('☀️ Testing Summer AI/ML conference...');
    const summerResult = await conflictService.analyzeDateRangeOptimized(summerParams);
    
    // Compare seasonal factors
    if (springResult.recommendedDates.length > 0 && summerResult.recommendedDates.length > 0) {
      const springFactors = springResult.recommendedDates[0].seasonalFactors;
      const summerFactors = summerResult.recommendedDates[0].seasonalFactors;
      
      if (springFactors && summerFactors) {
        console.log(`Spring seasonal multiplier: ${springFactors.seasonalMultiplier}x`);
        console.log(`Summer seasonal multiplier: ${summerFactors.seasonalMultiplier}x`);
        
        if (springFactors.seasonalMultiplier > summerFactors.seasonalMultiplier) {
          console.log('✅ Spring has higher seasonal demand than summer (correct)');
          return true;
        } else {
          console.error('❌ Spring should have higher seasonal demand than summer');
          return false;
        }
      } else {
        console.error('❌ Seasonal factors missing in one or both results');
        return false;
      }
    } else {
      console.error('❌ No recommendations generated for one or both seasons');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Seasonal comparison test failed:', error);
    return false;
  }
}

/**
 * Test holiday impact on conflict analysis
 */
async function testHolidayImpactOnConflictAnalysis(): Promise<boolean> {
  console.log('🎭 Testing holiday impact on conflict analysis...');
  
  try {
    const conflictService = new ConflictAnalysisService();
    
    // Test Christmas period (should have high holiday impact)
    const christmasParams = {
      city: 'Prague',
      category: 'Business',
      subcategory: 'Conferences',
      expectedAttendees: 300,
      startDate: '2024-12-24',
      endDate: '2024-12-25',
      dateRangeStart: '2024-12-20',
      dateRangeEnd: '2024-12-30',
      enableAdvancedAnalysis: true
    };
    
    console.log('🎄 Testing Christmas period business conference...');
    
    const result = await conflictService.analyzeDateRangeOptimized(christmasParams);
    
    if (result.recommendedDates.length > 0) {
      const firstRecommendation = result.recommendedDates[0];
      
      if (firstRecommendation.seasonalFactors) {
        console.log(`Holiday multiplier: ${firstRecommendation.seasonalFactors.holidayMultiplier}x`);
        console.log(`Holiday reasoning: ${firstRecommendation.seasonalFactors.holidayReasoning.join(', ')}`);
        
        if (firstRecommendation.seasonalFactors.holidayMultiplier > 1.0) {
          console.log('✅ Holiday impact detected correctly');
          return true;
        } else {
          console.error('❌ Holiday impact should be > 1.0 for Christmas period');
          return false;
        }
      } else {
        console.error('❌ Seasonal factors missing in Christmas recommendation');
        return false;
      }
    } else {
      console.error('❌ No recommendations generated for Christmas period');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Holiday impact test failed:', error);
    return false;
  }
}

/**
 * Main integration test runner
 */
async function runIntegrationTests(): Promise<void> {
  console.log('🚀 Starting Seasonality Integration Tests...\n');
  
  const tests = [
    { name: 'Conflict Analysis with Seasonality', fn: testConflictAnalysisWithSeasonality },
    { name: 'Seasonal Comparison (Spring vs Summer)', fn: testSeasonalComparison },
    { name: 'Holiday Impact on Conflict Analysis', fn: testHolidayImpactOnConflictAnalysis }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    try {
      const result = await test.fn();
      if (result) {
        passedTests++;
        console.log(`✅ ${test.name} PASSED`);
      } else {
        console.log(`❌ ${test.name} FAILED`);
      }
    } catch (error) {
      console.log(`❌ ${test.name} FAILED with error:`, error);
    }
  }
  
  console.log(`\n🎯 Integration Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All integration tests passed! Seasonality system is properly integrated.');
  } else {
    console.log('⚠️  Some integration tests failed. Please check the errors above.');
  }
}

// Export for use in other scripts
export { runIntegrationTests };

// Run tests if this script is executed directly
if (require.main === module) {
  runIntegrationTests()
    .then(() => {
      console.log('\n✅ Seasonality integration testing completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Integration testing failed:', error);
      process.exit(1);
    });
}
