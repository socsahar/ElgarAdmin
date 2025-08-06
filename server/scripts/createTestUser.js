const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../config/supabase');

async function createTestUser() {
  try {
    console.log('יוצר משתמש בדיקה עם סיסמה ראשונית...');
    
    // Check if test user already exists
    const { data: existingUser, error: findError } = await supabaseAdmin
      .from('users')
      .select('id, username, must_change_password')
      .eq('username', 'test')
      .maybeSingle();

    if (findError) {
      console.log('שגיאה בבדיקת טבלת המשתמשים:', findError.message);
      return false;
    }

    if (existingUser) {
      console.log('✅ משתמש בדיקה כבר קיים:', existingUser.username);
      console.log('חובת שינוי סיסמה:', existingUser.must_change_password);
      return true;
    }

    // Hash the default password
    const hashedPassword = await bcrypt.hash('123456', 12);
    
    // Create test user with must_change_password = true
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        username: 'test',
        full_name: 'משתמש בדיקה',
        password_hash: hashedPassword,
        role: 'סייר',
        phone_number: '0501234567',
        id_number: '123456789',
        position: 'סייר',
        has_car: false,
        is_active: true,
        must_change_password: true, // Force password change
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('שגיאה ביצירת משתמש בדיקה:', createError.message);
      return false;
    }

    console.log('✅ משתמש בדיקה נוצר בהצלחה!');
    console.log('שם משתמש: test');
    console.log('סיסמה ראשונית: 123456');
    console.log('חובת שינוי סיסמה: true');
    console.log('תפקיד:', newUser.role);
    return true;
    
  } catch (error) {
    console.error('שגיאה ב-createTestUser:', error.message);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  createTestUser().then((success) => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('הסקריפט נכשל:', error);
    process.exit(1);
  });
}

module.exports = createTestUser;
