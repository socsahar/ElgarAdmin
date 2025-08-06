const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateAdminPassword() {
  try {
    console.log('🔄 Updating admin password to "password"...');
    
    // Hash the new password
    const newPassword = 'admin123';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('🔐 New password hash generated');
    
    // Update the admin user's password
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ 
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('username', 'admin')
      .select();
      
    if (error) {
      console.error('❌ Error updating password:', error);
      return;
    }
    
    console.log('✅ Admin password updated successfully');
    console.log('🎉 You can now login with:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    
    // Verify the update worked
    const { data: updatedUser, error: verifyError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('username', 'admin')
      .single();
      
    if (!verifyError && updatedUser) {
      const isMatch = await bcrypt.compare('admin123', updatedUser.password_hash);
      console.log('✅ Password verification:', isMatch ? 'SUCCESS' : 'FAILED');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateAdminPassword();
