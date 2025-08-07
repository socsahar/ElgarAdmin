require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase admin client  
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

async function debugUserPermissions(userIdentifier) {
  try {
    console.log(`\n=== Debugging permissions for user: ${userIdentifier} ===`);
    
    // Find user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .or(`username.eq.${userIdentifier},full_name.eq.${userIdentifier},email.eq.${userIdentifier}`)
      .single();
      
    if (userError || !user) {
      console.log('User not found:', userError?.message);
      return;
    }
    
    console.log('User found:');
    console.log(`- ID: ${user.id}`);
    console.log(`- Username: ${user.username}`);
    console.log(`- Full Name: ${user.full_name}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Email: ${user.email}`);
    
    // Get user permissions
    const { data: permissions, error: permError } = await supabaseAdmin
      .from('user_permissions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);
      
    if (permError) {
      console.log('Error fetching permissions:', permError.message);
      return;
    }
    
    console.log(`\nUser has ${permissions.length} active permissions:`);
    permissions.forEach(perm => {
      console.log(`- ${perm.permission} (granted at: ${perm.granted_at})`);
    });
    
    // Check specific problematic permissions
    const problematicPerms = ['view_events_list', 'access_summaries', 'view_own_summaries'];
    console.log('\nChecking problematic permissions:');
    problematicPerms.forEach(perm => {
      const hasPerm = permissions.some(p => p.permission === perm);
      console.log(`- ${perm}: ${hasPerm ? 'YES' : 'NO'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Get username from command line args
const userIdentifier = process.argv[2];
if (!userIdentifier) {
  console.log('Usage: node debug-permissions.js <username/email/fullname>');
  process.exit(1);
}

debugUserPermissions(userIdentifier);
