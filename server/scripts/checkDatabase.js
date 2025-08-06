const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabase() {
  try {
    console.log('🔍 Checking database connection...');
    
    // Test basic connection
    const { data: testData, error: testError } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(1);

    if (testError) {
      console.log('❌ Users table error:', testError.message);
      
      // Try to see what tables exist
      console.log('\n🔍 Checking available tables...');
      const { data: tables, error: tablesError } = await supabaseAdmin
        .rpc('get_tables');
      
      if (tablesError) {
        console.log('❌ Cannot fetch tables:', tablesError.message);
      } else {
        console.log('📋 Available tables:', tables);
      }
    } else {
      console.log('✅ Users table exists');
      console.log('📊 Sample data structure:', testData);
      
      // Check specific admin user
      const { data: adminUser, error: adminError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('username', 'admin')
        .single();
        
      if (adminError) {
        console.log('❌ Admin user not found:', adminError.message);
      } else {
        console.log('✅ Admin user found:', {
          id: adminUser.id,
          username: adminUser.username,
          full_name: adminUser.full_name,
          role: adminUser.role,
          isActive: adminUser.is_active
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

checkDatabase();
