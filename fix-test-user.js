const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixTestUser() {
  try {
    console.log('🔍 Looking for test user...');
    
    // Find the test user
    const { data: testUser, error: findError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('username', 'בדיקות')
      .single();

    if (findError) {
      console.error('❌ Error finding test user:', findError.message);
      return;
    }

    if (!testUser) {
      console.log('ℹ️ Test user not found');
      return;
    }

    console.log('👤 Found test user:', {
      id: testUser.id,
      username: testUser.username,
      full_name: testUser.full_name,
      photo_url: testUser.photo_url
    });

    if (testUser.photo_url) {
      console.log('✅ Test user already has photo_url:', testUser.photo_url);
      return;
    }

    // Update the test user to set a default photo_url
    console.log('🔧 Updating test user with default photo_url...');
    
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        photo_url: null // Set to null instead of undefined
      })
      .eq('id', testUser.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating test user:', updateError.message);
      return;
    }

    console.log('✅ Test user updated successfully:', {
      id: updatedUser.id,
      username: updatedUser.username,
      full_name: updatedUser.full_name,
      photo_url: updatedUser.photo_url
    });

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the fix
fixTestUser().then(() => {
  console.log('🏁 Script completed');
  process.exit(0);
});
