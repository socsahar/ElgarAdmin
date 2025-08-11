const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create both regular and admin clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnoseDatabase() {
  console.log('🔍 DATABASE DIAGNOSIS STARTING...\n');

  // Test 1: Check if we're connecting to the right database
  console.log('📊 SUPABASE URL:', process.env.SUPABASE_URL);
  console.log('🔑 ANON KEY starts with:', process.env.SUPABASE_ANON_KEY?.substring(0, 20) + '...');
  console.log('🔐 SERVICE KEY starts with:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...\n');

  // Test 2: Check table schema
  console.log('🗄️ CHECKING USERS TABLE SCHEMA...');
  try {
    const { data: schemaData, error: schemaError } = await supabaseAdmin
      .rpc('get_table_columns', { table_name: 'users' });
    
    if (schemaError) {
      console.log('❌ Could not get schema via RPC, trying direct query...');
      
      // Try to get schema info another way
      const { data: columns, error: directError } = await supabaseAdmin
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'users')
        .eq('table_schema', 'public');
        
      if (directError) {
        console.error('❌ Schema query failed:', directError);
      } else {
        console.log('✅ Users table columns:', columns);
      }
    } else {
      console.log('✅ Users table schema:', schemaData);
    }
  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  }

  // Test 3: Raw count queries
  console.log('\n📊 CHECKING ROW COUNTS...');
  
  try {
    // Count using admin client
    const { count: adminCount, error: adminCountError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });
      
    console.log('🔐 Admin client users count:', adminCount);
    if (adminCountError) console.error('❌ Admin count error:', adminCountError);

    // Count using regular client  
    const { count: regularCount, error: regularCountError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
      
    console.log('👤 Regular client users count:', regularCount);
    if (regularCountError) console.error('❌ Regular count error:', regularCountError);

  } catch (error) {
    console.error('❌ Count queries failed:', error.message);
  }

  // Test 4: Sample user data
  console.log('\n👥 SAMPLE USER DATA...');
  try {
    const { data: sampleUsers, error: sampleError } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, is_active')
      .limit(3);
      
    if (sampleError) {
      console.error('❌ Sample users error:', sampleError);
    } else {
      console.log('✅ Sample users:', JSON.stringify(sampleUsers, null, 2));
    }
  } catch (error) {
    console.error('❌ Sample query failed:', error.message);
  }

  // Test 5: Check if specific failing user exists
  const testUserId = '96a26fcd-a0ab-44cc-add7-fee678ef20e1'; // First failing user
  console.log(`\n🔍 CHECKING SPECIFIC USER: ${testUserId}`);
  
  try {
    const { data: specificUser, error: specificError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .single();
      
    if (specificError) {
      console.error('❌ Specific user error:', specificError);
    } else {
      console.log('✅ Specific user found:', JSON.stringify(specificUser, null, 2));
    }
  } catch (error) {
    console.error('❌ Specific user query failed:', error.message);
  }

  // Test 6: Check vehicles table
  console.log('\n🚗 CHECKING VEHICLES TABLE...');
  try {
    const { count: vehicleCount, error: vehicleCountError } = await supabaseAdmin
      .from('vehicles')
      .select('*', { count: 'exact', head: true });
      
    console.log('🚗 Vehicles count:', vehicleCount);
    if (vehicleCountError) console.error('❌ Vehicle count error:', vehicleCountError);

    // Sample vehicles
    const { data: sampleVehicles, error: sampleVehicleError } = await supabaseAdmin
      .from('vehicles')
      .select('id, user_id, license_plate')
      .limit(3);
      
    if (sampleVehicleError) {
      console.error('❌ Sample vehicles error:', sampleVehicleError);
    } else {
      console.log('✅ Sample vehicles:', JSON.stringify(sampleVehicles, null, 2));
    }
  } catch (error) {
    console.error('❌ Vehicle queries failed:', error.message);
  }

  // Test 7: Check foreign key constraint
  console.log('\n🔗 CHECKING FOREIGN KEY CONSTRAINT...');
  try {
    const { data: constraints, error: constraintError } = await supabaseAdmin
      .from('information_schema.table_constraints')
      .select('*')
      .eq('table_name', 'vehicles')
      .eq('constraint_type', 'FOREIGN KEY');
      
    if (constraintError) {
      console.error('❌ Constraint query error:', constraintError);
    } else {
      console.log('✅ Foreign key constraints:', JSON.stringify(constraints, null, 2));
    }
  } catch (error) {
    console.error('❌ Constraint check failed:', error.message);
  }

  // Test 8: Try to manually insert a test vehicle
  console.log('\n🧪 TESTING MANUAL VEHICLE INSERT...');
  try {
    // First, try to get any real user
    const { data: realUsers, error: realUsersError } = await supabaseAdmin
      .from('users')
      .select('id, username')
      .limit(1);
      
    if (realUsersError || !realUsers?.length) {
      console.error('❌ No real users found for test:', realUsersError);
    } else {
      const testUser = realUsers[0];
      console.log(`🧪 Testing with real user: ${testUser.username} (${testUser.id})`);
      
      // Try to insert a test vehicle
      const { data: testVehicle, error: testVehicleError } = await supabaseAdmin
        .from('vehicles')
        .insert({
          user_id: testUser.id,
          license_plate: 'TEST-123',
          brand: 'Test Brand',
          model: 'Test Model',
          year: 2023,
          status: 'active'
        })
        .select()
        .single();
        
      if (testVehicleError) {
        console.error('❌ Test vehicle insert failed:', testVehicleError);
      } else {
        console.log('✅ Test vehicle created successfully:', testVehicle);
        
        // Clean up - delete the test vehicle
        const { error: deleteError } = await supabaseAdmin
          .from('vehicles')
          .delete()
          .eq('id', testVehicle.id);
          
        if (deleteError) {
          console.error('⚠️ Failed to clean up test vehicle:', deleteError);
        } else {
          console.log('🧹 Test vehicle cleaned up successfully');
        }
      }
    }
  } catch (error) {
    console.error('❌ Manual test failed:', error.message);
  }

  console.log('\n🏁 DIAGNOSIS COMPLETE');
}

// Run diagnosis
diagnoseDatabase().catch(console.error);
