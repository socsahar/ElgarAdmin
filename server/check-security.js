require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');

(async () => {
  try {
    // Check who has access_users_crud permission
    const { data: dangerousPerms, error } = await supabaseAdmin
      .from('user_permissions')
      .select(`
        permission,
        user_id,
        users!user_permissions_user_id_fkey(role, full_name)
      `)
      .eq('permission', 'access_users_crud')
      .eq('is_active', true);
      
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('🚨 SECURITY BREACH CHECK: Users with access_users_crud permission');
    console.log('================================================================');
    
    if (dangerousPerms && dangerousPerms.length > 0) {
      dangerousPerms.forEach(perm => {
        const role = perm.users.role;
        const name = perm.users.full_name || 'N/A';
        const isAllowed = ['מפתח', 'אדמין', 'פיקוד יחידה'].includes(role);
        
        console.log(`${isAllowed ? '✅' : '🚨'} ${role}: ${name} ${isAllowed ? '(ALLOWED)' : '(SECURITY BREACH!)'}`)
      });
    } else {
      console.log('✅ No users have access_users_crud permission');
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
})();
