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

async function testDelegationPermission() {
  try {
    console.log('🧪 Testing vehicle delegation permission...');
    
    // Find a מפתח user to test with
    const { data: developerUsers, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, username, role')
      .eq('role', 'מפתח')
      .limit(1);
      
    if (userError || !developerUsers || developerUsers.length === 0) {
      console.log('❌ No מפתח users found:', userError?.message);
      return;
    }
    
    const testUser = developerUsers[0];
    console.log(`✅ Found מפתח user: ${testUser.full_name} (${testUser.username})`);
    
    // Grant the new delegation permission to this user
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('user_permissions')
      .insert({
        user_id: testUser.id,
        permission: 'vehicle_delegate_permissions',
        is_active: true,
        granted_by_id: testUser.id, // Self-granted for testing
        granted_at: new Date().toISOString()
      });
      
    if (insertError) {
      if (insertError.code === '23505') { // Unique constraint violation
        console.log('ℹ️  User already has this permission');
      } else {
        console.log('❌ Error granting permission:', insertError.message);
        return;
      }
    } else {
      console.log('✅ Delegation permission granted successfully!');
    }
    
    // Verify the permission was granted
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('user_permissions')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('permission', 'vehicle_delegate_permissions')
      .eq('is_active', true);
      
    if (verifyError) {
      console.log('❌ Error verifying permission:', verifyError.message);
    } else if (verifyData && verifyData.length > 0) {
      console.log('✅ Permission verified in database!');
      console.log(`User: ${testUser.full_name} now has vehicle_delegate_permissions`);
    } else {
      console.log('⚠️  Permission not found after granting');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDelegationPermission();
