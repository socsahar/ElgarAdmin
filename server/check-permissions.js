require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');

(async () => {
  try {
    console.log('🔍 Checking current permissions for each role...\n');
    
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, role, full_name')
      .order('role');
      
    if (error) {
      console.error('Error fetching users:', error);
      process.exit(1);
    }
    
    const roleGroups = {};
    
    for (const user of users) {
      const { data: perms } = await supabaseAdmin
        .from('user_permissions') 
        .select('permission')
        .eq('user_id', user.id)
        .eq('is_active', true);
        
      const permList = perms?.map(p => p.permission) || [];
      
      if (!roleGroups[user.role]) {
        roleGroups[user.role] = [];
      }
      
      roleGroups[user.role].push({
        name: user.full_name || 'N/A',
        permissions: permList
      });
    }
    
    // Display by role
    for (const [role, users] of Object.entries(roleGroups)) {
      console.log(`\n📋 Role: ${role}`);
      console.log('='.repeat(50));
      
      users.forEach(user => {
        console.log(`  👤 ${user.name}:`);
        if (user.permissions.length > 0) {
          user.permissions.forEach(perm => {
            console.log(`    ✅ ${perm}`);
          });
        } else {
          console.log(`    ❌ No permissions`);
        }
        console.log('');
      });
    }
    
    // Check specifically for access_users_crud
    console.log('\n🚨 SECURITY CHECK: Who has access_users_crud permission?');
    console.log('='.repeat(60));
    
    for (const [role, users] of Object.entries(roleGroups)) {
      users.forEach(user => {
        if (user.permissions.includes('access_users_crud')) {
          console.log(`⚠️  ${role}: ${user.name} has access_users_crud`);
        }
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Script error:', error);
    process.exit(1);
  }
})();
