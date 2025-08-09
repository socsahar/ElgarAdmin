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

async function createVehiclesBatch() {
  try {
    console.log('🔄 Creating vehicles for all users...');
    
    // Get users with cars
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, phone_number, license_plate, car_type, car_color, has_car')
      .eq('has_car', true)
      .not('license_plate', 'is', null);
    
    if (usersError) throw usersError;
    
    console.log(`Found ${users.length} users with cars`);
    
    // Try different phone formats until one works
    const phoneFormats = ['XXX-XXXXXXX', 'XXX-XXX-XXXX', 'XXXXXXXXXX', 'XXX XXXXXXX'];
    let workingFormat = null;
    
    // Test with a simple vehicle first
    for (const format of phoneFormats) {
      let testPhone;
      if (format === 'XXX-XXXXXXX') testPhone = '050-1234567';
      else if (format === 'XXX-XXX-XXXX') testPhone = '050-123-4567';
      else if (format === 'XXXXXXXXXX') testPhone = '0501234567';
      else if (format === 'XXX XXXXXXX') testPhone = '050 1234567';
      
      const { data, error } = await supabaseAdmin
        .from('vehicles')
        .insert([{
          license_plate: 'FORMAT-TEST',
          vehicle_type: 'רכב פרטי',
          vehicle_model: 'טסט',
          vehicle_color: 'לבן',
          owner_name: 'טסט',
          owner_phone: testPhone,
          owner_address: 'טסט כתובת'
        }])
        .select();
      
      if (!error) {
        console.log(`✅ Working phone format found: ${format} (${testPhone})`);
        workingFormat = format;
        // Clean up test vehicle
        await supabaseAdmin.from('vehicles').delete().eq('license_plate', 'FORMAT-TEST');
        break;
      } else {
        console.log(`❌ Format ${format} failed: ${error.message}`);
      }
    }
    
    if (!workingFormat) {
      // If no format works, let's try without phone validation
      console.log('🔧 Trying to create vehicle without phone number...');
      const { data, error } = await supabaseAdmin
        .from('vehicles')
        .insert([{
          license_plate: 'NO-PHONE-TEST',
          vehicle_type: 'רכב פרטי',
          vehicle_model: 'טסט',
          vehicle_color: 'לבן',
          owner_name: 'טסט',
          owner_address: 'טסט כתובת'
          // No owner_phone field
        }])
        .select();
      
      if (!error) {
        console.log('✅ Can create vehicles without phone number!');
        await supabaseAdmin.from('vehicles').delete().eq('license_plate', 'NO-PHONE-TEST');
        
        // Create vehicles for all users without phone
        console.log('🚗 Creating vehicles without phone numbers...');
        let created = 0;
        
        for (const user of users) {
          const { error: createError } = await supabaseAdmin
            .from('vehicles')
            .insert([{
              license_plate: user.license_plate,
              vehicle_type: user.car_type || 'רכב פרטי',
              vehicle_model: 'לא צוין',
              vehicle_color: user.car_color || 'לא צוין',
              owner_name: user.full_name,
              owner_address: 'לא צוין'
              // No phone number to avoid constraint
            }]);
          
          if (!createError) {
            console.log(`✅ Created vehicle for ${user.full_name}`);
            created++;
          } else {
            console.log(`❌ Failed to create vehicle for ${user.full_name}: ${createError.message}`);
          }
        }
        
        console.log(`🎉 Successfully created ${created} vehicles out of ${users.length} users`);
        
      } else {
        console.log('❌ Cannot create vehicles without phone either:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Process failed:', error);
  }
}

createVehiclesBatch();
