// Script to manually set up Supabase Storage policies
require('dotenv').config();

const { supabaseAdmin } = require('../config/supabase');

async function setupStoragePolicies() {
  console.log('🔐 Setting up Supabase Storage policies...');
  
  try {
    // Storage policies SQL
    const storagePoliciesToCreate = [
      // Allow authenticated users to upload
      {
        name: 'Allow authenticated uploads',
        sql: `
        CREATE POLICY IF NOT EXISTS "Allow authenticated uploads"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (
          bucket_id = 'uploads' AND
          auth.role() = 'authenticated'
        );
        `
      },
      // Allow public read access
      {
        name: 'Allow public read access',
        sql: `
        CREATE POLICY IF NOT EXISTS "Allow public read access"
        ON storage.objects
        FOR SELECT
        TO public
        USING (bucket_id = 'uploads');
        `
      },
      // Allow authenticated updates
      {
        name: 'Allow authenticated updates',
        sql: `
        CREATE POLICY IF NOT EXISTS "Allow authenticated updates"
        ON storage.objects
        FOR UPDATE
        TO authenticated
        USING (bucket_id = 'uploads' AND auth.role() = 'authenticated')
        WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');
        `
      },
      // Allow authenticated deletes
      {
        name: 'Allow authenticated deletes',
        sql: `
        CREATE POLICY IF NOT EXISTS "Allow authenticated deletes"
        ON storage.objects
        FOR DELETE
        TO authenticated
        USING (bucket_id = 'uploads' AND auth.role() = 'authenticated');
        `
      }
    ];
    
    for (const policy of storagePoliciesToCreate) {
      console.log(`📝 Creating policy: ${policy.name}...`);
      
      const { data, error } = await supabaseAdmin
        .from('') // This is a hack to execute raw SQL
        .select()
        .limit(0);
      
      // Try a different approach - using the SQL function if available
      try {
        const { error: sqlError } = await supabaseAdmin.rpc('exec_sql', { 
          sql: policy.sql 
        });
        
        if (sqlError) {
          console.warn(`⚠️ Could not create policy ${policy.name}:`, sqlError.message);
        } else {
          console.log(`✅ Policy created: ${policy.name}`);
        }
      } catch (rpcError) {
        console.warn(`⚠️ RPC not available for policy ${policy.name}:`, rpcError.message);
      }
    }
    
    console.log('✅ Storage policy setup completed');
    console.log('📝 If some policies failed, please run setup-storage-policies.sql manually in Supabase SQL Editor');
    
  } catch (error) {
    console.error('❌ Error setting up storage policies:', error);
    console.log('📝 Please run setup-storage-policies.sql manually in Supabase SQL Editor');
  }
}

// Run if called directly
if (require.main === module) {
  setupStoragePolicies()
    .then(() => {
      console.log('🎉 Storage policy setup script completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Storage policy setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupStoragePolicies };
