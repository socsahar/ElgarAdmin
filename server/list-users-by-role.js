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

async function listUsersWithRole(role) {
  try {
    console.log(`\n=== Users with role: ${role} ===`);
    
    // Find users with specific role
    const { data: users, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, role, created_at')
      .eq('role', role);
      
    if (userError) {
      console.log('Error fetching users:', userError.message);
      return;
    }
    
    if (users.length === 0) {
      console.log(`No users found with role: ${role}`);
      return;
    }
    
    console.log(`Found ${users.length} users with role ${role}:`);
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. User: ${user.full_name} (${user.username})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${user.created_at}`);
    });
    
    // If there are users, check permissions for the first one
    if (users.length > 0) {
      const firstUser = users[0];
      console.log(`\n=== Checking permissions for: ${firstUser.full_name} ===`);
      
      // Get user permissions
      const { data: permissions, error: permError } = await supabaseAdmin
        .from('user_permissions')
        .select('*')
        .eq('user_id', firstUser.id)
        .eq('is_active', true);
        
      if (permError) {
        console.log('Error fetching permissions:', permError.message);
        return;
      }
      
      console.log(`\nUser has ${permissions.length} active permissions:`);
      permissions.forEach(perm => {
        console.log(`- ${perm.permission} (granted at: ${perm.granted_at})`);
      });
      
      // Check specific problematic permissions
      const problematicPerms = ['view_events_list', 'access_summaries', 'view_own_summaries'];
      console.log('\nChecking problematic permissions:');
      problematicPerms.forEach(perm => {
        const hasPerm = permissions.some(p => p.permission === perm);
        console.log(`- ${perm}: ${hasPerm ? 'YES' : 'NO'}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Get role from command line args
const role = process.argv[2] || 'סייר';
listUsersWithRole(role);
