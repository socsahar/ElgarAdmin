require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
  process.exit(1);
}

console.log('✅ Supabase environment variables validated');
console.log(`🔗 Connecting to: ${supabaseUrl}`);

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function updateExistingVehicles() {
  try {
    console.log('🔄 Starting update of existing vehicles to link with users...');
    
    // Step 1: Get all existing users
    console.log('👥 Fetching all existing users...');
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, phone_number, license_plate, car_type, car_color, has_car')
      .eq('has_car', true)
      .not('license_plate', 'is', null);
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      throw usersError;
    }
    
    console.log(`✅ Found ${users?.length || 0} users with car information`);
    
    // Step 2: Get all existing vehicles
    console.log('🚗 Fetching all existing vehicles...');
    const { data: vehicles, error: vehiclesError } = await supabaseAdmin
      .from('vehicles')
      .select('*');
    
    if (vehiclesError) {
      console.error('❌ Error fetching vehicles:', vehiclesError);
      throw vehiclesError;
    }
    
    console.log(`✅ Found ${vehicles?.length || 0} existing vehicles`);
    
    // Step 3: Match vehicles with users and update them
    let matchedCount = 0;
    let createdCount = 0;
    const matchResults = [];
    
    for (const user of users) {
      console.log(`\n🔍 Processing user: ${user.full_name} (${user.license_plate})`);
      
      // Try to find matching vehicle by license plate
      let matchingVehicle = vehicles.find(vehicle => 
        vehicle.license_plate === user.license_plate
      );
      
      if (matchingVehicle) {
        // Update existing vehicle with user_id
        console.log(`   📝 Found matching vehicle, updating with user_id...`);
        
        const { data: updatedVehicle, error: updateError } = await supabaseAdmin
          .from('vehicles')
          .update({ 
            user_id: user.id,
            owner_name: user.full_name,
            owner_phone: user.phone_number,
            vehicle_type: user.car_type || matchingVehicle.vehicle_type,
            vehicle_model: matchingVehicle.vehicle_model, // Keep existing model
            vehicle_color: user.car_color || matchingVehicle.vehicle_color
          })
          .eq('id', matchingVehicle.id)
          .select()
          .single();
        
        if (updateError) {
          console.error(`   ❌ Error updating vehicle for ${user.full_name}:`, updateError);
          matchResults.push({ user: user.full_name, action: 'update_failed', error: updateError.message });
        } else {
          console.log(`   ✅ Successfully updated vehicle for ${user.full_name}`);
          matchedCount++;
          matchResults.push({ user: user.full_name, action: 'updated', vehicleId: updatedVehicle.id });
        }
      } else {
        // Create new vehicle for this user
        console.log(`   🆕 No matching vehicle found, creating new vehicle...`);
        
        const newVehicle = {
          license_plate: user.license_plate,
          vehicle_type: user.car_type || 'רכב פרטי',
          vehicle_model: 'לא צוין', // No model info in users table
          vehicle_color: user.car_color || 'לא צוין',
          owner_name: user.full_name,
          owner_phone: user.phone_number,
          owner_address: 'לא צוין', // Required field
          user_id: user.id
        };
        
        const { data: createdVehicle, error: createError } = await supabaseAdmin
          .from('vehicles')
          .insert([newVehicle])
          .select()
          .single();
        
        if (createError) {
          console.error(`   ❌ Error creating vehicle for ${user.full_name}:`, createError);
          matchResults.push({ user: user.full_name, action: 'create_failed', error: createError.message });
        } else {
          console.log(`   ✅ Successfully created vehicle for ${user.full_name}`);
          createdCount++;
          matchResults.push({ user: user.full_name, action: 'created', vehicleId: createdVehicle.id });
        }
      }
    }
    
    // Step 4: Summary report
    console.log('\n📊 Update Summary:');
    console.log('==================');
    console.log(`👥 Total users with cars: ${users.length}`);
    console.log(`🚗 Total existing vehicles: ${vehicles.length}`);
    console.log(`🔄 Vehicles updated: ${matchedCount}`);
    console.log(`🆕 Vehicles created: ${createdCount}`);
    console.log(`❌ Failed operations: ${matchResults.filter(r => r.action.includes('failed')).length}`);
    
    console.log('\n📋 Detailed Results:');
    matchResults.forEach((result, index) => {
      const status = result.action === 'updated' ? '✅ Updated' : 
                    result.action === 'created' ? '🆕 Created' : 
                    '❌ Failed';
      console.log(`${index + 1}. ${result.user}: ${status}${result.error ? ` (${result.error})` : ''}`);
    });
    
    // Step 5: Verify results
    console.log('\n🔍 Verifying results...');
    const { data: finalVehicles, error: finalError } = await supabaseAdmin
      .from('vehicles')
      .select('id, license_plate, owner_name, user_id')
      .not('user_id', 'is', null);
    
    if (finalError) {
      console.error('❌ Error verifying results:', finalError);
    } else {
      console.log(`✅ Verification complete: ${finalVehicles.length} vehicles now linked to users`);
    }
    
    console.log('\n🎉 Vehicle update process completed successfully!');
    console.log('💡 You can now test the enhanced vehicle search with user photos and badges.');
    
  } catch (error) {
    console.error('❌ Vehicle update process failed:', error);
    process.exit(1);
  }
}

updateExistingVehicles();
