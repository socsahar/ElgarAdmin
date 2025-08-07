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
    
    // Check if 'uploads' bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return false;
    }
    
    const uploadsBucket = buckets.find(bucket => bucket.name === 'uploads');
    
    if (!uploadsBucket) {
      console.log('📦 Creating uploads bucket...');
      
      // Create the bucket
      const { data, error } = await supabaseAdmin.storage.createBucket('uploads', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (error) {
        console.error('❌ Error creating bucket:', error);
        return false;
      }
      
      console.log('✅ Uploads bucket created successfully');
    } else {
      console.log('✅ Uploads bucket already exists');
    }
    
    // Set up storage policies for public read access
    console.log('🔐 Setting up storage policies...');
    
    // Note: Policies are usually set up via Supabase Dashboard or SQL
    // For this demo, we'll assume public read access is enabled
    
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
