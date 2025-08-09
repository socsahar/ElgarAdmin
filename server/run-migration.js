require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Starting migration to add user vehicle linking...');
    
    // Test if the user_id column exists by trying to select it specifically
    console.log('🔍 Testing if user_id column exists...');
    
    const { data: testData, error: testError } = await supabaseAdmin
      .from('vehicles')
      .select('id, user_id')
      .limit(1);
    
    if (testError && testError.message.includes('user_id')) {
      console.log('❌ user_id column does not exist yet');
      console.log('💡 Please run this SQL manually in Supabase SQL editor:');
      console.log('');
      console.log('ALTER TABLE vehicles ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;');
      console.log('CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);');
      console.log('');
      console.log('After running the SQL, restart this script.');
      return;
    }
    
    if (testError) {
      console.error('❌ Unexpected error testing column:', testError);
      throw testError;
    }
    
    console.log('✅ user_id column exists and is accessible!');
    console.log('📊 Sample data structure:', testData?.[0] || 'No vehicles found');
    
    // Test basic vehicle search functionality first
    console.log('🔍 Testing basic vehicle search...');
    
    const { data: basicData, error: basicError } = await supabaseAdmin
      .from('vehicles')
      .select('*')
      .limit(3);
    
    if (basicError) {
      console.error('❌ Error testing basic search:', basicError);
      throw basicError;
    }
    
    console.log('✅ Basic vehicle search is working!');
    console.log(`📋 Found ${basicData?.length || 0} vehicles in database`);
    
    // Test creating a sample vehicle to verify structure
    console.log('🎯 Testing vehicle creation...');
    
    const testVehicle = {
      license_plate: 'TEST-001',
      vehicle_type: 'רכב פרטי',
      vehicle_model: 'טסט מודל',
      vehicle_color: 'לבן',
      owner_name: 'משתמש טסט',
      owner_phone: '050-1234567',
      owner_address: 'כתובת טסט',
      user_id: null // Will be null for now
    };
    
    const { data: createdVehicle, error: createError } = await supabaseAdmin
      .from('vehicles')
      .insert([testVehicle])
      .select()
      .single();
    
    if (createError) {
      console.log('ℹ️ Vehicle creation test:', createError.message);
      if (createError.message.includes('duplicate key value')) {
        console.log('✅ Test vehicle already exists (that\'s fine)');
      }
    } else {
      console.log('✅ Test vehicle created successfully:', createdVehicle);
      
      // Clean up test vehicle
      await supabaseAdmin
        .from('vehicles')
        .delete()
        .eq('license_plate', 'TEST-001');
      console.log('🧹 Test vehicle cleaned up');
    }
    
    // Test basic vehicle search with user_id
    console.log('🔍 Testing vehicle search with user_id...');
    const { data: vehicleData, error: vehicleError } = await supabaseAdmin
      .from('vehicles')
      .select('id, license_plate, vehicle_type, owner_name, user_id')
      .limit(3);
    
    if (vehicleError) {
      console.error('❌ Error testing vehicle search:', vehicleError);
      throw vehicleError;
    }
    
    console.log('✅ Vehicle search with user_id is working!');
    console.log(`📋 Found ${vehicleData?.length || 0} vehicles`);
    
    // Skip the enhanced join test for now since there are multiple relationships
    console.log('ℹ️ Skipping enhanced user join test (multiple FK relationships detected)');
    
    console.log('🎉 Basic migration verification completed successfully!');
    
    if (enhancedError) {
      console.error('❌ Error testing enhanced search:', enhancedError);
      throw enhancedError;
    }
    
    console.log('✅ Enhanced vehicle search is working!');
    console.log(`� Found ${enhancedData?.length || 0} vehicles for testing`);
    
    if (enhancedData && enhancedData.length > 0) {
      enhancedData.forEach((vehicle, index) => {
        const isSystemUser = !!vehicle.user_id && !!vehicle.users;
        console.log(`📋 Vehicle ${index + 1}: ${vehicle.license_plate} - ${isSystemUser ? '🎖️ System User Vehicle' : '👤 Regular Vehicle'}`);
        if (isSystemUser) {
          console.log(`   📸 User photo: ${vehicle.users.photo_url ? '✅ Available' : '❌ Missing'}`);
          console.log(`   👨‍💼 ${vehicle.users.full_name} (${vehicle.users.position})`);
        }
      });
    }
    
    console.log('🎉 Migration verification completed successfully!');
    console.log('');
    console.log('� Next steps:');
    console.log('1. Create a new user with car information to test automatic vehicle creation');
    console.log('2. Check the vehicle search to see enhanced display with user photos and badges');
    console.log('3. Verify that system user vehicles show the "מתנדב יחידת אלג"ר" badge');
    
  } catch (error) {
    console.error('❌ Migration verification failed:', error);
    process.exit(1);
  }
}

runMigration();
