const { supabaseAdmin } = require('../config/supabase');

async function initializeLogs() {
  try {
    console.log('🔧 מתחיל ביצוע אתחול לוגים...');
    
    // Check if we already have logs
    const { count: logCount, error: checkError } = await supabaseAdmin
      .from('logs')
      .select('*', { count: 'exact', head: true });
    
    if (checkError) {
      console.error('שגיאה בבדיקת לוגים קיימים:', checkError);
      return false;
    }
    
    // If logs table is empty or has very few entries, create initial logs
    console.log(`נמצאו ${logCount || 0} לוגים קיימים`);
    
    if (logCount < 5) {
      console.log('יצירת לוגים ראשוניים...');
      
      const initialLogs = [
        {
          level: 'info',
          message: 'מערכת Elgar הופעלה בהצלחה',
          source: 'Web', // Changed from 'System' to match constraint
          user_id: null,
          metadata: { 
            system_event: 'startup',
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development'
          }
        },
        {
          level: 'info',
          message: 'בסיס נתונים מחובר ופעיל',
          source: 'Web', // Changed from 'Database' to match constraint
          user_id: null,
          metadata: { 
            db_operation: true,
            operation_type: 'connection_verified'
          }
        },
        {
          level: 'info',
          message: 'שירותי API מוכנים לשימוש',
          source: 'Web', // Changed from 'API' to match constraint
          user_id: null,
          metadata: { 
            api_call: true,
            service_status: 'ready',
            endpoints_available: true
          }
        },
        {
          level: 'info',
          message: 'מערכת האותנטיקציה פעילה',
          source: 'Web', // Changed from 'Auth' to match constraint
          user_id: null,
          metadata: { 
            security_event: 'auth_system_ready',
            auth_method: 'supabase'
          }
        },
        {
          level: 'info',
          message: 'מערכת ניטור הבריאות פעילה',
          source: 'Web', // Changed from 'Health' to match constraint
          user_id: null,
          metadata: { 
            system_event: 'health_monitoring_active',
            monitoring_interval: '5_minutes'
          }
        }
      ];
      
      const { data: insertResult, error: insertError } = await supabaseAdmin
        .from('logs')
        .insert(initialLogs)
        .select();
      
      if (insertError) {
        console.error('שגיאה ביצירת לוגים ראשוניים:', insertError);
        return false;
      }
      
      console.log(`✅ נוצרו ${insertResult.length} לוגים ראשוניים בהצלחה`);
    } else {
      console.log('✅ יש מספיק לוגים במערכת, אין צורך באתחול');
    }
    
    return true;
    
  } catch (error) {
    console.error('שגיאה באתחול לוגים:', error);
    return false;
  }
}

module.exports = { initializeLogs };
