require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function addDelegationPermission() {
  try {
    console.log('🔄 Adding vehicle delegation permission...');
    
    // Insert the new permission
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('vehicle_permissions')
      .insert({
        permission: 'vehicle_delegate_permissions',
        label_hebrew: 'מתן הרשאה למתן הרשאות',
        description_hebrew: 'יכולת להעניק הרשאות עריכה, מחיקה והוספת רכבים למשתמשים אחרים'
      });
      
    if (insertError) {
      if (insertError.code === '23505') { // Unique constraint violation
        console.log('ℹ️  Permission already exists, skipping...');
      } else {
        console.error('❌ Error inserting permission:', insertError.message);
        return;
      }
    } else {
      console.log('✅ New permission added successfully!');
    }
    
    // Verify the permission exists
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('vehicle_permissions')
      .select('*')
      .eq('permission', 'vehicle_delegate_permissions');
      
    if (verifyError) {
      console.error('❌ Error verifying permission:', verifyError.message);
    } else if (verifyData && verifyData.length > 0) {
      console.log('✅ Permission verified in database:');
      console.log(verifyData[0]);
    } else {
      console.log('⚠️  Permission not found after insertion');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addDelegationPermission();
