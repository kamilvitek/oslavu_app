import { config } from 'dotenv';
import path from 'path';
import crypto from 'crypto';

// Load environment variables from .env.local FIRST
config({ path: path.resolve(process.cwd(), '.env.local') });

async function setupCronAutomation() {
  console.log('🚀 Setting up Cron Automation');
  console.log('================================\n');

  // Check if CRON_SECRET is set
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret || cronSecret === 'your_secure_random_string_here') {
    console.log('🔐 Generating secure CRON_SECRET...');
    const newSecret = crypto.randomBytes(32).toString('hex');
    
    console.log('📝 Add this to your .env.local file:');
    console.log(`CRON_SECRET=${newSecret}\n`);
    
    console.log('📝 Add this to your Vercel environment variables:');
    console.log(`CRON_SECRET=${newSecret}\n`);
    
    console.log('⚠️  IMPORTANT: Keep this secret secure!');
    console.log('   This token is used to authorize automated cron jobs.\n');
  } else {
    console.log('✅ CRON_SECRET is already configured\n');
  }

  console.log('📅 Cron Schedule Configuration:');
  console.log('================================');
  console.log('🕕 Daily Scraping: 6:00 AM UTC (0 6 * * *)');
  console.log('   - Scrapes all event sources');
  console.log('   - Updates existing events');
  console.log('   - Adds new events with attendee estimates\n');
  
  console.log('🔄 Weekly Backfill: 7:00 AM UTC Sundays (0 7 * * 0)');
  console.log('   - Processes up to 500 events per run');
  console.log('   - Updates events missing attendee data');
  console.log('   - Runs only if needed\n');

  console.log('🌐 API Endpoints:');
  console.log('================');
  console.log('📊 Scraper Sync: POST /api/scraper/sync');
  console.log('🔄 Attendee Backfill: POST /api/events/backfill-attendees');
  console.log('📈 Statistics: GET /api/events/backfill-attendees\n');

  console.log('🔧 Vercel Deployment Steps:');
  console.log('===========================');
  console.log('1. Add CRON_SECRET to Vercel environment variables');
  console.log('2. Deploy your application to Vercel');
  console.log('3. Vercel will automatically set up the cron jobs');
  console.log('4. Monitor logs in Vercel dashboard\n');

  console.log('🧪 Testing Commands:');
  console.log('====================');
  console.log('Test scraper sync:');
  console.log('curl -X POST "https://your-domain.vercel.app/api/scraper/sync" \\');
  console.log('  -H "Authorization: Bearer YOUR_CRON_SECRET"\n');
  
  console.log('Test backfill:');
  console.log('curl -X POST "https://your-domain.vercel.app/api/events/backfill-attendees" \\');
  console.log('  -H "Authorization: Bearer YOUR_CRON_SECRET"\n');
  
  console.log('Check statistics:');
  console.log('curl "https://your-domain.vercel.app/api/events/backfill-attendees"\n');

  console.log('✅ Cron automation setup complete!');
  console.log('   Your system will now automatically:');
  console.log('   - Scrape new events daily');
  console.log('   - Estimate attendee data for new events');
  console.log('   - Backfill missing attendee data weekly');
  console.log('   - Keep your database up-to-date\n');
}

setupCronAutomation().catch(console.error);
