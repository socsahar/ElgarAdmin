require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase admin client  
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

async function removeUnwantedPermissionsFromSayerUsers() {
  try {
    console.log('🔍 Removing unwanted permissions from סייר users...');
    
    // Get all סייר users
    const { data: sayerUsers, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, username')
      .eq('role', 'סייר');
      
    if (userError) {
      console.error('Error fetching סייר users:', userError.message);
      return;
    }
    
    console.log(`Found ${sayerUsers.length} סייר users`);
    
    // Remove unwanted permissions for each user
    const unwantedPermissions = ['view_events_list', 'view_own_summaries', 'access_summaries'];
    let totalRemoved = 0;
    
    for (const permission of unwantedPermissions) {
      console.log(`\n🗑️  Removing permission: ${permission}`);
      
      const { data: removedData, error: removeError } = await supabaseAdmin
        .from('user_permissions')
        .delete()
        .in('user_id', sayerUsers.map(u => u.id))
        .eq('permission', permission)
        .eq('is_active', true);
        
      if (removeError) {
        console.error(`Error removing ${permission}:`, removeError.message);
      } else {
        console.log(`✅ Removed ${permission} from all סייר users`);
        totalRemoved++;
      }
    }
    
    console.log(`\n🎉 Successfully removed ${totalRemoved} permission types from סייר users`);
    
    // Verify the cleanup
    console.log('\n🔍 Verifying cleanup...');
    const { data: remainingPerms, error: checkError } = await supabaseAdmin
      .from('user_permissions')
      .select('user_id, permission')
      .in('user_id', sayerUsers.map(u => u.id))
      .in('permission', unwantedPermissions)
      .eq('is_active', true);
      
    if (checkError) {
      console.error('Error checking remaining permissions:', checkError.message);
    } else {
      console.log(`Remaining unwanted permissions: ${remainingPerms.length}`);
      if (remainingPerms.length > 0) {
        console.log('WARNING: Some permissions were not removed:', remainingPerms);
      } else {
        console.log('✅ All unwanted permissions successfully removed!');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

removeUnwantedPermissionsFromSayerUsers();
