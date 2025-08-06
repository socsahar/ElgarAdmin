const { supabaseAdmin } = require('../config/supabase');

async function listUsers() {
  try {
    console.log('רשימת משתמשים במערכת:');
    console.log('========================');
    
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, role, is_active, must_change_password')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('שגיאה בטעינת המשתמשים:', error.message);
      return false;
    }

    if (!users || users.length === 0) {
      console.log('לא נמצאו משתמשים במערכת');
      return true;
    }

    users.forEach((user, index) => {
      console.log(`${index + 1}. שם משתמש: ${user.username}`);
      console.log(`   שם מלא: ${user.full_name || 'לא צוין'}`);
      console.log(`   תפקיד: ${user.role}`);
      console.log(`   פעיל: ${user.is_active ? 'כן' : 'לא'}`);
      console.log(`   חובת שינוי סיסמה: ${user.must_change_password ? 'כן' : 'לא'}`);
      console.log('   ---');
    });

    console.log('');
    console.log('לבדיקת שינוי סיסמה כפוי, הרץ:');
    console.log('node scripts/setUserMustChangePassword.js <username>');
    console.log('דוגמה: node scripts/setUserMustChangePassword.js admin');
    
    return true;
    
  } catch (error) {
    console.error('שגיאה:', error.message);
    return false;
  }
}

// Run the function
listUsers().then((success) => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('הסקריפט נכשל:', error);
  process.exit(1);
});
