const http = require('http');

console.log('🧪 Testing vehicle search API response...');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/vehicles/search',
  method: 'GET',
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'Node.js Test'
  }
};

const req = http.request(options, (res) => {
  console.log(`📊 Status: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 Response Body:');
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
      
      // Check for enhanced vehicle data
      if (jsonData.data && jsonData.data.length > 0) {
        const firstVehicle = jsonData.data[0];
        console.log('\n🔍 Checking first vehicle for enhanced data:');
        console.log('is_system_user_vehicle:', firstVehicle.is_system_user_vehicle);
        console.log('system_user:', firstVehicle.system_user);
        
        // Look specifically for vehicle 856-62-702
        const targetVehicle = jsonData.data.find(v => v.license_plate === '856-62-702');
        if (targetVehicle) {
          console.log('\n🎯 Found target vehicle 856-62-702:');
          console.log('is_system_user_vehicle:', targetVehicle.is_system_user_vehicle);
          console.log('system_user:', targetVehicle.system_user);
        }
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
