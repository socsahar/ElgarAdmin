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

function formatPhoneNumber(phone) {
  if (!phone) return '050-0000000';
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Try different formats
  if (digits.length === 10 && digits.startsWith('05')) {
    return `${digits.slice(0,3)}-${digits.slice(3)}`;
  } else if (digits.length === 9) {
    return `05${digits.slice(0,1)}-${digits.slice(1)}`;
  } else if (digits.length === 7) {
    return `050-${digits}`;
  }
  
  // If all else fails, return default
  return '050-0000000';
}

async function createVehiclesForUsers() {
  try {
    console.log('🔄 Starting creation of vehicles for existing users...');
    
    // Step 1: Get all existing users with car info
    console.log('👥 Fetching all existing users with car information...');
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
    
    // Step 2: Create vehicles (without user_id to avoid FK constraint)
    let createdCount = 0;
    let failedCount = 0;
    const results = [];
    
    for (const user of users) {
      console.log(`\n🔍 Creating vehicle for: ${user.full_name} (${user.license_plate})`);
      
      const formattedPhone = formatPhoneNumber(user.phone_number);
      console.log(`   📞 Formatted phone: ${formattedPhone}`);
      
      const newVehicle = {
        license_plate: user.license_plate,
        vehicle_type: user.car_type || 'רכב פרטי',
        vehicle_model: 'לא צוין',
        vehicle_color: user.car_color || 'לא צוין',
        owner_name: user.full_name,
        owner_phone: formattedPhone,
        owner_address: 'לא צוין'
        // Deliberately NOT including user_id to avoid FK constraint
      };
      
      const { data: createdVehicle, error: createError } = await supabaseAdmin
        .from('vehicles')
        .insert([newVehicle])
        .select()
        .single();
      
      if (createError) {
        console.error(`   ❌ Error creating vehicle for ${user.full_name}:`, createError.message);
        failedCount++;
        results.push({ user: user.full_name, license: user.license_plate, action: 'failed', error: createError.message });
      } else {
        console.log(`   ✅ Successfully created vehicle ID: ${createdVehicle.id}`);
        createdCount++;
        results.push({ user: user.full_name, license: user.license_plate, action: 'created', vehicleId: createdVehicle.id });
      }
    }
    
    // Step 3: Summary report
    console.log('\n📊 Vehicle Creation Summary:');
    console.log('==============================');
    console.log(`👥 Total users with cars: ${users.length}`);
    console.log(`🆕 Vehicles created: ${createdCount}`);
    console.log(`❌ Failed operations: ${failedCount}`);
    
    if (createdCount > 0) {
      console.log('\n✅ Successfully Created Vehicles:');
      results.filter(r => r.action === 'created').forEach((result, index) => {
        console.log(`${index + 1}. ${result.user} - ${result.license}`);
      });
    }
    
    if (failedCount > 0) {
      console.log('\n❌ Failed Operations:');
      results.filter(r => r.action === 'failed').forEach((result, index) => {
        console.log(`${index + 1}. ${result.user} - ${result.license}: ${result.error}`);
      });
    }
    
    // Step 4: Verify results
    console.log('\n🔍 Verifying results...');
    const { data: finalVehicles, error: finalError } = await supabaseAdmin
      .from('vehicles')
      .select('id, license_plate, owner_name, user_id')
      .order('created_at', { ascending: false });
    
    if (finalError) {
      console.error('❌ Error verifying results:', finalError);
    } else {
      console.log(`✅ Verification complete: ${finalVehicles.length} total vehicles in database`);
      console.log(`📋 Vehicles with user_id: ${finalVehicles.filter(v => v.user_id).length}`);
      console.log(`📋 Vehicles without user_id: ${finalVehicles.filter(v => !v.user_id).length}`);
    }
    
    console.log('\n🎉 Vehicle creation process completed!');
    console.log('💡 Note: Vehicles were created without user_id links due to FK constraint.');
    console.log('🔧 Next step: Fix the FK constraint or update the vehicles table to link properly.');
    
  } catch (error) {
    console.error('❌ Vehicle creation process failed:', error);
    process.exit(1);
  }
}

createVehiclesForUsers();
