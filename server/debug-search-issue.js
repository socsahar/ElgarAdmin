require('dotenv').config();
const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('./config/supabase');

async function debugSearchIssue() {
  console.log('🔍 Debugging search endpoint issue...');
  
  try {
    // Test the basic vehicle query first
    console.log('📋 Testing basic vehicles query...');
    const { data: vehicles, error: searchError } = await supabaseAdmin
      .from('vehicles')
      .select(`
        id,
        license_plate,
        vehicle_type,
        vehicle_model,
        vehicle_color,
        owner_name,
        owner_address,
        owner_phone,
        vehicle_image_url,
        owner_image_url,
        created_at,
        updated_at,
        user_id
      `)
      .or(`
        license_plate.ilike.%856%,
        vehicle_type.ilike.%856%,
        vehicle_model.ilike.%856%,
        vehicle_color.ilike.%856%,
        owner_name.ilike.%856%,
        owner_phone.ilike.%856%
      `)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (searchError) {
      console.error('❌ Error in vehicles query:', searchError);
      return;
    }
    
    console.log(`✅ Found ${vehicles.length} vehicles from search`);
    if (vehicles.length > 0) {
      console.log('First vehicle:', vehicles[0].license_plate);
    }

    // Test the users query
    console.log('\n📋 Testing users query...');
    const { data: allUsers, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, phone_number, position, role, photo_url, license_plate, has_car')
      .eq('has_car', true);

    if (usersError) {
      console.error('❌ Error in users query:', usersError);
      return;
    }
    
    console.log(`✅ Found ${allUsers.length} users with cars`);

    // Test the matching logic
    if (vehicles.length > 0 && allUsers.length > 0) {
      console.log('\n🔍 Testing matching logic...');
      const testVehicle = vehicles.find(v => v.license_plate === '856-62-702');
      if (testVehicle) {
        console.log('Target vehicle:', testVehicle.license_plate, testVehicle.owner_name);
        
        const matchingUser = allUsers.find(user => 
          user.license_plate === testVehicle.license_plate || 
          user.full_name.trim() === testVehicle.owner_name.trim()
        );
        
        if (matchingUser) {
          console.log('✅ Found matching user:', matchingUser.full_name);
          console.log('  - license_plate:', matchingUser.license_plate);
          console.log('  - position:', matchingUser.position);
          console.log('  - role:', matchingUser.role);
          console.log('  - photo_url:', matchingUser.photo_url);
        } else {
          console.log('❌ No matching user found');
          console.log('Available users:', allUsers.map(u => `${u.full_name} (${u.license_plate})`));
        }
      }
    }

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugSearchIssue();
