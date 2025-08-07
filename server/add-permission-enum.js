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

async function addPermissionToEnum() {
  try {
    console.log('🔍 Checking permission enum types...');
    
    // First, let's see what permission enum values exist
    const { data: enumData, error: enumError } = await supabaseAdmin
      .rpc('get_enum_values', {
        enum_name: 'permission_type'
      });
      
    if (enumError) {
      console.log('⚠️  Could not get enum values, trying direct query:', enumError.message);
      
      // Alternative approach - query the information schema
      const { data: schemaData, error: schemaError } = await supabaseAdmin
        .from('information_schema.enum_labels')
        .select('*')
        .eq('enum_name', 'permission_type');
        
      if (schemaError) {
        console.log('❌ Error querying schema:', schemaError.message);
        return;
      }
      
      console.log('📋 Schema enum data:', schemaData);
    } else {
      console.log('📋 Enum values:', enumData);
    }
    
    // Add the new permission to the enum
    console.log('🔧 Adding new permission to enum...');
    
    const { data: alterData, error: alterError } = await supabaseAdmin
      .rpc('exec_sql', {
        sql: "ALTER TYPE permission_type ADD VALUE 'vehicle_delegate_permissions';"
      });
      
    if (alterError) {
      if (alterError.message.includes('already exists')) {
        console.log('ℹ️  Permission type already exists in enum');
      } else {
        console.log('❌ Error adding to enum:', alterError.message);
        
        // Try direct SQL execution
        console.log('🔧 Trying direct SQL approach...');
        const { error: sqlError } = await supabaseAdmin
          .from('pg_enum')
          .insert({
            enumtypid: 'permission_type',
            enumlabel: 'vehicle_delegate_permissions'
          });
          
        if (sqlError) {
          console.log('❌ Direct SQL also failed:', sqlError.message);
        }
      }
    } else {
      console.log('✅ Successfully added permission to enum!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addPermissionToEnum();
