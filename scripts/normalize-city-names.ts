#!/usr/bin/env ts-node
// scripts/normalize-city-names.ts
// Migration script to normalize existing city names in the events database
// Updates "Praha" to "Prague", and other Czech city names to their English equivalents

import { createServerClient } from '../src/lib/supabase';
import { cityNormalizationService } from '../src/lib/services/city-normalization';

interface CityMapping {
  czech: string;
  english: string;
}

// Common Czech to English city name mappings
const CITY_MAPPINGS: CityMapping[] = [
  { czech: 'Praha', english: 'Prague' },
  { czech: 'Brno', english: 'Brno' }, // Already English
  { czech: 'Ostrava', english: 'Ostrava' }, // Already English
  { czech: 'Plzeň', english: 'Plzen' },
  { czech: 'Liberec', english: 'Liberec' }, // Already English
  { czech: 'Olomouc', english: 'Olomouc' }, // Already English
  { czech: 'České Budějovice', english: 'Ceske Budejovice' },
  { czech: 'Hradec Králové', english: 'Hradec Kralove' },
  { czech: 'Ústí nad Labem', english: 'Usti nad Labem' },
  { czech: 'Pardubice', english: 'Pardubice' }, // Already English
  { czech: 'Zlín', english: 'Zlin' },
  { czech: 'Havířov', english: 'Havirov' },
  { czech: 'Kladno', english: 'Kladno' }, // Already English
  { czech: 'Most', english: 'Most' }, // Already English
  { czech: 'Karlovy Vary', english: 'Karlovy Vary' }, // Already English
];

async function normalizeCityNames() {
  console.log('🔄 Starting city name normalization migration...');
  
  const supabase = createServerClient();
  let totalUpdated = 0;
  let totalErrors = 0;

  try {
    // Get all unique city names from events table
    console.log('📊 Fetching unique city names from events table...');
    const { data: cities, error: fetchError } = await supabase
      .from('events')
      .select('city')
      .not('city', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch cities: ${fetchError.message}`);
    }

    if (!cities || cities.length === 0) {
      console.log('✅ No events found in database');
      return;
    }

    // Get unique city names
    const uniqueCities = [...new Set(cities.map(c => c.city))].filter(Boolean) as string[];
    console.log(`📊 Found ${uniqueCities.length} unique city names`);

    // Normalize each city name
    const cityNormalizations = new Map<string, string>();
    
    for (const city of uniqueCities) {
      try {
        // Check if we have a direct mapping first
        const directMapping = CITY_MAPPINGS.find(m => 
          m.czech.toLowerCase() === city.toLowerCase() || 
          m.english.toLowerCase() === city.toLowerCase()
        );

        if (directMapping) {
          cityNormalizations.set(city, directMapping.english);
          console.log(`✅ Direct mapping: "${city}" -> "${directMapping.english}"`);
          continue;
        }

        // Use city normalization service for other cities
        const normalized = await cityNormalizationService.getAPICityName(city);
        if (normalized !== city) {
          cityNormalizations.set(city, normalized);
          console.log(`✅ Normalized: "${city}" -> "${normalized}"`);
        } else {
          console.log(`⏭️  No change needed: "${city}"`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Error normalizing city "${city}":`, error);
        totalErrors++;
      }
    }

    // Update events with normalized city names
    console.log(`\n🔄 Updating events with normalized city names...`);
    
    for (const [originalCity, normalizedCity] of cityNormalizations.entries()) {
      if (originalCity === normalizedCity) continue;

      try {
        const { data, error } = await supabase
          .from('events')
          .update({ 
            city: normalizedCity,
            normalized_city: normalizedCity // Also update normalized_city field if it exists
          })
          .eq('city', originalCity)
          .select('id');

        if (error) {
          console.error(`❌ Error updating city "${originalCity}":`, error);
          totalErrors++;
        } else {
          const updatedCount = data?.length || 0;
          totalUpdated += updatedCount;
          console.log(`✅ Updated ${updatedCount} events: "${originalCity}" -> "${normalizedCity}"`);
        }
      } catch (error) {
        console.error(`❌ Error updating city "${originalCity}":`, error);
        totalErrors++;
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   - Total cities processed: ${uniqueCities.length}`);
    console.log(`   - Cities normalized: ${cityNormalizations.size}`);
    console.log(`   - Events updated: ${totalUpdated}`);
    console.log(`   - Errors: ${totalErrors}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  normalizeCityNames()
    .then(() => {
      console.log('✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { normalizeCityNames };

