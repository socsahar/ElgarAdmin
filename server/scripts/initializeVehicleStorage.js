// Load environment variables
require('dotenv').config();

const { supabaseAdmin } = require('../config/supabase');

// Initialize Supabase Storage buckets for vehicle images
async function initializeVehicleStorage() {
  try {
    console.log('🗂️ Initializing vehicle image storage...');

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return false;
    }

    const vehicleBucketExists = buckets.some(bucket => bucket.name === 'vehicle-images');
    
    if (!vehicleBucketExists) {
      // Create vehicle-images bucket
      const { data, error } = await supabaseAdmin.storage.createBucket('vehicle-images', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png'],
        fileSizeLimit: 5242880 // 5MB
      });

      if (error) {
        console.error('Error creating vehicle-images bucket:', error);
        return false;
      }

      console.log('✅ Vehicle images bucket created successfully');
    } else {
      console.log('✅ Vehicle images bucket already exists');
    }

    // Set up RLS policies for the bucket (if needed)
    // Note: For public buckets, this might not be necessary
    
    return true;
  } catch (error) {
    console.error('Error initializing vehicle storage:', error);
    return false;
  }
}

module.exports = { initializeVehicleStorage };

// Run if called directly
if (require.main === module) {
  initializeVehicleStorage()
    .then(() => {
      console.log('Vehicle storage initialization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Vehicle storage initialization failed:', error);
      process.exit(1);
    });
}
