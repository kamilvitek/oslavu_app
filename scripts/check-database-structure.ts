import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local FIRST
config({ path: path.resolve(process.cwd(), '.env.local') });

// Now import the service after environment variables are loaded
const { serverDatabaseService } = require('../src/lib/supabase');

async function checkDatabaseStructure() {
  console.log('🔍 Checking database structure...\n');
  
  try {
    // Try to query events table with all possible columns
    console.log('📋 Testing events table columns...');
    
    // Test if expected_attendees column exists by trying to select it
    const { data: attendeeTest, error: attendeeError } = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('events')
        .select('id, title, expected_attendees')
        .limit(1);
      return result;
    });

    if (attendeeError) {
      console.log('❌ expected_attendees column does NOT exist or is not accessible');
      console.log('   Error:', attendeeError.message);
    } else {
      console.log('✅ expected_attendees column exists');
    }

    // Test confidence columns
    const confidenceColumns = ['attendee_source', 'attendee_confidence', 'attendee_reasoning', 'attendee_verified'];
    console.log('\n📊 Testing confidence tracking columns:');
    
    for (const col of confidenceColumns) {
      const { data, error } = await serverDatabaseService.executeWithRetry(async () => {
        const result = await serverDatabaseService.getClient()
          .from('events')
          .select(`id, ${col}`)
          .limit(1);
        return result;
      });
      
      if (error) {
        console.log(`   - ${col}: ❌ NO (${error.message})`);
      } else {
        console.log(`   - ${col}: ✅ YES`);
      }
    }

    // Test venues table
    console.log('\n🏢 Testing venues table...');
    const { data: venuesTest, error: venuesError } = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('venues')
        .select('id, name')
        .limit(1);
      return result;
    });

    if (venuesError) {
      console.log('   - venues table: ❌ NO (does not exist or not accessible)');
    } else {
      console.log('   - venues table: ✅ YES');
    }

    // Sample some events to see if they have expected_attendees
    console.log('\n📊 Sample events with attendee data:');
    const { data: sampleEvents, error: sampleError } = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('events')
        .select('id, title, venue, expected_attendees, attendee_source, attendee_confidence, attendee_reasoning')
        .not('expected_attendees', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(10);
      return result;
    });

    if (sampleError) {
      console.error('❌ Error fetching sample events:', sampleError);
    } else {
      if (sampleEvents && sampleEvents.length > 0) {
        console.log(`   Found ${sampleEvents.length} events with attendee data:`);
        sampleEvents.forEach((event: any, index: number) => {
          const source = event.attendee_source || 'unknown';
          const confidence = event.attendee_confidence || 0;
          const reasoning = event.attendee_reasoning ? JSON.stringify(event.attendee_reasoning).slice(0, 50) + '...' : 'none';
          console.log(`   ${index + 1}. ${event.title} (${event.venue})`);
          console.log(`       👥 ${event.expected_attendees} attendees | 📊 ${source} | 🎯 ${confidence} | 💭 ${reasoning}`);
        });
      } else {
        console.log('   ⚠️  No events found with attendee data');
      }
    }

    // Count total events
    const { data: totalEvents, error: totalError } = await serverDatabaseService.executeWithRetry(async () => {
      const result = await serverDatabaseService.getClient()
        .from('events')
        .select('id', { count: 'exact' });
      return result;
    });

    if (!totalError && totalEvents) {
      console.log(`\n📈 Total events in database: ${totalEvents.length}`);
    }

  } catch (error) {
    console.error('❌ Error checking database structure:', error);
  }
}

checkDatabaseStructure().catch(console.error);
