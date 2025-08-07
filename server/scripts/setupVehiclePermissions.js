// Load environment variables
require('dotenv').config();

const { supabaseAdmin } = require('../config/supabase');

// Add vehicle permissions to existing ENUM type and setup user permissions
async function setupVehiclePermissions() {
  try {
    console.log('🚗 Setting up vehicle system permissions...');

    // Vehicle permissions we want to add
    const vehiclePermissions = [
      'vehicle_use_system',
      'vehicle_manage_system', 
      'vehicle_manage_permissions'
    ];

    console.log('📝 Adding vehicle permissions to permission_type ENUM...');
    
    // Try to add each permission to the ENUM
    for (const permission of vehiclePermissions) {
      try {
        // Try to add to ENUM using direct SQL
        const { error } = await supabaseAdmin.rpc('exec_sql', {
          sql: `ALTER TYPE permission_type ADD VALUE IF NOT EXISTS '${permission}';`
        });

        if (error) {
          console.log(`⚠️ Could not add ${permission} to ENUM: ${error.message}`);
          console.log(`   Note: You may need to add '${permission}' manually in Supabase SQL Editor`);
        } else {
          console.log(`✅ Added permission to ENUM: ${permission}`);
        }
      } catch (enumError) {
        console.log(`⚠️ ENUM modification for ${permission}: ${enumError.message}`);
      }
    }

    // Find developers and grant them permissions
    console.log('\n👥 Setting up user permissions...');

    const { data: developers, error: developerError } = await supabaseAdmin
      .from('users')
      .select('id, username, role')
      .eq('role', 'מפתח')
      .eq('is_active', true);

    if (developerError) {
      console.error('Error fetching developers:', developerError);
      return false;
    }

    console.log(`Found ${developers.length} developer(s) to grant permissions to`);

    // Grant permissions to developers
    for (const developer of developers) {
      console.log(`\n🔑 Setting up permissions for ${developer.username}...`);
      
      for (const permission of vehiclePermissions) {
        try {
          // Check if permission already exists
          const { data: existingPerm, error: existingError } = await supabaseAdmin
            .from('user_permissions')
            .select('id')
            .eq('user_id', developer.id)
            .eq('permission', permission)
            .single();

          if (existingError && existingError.code !== 'PGRST116') {
            console.log(`⚠️ Could not check existing permission ${permission}: ${existingError.message}`);
            continue;
          }

          if (!existingPerm) {
            // Try to insert the permission
            const { error: grantError } = await supabaseAdmin
              .from('user_permissions')
              .insert({
                user_id: developer.id,
                permission: permission,
                granted_by_id: developer.id,
                is_active: true,
                granted_at: new Date().toISOString()
              });

            if (grantError) {
              console.log(`⚠️ Could not grant ${permission} to ${developer.username}: ${grantError.message}`);
            } else {
              console.log(`✅ Granted ${permission} to ${developer.username}`);
            }
          } else {
            console.log(`⚡ ${developer.username} already has ${permission}`);
          }
        } catch (permError) {
          console.log(`⚠️ Error processing ${permission}: ${permError.message}`);
        }
      }
    }

    console.log('\n🎉 Vehicle permissions setup complete!');
    console.log('\n📋 Manual Setup Instructions:');
    console.log('If you see ENUM errors above, please:');
    console.log('1. Go to Supabase SQL Editor');
    console.log('2. Run these commands:');
    console.log('');
    vehiclePermissions.forEach(perm => {
      console.log(`   ALTER TYPE permission_type ADD VALUE '${perm}';`);
    });
    console.log('');
    console.log('3. Then run this script again to assign permissions.');
    
    return true;
  } catch (error) {
    console.error('❌ Error setting up vehicle permissions:', error);
    return false;
  }
}

module.exports = { setupVehiclePermissions };

// Run if called directly
if (require.main === module) {
  setupVehiclePermissions()
    .then((success) => {
      if (success) {
        console.log('\n✅ Setup completed');
        process.exit(0);
      } else {
        console.log('\n❌ Setup failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Setup crashed:', error);
      process.exit(1);
    });
}
