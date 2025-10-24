#!/usr/bin/env tsx
// scripts/seed-venue-database.ts
import { venueDatabaseService } from '../src/lib/services/venue-database';

interface CzechVenue {
  name: string;
  city: string;
  capacity: number;
  capacity_standing?: number;
  capacity_seated?: number;
  capacity_source: 'official' | 'estimated' | 'user_reported';
  venue_type: string;
  address?: string;
  website?: string;
  data_source: 'manual';
}

const czechVenues: CzechVenue[] = [
  // Prague Venues
  {
    name: 'O2 Arena',
    city: 'Prague',
    capacity: 18000,
    capacity_standing: 18000,
    capacity_seated: 12000,
    capacity_source: 'official',
    venue_type: 'arena',
    address: 'Českomoravská 2345/17, 190 00 Praha 9',
    website: 'https://www.o2arena.cz',
    data_source: 'manual'
  },
  {
    name: 'Eden Arena',
    city: 'Prague',
    capacity: 21000,
    capacity_standing: 21000,
    capacity_seated: 15000,
    capacity_source: 'official',
    venue_type: 'stadium',
    address: 'U Slavie 1540/2a, 100 00 Praha 10',
    website: 'https://www.edenarena.cz',
    data_source: 'manual'
  },
  {
    name: 'Prague Congress Centre',
    city: 'Prague',
    capacity: 9300,
    capacity_standing: 9300,
    capacity_seated: 9300,
    capacity_source: 'official',
    venue_type: 'conference_center',
    address: '5. května 1640/65, 140 21 Praha 4',
    website: 'https://www.pvcp.cz',
    data_source: 'manual'
  },
  {
    name: 'Clarion Congress Hotel Prague',
    city: 'Prague',
    capacity: 2500,
    capacity_standing: 2500,
    capacity_seated: 2500,
    capacity_source: 'official',
    venue_type: 'hotel',
    address: 'Freyova 33, 190 00 Praha 9',
    website: 'https://www.clarioncongressprague.cz',
    data_source: 'manual'
  },
  {
    name: 'Prague Exhibition Grounds',
    city: 'Prague',
    capacity: 15000,
    capacity_standing: 15000,
    capacity_seated: 10000,
    capacity_source: 'official',
    venue_type: 'exhibition_center',
    address: 'Výstaviště 1, 170 00 Praha 7',
    website: 'https://www.vystavistepraha.cz',
    data_source: 'manual'
  },
  {
    name: 'National Theatre',
    city: 'Prague',
    capacity: 1000,
    capacity_standing: 0,
    capacity_seated: 1000,
    capacity_source: 'official',
    venue_type: 'theater',
    address: 'Národní 2, 110 00 Praha 1',
    website: 'https://www.narodni-divadlo.cz',
    data_source: 'manual'
  },
  {
    name: 'Rudolfinum',
    city: 'Prague',
    capacity: 1200,
    capacity_standing: 0,
    capacity_seated: 1200,
    capacity_source: 'official',
    venue_type: 'concert_hall',
    address: 'Alšovo nábř. 12, 110 00 Praha 1',
    website: 'https://www.rudolfinum.cz',
    data_source: 'manual'
  },
  {
    name: 'Prague Castle',
    city: 'Prague',
    capacity: 5000,
    capacity_standing: 5000,
    capacity_seated: 2000,
    capacity_source: 'estimated',
    venue_type: 'historic_venue',
    address: 'Hradčany, 119 08 Praha 1',
    website: 'https://www.hrad.cz',
    data_source: 'manual'
  },

  // Brno Venues
  {
    name: 'Brno Exhibition Centre',
    city: 'Brno',
    capacity: 8000,
    capacity_standing: 8000,
    capacity_seated: 6000,
    capacity_source: 'official',
    venue_type: 'exhibition_center',
    address: 'Výstaviště 1, 603 00 Brno',
    website: 'https://www.bvv.cz',
    data_source: 'manual'
  },
  {
    name: 'Janáček Theatre',
    city: 'Brno',
    capacity: 1200,
    capacity_standing: 0,
    capacity_seated: 1200,
    capacity_source: 'official',
    venue_type: 'theater',
    address: 'Rooseveltova 1/7, 602 00 Brno',
    website: 'https://www.ndbrno.cz',
    data_source: 'manual'
  },
  {
    name: 'Brno Congress Centre',
    city: 'Brno',
    capacity: 2000,
    capacity_standing: 2000,
    capacity_seated: 2000,
    capacity_source: 'official',
    venue_type: 'conference_center',
    address: 'BVV Trade Fairs Brno, Výstaviště 1, 603 00 Brno',
    website: 'https://www.bvv.cz',
    data_source: 'manual'
  },
  {
    name: 'Hotel International Brno',
    city: 'Brno',
    capacity: 800,
    capacity_standing: 800,
    capacity_seated: 800,
    capacity_source: 'estimated',
    venue_type: 'hotel',
    address: 'Husova 200/16, 602 00 Brno',
    website: 'https://www.hotel-international.cz',
    data_source: 'manual'
  },

  // Ostrava Venues
  {
    name: 'Ostrava Arena',
    city: 'Ostrava',
    capacity: 12000,
    capacity_standing: 12000,
    capacity_seated: 8000,
    capacity_source: 'official',
    venue_type: 'arena',
    address: 'Černá louka 3231/1, 702 00 Ostrava',
    website: 'https://www.ostrava-arena.cz',
    data_source: 'manual'
  },
  {
    name: 'Dolní Vítkovice',
    city: 'Ostrava',
    capacity: 15000,
    capacity_standing: 15000,
    capacity_seated: 10000,
    capacity_source: 'estimated',
    venue_type: 'industrial_venue',
    address: 'Vítkovice 3004, 703 00 Ostrava',
    website: 'https://www.dolnivitkovice.cz',
    data_source: 'manual'
  },
  {
    name: 'Hotel Park Inn Ostrava',
    city: 'Ostrava',
    capacity: 600,
    capacity_standing: 600,
    capacity_seated: 600,
    capacity_source: 'estimated',
    venue_type: 'hotel',
    address: 'Hornopolní 3313/42, 702 00 Ostrava',
    website: 'https://www.parkinn.com',
    data_source: 'manual'
  },

  // Other Major Cities
  {
    name: 'Olomouc Exhibition Centre',
    city: 'Olomouc',
    capacity: 3000,
    capacity_standing: 3000,
    capacity_seated: 2500,
    capacity_source: 'official',
    venue_type: 'exhibition_center',
    address: 'Wolkerova 17, 771 11 Olomouc',
    website: 'https://www.vmo.cz',
    data_source: 'manual'
  },
  {
    name: 'Plzeň Exhibition Centre',
    city: 'Plzeň',
    capacity: 2500,
    capacity_standing: 2500,
    capacity_seated: 2000,
    capacity_source: 'official',
    venue_type: 'exhibition_center',
    address: 'Výstaviště 1, 301 00 Plzeň',
    website: 'https://www.vystaviste-plzen.cz',
    data_source: 'manual'
  },
  {
    name: 'Hradec Králové Exhibition Centre',
    city: 'Hradec Králové',
    capacity: 2000,
    capacity_standing: 2000,
    capacity_seated: 1500,
    capacity_source: 'official',
    venue_type: 'exhibition_center',
    address: 'Piletická 375, 500 03 Hradec Králové',
    website: 'https://www.vchk.cz',
    data_source: 'manual'
  },

  // Hotels and Conference Centers
  {
    name: 'Hilton Prague',
    city: 'Prague',
    capacity: 1200,
    capacity_standing: 1200,
    capacity_seated: 1000,
    capacity_source: 'estimated',
    venue_type: 'hotel',
    address: 'Pobřežní 1, 186 00 Praha 8',
    website: 'https://www.hilton.com',
    data_source: 'manual'
  },
  {
    name: 'Marriott Prague',
    city: 'Prague',
    capacity: 1000,
    capacity_standing: 1000,
    capacity_seated: 800,
    capacity_source: 'estimated',
    venue_type: 'hotel',
    address: 'V Celnici 8, 110 00 Praha 1',
    website: 'https://www.marriott.com',
    data_source: 'manual'
  },
  {
    name: 'Crowne Plaza Prague',
    city: 'Prague',
    capacity: 800,
    capacity_standing: 800,
    capacity_seated: 600,
    capacity_source: 'estimated',
    venue_type: 'hotel',
    address: 'Koulova 15, 160 00 Praha 6',
    website: 'https://www.ihg.com',
    data_source: 'manual'
  },

  // Universities and Educational Venues
  {
    name: 'Charles University',
    city: 'Prague',
    capacity: 500,
    capacity_standing: 500,
    capacity_seated: 500,
    capacity_source: 'estimated',
    venue_type: 'university',
    address: 'Ovocný trh 5, 116 36 Praha 1',
    website: 'https://www.cuni.cz',
    data_source: 'manual'
  },
  {
    name: 'Masaryk University',
    city: 'Brno',
    capacity: 400,
    capacity_standing: 400,
    capacity_seated: 400,
    capacity_source: 'estimated',
    venue_type: 'university',
    address: 'Žerotínovo nám. 9, 601 77 Brno',
    website: 'https://www.muni.cz',
    data_source: 'manual'
  },

  // Sports Venues
  {
    name: 'Tipsport Arena',
    city: 'Prague',
    capacity: 17000,
    capacity_standing: 17000,
    capacity_seated: 12000,
    capacity_source: 'official',
    venue_type: 'stadium',
    address: 'Za Elektrárnou 419, 170 00 Praha 7',
    website: 'https://www.tipsportarena.cz',
    data_source: 'manual'
  },
  {
    name: 'Stadion Letná',
    city: 'Prague',
    capacity: 22000,
    capacity_standing: 22000,
    capacity_seated: 18000,
    capacity_source: 'official',
    venue_type: 'stadium',
    address: 'Milady Horákové 98, 170 00 Praha 7',
    website: 'https://www.sparta.cz',
    data_source: 'manual'
  }
];

async function seedVenueDatabase() {
  console.log('🌱 Starting venue database seeding...');
  console.log(`📊 Found ${czechVenues.length} venues to seed`);

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const venue of czechVenues) {
    try {
      console.log(`📍 Adding venue: ${venue.name} (${venue.city})`);
      
      const result = await venueDatabaseService.addVenue(venue);
      console.log(`   ✅ Added with ID: ${result.id}`);
      successCount++;
      
    } catch (error) {
      const errorMsg = `Failed to add ${venue.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`   ❌ ${errorMsg}`);
      errors.push(errorMsg);
      errorCount++;
    }
  }

  console.log('\n🏁 Seeding completed!');
  console.log(`✅ Successfully added: ${successCount} venues`);
  console.log(`❌ Failed to add: ${errorCount} venues`);

  if (errors.length > 0) {
    console.log('\n⚠️  Errors:');
    errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }

  // Verify seeding
  console.log('\n🔍 Verifying seeded data...');
  try {
    const pragueVenues = await venueDatabaseService.getVenuesByCity('Prague');
    const brnoVenues = await venueDatabaseService.getVenuesByCity('Brno');
    
    console.log(`📊 Prague venues: ${pragueVenues.length}`);
    console.log(`📊 Brno venues: ${brnoVenues.length}`);
    console.log(`📊 Total venues in database: ${pragueVenues.length + brnoVenues.length}`);
    
    // Show some examples
    if (pragueVenues.length > 0) {
      console.log('\n🏟️  Sample Prague venues:');
      pragueVenues.slice(0, 3).forEach(venue => {
        console.log(`   - ${venue.name}: ${venue.capacity} capacity (${venue.venue_type})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error verifying seeded data:', error);
  }
}

async function main() {
  try {
    await seedVenueDatabase();
    console.log('\n🎉 Venue database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}
