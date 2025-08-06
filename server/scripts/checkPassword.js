const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAdminPassword() {
  try {
    console.log('🔍 Checking admin user password...');
    
    const { data: adminUser, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('username', 'admin')
      .single();
      
    if (error || !adminUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('✅ Admin user found:', {
      id: adminUser.id,
      username: adminUser.username,
      role: adminUser.role,
      isActive: adminUser.is_active,
      passwordHash: adminUser.password_hash.substring(0, 20) + '...'
    });
    
    // Test different common passwords
    const testPasswords = ['password', 'admin', 'admin123', '123456', 'elgar'];
    
    for (const testPassword of testPasswords) {
      const isMatch = await bcrypt.compare(testPassword, adminUser.password_hash);
      console.log(`Testing password "${testPassword}": ${isMatch ? '✅ MATCH' : '❌ No match'}`);
      if (isMatch) {
        console.log(`🎉 Correct password is: "${testPassword}"`);
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAdminPassword();
