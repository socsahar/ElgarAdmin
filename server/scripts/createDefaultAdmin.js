require('dotenv').config();
const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../config/supabase');

async function createDefaultAdmin() {
  try {
    console.log('בדיקת משתמש אדמין קיים...');
    
    // Check if admin user already exists by username
    const { data: existingAdmin, error: findError } = await supabaseAdmin
      .from('users')
      .select('id, username, role')
      .eq('username', 'admin')
      .maybeSingle();

    if (findError) {
      console.log('שגיאה בבדיקת טבלת המשתמשים:', findError.message);
      console.log('יש להריץ תחילה את סקריפט database-setup.sql בממשק Supabase');
      return false;
    }

    if (existingAdmin) {
      console.log('✅ משתמש אדמין כבר קיים:', existingAdmin.username);
      console.log('תפקיד:', existingAdmin.role);
      return true;
    }

    console.log('יוצר משתמש אדמין ברירת מחדל...');
    
    // Hash the password using bcrypt
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    // Create admin user with Hebrew schema
    const { data: newAdmin, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        username: 'admin',
        full_name: 'מנהל מערכת',
        password_hash: hashedPassword,
        role: 'אדמין',
        is_active: true,
        must_change_password: false, // Admin doesn't need to change password
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('שגיאה ביצירת משתמש אדמין:', createError.message);
      console.log('יש לוודא שטבלת המשתמשים נוצרה עם הסכמה הנכונה');
      return false;
    }

    console.log('✅ משתמש אדמין נוצר בהצלחה!');
    console.log('שם משתמש: admin');
    console.log('סיסמה: admin123');
    console.log('תפקיד:', newAdmin.role);
    return true;
    
  } catch (error) {
    console.error('שגיאה ב-createDefaultAdmin:', error.message);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  createDefaultAdmin().then((success) => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('הסקריפט נכשל:', error);
    process.exit(1);
  });
}

module.exports = createDefaultAdmin;

// Run if called directly
if (require.main === module) {
  createDefaultAdmin().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = createDefaultAdmin;
