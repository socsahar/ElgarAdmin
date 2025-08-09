require('dotenv').config();
const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('./config/supabase');
const http = require('http');

async function testEmptySearch() {
  console.log('🔍 Testing empty search (page load scenario)...');
  
  try {
    // Get an admin user to create a token
    const { data: adminUser, error } = await supabaseAdmin
      .from('users')
      .select('id, full_name, role')
      .eq('role', 'מפתח')
      .eq('is_active', true)
      .limit(1)
      .single();
    
    if (error) {
      console.error('❌ Error finding admin user:', error);
      return;
    }
    
    console.log('✅ Found admin user:', adminUser.full_name, `(${adminUser.role})`);
    
    // Create JWT token
    const token = jwt.sign(
      { id: adminUser.id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );
    
    console.log('🔑 Created test token');
    
    // Test the search API with empty query (should trigger validation error)
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/vehicles/search?query=',  // Empty search
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Node.js Test',
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      console.log(`📊 Status: ${res.statusCode}`);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log('📄 Response:', jsonData);
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
    
  } catch (error) {
    console.error('❌ Test setup error:', error);
  }
}

testEmptySearch();
