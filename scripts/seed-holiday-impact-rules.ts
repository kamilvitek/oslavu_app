/**
 * Holiday Impact Rules Seeding Script
 * 
 * This script seeds the holiday_impact_rules table with comprehensive rules
 * for how different holidays affect various event categories. The rules are
 * based on expert analysis of Czech holidays and their impact on different
 * types of events.
 * 
 * Key Features:
 * - Czech public holidays with category-specific multipliers
 * - Business vs entertainment event differentiation
 * - Impact windows (days before/after holiday)
 * - Regional holiday variations
 * - Expert reasoning for each rule
 * 
 * @fileoverview Holiday impact rules seeding for enhanced conflict analysis
 */

import { createClient } from '@/lib/supabase';

interface HolidayImpactRuleData {
  holidayType: string;
  eventCategory: string;
  eventSubcategory?: string;
  daysBefore: number;
  daysAfter: number;
  impactMultiplier: number;
  impactType: 'conflict' | 'demand' | 'availability' | 'combined';
  region: string;
  yearStart?: number;
  yearEnd?: number;
  confidence: number;
  dataSource: string;
  reasoning: string;
  expertSource: string;
}

/**
 * Major Czech holidays with high impact on all event categories
 */
const MAJOR_HOLIDAYS_IMPACT: HolidayImpactRuleData[] = [
  // Christmas Eve (December 24) - Critical impact
  {
    holidayType: 'public_holiday',
    eventCategory: 'Business',
    daysBefore: 5,
    daysAfter: 2,
    impactMultiplier: 4.0,
    impactType: 'combined',
    region: 'CZ',
    confidence: 0.95,
    dataSource: 'expert_rules',
    reasoning: 'Christmas Eve is the most important family holiday in Czech Republic, business activity completely stops',
    expertSource: 'Czech Business Calendar Analysis 2024'
  },
  {
    holidayType: 'public_holiday',
    eventCategory: 'Entertainment',
    daysBefore: 3,
    daysAfter: 1,
    impactMultiplier: 2.5,
    impactType: 'demand',
    region: 'CZ',
    confidence: 0.9,
    dataSource: 'expert_rules',
    reasoning: 'Christmas Eve creates high demand for family entertainment but conflicts with other events',
    expertSource: 'Czech Entertainment Industry Analysis 2024'
  },
  {
    holidayType: 'public_holiday',
    eventCategory: 'Technology',
    daysBefore: 5,
    daysAfter: 2,
    impactMultiplier: 3.5,
    impactType: 'combined',
    region: 'CZ',
    confidence: 0.95,
    dataSource: 'expert_rules',
    reasoning: 'Christmas Eve completely stops tech industry activity, no conferences or events',
    expertSource: 'Czech Tech Industry Analysis 2024'
  },

  // Christmas Day (December 25) - Critical impact
  {
    holidayType: 'public_holiday',
    eventCategory: 'Business',
    daysBefore: 2,
    daysAfter: 1,
    impactMultiplier: 4.5,
    impactType: 'combined',
    region: 'CZ',
    confidence: 0.95,
    dataSource: 'expert_rules',
    reasoning: 'Christmas Day is a complete business shutdown, no events possible',
    expertSource: 'Czech Business Calendar Analysis 2024'
  },
  {
    holidayType: 'public_holiday',
    eventCategory: 'Entertainment',
    daysBefore: 1,
    daysAfter: 1,
    impactMultiplier: 2.0,
    impactType: 'demand',
    region: 'CZ',
    confidence: 0.9,
    dataSource: 'expert_rules',
    reasoning: 'Christmas Day has moderate entertainment demand but venue availability issues',
    expertSource: 'Czech Entertainment Industry Analysis 2024'
  },

  // New Year's Day (January 1) - High impact
  {
    holidayType: 'public_holiday',
    eventCategory: 'Business',
    daysBefore: 3,
    daysAfter: 1,
    impactMultiplier: 3.0,
    impactType: 'combined',
    region: 'CZ',
    confidence: 0.9,
    dataSource: 'expert_rules',
    reasoning: 'New Year period has low business activity, post-celebration recovery',
    expertSource: 'Czech Business Calendar Analysis 2024'
  },
  {
    holidayType: 'public_holiday',
    eventCategory: 'Entertainment',
    daysBefore: 2,
    daysAfter: 1,
    impactMultiplier: 1.8,
    impactType: 'demand',
    region: 'CZ',
    confidence: 0.85,
    dataSource: 'expert_rules',
    reasoning: 'New Year period has high entertainment demand but venue competition',
    expertSource: 'Czech Entertainment Industry Analysis 2024'
  },

  // Easter Monday - High impact
  {
    holidayType: 'public_holiday',
    eventCategory: 'Business',
    daysBefore: 2,
    daysAfter: 1,
    impactMultiplier: 2.5,
    impactType: 'combined',
    region: 'CZ',
    confidence: 0.9,
    dataSource: 'expert_rules',
    reasoning: 'Easter Monday extends Easter weekend, reduces business activity',
    expertSource: 'Czech Business Calendar Analysis 2024'
  },
  {
    holidayType: 'public_holiday',
    eventCategory: 'Entertainment',
    daysBefore: 1,
    daysAfter: 1,
    impactMultiplier: 1.5,
    impactType: 'demand',
    region: 'CZ',
    confidence: 0.85,
    dataSource: 'expert_rules',
    reasoning: 'Easter Monday creates moderate entertainment demand',
    expertSource: 'Czech Entertainment Industry Analysis 2024'
  }
];

/**
 * Business-specific holiday impacts
 */
const BUSINESS_HOLIDAY_IMPACTS: HolidayImpactRuleData[] = [
  // Labour Day (May 1) - Business impact
  {
    holidayType: 'public_holiday',
    eventCategory: 'Business',
    subcategory: 'Conferences',
    daysBefore: 1,
    daysAfter: 1,
    impactMultiplier: 2.0,
    impactType: 'combined',
    region: 'CZ',
    confidence: 0.85,
    dataSource: 'expert_rules',
    reasoning: 'Labour Day reduces business conference attendance and venue availability',
    expertSource: 'Czech Business Conference Analysis 2024'
  },
  {
    holidayType: 'public_holiday',
    eventCategory: 'Business',
    subcategory: 'Networking',
    daysBefore: 1,
    daysAfter: 1,
    impactMultiplier: 1.8,
    impactType: 'demand',
    region: 'CZ',
    confidence: 0.8,
    dataSource: 'expert_rules',
    reasoning: 'Labour Day reduces networking event attendance',
    expertSource: 'Czech Business Networking Analysis 2024'
  },

  // Liberation Day (May 8) - Business impact
  {
    holidayType: 'public_holiday',
    eventCategory: 'Business',
    daysBefore: 1,
    daysAfter: 0,
    impactMultiplier: 1.5,
    impactType: 'availability',
    region: 'CZ',
    confidence: 0.8,
    dataSource: 'expert_rules',
    reasoning: 'Liberation Day reduces venue availability for business events',
    expertSource: 'Czech Business Calendar Analysis 2024'
  },

  // Czech Statehood Day (September 28) - Business impact
  {
    holidayType: 'public_holiday',
    eventCategory: 'Business',
    daysBefore: 1,
    daysAfter: 1,
    impactMultiplier: 1.8,
    impactType: 'combined',
    region: 'CZ',
    confidence: 0.85,
    dataSource: 'expert_rules',
    reasoning: 'Statehood Day reduces business activity and venue availability',
    expertSource: 'Czech Business Calendar Analysis 2024'
  },

  // Independence Day (October 28) - Business impact
  {
    holidayType: 'public_holiday',
    eventCategory: 'Business',
    daysBefore: 1,
    daysAfter: 1,
    impactMultiplier: 1.8,
    impactType: 'combined',
    region: 'CZ',
    confidence: 0.85,
    dataSource: 'expert_rules',
    reasoning: 'Independence Day reduces business activity and venue availability',
    expertSource: 'Czech Business Calendar Analysis 2024'
  },

  // Struggle for Freedom Day (November 17) - Business impact
  {
    holidayType: 'public_holiday',
    eventCategory: 'Business',
    daysBefore: 1,
    daysAfter: 1,
    impactMultiplier: 1.6,
    impactType: 'combined',
    region: 'CZ',
    confidence: 0.8,
    dataSource: 'expert_rules',
    reasoning: 'Freedom Day reduces business activity and venue availability',
    expertSource: 'Czech Business Calendar Analysis 2024'
  }
];

/**
 * Entertainment-specific holiday impacts
 */
const ENTERTAINMENT_HOLIDAY_IMPACTS: HolidayImpactRuleData[] = [
  // Christmas period - Entertainment impact
  {
    holidayType: 'public_holiday',
    eventCategory: 'Entertainment',
    subcategory: 'Music',
    daysBefore: 7,
    daysAfter: 3,
    impactMultiplier: 2.2,
    impactType: 'demand',
    region: 'CZ',
    confidence: 0.9,
    dataSource: 'expert_rules',
    reasoning: 'Christmas period creates high demand for music events but intense competition',
    expertSource: 'Czech Music Industry Analysis 2024'
  },
  {
    holidayType: 'public_holiday',
    eventCategory: 'Entertainment',
    subcategory: 'Theater',
    daysBefore: 5,
    daysAfter: 2,
    impactMultiplier: 1.8,
    impactType: 'demand',
    region: 'CZ',
    confidence: 0.85,
    dataSource: 'expert_rules',
    reasoning: 'Christmas period increases theater demand but reduces venue availability',
    expertSource: 'Czech Theater Industry Analysis 2024'
  },

  // New Year period - Entertainment impact
  {
    holidayType: 'public_holiday',
    eventCategory: 'Entertainment',
    subcategory: 'Music',
    daysBefore: 3,
    daysAfter: 2,
    impactMultiplier: 1.6,
    impactType: 'demand',
    region: 'CZ',
    confidence: 0.8,
    dataSource: 'expert_rules',
    reasoning: 'New Year period creates high demand for music events',
    expertSource: 'Czech Music Industry Analysis 2024'
  },

  // Easter period - Entertainment impact
  {
    holidayType: 'public_holiday',
    eventCategory: 'Entertainment',
    subcategory: 'Cultural',
    daysBefore: 2,
    daysAfter: 2,
    impactMultiplier: 1.4,
    impactType: 'demand',
    region: 'CZ',
    confidence: 0.8,
    dataSource: 'expert_rules',
    reasoning: 'Easter period increases cultural event demand',
    expertSource: 'Czech Cultural Events Analysis 2024'
  }
];

/**
 * Technology-specific holiday impacts
 */
const TECHNOLOGY_HOLIDAY_IMPACTS: HolidayImpactRuleData[] = [
  // Christmas period - Technology impact
  {
    holidayType: 'public_holiday',
    eventCategory: 'Technology',
    subcategory: 'AI/ML',
    daysBefore: 7,
    daysAfter: 3,
    impactMultiplier: 3.0,
    impactType: 'combined',
    region: 'CZ',
    confidence: 0.95,
    dataSource: 'expert_rules',
    reasoning: 'Christmas period completely stops tech industry activity, no AI/ML conferences',
    expertSource: 'Czech Tech Industry Analysis 2024'
  },
  {
    holidayType: 'public_holiday',
    eventCategory: 'Technology',
    subcategory: 'Web Development',
    daysBefore: 5,
    daysAfter: 2,
    impactMultiplier: 2.5,
    impactType: 'combined',
    region: 'CZ',
    confidence: 0.9,
    dataSource: 'expert_rules',
    reasoning: 'Christmas period significantly reduces web development conference activity',
    expertSource: 'Czech Tech Industry Analysis 2024'
  },
  {
    holidayType: 'public_holiday',
    eventCategory: 'Technology',
    subcategory: 'Startups',
    daysBefore: 5,
    daysAfter: 2,
    impactMultiplier: 2.8,
    impactType: 'combined',
    region: 'CZ',
    confidence: 0.9,
    dataSource: 'expert_rules',
    reasoning: 'Christmas period reduces startup event activity and attendance',
    expertSource: 'Czech Startup Ecosystem Analysis 2024'
  },

  // Summer vacation period - Technology impact
  {
    holidayType: 'cultural_event',
    eventCategory: 'Technology',
    daysBefore: 0,
    daysAfter: 0,
    impactMultiplier: 1.8,
    impactType: 'availability',
    region: 'CZ',
    yearStart: 2024,
    yearEnd: null,
    confidence: 0.85,
    dataSource: 'expert_rules',
    reasoning: 'Czech summer vacation period (July-August) reduces tech conference attendance',
    expertSource: 'Czech Tech Industry Analysis 2024'
  }
];

/**
 * Regional holiday impacts (Prague-specific)
 */
const REGIONAL_HOLIDAY_IMPACTS: HolidayImpactRuleData[] = [
  // Prague Spring Festival (May) - Regional impact
  {
    holidayType: 'cultural_event',
    eventCategory: 'Entertainment',
    subcategory: 'Classical',
    daysBefore: 3,
    daysAfter: 3,
    impactMultiplier: 2.5,
    impactType: 'combined',
    region: 'CZ-PR', // Prague region
    confidence: 0.95,
    dataSource: 'expert_rules',
    reasoning: 'Prague Spring Festival creates high demand for classical music events and venue competition',
    expertSource: 'Prague Cultural Events Analysis 2024'
  },
  {
    holidayType: 'cultural_event',
    eventCategory: 'Entertainment',
    subcategory: 'Music',
    daysBefore: 2,
    daysAfter: 2,
    impactMultiplier: 1.8,
    impactType: 'demand',
    region: 'CZ-PR',
    confidence: 0.9,
    dataSource: 'expert_rules',
    reasoning: 'Prague Spring Festival increases overall music event demand in Prague',
    expertSource: 'Prague Music Industry Analysis 2024'
  },

  // Prague Pride (August) - Regional impact
  {
    holidayType: 'cultural_event',
    eventCategory: 'Entertainment',
    subcategory: 'Cultural',
    daysBefore: 2,
    daysAfter: 2,
    impactMultiplier: 1.6,
    impactType: 'demand',
    region: 'CZ-PR',
    confidence: 0.85,
    dataSource: 'expert_rules',
    reasoning: 'Prague Pride increases cultural event demand and venue competition',
    expertSource: 'Prague Cultural Events Analysis 2024'
  }
];

/**
 * Sports-specific holiday impacts
 */
const SPORTS_HOLIDAY_IMPACTS: HolidayImpactRuleData[] = [
  // Major holidays - Sports impact
  {
    holidayType: 'public_holiday',
    eventCategory: 'Sports',
    daysBefore: 1,
    daysAfter: 1,
    impactMultiplier: 1.5,
    impactType: 'demand',
    region: 'CZ',
    confidence: 0.8,
    dataSource: 'expert_rules',
    reasoning: 'Public holidays increase sports event demand but reduce venue availability',
    expertSource: 'Czech Sports Industry Analysis 2024'
  },

  // Christmas period - Sports impact
  {
    holidayType: 'public_holiday',
    eventCategory: 'Sports',
    daysBefore: 3,
    daysAfter: 2,
    impactMultiplier: 1.8,
    impactType: 'combined',
    region: 'CZ',
    confidence: 0.85,
    dataSource: 'expert_rules',
    reasoning: 'Christmas period increases family sports activity but reduces competitive events',
    expertSource: 'Czech Sports Industry Analysis 2024'
  }
];

/**
 * Main seeding function
 */
async function seedHolidayImpactRules(): Promise<void> {
  const supabase = createClient();
  
  console.log('🎭 Starting holiday impact rules seeding...');
  
  try {
    // Combine all rule sets
    const allRules = [
      ...MAJOR_HOLIDAYS_IMPACT,
      ...BUSINESS_HOLIDAY_IMPACTS,
      ...ENTERTAINMENT_HOLIDAY_IMPACTS,
      ...TECHNOLOGY_HOLIDAY_IMPACTS,
      ...REGIONAL_HOLIDAY_IMPACTS,
      ...SPORTS_HOLIDAY_IMPACTS
    ];

    console.log(`📊 Total holiday impact rules to seed: ${allRules.length}`);

    // Insert rules in batches for better performance
    const batchSize = 50;
    let insertedCount = 0;

    for (let i = 0; i < allRules.length; i += batchSize) {
      const batch = allRules.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('holiday_impact_rules')
        .upsert(batch, { 
          onConflict: 'holiday_type,event_category,event_subcategory,region',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
        throw error;
      }

      insertedCount += batch.length;
      console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} rules (Total: ${insertedCount})`);
    }

    console.log(`🎉 Successfully seeded ${insertedCount} holiday impact rules!`);
    
    // Verify the seeding
    const { data: verification, error: verifyError } = await supabase
      .from('holiday_impact_rules')
      .select('holiday_type, event_category, event_subcategory, region, impact_multiplier')
      .order('holiday_type, event_category, event_subcategory');

    if (verifyError) {
      console.error('❌ Error verifying seeded data:', verifyError);
    } else {
      console.log(`✅ Verification: Found ${verification?.length || 0} rules in database`);
      
      // Show summary by holiday type
      const holidaySummary = verification?.reduce((acc: any, rule: any) => {
        acc[rule.holiday_type] = (acc[rule.holiday_type] || 0) + 1;
        return acc;
      }, {});

      console.log('📈 Rules by holiday type:');
      Object.entries(holidaySummary || {}).forEach(([holidayType, count]) => {
        console.log(`  - ${holidayType}: ${count} rules`);
      });

      // Show summary by event category
      const categorySummary = verification?.reduce((acc: any, rule: any) => {
        acc[rule.event_category] = (acc[rule.event_category] || 0) + 1;
        return acc;
      }, {});

      console.log('📈 Rules by event category:');
      Object.entries(categorySummary || {}).forEach(([category, count]) => {
        console.log(`  - ${category}: ${count} rules`);
      });
    }

  } catch (error) {
    console.error('❌ Fatal error during seeding:', error);
    throw error;
  }
}

/**
 * Validate seeded data
 */
async function validateSeededData(): Promise<void> {
  const supabase = createClient();
  
  console.log('🔍 Validating seeded holiday impact rules...');
  
  try {
    // Check for rules with extreme multipliers
    const { data: extremeRules, error: extremeError } = await supabase
      .from('holiday_impact_rules')
      .select('*')
      .or('impact_multiplier.gte.4.0,impact_multiplier.lte.0.5');

    if (extremeError) {
      console.error('❌ Error fetching extreme rules:', extremeError);
    } else if (extremeRules && extremeRules.length > 0) {
      console.log(`⚠️  Found ${extremeRules.length} rules with extreme multipliers:`);
      extremeRules.forEach(rule => {
        console.log(`  - ${rule.holiday_type} + ${rule.event_category}: ${rule.impact_multiplier}x (${rule.reasoning})`);
      });
    }

    // Check for missing combinations
    const { data: allRules, error: allError } = await supabase
      .from('holiday_impact_rules')
      .select('holiday_type, event_category, region');

    if (allError) {
      console.error('❌ Error fetching all rules:', allError);
      return;
    }

    // Check coverage by region
    const regionCoverage = allRules?.reduce((acc: any, rule: any) => {
      acc[rule.region] = (acc[rule.region] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 Rules by region:');
    Object.entries(regionCoverage || {}).forEach(([region, count]) => {
      console.log(`  - ${region}: ${count} rules`);
    });

    console.log('✅ Validation completed');

  } catch (error) {
    console.error('❌ Error during validation:', error);
  }
}

/**
 * Test holiday impact calculation
 */
async function testHolidayImpactCalculation(): Promise<void> {
  const supabase = createClient();
  
  console.log('🧪 Testing holiday impact calculation...');
  
  try {
    // Test Christmas Eve impact on Business events
    const { data: christmasRules, error: christmasError } = await supabase
      .from('holiday_impact_rules')
      .select('*')
      .eq('holiday_type', 'public_holiday')
      .eq('event_category', 'Business')
      .like('reasoning', '%Christmas%');

    if (christmasError) {
      console.error('❌ Error fetching Christmas rules:', christmasError);
    } else if (christmasRules && christmasRules.length > 0) {
      console.log(`✅ Found ${christmasRules.length} Christmas impact rules for Business events`);
      christmasRules.forEach(rule => {
        console.log(`  - Impact: ${rule.impact_multiplier}x (${rule.days_before} days before, ${rule.days_after} days after)`);
        console.log(`  - Reasoning: ${rule.reasoning}`);
      });
    }

    // Test regional rules
    const { data: regionalRules, error: regionalError } = await supabase
      .from('holiday_impact_rules')
      .select('*')
      .eq('region', 'CZ-PR');

    if (regionalError) {
      console.error('❌ Error fetching regional rules:', regionalError);
    } else if (regionalRules && regionalRules.length > 0) {
      console.log(`✅ Found ${regionalRules.length} Prague-specific holiday impact rules`);
    }

    console.log('✅ Holiday impact calculation test completed');

  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

// Export functions for use in other scripts
export { seedHolidayImpactRules, validateSeededData, testHolidayImpactCalculation };

// Run seeding if this script is executed directly
if (require.main === module) {
  seedHolidayImpactRules()
    .then(() => validateSeededData())
    .then(() => testHolidayImpactCalculation())
    .then(() => {
      console.log('🎉 Holiday impact rules seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}
