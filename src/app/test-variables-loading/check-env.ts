import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('🔍 Checking environment variables...\n');

console.log('CRON_SECRET:', process.env.CRON_SECRET ? '✅ SET' : '❌ NOT SET');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ SET' : '❌ NOT SET');
console.log('FIRECRAWL_API_KEY:', process.env.FIRECRAWL_API_KEY ? '✅ SET' : '❌ NOT SET');
console.log('TICKETMASTER_API_KEY:', process.env.TICKETMASTER_API_KEY ? '✅ SET' : '❌ NOT SET');
console.log('PREDICTHQ_API_KEY:', process.env.PREDICTHQ_API_KEY ? '✅ SET' : '❌ NOT SET');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ SET' : '❌ NOT SET');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ SET' : '❌ NOT SET');

console.log('\n✅ Check complete!');