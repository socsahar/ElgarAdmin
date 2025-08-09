const http = require('http');

console.log('🧪 Testing authenticated vehicle search API...');

// First, let's test the vehicles endpoint which should return all vehicles
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/vehicles',
  method: 'GET',
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'Node.js Test',
    // Using a mock admin token (you might need to adjust this)
    'Authorization': 'Bearer admin-test-token'
  }
};

const req = http.request(options, (res) => {
  console.log(`📊 Status: ${res.statusCode}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 Response:');
    try {
      const jsonData = JSON.parse(data);
      
      if (jsonData.success && jsonData.data && jsonData.data.length > 0) {
        console.log(`✅ Found ${jsonData.data.length} vehicles`);
        
        // Look for our target vehicle
        const targetVehicle = jsonData.data.find(v => v.license_plate === '856-62-702');
        if (targetVehicle) {
          console.log('\n🎯 Target vehicle 856-62-702:');
          console.log('is_system_user_vehicle:', targetVehicle.is_system_user_vehicle);
          console.log('system_user:', targetVehicle.system_user ? 'Present' : 'Missing');
          if (targetVehicle.system_user) {
            console.log('  - name:', targetVehicle.system_user.name);
            console.log('  - badge:', targetVehicle.system_user.badge);
            console.log('  - position:', targetVehicle.system_user.position);
            console.log('  - role:', targetVehicle.system_user.role);
            console.log('  - photo_url:', targetVehicle.system_user.photo_url);
          }
        } else {
          console.log('❌ Target vehicle 856-62-702 not found');
        }
        
        // Check if any vehicles have system user data
        const systemVehicles = jsonData.data.filter(v => v.is_system_user_vehicle);
        console.log(`\n📊 System user vehicles: ${systemVehicles.length}/${jsonData.data.length}`);
        
        if (systemVehicles.length > 0) {
          console.log('First system vehicle:', systemVehicles[0].license_plate);
          console.log('Has system_user data:', !!systemVehicles[0].system_user);
        }
      } else {
        console.log('❌ No vehicles returned or error:', jsonData);
      }
    } catch (e) {
      console.log('❌ Error parsing JSON:', e.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Request error: ${e.message}`);
});

req.end();
