/**
 * Populate Czech Holidays for 2026 - Simple Version
 * 
 * This script directly inserts the essential Czech holidays for 2026
 * without complex calculations, focusing on the most important dates.
 * 
 * @fileoverview Simple script to populate Czech holidays for 2026
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * Essential Czech holidays for 2026
 */
const CZECH_HOLIDAYS_2026 = [
  // Fixed date holidays
  { name: "New Year's Day", name_native: "Nový rok", date: "2026-01-01", business_impact: "full", venue_closure: true },
  { name: "Labour Day", name_native: "Svátek práce", date: "2026-05-01", business_impact: "full", venue_closure: true },
  { name: "Liberation Day", name_native: "Den osvobození", date: "2026-05-08", business_impact: "full", venue_closure: true },
  { name: "St. Cyril and Methodius Day", name_native: "Den slovanských věrozvěstů Cyrila a Metoděje", date: "2026-07-05", business_impact: "full", venue_closure: true },
  { name: "Jan Hus Day", name_native: "Den upálení mistra Jana Husa", date: "2026-07-06", business_impact: "full", venue_closure: true },
  { name: "Czech Statehood Day", name_native: "Den české státnosti", date: "2026-09-28", business_impact: "full", venue_closure: true },
  { name: "Independence Day", name_native: "Den vzniku samostatného československého státu", date: "2026-10-28", business_impact: "full", venue_closure: true },
  { name: "Struggle for Freedom and Democracy Day", name_native: "Den boje za svobodu a demokracii", date: "2026-11-17", business_impact: "full", venue_closure: true },
  { name: "Christmas Eve", name_native: "Štědrý den", date: "2026-12-24", business_impact: "full", venue_closure: true },
  { name: "Christmas Day", name_native: "1. svátek vánoční", date: "2026-12-25", business_impact: "full", venue_closure: true },
  { name: "St. Stephen's Day", name_native: "2. svátek vánoční", date: "2026-12-26", business_impact: "full", venue_closure: true },
  
  // Easter-dependent holidays (calculated for 2026)
  { name: "Easter Monday", name_native: "Velikonoční pondělí", date: "2026-03-31", business_impact: "full", venue_closure: true },
  
  // Cultural events that might affect venues
  { name: "Prague Spring Festival", name_native: "Pražské jaro", date: "2026-05-12", business_impact: "partial", venue_closure: false },
  { name: "Karlovy Vary Film Festival", name_native: "Mezinárodní filmový festival Karlovy Vary", date: "2026-07-01", business_impact: "partial", venue_closure: false },
];

/**
 * Get holiday type ID
 */
async function getHolidayTypeId(supabase: any, typeName: string): Promise<string> {
  const { data, error } = await supabase
    .from('holiday_types')
    .select('id')
    .eq('name', typeName)
    .single();
  
  if (error || !data) {
    throw new Error(`Holiday type '${typeName}' not found`);
  }
  
  return data.id;
}

/**
 * Get country ID for Czech Republic
 */
async function getCountryId(supabase: any): Promise<string> {
  const { data, error } = await supabase
    .from('countries')
    .select('id')
    .eq('code', 'CZE')
    .single();
  
  if (error || !data) {
    throw new Error('Czech Republic not found in countries table');
  }
  
  return data.id;
}

/**
 * Populate Czech holidays for 2026
 */
async function populateCzechHolidays2026(): Promise<void> {
  console.log('🚀 Populating Czech Holidays for 2026...\n');
  
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    console.log('✅ Database connection established');
    
    // Get required IDs
    console.log('\n📋 Getting required IDs...');
    const countryId = await getCountryId(supabase);
    const publicHolidayTypeId = await getHolidayTypeId(supabase, 'public_holiday');
    const culturalEventTypeId = await getHolidayTypeId(supabase, 'cultural_event');
    
    console.log(`✅ Country ID: ${countryId}`);
    console.log(`✅ Public Holiday Type ID: ${publicHolidayTypeId}`);
    console.log(`✅ Cultural Event Type ID: ${culturalEventTypeId}`);
    
    // Check if observances already exist for 2026
    const { data: existing, error: checkError } = await supabase
      .from('holiday_observances')
      .select('id')
      .gte('observed_date', '2026-01-01')
      .lte('observed_date', '2026-12-31')
      .limit(1);
    
    if (checkError) {
      console.error('Error checking existing observances:', checkError);
      return;
    }
    
    if (existing && existing.length > 0) {
      console.log('⚠️  Holiday observances for 2026 already exist.');
      console.log('   To re-populate, delete existing entries first:');
      console.log('   DELETE FROM holiday_observances WHERE observed_date >= \'2026-01-01\' AND observed_date <= \'2026-12-31\';');
      return;
    }
    
    // Insert holiday observances
    console.log('\n📝 Inserting holiday observances...');
    
    const observances = CZECH_HOLIDAYS_2026.map(holiday => ({
      observed_date: holiday.date,
      is_observed: true,
      business_impact: holiday.business_impact,
      venue_closure_expected: holiday.venue_closure,
      created_at: new Date().toISOString(),
      // We'll need to get the holiday_id from the holidays table
      holiday_name: holiday.name,
      holiday_name_native: holiday.name_native
    }));
    
    // For now, let's create a simple approach by inserting directly
    // This assumes the holidays table has the basic Czech holidays
    console.log(`📅 Inserting ${observances.length} holiday observances...`);
    
    // Insert in batches
    const batchSize = 5;
    for (let i = 0; i < observances.length; i += batchSize) {
      const batch = observances.slice(i, i + batchSize);
      
      // For each observance, we need to find the corresponding holiday_id
      for (const observance of batch) {
        // Try to find the holiday by name
        const { data: holiday, error: holidayError } = await supabase
          .from('holidays')
          .select('id')
          .eq('name', observance.holiday_name)
          .eq('country_id', countryId)
          .single();
        
        if (holiday && !holidayError) {
          // Insert the observance with the found holiday_id
          const { error: insertError } = await supabase
            .from('holiday_observances')
            .insert({
              holiday_id: holiday.id,
              observed_date: observance.observed_date,
              is_observed: observance.is_observed,
              business_impact: observance.business_impact,
              venue_closure_expected: observance.venue_closure_expected,
              created_at: observance.created_at
            });
          
          if (insertError) {
            console.log(`⚠️  Could not insert ${observance.holiday_name}: ${insertError.message}`);
          } else {
            console.log(`✅ Inserted ${observance.holiday_name} (${observance.observed_date})`);
          }
        } else {
          console.log(`⚠️  Could not find holiday: ${observance.holiday_name}`);
        }
      }
    }
    
    // Verify the data
    console.log('\n🔍 Verifying populated data...');
    
    const { data: insertedObservances, error: verifyError } = await supabase
      .from('holiday_observances')
      .select(`
        id,
        observed_date,
        is_observed,
        business_impact,
        venue_closure_expected,
        holidays!inner(
          name,
          name_native
        )
      `)
      .gte('observed_date', '2026-01-01')
      .lte('observed_date', '2026-12-31')
      .order('observed_date');
    
    if (verifyError) {
      console.error('❌ Error verifying observances:', verifyError);
    } else {
      console.log(`📊 Successfully inserted ${insertedObservances?.length || 0} holiday observances for 2026:`);
      
      insertedObservances?.forEach((obs: any) => {
        const holiday = obs.holidays;
        console.log(`  - ${holiday.name} (${holiday.name_native}): ${obs.observed_date} [${obs.business_impact}]`);
      });
    }
    
    // Test the RPC function
    console.log('\n🧪 Testing holiday RPC function...');
    
    try {
      const { data: testHolidays, error: testError } = await supabase
        .rpc('get_holidays_for_date', {
          target_date: '2026-06-20',
          country_code: 'CZE',
          region_code: 'CZ-JM'
        });
      
      if (testError) {
        console.log(`⚠️  RPC function test failed: ${testError.message}`);
        console.log('   This might be because the RPC function needs to be created or updated.');
      } else {
        console.log(`✅ RPC function working: Found ${testHolidays?.length || 0} holidays for June 20, 2026`);
      }
    } catch (error) {
      console.log(`⚠️  RPC function test error: ${error}`);
    }
    
    console.log('\n🎉 Czech holidays population completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('  1. Test the conflict analysis to see holiday impacts');
    console.log('  2. Run: npm run dev (if not already running)');
    console.log('  3. Test the conflict analysis API with a date near a holiday');
    console.log('  4. Verify that holiday multipliers are applied to conflict scores');
    
  } catch (error) {
    console.error('❌ Failed to populate Czech holidays:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('  1. Check that the database connection is working');
    console.log('  2. Verify that the holidays table has Czech holidays');
    console.log('  3. Ensure the holiday_observances table exists');
    console.log('  4. Check that you have the necessary permissions');
    console.log('  5. Make sure the migration 003_holidays_and_cultural_events.sql was applied');
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  populateCzechHolidays2026()
    .then(() => {
      console.log('\n✅ Czech holidays population completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Czech holidays population failed:', error);
      process.exit(1);
    });
}

export { populateCzechHolidays2026 };
