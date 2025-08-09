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

function formatPhoneNumber(phone) {
  if (!phone) return '0500000000';
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Ensure it's 10 digits starting with 05
  if (digits.length === 10 && digits.startsWith('05')) {
    return digits;
  } else if (digits.length === 9) {
    return '05' + digits.slice(1);
  } else if (digits.length === 7) {
    return '050' + digits;
  }
  
  // Default fallback
  return '0500000000';
}

async function createVehiclesForAllUsers() {
  try {
    console.log('🚗 Creating vehicles for all existing users...');
    
    // Get users with cars
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, phone_number, license_plate, car_type, car_color, has_car')
      .eq('has_car', true)
      .not('license_plate', 'is', null);
    
    if (usersError) throw usersError;
    
    console.log(`📋 Found ${users.length} users with car information`);
    
    let created = 0;
    let failed = 0;
    const results = [];
    
    for (const user of users) {
      console.log(`\n🔍 Processing: ${user.full_name} (${user.license_plate})`);
      
      const formattedPhone = formatPhoneNumber(user.phone_number);
      console.log(`   📞 Phone: ${user.phone_number} → ${formattedPhone}`);
      
      const vehicleData = {
        license_plate: user.license_plate,
        vehicle_type: user.car_type || 'רכב פרטי',
        vehicle_model: 'לא צוין',
        vehicle_color: user.car_color || 'לא צוין',
        owner_name: user.full_name,
        owner_phone: formattedPhone,
        owner_address: 'לא צוין'
        // Note: user_id is omitted due to FK constraint issue
      };
      
      const { data: createdVehicle, error: createError } = await supabaseAdmin
        .from('vehicles')
        .insert([vehicleData])
        .select()
        .single();
      
      if (createError) {
        console.log(`   ❌ Failed: ${createError.message}`);
        failed++;
        results.push({ name: user.full_name, license: user.license_plate, status: 'failed', error: createError.message });
      } else {
        console.log(`   ✅ Success! Vehicle ID: ${createdVehicle.id}`);
        created++;
        results.push({ name: user.full_name, license: user.license_plate, status: 'created', id: createdVehicle.id });
      }
    }
    
    // Summary
    console.log('\n📊 Final Summary:');
    console.log('=================');
    console.log(`👥 Total users processed: ${users.length}`);
    console.log(`✅ Vehicles created: ${created}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (created > 0) {
      console.log('\n✅ Successfully Created:');
      results.filter(r => r.status === 'created').forEach((r, i) => {
        console.log(`${i + 1}. ${r.name} - ${r.license} (ID: ${r.id})`);
      });
    }
    
    if (failed > 0) {
      console.log('\n❌ Failed:');
      results.filter(r => r.status === 'failed').forEach((r, i) => {
        console.log(`${i + 1}. ${r.name} - ${r.license}: ${r.error}`);
      });
    }
    
    // Verify final state
    const { data: allVehicles, error: verifyError } = await supabaseAdmin
      .from('vehicles')
      .select('id, license_plate, owner_name')
      .order('created_at', { ascending: false });
    
    if (!verifyError) {
      console.log(`\n🔍 Verification: Total vehicles in database: ${allVehicles.length}`);
    }
    
    console.log('\n🎉 Process completed!');
    console.log('💡 Next: Test the vehicle search page to see your vehicles');
    console.log('🔧 Note: user_id linking will need to be handled separately due to FK constraints');
    
  } catch (error) {
    console.error('❌ Process failed:', error);
    process.exit(1);
  }
}

createVehiclesForAllUsers();
