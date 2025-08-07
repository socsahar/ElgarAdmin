// Load environment variables
require('dotenv').config();

const { supabase, supabaseAdmin } = require('../config/supabase');

/**
 * Initialize Supabase Storage for profile photos
 * Creates the 'uploads' bucket if it doesn't exist
 * Sets up proper policies for file access
 */
async function initializeSupabaseStorage() {
  try {
    console.log('🪣 Initializing Supabase Storage...');
    
    // Check if 'vehicle-images' bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return false;
    }
    
    const vehicleImagesBucket = buckets.find(bucket => bucket.name === 'vehicle-images');
    
    if (!vehicleImagesBucket) {
      console.log('📦 Creating vehicle-images bucket...');
      
      // Create the bucket with public access
      const { data, error } = await supabaseAdmin.storage.createBucket('vehicle-images', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        fileSizeLimit: 5242880, // 5MB
        fileTransforms: {
          imageFormat: 'auto'
        }
      });
      
      if (error) {
        console.error('❌ Error creating bucket:', error);
        return false;
      }
      
      console.log('✅ Vehicle-images bucket created successfully');
    } else {
      console.log('✅ Vehicle-images bucket already exists');
    }
    
    // Set up storage policies for authenticated uploads and public read access
    console.log('🔐 Setting up storage policies...');
    
    try {
      // Create storage policies using SQL
      const storagePoliciesToCreate = [
        // Allow authenticated users to upload
        `
        CREATE POLICY IF NOT EXISTS "Allow authenticated uploads to vehicle-images"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (
          bucket_id = 'vehicle-images' AND
          auth.role() = 'authenticated'
        );
        `,
        // Allow public read access
        `
        CREATE POLICY IF NOT EXISTS "Allow public read access to vehicle-images"
        ON storage.objects
        FOR SELECT
        TO public
        USING (bucket_id = 'vehicle-images');
        `,
        // Allow authenticated updates
        `
        CREATE POLICY IF NOT EXISTS "Allow authenticated updates to vehicle-images"
        ON storage.objects
        FOR UPDATE
        TO authenticated
        USING (bucket_id = 'vehicle-images' AND auth.role() = 'authenticated')
        WITH CHECK (bucket_id = 'vehicle-images' AND auth.role() = 'authenticated');
        `,
        // Allow authenticated deletes
        `
        CREATE POLICY IF NOT EXISTS "Allow authenticated deletes to vehicle-images"
        ON storage.objects
        FOR DELETE
        TO authenticated
        USING (bucket_id = 'vehicle-images' AND auth.role() = 'authenticated');
        `
      ];
      
      for (const policy of storagePoliciesToCreate) {
        const { error: policyError } = await supabaseAdmin.rpc('sql', { query: policy });
        if (policyError && !policyError.message.includes('already exists')) {
          console.warn('⚠️ Policy creation warning:', policyError.message);
        }
      }
      
      console.log('✅ Storage policies configured');
    } catch (policyError) {
      console.warn('⚠️ Could not set storage policies programmatically:', policyError.message);
      console.log('📝 Please run the setup-storage-policies.sql file manually in Supabase SQL Editor');
    }
    
    console.log('✅ Supabase Storage initialization complete');
    return true;
    
  } catch (error) {
    console.error('❌ Error initializing Supabase Storage:', error);
    return false;
  }
}

// Run initialization if called directly
if (require.main === module) {
  initializeSupabaseStorage()
    .then(success => {
      if (success) {
        console.log('🎉 Supabase Storage setup completed successfully!');
        process.exit(0);
      } else {
        console.error('💥 Supabase Storage setup failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { initializeSupabaseStorage };
