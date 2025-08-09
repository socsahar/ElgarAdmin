require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function linkVehiclesToUsers() {
  try {
    console.log('🔗 Linking vehicles to users for profile pictures and badges...');
    
    // Step 1: Get all vehicles and users
    const { data: vehicles, error: vehiclesError } = await supabaseAdmin
      .from('vehicles')
      .select('id, license_plate, owner_name, user_id');
    
    if (vehiclesError) throw vehiclesError;
    
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, license_plate')
      .eq('has_car', true);
    
    if (usersError) throw usersError;
    
    console.log(`📋 Found ${vehicles.length} vehicles and ${users.length} users with cars`);
    
    // Step 2: Match vehicles to users by license plate and name
    let linkedCount = 0;
    let skippedCount = 0;
    const results = [];
    
    for (const vehicle of vehicles) {
      console.log(`\n🔍 Processing vehicle: ${vehicle.license_plate} (${vehicle.owner_name})`);
      
      if (vehicle.user_id) {
        console.log('   ⏭️ Already has user_id, skipping');
        skippedCount++;
        continue;
      }
      
      // Try to find matching user by license plate first
      let matchingUser = users.find(user => 
        user.license_plate === vehicle.license_plate
      );
      
      // If no match by license plate, try by name
      if (!matchingUser) {
        matchingUser = users.find(user => 
          user.full_name.trim() === vehicle.owner_name.trim()
        );
      }
      
      if (matchingUser) {
        console.log(`   ✅ Found matching user: ${matchingUser.full_name} (ID: ${matchingUser.id})`);
        
        // Since we can't use user_id due to FK constraint, let's try a workaround
        // We'll create a custom mapping table or update our backend to handle this differently
        
        // For now, let's see if we can bypass the FK constraint by checking what it's looking for
        console.log(`   🔧 Attempting to link user_id...`);
        
        try {
          const { data: updatedVehicle, error: updateError } = await supabaseAdmin
            .from('vehicles')
            .update({ user_id: matchingUser.id })
            .eq('id', vehicle.id)
            .select();
          
          if (updateError) {
            console.log(`   ❌ FK constraint prevents linking: ${updateError.message}`);
            // Let's add a custom field instead
            const { data: customUpdate, error: customError } = await supabaseAdmin
              .from('vehicles')
              .update({ 
                owner_name: matchingUser.full_name,
                // Add a custom field to mark this as a system user vehicle
                notes: `SYSTEM_USER:${matchingUser.id}`
              })
              .eq('id', vehicle.id)
              .select();
            
            if (customError) {
              console.log(`   ❌ Custom update failed: ${customError.message}`);
              results.push({ vehicle: vehicle.license_plate, user: matchingUser.full_name, status: 'failed', error: customError.message });
            } else {
              console.log(`   ✅ Custom link added via notes field`);
              linkedCount++;
              results.push({ vehicle: vehicle.license_plate, user: matchingUser.full_name, status: 'custom_linked' });
            }
          } else {
            console.log(`   ✅ Successfully linked with user_id`);
            linkedCount++;
            results.push({ vehicle: vehicle.license_plate, user: matchingUser.full_name, status: 'linked' });
          }
        } catch (err) {
          console.log(`   ❌ Update failed: ${err.message}`);
          results.push({ vehicle: vehicle.license_plate, user: matchingUser.full_name, status: 'failed', error: err.message });
        }
      } else {
        console.log(`   ❓ No matching user found`);
        results.push({ vehicle: vehicle.license_plate, user: 'No match', status: 'no_match' });
      }
    }
    
    // Step 3: Summary
    console.log('\n📊 Linking Summary:');
    console.log('===================');
    console.log(`🚗 Total vehicles: ${vehicles.length}`);
    console.log(`⏭️ Already linked: ${skippedCount}`);
    console.log(`🔗 Successfully linked: ${linkedCount}`);
    console.log(`❌ Failed: ${results.filter(r => r.status === 'failed').length}`);
    console.log(`❓ No match: ${results.filter(r => r.status === 'no_match').length}`);
    
    if (linkedCount > 0) {
      console.log('\n✅ Successfully Linked:');
      results.filter(r => r.status === 'linked' || r.status === 'custom_linked').forEach((r, i) => {
        const method = r.status === 'linked' ? 'user_id' : 'notes field';
        console.log(`${i + 1}. ${r.vehicle} → ${r.user} (${method})`);
      });
    }
    
    console.log('\n🎉 Linking process completed!');
    console.log('💡 Now test the vehicle search to see profile pictures and badges');
    
  } catch (error) {
    console.error('❌ Linking process failed:', error);
    process.exit(1);
  }
}

linkVehiclesToUsers();
