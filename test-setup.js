// test-setup.js
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function test() {
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing');
    console.log('SUPABASE_KEY:', supabaseKey ? 'Found' : 'Missing');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const { data, error } = await supabase.from('events').select('count');
    console.log('✅ Supabase connected successfully!');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
  }
}

test();