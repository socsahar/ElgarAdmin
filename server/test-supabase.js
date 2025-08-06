// Quick Supabase connection test
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Testing Supabase connection...');
console.log('URL:', process.env.SUPABASE_URL);
console.log('Anon Key:', process.env.SUPABASE_ANON_KEY ? 'Present' : 'Missing');
console.log('Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testConnection() {
  try {
    console.log('Testing basic connection...');
    
    // Try a simple query that should work regardless of schema
    const { data, error } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5);

    if (error) {
      console.error('❌ Connection failed:', error.message);
      console.error('Full error:', error);
      return false;
    }

    console.log('✅ Connection successful!');
    console.log('Tables found:', data?.map(t => t.table_name) || 'None');
    
    // Try to check if our specific tables exist
    const tables = ['users', 'events', 'attendance', 'logs', 'action_reports'];
    console.log('\nChecking for project tables:');
    
    for (const table of tables) {
      const { data: tableData, error: tableError } = await supabaseAdmin
        .from(table)
        .select('*')
        .limit(1);
      
      if (tableError) {
        console.log(`❌ ${table}: ${tableError.message}`);
      } else {
        console.log(`✅ ${table}: exists`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
