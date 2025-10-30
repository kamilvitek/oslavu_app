/**
 * Simple Conflict Analysis Test
 * 
 * This script tests the conflict analysis with seasonality integration
 * to verify that the system works end-to-end.
 * 
 * @fileoverview Simple integration test for seasonality-enhanced conflict analysis
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * Test seasonal multiplier calculation
 */
async function testSeasonalMultiplier(): Promise<boolean> {
  console.log('🌱 Testing seasonal multiplier calculation...');
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Test AI/ML conference in March (should be high demand)
    const { data: marchData, error: marchError } = await supabase
      .rpc('get_seasonal_multiplier', {
        target_date: '2024-03-15',
        event_category: 'Technology',
        event_subcategory: 'AI/ML',
        target_region: 'CZ'
      });
    
    if (marchError) {
      console.error('❌ March seasonal multiplier error:', marchError);
      return false;
    }
    
    console.log(`March AI/ML multiplier: ${marchData?.[0]?.multiplier || 'N/A'}x`);
    
    // Test AI/ML conference in July (should be low demand)
    const { data: julyData, error: julyError } = await supabase
      .rpc('get_seasonal_multiplier', {
        target_date: '2024-07-15',
        event_category: 'Technology',
        event_subcategory: 'AI/ML',
        target_region: 'CZ'
      });
    
    if (julyError) {
      console.error('❌ July seasonal multiplier error:', julyError);
      return false;
    }
    
    console.log(`July AI/ML multiplier: ${julyData?.[0]?.multiplier || 'N/A'}x`);
    
    // Verify March is higher than July
    if (marchData?.[0]?.multiplier > julyData?.[0]?.multiplier) {
      console.log('✅ Seasonal patterns working correctly (March > July)');
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
 * Test holiday impact calculation
 */
async function testHolidayImpact(): Promise<boolean> {
  console.log('🎭 Testing holiday impact calculation...');
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Test Christmas Eve (should have high impact)
    const { data: christmasData, error: christmasError } = await supabase
      .rpc('get_holiday_impact_multiplier', {
        target_date: '2024-12-24',
        event_category: 'Business',
        event_subcategory: 'Conferences',
        target_region: 'CZ'
      });
    
    if (christmasError) {
      console.error('❌ Christmas holiday impact error:', christmasError);
      return false;
    }
    
    console.log(`Christmas Eve impact: ${christmasData?.[0]?.total_multiplier || 'N/A'}x`);
    
    // Test regular day (should have no impact)
    const { data: regularData, error: regularError } = await supabase
      .rpc('get_holiday_impact_multiplier', {
        target_date: '2024-06-15',
        event_category: 'Business',
        event_subcategory: 'Conferences',
        target_region: 'CZ'
      });
    
    if (regularError) {
      console.error('❌ Regular day holiday impact error:', regularError);
      return false;
    }
    
    console.log(`Regular day impact: ${regularData?.[0]?.total_multiplier || 'N/A'}x`);
    
    // Verify Christmas has higher impact than regular day
    if (christmasData?.[0]?.total_multiplier > regularData?.[0]?.total_multiplier) {
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: demandCurve, error } = await supabase
      .rpc('get_seasonal_demand_curve', {
        event_category: 'Technology',
        event_subcategory: 'AI/ML',
        target_region: 'CZ'
      });
    
    if (error) {
      console.error('❌ Seasonal demand curve error:', error);
      return false;
    }
    
    console.log(`Demand curve for AI/ML: ${demandCurve?.length || 0} months`);
    
    if (demandCurve && demandCurve.length === 12) {
      const highDemandMonths = demandCurve.filter((month: any) => month.demand_multiplier >= 1.2);
      const lowDemandMonths = demandCurve.filter((month: any) => month.demand_multiplier <= 0.8);
      
      console.log(`High demand months: ${highDemandMonths.length}`);
      console.log(`Low demand months: ${lowDemandMonths.length}`);
      
      if (highDemandMonths.length > 0 && lowDemandMonths.length > 0) {
        console.log('✅ Seasonal demand curve working correctly');
        return true;
      } else {
        console.error('❌ Seasonal demand curve not showing proper variation');
        return false;
      }
    } else {
      console.error('❌ Seasonal demand curve not returning 12 months');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Seasonal demand curve test failed:', error);
    return false;
  }
}

/**
 * Test performance (should be under 500ms)
 */
async function testPerformance(): Promise<boolean> {
  console.log('⚡ Testing performance...');
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const startTime = Date.now();
    
    // Test multiple seasonal calculations
    await Promise.all([
      supabase.rpc('get_seasonal_multiplier', {
        target_date: '2024-03-15',
        event_category: 'Technology',
        event_subcategory: 'AI/ML',
        target_region: 'CZ'
      }),
      supabase.rpc('get_seasonal_multiplier', {
        target_date: '2024-07-15',
        event_category: 'Technology',
        event_subcategory: 'AI/ML',
        target_region: 'CZ'
      }),
      supabase.rpc('get_seasonal_multiplier', {
        target_date: '2024-10-15',
        event_category: 'Technology',
        event_subcategory: 'AI/ML',
        target_region: 'CZ'
      }),
      supabase.rpc('get_holiday_impact_multiplier', {
        target_date: '2024-12-24',
        event_category: 'Business',
        event_subcategory: 'Conferences',
        target_region: 'CZ'
      }),
      supabase.rpc('get_holiday_impact_multiplier', {
        target_date: '2024-06-15',
        event_category: 'Business',
        event_subcategory: 'Conferences',
        target_region: 'CZ'
      })
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
  console.log('🚀 Starting Seasonality Integration Tests...\n');
  
  const tests = [
    { name: 'Seasonal Multiplier', fn: testSeasonalMultiplier },
    { name: 'Holiday Impact', fn: testHolidayImpact },
    { name: 'Seasonal Demand Curve', fn: testSeasonalDemandCurve },
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
    console.log('🎉 All integration tests passed! Seasonality system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
  }
}

// Export for use in other scripts
export { runAllTests, testSeasonalMultiplier, testHolidayImpact, testSeasonalDemandCurve };

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(() => {
      console.log('\n✅ Seasonality integration testing completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Integration testing failed:', error);
      process.exit(1);
    });
}
