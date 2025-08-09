require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function debugVehicleMatching() {
  console.log('🔍 Debugging vehicle-user matching...');
  
  // Get the specific vehicle from the screenshot
  const { data: vehicle, error: vehicleError } = await supabaseAdmin
    .from('vehicles')
    .select('*')
    .eq('license_plate', '856-62-702')
    .single();
  
  console.log('\n🚗 Vehicle data:');
  console.log('License plate:', vehicle?.license_plate);
  console.log('Owner name:', vehicle?.owner_name);
  console.log('User ID:', vehicle?.user_id);
  
  // Get matching user
  const { data: users, error: usersError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('has_car', true);
  
  console.log(`\n👥 Found ${users?.length} users with cars`);
  
  if (vehicle && users) {
    console.log('\n🔍 Looking for matches...');
    
    // Try license plate match
    const licenseMatch = users.find(user => user.license_plate === vehicle.license_plate);
    console.log('License plate match:', licenseMatch ? `${licenseMatch.full_name} (${licenseMatch.license_plate})` : 'No match');
    
    // Try name match
    const nameMatch = users.find(user => user.full_name.trim() === vehicle.owner_name.trim());
    console.log('Name match:', nameMatch ? `${nameMatch.full_name} (${nameMatch.license_plate})` : 'No match');
    
    // Show exact values for debugging
    console.log('\n📋 Exact values comparison:');
    console.log('Vehicle license_plate:', `"${vehicle.license_plate}"`);
    console.log('Vehicle owner_name:', `"${vehicle.owner_name}"`);
    
    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  - full_name: "${user.full_name}"`);
      console.log(`  - license_plate: "${user.license_plate}"`);
      console.log(`  - photo_url: "${user.photo_url}"`);
      console.log(`  - position: "${user.position}"`);
      console.log(`  - role: "${user.role}"`);
      
      if (user.license_plate === vehicle.license_plate) {
        console.log('  ✅ LICENSE PLATE MATCH!');
      }
      if (user.full_name.trim() === vehicle.owner_name.trim()) {
        console.log('  ✅ NAME MATCH!');
      }
    });
  }
  
  // Test the API endpoint directly
  console.log('\n🌐 Testing API endpoint...');
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('http://localhost:5000/api/vehicles/search?query=856', {
      headers: {
        'Authorization': 'Bearer test' // This will fail auth but we can see the structure
      }
    });
    
    console.log('API Response status:', response.status);
    const data = await response.text();
    console.log('API Response:', data.substring(0, 500));
  } catch (error) {
    console.log('API test failed (expected):', error.message);
  }
}

debugVehicleMatching().catch(console.error);
