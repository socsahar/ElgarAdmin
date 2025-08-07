// Load environment variables
require('dotenv').config();

const { supabaseAdmin } = require('../config/supabase');

async function addVehiclePermissions() {
  try {
    console.log('🔧 Adding vehicle search permissions to existing users...');

    // Get all users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, username, role');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return false;
    }

    console.log(`Found ${users.length} users`);

    // Add vehicle_search_access permission to all users
    for (const user of users) {
      console.log(`Adding vehicle search permission to user: ${user.username} (${user.role})`);
      
      // Check if permission already exists
      const { data: existingPermission } = await supabaseAdmin
        .from('user_permissions')
        .select('id')
        .eq('user_id', user.id)
        .eq('permission', 'vehicle_search_access')
        .single();

      if (!existingPermission) {
        // Add permission
        const { error } = await supabaseAdmin
          .from('user_permissions')
          .insert({
            user_id: user.id,
            permission: 'vehicle_search_access',
            is_active: true,
            granted_by_id: user.id, // Self-granted for system update
            granted_at: new Date().toISOString()
          });

        if (error) {
          console.error(`Error adding permission for ${user.username}:`, error);
        } else {
          console.log(`✅ Added vehicle_search_access to ${user.username}`);
        }
      } else {
        console.log(`✅ ${user.username} already has vehicle_search_access`);
      }

      // Add admin permissions for high-level roles
      if (['מפתח', 'אדמין', 'פיקוד יחידה'].includes(user.role)) {
        const { data: existingAdminPermission } = await supabaseAdmin
          .from('user_permissions')
          .select('id')
          .eq('user_id', user.id)
          .eq('permission', 'vehicle_admin_access')
          .single();

        if (!existingAdminPermission) {
          const { error } = await supabaseAdmin
            .from('user_permissions')
            .insert({
              user_id: user.id,
              permission: 'vehicle_admin_access',
              is_active: true,
              granted_by_id: user.id,
              granted_at: new Date().toISOString()
            });

          if (error) {
            console.error(`Error adding admin permission for ${user.username}:`, error);
          } else {
            console.log(`✅ Added vehicle_admin_access to ${user.username}`);
          }
        } else {
          console.log(`✅ ${user.username} already has vehicle_admin_access`);
        }
      }
    }

    console.log('🎉 Vehicle permissions added successfully!');
    return true;

  } catch (error) {
    console.error('Error adding vehicle permissions:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  addVehiclePermissions()
    .then(() => {
      console.log('Permission update complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Permission update failed:', error);
      process.exit(1);
    });
}

module.exports = { addVehiclePermissions };
