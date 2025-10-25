/**
 * Test Database Seasonality System
 * 
 * This script tests the seasonality system database tables and data
 * to verify that the migration and seeding were successful.
 * 
 * @fileoverview Database testing for seasonality system
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * Test database connectivity and table existence
 */
async function testDatabaseConnection(): Promise<boolean> {
  console.log('🔍 Testing database connection...');
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
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
 * Test seasonal rules data
 */
async function testSeasonalRulesData(): Promise<boolean> {
  console.log('🌱 Testing seasonal rules data...');
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get all seasonal rules
    const { data: rules, error } = await supabase
      .from('seasonal_rules')
      .select('*');
    
    if (error) {
      console.error('❌ Error fetching seasonal rules:', error);
      return false;
    }
    
    console.log(`📊 Found ${rules?.length || 0} seasonal rules`);
    
    if (rules && rules.length > 0) {
      // Test AI/ML rules for March (should be high demand)
      const marchAIML = rules.find(r => 
        r.category === 'Technology' && 
        r.subcategory === 'AI/ML' && 
        r.month === 3
      );
      
      if (marchAIML) {
        console.log(`✅ March AI/ML rule found: ${marchAIML.demand_multiplier}x demand`);
        if (marchAIML.demand_multiplier > 1.0) {
          console.log('✅ March has high demand (correct)');
        } else {
          console.log('⚠️  March should have high demand');
        }
      } else {
        console.log('❌ March AI/ML rule not found');
        return false;
      }
      
      // Test AI/ML rules for July (should be low demand)
      const julyAIML = rules.find(r => 
        r.category === 'Technology' && 
        r.subcategory === 'AI/ML' && 
        r.month === 7
      );
      
      if (julyAIML) {
        console.log(`✅ July AI/ML rule found: ${julyAIML.demand_multiplier}x demand`);
        if (julyAIML.demand_multiplier < 1.0) {
          console.log('✅ July has low demand (correct)');
        } else {
          console.log('⚠️  July should have low demand');
        }
      } else {
        console.log('❌ July AI/ML rule not found');
        return false;
      }
      
      // Verify March > July
      if (marchAIML && julyAIML && marchAIML.demand_multiplier > julyAIML.demand_multiplier) {
        console.log('✅ Seasonal patterns working correctly (March > July)');
        return true;
      } else {
        console.log('❌ Seasonal patterns not working correctly');
        return false;
      }
    } else {
      console.log('❌ No seasonal rules found');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Seasonal rules test failed:', error);
    return false;
  }
}

/**
 * Test holiday impact rules data
 */
async function testHolidayImpactData(): Promise<boolean> {
  console.log('🎭 Testing holiday impact rules data...');
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get all holiday impact rules
    const { data: rules, error } = await supabase
      .from('holiday_impact_rules')
      .select('*');
    
    if (error) {
      console.error('❌ Error fetching holiday impact rules:', error);
      return false;
    }
    
    console.log(`📊 Found ${rules?.length || 0} holiday impact rules`);
    
    if (rules && rules.length > 0) {
      // Test Christmas impact rules
      const christmasRules = rules.filter(r => 
        r.holiday_type === 'public_holiday' && 
        r.event_category === 'Business'
      );
      
      if (christmasRules.length > 0) {
        console.log(`✅ Found ${christmasRules.length} Christmas impact rules for Business`);
        const highImpactRule = christmasRules.find(r => r.impact_multiplier >= 3.0);
        if (highImpactRule) {
          console.log(`✅ High impact Christmas rule found: ${highImpactRule.impact_multiplier}x`);
          return true;
        } else {
          console.log('⚠️  No high impact Christmas rules found');
        }
      } else {
        console.log('❌ No Christmas impact rules found for Business');
        return false;
      }
      
      // Test category distribution
      const categories = rules.reduce((acc: any, rule: any) => {
        acc[rule.event_category] = (acc[rule.event_category] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📈 Rules by category:', categories);
      
      return true;
    } else {
      console.log('❌ No holiday impact rules found');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Holiday impact rules test failed:', error);
    return false;
  }
}

/**
 * Test database functions
 */
async function testDatabaseFunctions(): Promise<boolean> {
  console.log('🔧 Testing database functions...');
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Test get_seasonal_multiplier function
    const { data: seasonalData, error: seasonalError } = await supabase
      .rpc('get_seasonal_multiplier', {
        target_date: '2024-03-15',
        event_category: 'Technology',
        event_subcategory: 'AI/ML',
        target_region: 'CZ'
      });
    
    if (seasonalError) {
      console.error('❌ get_seasonal_multiplier function error:', seasonalError);
      return false;
    }
    
    if (seasonalData && seasonalData.length > 0) {
      console.log(`✅ get_seasonal_multiplier function working: ${seasonalData[0].multiplier}x`);
    } else {
      console.log('⚠️  get_seasonal_multiplier function returned no data');
    }
    
    // Test get_holiday_impact_multiplier function
    const { data: holidayData, error: holidayError } = await supabase
      .rpc('get_holiday_impact_multiplier', {
        target_date: '2024-12-24',
        event_category: 'Business',
        event_subcategory: 'Conferences',
        target_region: 'CZ'
      });
    
    if (holidayError) {
      console.error('❌ get_holiday_impact_multiplier function error:', holidayError);
      return false;
    }
    
    if (holidayData && holidayData.length > 0) {
      console.log(`✅ get_holiday_impact_multiplier function working: ${holidayData[0].total_multiplier}x`);
    } else {
      console.log('⚠️  get_holiday_impact_multiplier function returned no data');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Database functions test failed:', error);
    return false;
  }
}

/**
 * Main test runner
 */
async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Seasonality Database Tests...\n');
  
  const tests = [
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Seasonal Rules Data', fn: testSeasonalRulesData },
    { name: 'Holiday Impact Data', fn: testHolidayImpactData },
    { name: 'Database Functions', fn: testDatabaseFunctions }
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
    console.log('🎉 All database tests passed! Seasonality system is ready.');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
  }
}

// Export for use in other scripts
export { runAllTests, testDatabaseConnection, testSeasonalRulesData, testHolidayImpactData };

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(() => {
      console.log('\n✅ Seasonality database testing completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Testing failed:', error);
      process.exit(1);
    });
}
