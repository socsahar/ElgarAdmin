const { supabaseAdmin } = require('../config/supabase');

async function setUserMustChangePassword(username) {
  try {
    console.log(`מעדכן משתמש ${username} לדרוש שינוי סיסמה...`);
    
    // Check if user exists
    const { data: existingUser, error: findError } = await supabaseAdmin
      .from('users')
      .select('id, username, must_change_password')
      .eq('username', username)
      .maybeSingle();

    if (findError) {
      console.log('שגיאה בבדיקת טבלת המשתמשים:', findError.message);
      return false;
    }

    if (!existingUser) {
      console.log(`❌ משתמש ${username} לא נמצא`);
      return false;
    }

    // Update user to require password change
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        must_change_password: true,
        updated_at: new Date().toISOString()
      })
      .eq('username', username)
      .select()
      .single();

    if (updateError) {
      console.error('שגיאה בעדכון המשתמש:', updateError.message);
      return false;
    }

    console.log('✅ המשתמש עודכן בהצלחה!');
    console.log('שם משתמש:', updatedUser.username);
    console.log('חובת שינוי סיסמה:', updatedUser.must_change_password);
    console.log('');
    console.log('עכשיו תוכל להתחבר עם המשתמש הזה ולראות את מסך שינוי הסיסמה הכפוי');
    return true;
    
  } catch (error) {
    console.error('שגיאה:', error.message);
    return false;
  }
}

// Get username from command line arguments
const username = process.argv[2];

if (!username) {
  console.log('שימוש: node setUserMustChangePassword.js <username>');
  console.log('דוגמה: node setUserMustChangePassword.js admin');
  process.exit(1);
}

// Run the function
setUserMustChangePassword(username).then((success) => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('הסקריפט נכשל:', error);
  process.exit(1);
});

module.exports = setUserMustChangePassword;
