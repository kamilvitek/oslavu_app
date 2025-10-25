/**
 * Test Seasonality System
 * 
 * This script tests the seasonality system to verify that all components
 * are working correctly after deployment.
 * 
 * @fileoverview Comprehensive testing for seasonality system functionality
 */

import { createClient } from '@/lib/supabase';
import { seasonalityEngine } from '@/lib/services/seasonality-engine';
import { holidayConflictDetector } from '@/lib/services/holiday-conflict-detector';

/**
 * Test database connectivity and table existence
 */
async function testDatabaseConnection(): Promise<boolean> {
  console.log('🔍 Testing database connection...');
  
  try {
    const supabase = createClient();
    
    // Test seasonal_rules table
    const { data: seasonalRules, error: seasonalError } = await supabase
      .from('seasonal_rules')
      .select('count')
      .limit(1);
    
    if (seasonalError) {
      console.error('❌ seasonal_rules table error:', seasonalError);
      return false;
    }
    
    // Test holiday_impact_rules table
    const { data: holidayRules, error: holidayError } = await supabase
      .from('holiday_impact_rules')
      .select('count')
      .limit(1);
    
    if (holidayError) {
      console.error('❌ holiday_impact_rules table error:', holidayError);
      return false;
    }
    
    // Test seasonal_insights_cache table
    const { data: cacheData, error: cacheError } = await supabase
      .from('seasonal_insights_cache')
      .select('count')
      .limit(1);
    
    if (cacheError) {
      console.error('❌ seasonal_insights_cache table error:', cacheError);
      return false;
    }
    
    console.log('✅ Database connection and tables verified');
    return true;
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

/**
 * Test seasonal multiplier calculation
 */
async function testSeasonalMultiplier(): Promise<boolean> {
  console.log('🌱 Testing seasonal multiplier calculation...');
  
  try {
    // Test AI/ML conference in March (should be high demand)
    const marchMultiplier = await seasonalityEngine.getSeasonalMultiplier(
      '2024-03-15',
      'Technology',
      'AI/ML',
      'CZ'
    );
    
    console.log(`March AI/ML multiplier: ${marchMultiplier.multiplier}x (${marchMultiplier.demandLevel})`);
    
    // Test AI/ML conference in July (should be low demand)
    const julyMultiplier = await seasonalityEngine.getSeasonalMultiplier(
      '2024-07-15',
      'Technology',
      'AI/ML',
      'CZ'
    );
    
    console.log(`July AI/ML multiplier: ${julyMultiplier.multiplier}x (${julyMultiplier.demandLevel})`);
    
    // Verify March is higher than July
    if (marchMultiplier.multiplier > julyMultiplier.multiplier) {
      console.log('✅ Seasonal patterns working correctly');
      return true;
    } else {
      console.error('❌ Seasonal patterns not working - March should be higher than July');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Seasonal multiplier test failed:', error);
    return false;
  }
}

/**
 * Test holiday impact detection
 */
async function testHolidayImpact(): Promise<boolean> {
  console.log('🎭 Testing holiday impact detection...');
  
  try {
    // Test Christmas Eve (should have high impact)
    const christmasImpact = await holidayConflictDetector.getHolidayImpact(
      '2024-12-24',
      'Business',
      'Conferences',
      'CZ'
    );
    
    console.log(`Christmas Eve impact: ${christmasImpact.multiplier}x (${christmasImpact.totalImpact})`);
    
    // Test regular day (should have no impact)
    const regularImpact = await holidayConflictDetector.getHolidayImpact(
      '2024-06-15',
      'Business',
      'Conferences',
      'CZ'
    );
    
    console.log(`Regular day impact: ${regularImpact.multiplier}x (${regularImpact.totalImpact})`);
    
    // Verify Christmas has higher impact than regular day
    if (christmasImpact.multiplier > regularImpact.multiplier) {
      console.log('✅ Holiday impact detection working correctly');
      return true;
    } else {
      console.error('❌ Holiday impact not working - Christmas should have higher impact');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Holiday impact test failed:', error);
    return false;
  }
}

/**
 * Test seasonal demand curve
 */
async function testSeasonalDemandCurve(): Promise<boolean> {
  console.log('📊 Testing seasonal demand curve...');
  
  try {
    const demandCurve = await seasonalityEngine.getSeasonalDemandCurve({
      category: 'Technology',
      subcategory: 'AI/ML',
      region: 'CZ',
      includeReasoning: true
    });
    
    console.log(`Demand curve for AI/ML: ${demandCurve.monthlyData.length} months`);
    console.log(`Optimal months: ${demandCurve.optimalMonths.join(', ')}`);
    console.log(`Avoid months: ${demandCurve.avoidMonths.join(', ')}`);
    console.log(`Pattern: ${demandCurve.pattern}`);
    
    if (demandCurve.monthlyData.length === 12 && demandCurve.optimalMonths.length > 0) {
      console.log('✅ Seasonal demand curve working correctly');
      return true;
    } else {
      console.error('❌ Seasonal demand curve not working correctly');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Seasonal demand curve test failed:', error);
    return false;
  }
}

/**
 * Test optimal season suggestions
 */
async function testOptimalSeasons(): Promise<boolean> {
  console.log('🎯 Testing optimal season suggestions...');
  
  try {
    const optimalSeasons = await seasonalityEngine.suggestOptimalSeasons(
      'Technology',
      'AI/ML',
      'CZ',
      3
    );
    
    console.log(`Optimal seasons for AI/ML:`);
    optimalSeasons.forEach((season, index) => {
      console.log(`  ${index + 1}. ${season.monthName} (${season.demandScore.toFixed(2)} score, ${season.riskLevel} risk)`);
    });
    
    if (optimalSeasons.length > 0) {
      console.log('✅ Optimal season suggestions working correctly');
      return true;
    } else {
      console.error('❌ Optimal season suggestions not working');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Optimal season suggestions test failed:', error);
    return false;
  }
}

/**
 * Test performance (should be under 500ms)
 */
async function testPerformance(): Promise<boolean> {
  console.log('⚡ Testing performance...');
  
  try {
    const startTime = Date.now();
    
    // Test multiple seasonal calculations
    await Promise.all([
      seasonalityEngine.getSeasonalMultiplier('2024-03-15', 'Technology', 'AI/ML', 'CZ'),
      seasonalityEngine.getSeasonalMultiplier('2024-07-15', 'Technology', 'AI/ML', 'CZ'),
      seasonalityEngine.getSeasonalMultiplier('2024-10-15', 'Technology', 'AI/ML', 'CZ'),
      holidayConflictDetector.getHolidayImpact('2024-12-24', 'Business', 'Conferences', 'CZ'),
      holidayConflictDetector.getHolidayImpact('2024-06-15', 'Business', 'Conferences', 'CZ')
    ]);
    
    const duration = Date.now() - startTime;
    console.log(`Performance test completed in ${duration}ms`);
    
    if (duration < 500) {
      console.log('✅ Performance test passed (<500ms)');
      return true;
    } else {
      console.warn(`⚠️  Performance test failed (${duration}ms > 500ms)`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    return false;
  }
}

/**
 * Main test runner
 */
async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Seasonality System Tests...\n');
  
  const tests = [
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Seasonal Multiplier', fn: testSeasonalMultiplier },
    { name: 'Holiday Impact', fn: testHolidayImpact },
    { name: 'Seasonal Demand Curve', fn: testSeasonalDemandCurve },
    { name: 'Optimal Seasons', fn: testOptimalSeasons },
    { name: 'Performance', fn: testPerformance }
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
  
  console.log(`\n🎯 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Seasonality system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
  }
}

// Export for use in other scripts
export { runAllTests, testDatabaseConnection, testSeasonalMultiplier, testHolidayImpact };

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log('\n✅ Seasonality system testing completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Testing failed:', error);
      process.exit(1);
    });
}
