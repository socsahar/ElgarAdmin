require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function exploreTables() {
  try {
    console.log('🔍 Exploring database structure...');
    
    // Check user_permissions table structure
    const { data: allPerms, error: allError } = await supabaseAdmin
      .from('user_permissions')
      .select('permission')
      .limit(10);
      
    if (allError) {
      console.log('❌ user_permissions table error:', allError.message);
    } else {
      console.log('✅ Sample permissions from user_permissions:');
      console.log(allPerms.map(p => p.permission));
      
      // Look for vehicle-related permissions
      const vehiclePerms = allPerms.filter(p => p.permission.includes('vehicle'));
      console.log('\n🚗 Vehicle-related permissions found:');
      console.log([...new Set(vehiclePerms.map(p => p.permission))]);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

exploreTables();
