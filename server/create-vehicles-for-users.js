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
    
    // Step 2: Create vehicles without user_id for now (due to FK constraint issue)
    let createdCount = 0;
    let failedCount = 0;
    const results = [];
    
    for (const user of users) {
      console.log(`\n🔍 Creating vehicle for: ${user.full_name} (${user.license_plate})`);
      
      // Format phone number to match constraint
      let formattedPhone = user.phone_number;
      if (formattedPhone && !formattedPhone.match(/^\d{3}-\d{7}$/)) {
        // Try to format phone number as XXX-XXXXXXX
        const digits = formattedPhone.replace(/\D/g, '');
        if (digits.length === 10) {
          formattedPhone = `${digits.slice(0,3)}-${digits.slice(3)}`;
        } else if (digits.length === 9) {
          formattedPhone = `0${digits.slice(0,2)}-${digits.slice(2)}`;
        }
      }
      
      const newVehicle = {
        license_plate: user.license_plate,
        vehicle_type: user.car_type || 'רכב פרטי',
        vehicle_model: 'לא צוין', // No model info in users table
        vehicle_color: user.car_color || 'לא צוין',
        owner_name: user.full_name,
        owner_phone: formattedPhone || '050-0000000',
        owner_address: 'לא צוין', // Required field
        user_id: null, // Set to null for now due to FK constraint issue
        custom_user_id: user.id // Add a reference to our custom users table
      };
      
      const { data: createdVehicle, error: createError } = await supabaseAdmin
        .from('vehicles')
        .insert([newVehicle])
        .select()
        .single();
      
      if (createError) {
        console.error(`   ❌ Error creating vehicle for ${user.full_name}:`, createError.message);
        failedCount++;
        results.push({ user: user.full_name, action: 'failed', error: createError.message });
      } else {
        console.log(`   ✅ Successfully created vehicle for ${user.full_name}`);
        createdCount++;
        results.push({ user: user.full_name, action: 'created', vehicleId: createdVehicle.id });
      }
    }
    
    // Step 3: Summary report
    console.log('\n📊 Vehicle Creation Summary:');
    console.log('==============================');
    console.log(`👥 Total users with cars: ${users.length}`);
    console.log(`🆕 Vehicles created: ${createdCount}`);
    console.log(`❌ Failed operations: ${failedCount}`);
    
    if (failedCount > 0) {
      console.log('\n❌ Failed Operations:');
      results.filter(r => r.action === 'failed').forEach((result, index) => {
        console.log(`${index + 1}. ${result.user}: ${result.error}`);
      });
    }
    
    if (createdCount > 0) {
      console.log('\n✅ Successfully Created:');
      results.filter(r => r.action === 'created').forEach((result, index) => {
        console.log(`${index + 1}. ${result.user}`);
      });
    }
    
    // Step 4: Verify results
    console.log('\n🔍 Verifying results...');
    const { data: finalVehicles, error: finalError } = await supabaseAdmin
      .from('vehicles')
      .select('id, license_plate, owner_name')
      .not('custom_user_id', 'is', null);
    
    if (finalError) {
      console.error('❌ Error verifying results:', finalError);
    } else {
      console.log(`✅ Verification complete: ${finalVehicles.length} vehicles created for users`);
    }
    
    console.log('\n🎉 Vehicle creation process completed!');
    console.log('💡 Note: user_id is set to null due to FK constraint. You can update the constraint later if needed.');
    console.log('🔧 The vehicles are linked via custom_user_id field for now.');
    
  } catch (error) {
    console.error('❌ Vehicle creation process failed:', error);
    process.exit(1);
  }
}

createVehiclesForUsers();
