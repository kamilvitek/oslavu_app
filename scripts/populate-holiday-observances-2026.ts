/**
 * Populate Holiday Observances for 2026
 * 
 * This script generates holiday_observances entries for 2026 based on the holidays table.
 * It calculates actual dates for fixed holidays and Easter-dependent holidays.
 * 
 * @fileoverview Script to populate holiday observances for 2026
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * Calculate Easter date for a given year using the algorithm
 */
function calculateEasterDate(year: number): Date {
  // Easter calculation algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = Math.floor((h + l - 7 * m + 114) / 31);
  const p = (h + l - 7 * m + 114) % 31;
  
  return new Date(year, n - 1, p + 1);
}

/**
 * Get all holidays from the database
 */
async function getAllHolidays(supabase: any) {
  const { data: holidays, error } = await supabase
    .from('holidays')
    .select(`
      id,
      name,
      name_native,
      description,
      holiday_type_id,
      country_id,
      region_id,
      date_type,
      month,
      day,
      easter_offset,
      year_start,
      year_end,
      business_impact,
      venue_closure_expected
    `)
    .eq('country_id', (await supabase.from('countries').select('id').eq('code', 'CZE').single()).data?.id);

  if (error) {
    throw new Error(`Failed to fetch holidays: ${error.message}`);
  }

  return holidays || [];
}

/**
 * Generate holiday observances for 2026
 */
async function generateHolidayObservances(supabase: any, holidays: any[]) {
  const year = 2026;
  const easterDate = calculateEasterDate(year);
  
  console.log(`🐣 Easter 2026: ${easterDate.toISOString().split('T')[0]}`);
  
  const observances = [];
  
  for (const holiday of holidays) {
    // Check if holiday is valid for 2026
    if (holiday.year_start && holiday.year_start > year) continue;
    if (holiday.year_end && holiday.year_end < year) continue;
    
    let observanceDate: Date;
    
    if (holiday.date_type === 'fixed') {
      // Fixed date holidays (like New Year's Day)
      observanceDate = new Date(year, holiday.month - 1, holiday.day);
    } else if (holiday.date_type === 'variable' && holiday.easter_offset !== null) {
      // Easter-dependent holidays
      observanceDate = new Date(easterDate);
      observanceDate.setDate(easterDate.getDate() + holiday.easter_offset);
    } else {
      // Skip holidays we can't calculate
      console.log(`⚠️  Skipping holiday "${holiday.name}" - unsupported date type: ${holiday.date_type}`);
      continue;
    }
    
    // Create observance entry
    const observance = {
      holiday_id: holiday.id,
      year: year,
      observed_date: observanceDate.toISOString().split('T')[0],
      is_observed: true,
      business_impact: holiday.business_impact,
      venue_closure_expected: holiday.venue_closure_expected,
      created_at: new Date().toISOString()
    };
    
    observances.push(observance);
    
    console.log(`✅ ${holiday.name} (${holiday.name_native}): ${observanceDate.toISOString().split('T')[0]}`);
  }
  
  return observances;
}

/**
 * Insert holiday observances into the database
 */
async function insertHolidayObservances(supabase: any, observances: any[]) {
  if (observances.length === 0) {
    console.log('⚠️  No observances to insert');
    return;
  }
  
  console.log(`\n📝 Inserting ${observances.length} holiday observances for 2026...`);
  
  // Check if observances already exist for 2026
  const { data: existing, error: checkError } = await supabase
    .from('holiday_observances')
    .select('id')
    .eq('year', 2026)
    .limit(1);
  
  if (checkError) {
    console.error('Error checking existing observances:', checkError);
    return;
  }
  
  if (existing && existing.length > 0) {
    console.log('⚠️  Holiday observances for 2026 already exist. Skipping insertion.');
    console.log('   To re-populate, delete existing entries first.');
    return;
  }
  
  // Insert in batches to avoid overwhelming the database
  const batchSize = 10;
  for (let i = 0; i < observances.length; i += batchSize) {
    const batch = observances.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('holiday_observances')
      .insert(batch);
    
    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
      continue;
    }
    
    console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(observances.length / batchSize)}`);
  }
  
  console.log(`\n🎉 Successfully populated ${observances.length} holiday observances for 2026!`);
}

/**
 * Verify the populated data
 */
async function verifyHolidayObservances(supabase: any) {
  console.log('\n🔍 Verifying populated holiday observances...');
  
  const { data: observances, error } = await supabase
    .from('holiday_observances')
    .select(`
      id,
      year,
      observed_date,
      is_observed,
      business_impact,
      venue_closure_expected,
      holidays!inner(
        name,
        name_native,
        date_type
      )
    `)
    .eq('year', 2026)
    .order('observed_date');
  
  if (error) {
    console.error('❌ Error verifying observances:', error);
    return;
  }
  
  console.log(`📊 Found ${observances?.length || 0} holiday observances for 2026:`);
  
  observances?.forEach((obs: any) => {
    const holiday = obs.holidays;
    console.log(`  - ${holiday.name} (${holiday.name_native}): ${obs.observed_date} [${obs.business_impact}]`);
  });
  
  // Test the RPC function
  console.log('\n🧪 Testing RPC function...');
  
  try {
    const { data: testHolidays, error: testError } = await supabase
      .rpc('get_holidays_for_date', {
        target_date: '2026-06-20',
        country_code: 'CZE',
        region_code: 'CZ-JM'
      });
    
    if (testError) {
      console.log(`⚠️  RPC function test failed: ${testError.message}`);
    } else {
      console.log(`✅ RPC function working: Found ${testHolidays?.length || 0} holidays for June 20, 2026`);
    }
  } catch (error) {
    console.log(`⚠️  RPC function test error: ${error}`);
  }
}

/**
 * Main function to populate holiday observances
 */
async function populateHolidayObservances2026(): Promise<void> {
  console.log('🚀 Populating Holiday Observances for 2026...\n');
  
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    console.log('✅ Database connection established');
    
    // Get all holidays
    console.log('\n📋 Fetching holidays from database...');
    const holidays = await getAllHolidays(supabase);
    console.log(`✅ Found ${holidays.length} holiday rules`);
    
    // Generate observances for 2026
    console.log('\n🧮 Generating holiday observances for 2026...');
    const observances = await generateHolidayObservances(supabase, holidays);
    console.log(`✅ Generated ${observances.length} observances`);
    
    // Insert observances
    await insertHolidayObservances(supabase, observances);
    
    // Verify the data
    await verifyHolidayObservances(supabase);
    
    console.log('\n🎉 Holiday observances population completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('  1. Test the conflict analysis to see holiday impacts');
    console.log('  2. Verify seasonal intelligence warnings are displayed');
    console.log('  3. Check that holiday multipliers are applied to conflict scores');
    
  } catch (error) {
    console.error('❌ Failed to populate holiday observances:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('  1. Check that the database connection is working');
    console.log('  2. Verify that the holidays table has data');
    console.log('  3. Ensure the holiday_observances table exists');
    console.log('  4. Check that you have the necessary permissions');
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  populateHolidayObservances2026()
    .then(() => {
      console.log('\n✅ Holiday observances population completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Holiday observances population failed:', error);
      process.exit(1);
    });
}

export { populateHolidayObservances2026 };
