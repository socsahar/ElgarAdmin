require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSearchAPI() {
  console.log('🧪 Testing vehicle search API directly...');
  
  // We need to simulate an authenticated request
  // Let's create a token first by checking how auth works
  
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  
  // Get an admin user to create a token
  const { data: adminUser, error: adminError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('role', 'מפתח')
    .eq('is_active', true)
    .single();
  
  if (adminError || !adminUser) {
    console.log('❌ Could not find admin user:', adminError);
    return;
  }
  
  console.log('✅ Found admin user:', adminUser.full_name);
  
  // Simulate the vehicle search directly using our backend logic
  const searchTerm = '856';
  
  // Get vehicles matching the search
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
      license_plate.ilike.%${searchTerm}%,
      vehicle_type.ilike.%${searchTerm}%,
      vehicle_model.ilike.%${searchTerm}%,
      vehicle_color.ilike.%${searchTerm}%,
      owner_name.ilike.%${searchTerm}%,
      owner_phone.ilike.%${searchTerm}%
    `)
    .order('updated_at', { ascending: false })
    .limit(50);
  
  if (searchError) {
    console.log('❌ Search error:', searchError);
    return;
  }
  
  console.log(`\n🔍 Found ${vehicles.length} vehicles matching "${searchTerm}"`);
  
  // Get all users for matching
  const { data: allUsers, error: usersError } = await supabaseAdmin
    .from('users')
    .select('id, full_name, phone_number, position, role, photo_url, license_plate, has_car')
    .eq('has_car', true);
  
  if (usersError) {
    console.log('❌ Users error:', usersError);
    return;
  }
  
  // Process vehicles with user matching (exactly like our backend)
  const processedVehicles = vehicles.map(vehicle => {
    // Try to find matching user by license plate or name
    let matchingUser = null;
    if (allUsers) {
      matchingUser = allUsers.find(user => 
        user.license_plate === vehicle.license_plate || 
        user.full_name.trim() === vehicle.owner_name.trim()
      );
    }
    
    const isSystemUserVehicle = !!matchingUser;
    const ownerPhoto = isSystemUserVehicle ? matchingUser.photo_url : vehicle.owner_image_url;
    
    return {
      ...vehicle,
      // Enhanced owner information (prefer system user data when available)
      owner_name: isSystemUserVehicle ? matchingUser.full_name : vehicle.owner_name,
      owner_phone: isSystemUserVehicle ? matchingUser.phone_number : vehicle.owner_phone,
      owner_image_url: ownerPhoto,
      // System user indicators
      is_system_user_vehicle: isSystemUserVehicle,
      system_user: isSystemUserVehicle ? {
        name: matchingUser.full_name,
        position: matchingUser.position,
        role: matchingUser.role,
        photo_url: matchingUser.photo_url,
        badge: 'מתנדב יחידת אלג"ר'
      } : null,
      // Ensure compatibility with frontend expectations
      vehicle_type: vehicle.vehicle_type,
      vehicle_model: vehicle.vehicle_model,
      vehicle_color: vehicle.vehicle_color,
      vehicle_image_url: vehicle.vehicle_image_url
    };
  });
  
  console.log('\n📊 Processed vehicles:');
  processedVehicles.forEach((vehicle, index) => {
    console.log(`\n${index + 1}. ${vehicle.license_plate} (${vehicle.owner_name})`);
    console.log(`   is_system_user_vehicle: ${vehicle.is_system_user_vehicle}`);
    console.log(`   owner_image_url: ${vehicle.owner_image_url}`);
    if (vehicle.system_user) {
      console.log(`   system_user.badge: "${vehicle.system_user.badge}"`);
      console.log(`   system_user.photo_url: "${vehicle.system_user.photo_url}"`);
      console.log(`   system_user.position: "${vehicle.system_user.position}"`);
      console.log(`   system_user.role: "${vehicle.system_user.role}"`);
    }
  });
}

testSearchAPI().catch(console.error);
