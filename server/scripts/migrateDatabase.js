const { supabaseAdmin } = require('../config/supabase');

async function checkDatabaseSchema() {
  try {
    console.log('בדיקת סכמת מסד הנתונים...');
    
    // Check if all required tables exist with Hebrew schema
    const tables = ['users', 'events', 'event_responses', 'logs', 'action_reports'];
    const tableChecks = [];
    
    for (const table of tables) {
      console.log(`בדיקת טבלה: ${table}`);
      
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ שגיאה בטבלה ${table}:`, error.message);
        tableChecks.push({ table, exists: false, error: error.message });
      } else {
        console.log(`✅ טבלה ${table} זמינה`);
        tableChecks.push({ table, exists: true });
      }
    }
    
    // Check for Hebrew role enum
    console.log('בדיקת תפקידים בעברית...');
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .limit(5);
    
    if (userData && userData.length > 0) {
      const roles = userData.map(u => u.role).filter(Boolean);
      console.log('תפקידים שנמצאו:', roles);
      
      const hebrewRoles = ['מפתח', 'אדמין', 'פיקוד יחידה', 'מפקד משל"ט', 'מוקדן', 'סייר'];
      const hasHebrewRoles = roles.some(role => hebrewRoles.includes(role));
      
      if (hasHebrewRoles) {
        console.log('✅ תפקידים בעברית זוהו במערכת');
      } else {
        console.log('⚠️ לא נמצאו תפקידים בעברית - יתכן שנדרש להריץ את database-setup.sql');
      }
    }
    
    return {
      success: tableChecks.every(check => check.exists),
      tableChecks,
      message: tableChecks.every(check => check.exists) 
        ? 'מסד הנתונים מוכן לשימוש'
        : 'יש להריץ את database-setup.sql תחילה'
    };
    
  } catch (error) {
    console.error('שגיאה בבדיקת מסד הנתונים:', error.message);
    return { success: false, error: error.message };
  }
}

async function migrateDatabase() {
  try {
    console.log('=== בדיקת מיגרציית מסד נתונים ===');
    
    const schemaCheck = await checkDatabaseSchema();
    
    if (schemaCheck.success) {
      console.log('✅ מסד הנתונים מעודכן ומוכן לשימוש');
      return true;
    } else {
      console.log('❌ יש בעיות במסד הנתונים:');
      console.log(schemaCheck.message);
      
      if (schemaCheck.tableChecks) {
        schemaCheck.tableChecks.forEach(check => {
          if (!check.exists) {
            console.log(`  - טבלה ${check.table} חסרה: ${check.error}`);
          }
        });
      }
      
      console.log('\nהוראות לתיקון:');
      console.log('1. היכנס לממשק Supabase Dashboard');
      console.log('2. עבור לעמוד SQL Editor');
      console.log('3. הרץ את הקובץ database-setup.sql');
      console.log('4. הפעל מחדש את השרת');
      
      return false;
    }
    
  } catch (error) {
    console.error('שגיאה במיגרציה:', error.message);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  migrateDatabase().then((success) => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('המיגרציה נכשלה:', error);
    process.exit(1);
  });
}

module.exports = { migrateDatabase, checkDatabaseSchema };
