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

async function checkAndAddPermission() {
  try {
    console.log('🔍 Checking database permission structure...');
    
    // First, let's see what permissions currently exist
    const { data: existingPermissions, error: permError } = await supabaseAdmin
      .from('user_permissions')
      .select('permission')
      .limit(20);
      
    if (permError) {
      console.log('❌ Error getting permissions:', permError.message);
      return;
    }
    
    console.log('📋 Existing permissions in database:');
    const uniquePermissions = [...new Set(existingPermissions.map(p => p.permission))];
    uniquePermissions.forEach(perm => console.log(`  - ${perm}`));
    
    // Check if our permission already exists
    const hasVehicleDelegate = uniquePermissions.includes('vehicle_delegate_permissions');
    console.log(`\n🔍 vehicle_delegate_permissions exists: ${hasVehicleDelegate}`);
    
    if (!hasVehicleDelegate) {
      // Try to find a מפתח user first
      const { data: adminUsers, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, full_name, role')
        .eq('role', 'מפתח')
        .limit(1);
        
      if (userError || !adminUsers?.length) {
        console.log('❌ No מפתח users found to test with');
        return;
      }
      
      const adminUser = adminUsers[0];
      console.log(`\n👤 Testing with user: ${adminUser.full_name}`);
      
      // Try to add the permission directly - this will help us see the exact error
      console.log('🔧 Attempting to add vehicle_delegate_permissions...');
      
      const { data: insertResult, error: insertError } = await supabaseAdmin
        .from('user_permissions')
        .insert({
          user_id: adminUser.id,
          permission: 'vehicle_delegate_permissions',
          is_active: true,
          granted_by_id: adminUser.id,
          granted_at: new Date().toISOString()
        })
        .select();
        
      if (insertError) {
        console.log('❌ Insert error:', insertError.message);
        console.log('📋 Error details:', insertError);
        
        // If it's an enum error, we need to add it to the enum first
        if (insertError.message.includes('invalid input value for enum')) {
          console.log('\n🔧 Need to add permission to enum. Checking table structure...');
          
          // Get table schema
          const { data: schema, error: schemaError } = await supabaseAdmin
            .rpc('get_schema_for_table', { table_name: 'user_permissions' });
            
          if (schemaError) {
            console.log('Could not get schema, trying raw SQL approach...');
            
            // Use raw SQL to add enum value
            const { error: sqlError } = await supabaseAdmin
              .from('user_permissions')
              .select('permission')
              .limit(0); // This will force us to see the column type
              
            console.log('Raw SQL approach error:', sqlError);
          }
        }
      } else {
        console.log('✅ Successfully added vehicle_delegate_permissions!');
        console.log('📋 Insert result:', insertResult);
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkAndAddPermission();
