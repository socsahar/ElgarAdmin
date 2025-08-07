const { supabaseAdmin } = require('./config/supabase');
require('dotenv').config();

async function fixEnumTrigger() {
  try {
    console.log('🔧 Fixing ENUM comparison in trigger function...');
    
    const sql = `
      CREATE OR REPLACE FUNCTION prevent_unauthorized_saiyer_permissions()
      RETURNS TRIGGER AS $$
      DECLARE
          user_role TEXT;
          unauthorized_permissions TEXT[] := ARRAY[
              'view_events_list',
              'access_summaries', 
              'view_own_summaries',
              'access_analytics',
              'can_modify_privileges',
              'access_events_crud'
          ];
      BEGIN
          -- Get user role
          SELECT role INTO user_role FROM public.users WHERE id = NEW.user_id;
          
          -- If user is סייר and trying to get unauthorized permission, block it
          -- Cast ENUM to text for comparison with text array
          IF user_role = 'סייר' AND NEW.permission::text = ANY(unauthorized_permissions) THEN
              RAISE EXCEPTION 'Cannot grant permission "%" to סייר users. This permission is not authorized for volunteers.', NEW.permission;
          END IF;
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    const { error } = await supabaseAdmin.from('_sql_execute').select().eq('sql', sql);
    
    // Try alternative approach using direct SQL execution
    const { data, error: sqlError } = await supabaseAdmin.rpc('sql', { 
      query: sql 
    });
    
    if (sqlError) {
      console.error('❌ SQL Error:', sqlError);
      // Try using a simple update approach
      console.log('🔄 Trying alternative update method...');
      
      // Let's just test the connection first
      const { data: testData, error: testError } = await supabaseAdmin
        .from('users')
        .select('id')
        .limit(1);
      
      if (testError) {
        console.error('❌ Connection test failed:', testError);
      } else {
        console.log('✅ Database connection is working');
        console.log('⚠️ Please run the SQL manually in Supabase dashboard:');
        console.log(sql);
      }
    } else {
      console.log('✅ Trigger function updated successfully');
    }
    
  } catch (error) {
    console.error('💥 Exception:', error);
    console.log('⚠️ Please apply this SQL fix manually in Supabase dashboard:');
    console.log(`
      CREATE OR REPLACE FUNCTION prevent_unauthorized_saiyer_permissions()
      RETURNS TRIGGER AS $$
      DECLARE
          user_role TEXT;
          unauthorized_permissions TEXT[] := ARRAY[
              'view_events_list',
              'access_summaries', 
              'view_own_summaries',
              'access_analytics',
              'can_modify_privileges',
              'access_events_crud'
          ];
      BEGIN
          SELECT role INTO user_role FROM public.users WHERE id = NEW.user_id;
          IF user_role = 'סייר' AND NEW.permission::text = ANY(unauthorized_permissions) THEN
              RAISE EXCEPTION 'Cannot grant permission "%" to סייר users. This permission is not authorized for volunteers.', NEW.permission;
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }
}

fixEnumTrigger().then(() => {
  console.log('🏁 Fix attempt complete');
  process.exit(0);
}).catch(console.error);
