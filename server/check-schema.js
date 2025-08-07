const { supabaseAdmin } = require('./config/supabase');

async function checkSchema() {
  try {
    console.log('🔍 Checking user_permissions table schema...');
    
    // Get one record to see the actual column names
    const { data, error } = await supabaseAdmin
      .from('user_permissions')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error fetching data:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Available columns:', Object.keys(data[0]));
      console.log('📄 Sample record:', data[0]);
    } else {
      console.log('⚠️ No data found in user_permissions table');
    }
    
    // Test a simple permission insert to see what the error is
    console.log('\n🧪 Testing permission insert...');
    const testInsert = {
      user_id: '123e4567-e89b-12d3-a456-426614174000', // fake UUID
      permission: 'vehicle_search_access',
      granted_by_id: '123e4567-e89b-12d3-a456-426614174000',
      is_active: true
    };
    
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('user_permissions')
      .insert(testInsert)
      .select();
    
    if (insertError) {
      console.log('❌ Insert error (expected):', insertError.message);
      console.log('   Code:', insertError.code);
    } else {
      console.log('✅ Insert successful (unexpected)');
      // Clean up the test record
      await supabaseAdmin
        .from('user_permissions')
        .delete()
        .eq('user_id', testInsert.user_id);
    }
    
  } catch (error) {
    console.error('💥 Exception:', error);
  }
}

checkSchema().then(() => {
  console.log('🏁 Schema check complete');
  process.exit(0);
}).catch(console.error);
