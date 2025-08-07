// Load environment variables
require('dotenv').config();

const { supabase, supabaseAdmin } = require('../config/supabase');
const { migrateProfilePhotos } = require('./migratePhotos');
const { initializeSupabaseStorage } = require('./initializeStorage');

/**
 * Complete migration to Supabase Storage
 * 1. Initialize Supabase Storage bucket
 * 2. Migrate existing photos to Supabase
 * 3. Update database URLs to point to Supabase
 */
async function fullStorageMigration() {
  try {
    console.log('🚀 Starting complete migration to Supabase Storage...');
    
    // Step 1: Initialize Supabase Storage
    console.log('\n📦 Step 1: Initializing Supabase Storage...');
    const storageInitialized = await initializeSupabaseStorage();
    if (!storageInitialized) {
      throw new Error('Failed to initialize Supabase Storage');
    }
    
    // Step 2: Migrate photos
    console.log('\n📸 Step 2: Migrating profile photos...');
    const photosMigrated = await migrateProfilePhotos();
    if (!photosMigrated) {
      console.warn('⚠️ Some photos failed to migrate, but continuing...');
    }
    
    // Step 3: Update database URLs
    console.log('\n🔄 Step 3: Updating database photo URLs...');
    await updateDatabaseUrls();
    
    console.log('\n🎉 Complete migration to Supabase Storage finished successfully!');
    console.log('💡 Your profile photos are now stored in secure cloud storage');
    console.log('🌐 Photos will be accessible from any deployment');
    
    return true;
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
}

/**
 * Update database photo URLs to use Supabase Storage URLs
 */
async function updateDatabaseUrls() {
  try {
    // Get all users with local photo URLs
    const { data: users, error } = await supabase
      .from('users')
      .select('id, id_number, photo_url')
      .not('photo_url', 'is', null)
      .like('photo_url', '/uploads/profile-photos/%');
    
    if (error) {
      throw error;
    }
    
    console.log(`📊 Found ${users.length} users with local photo URLs to update`);
    
    let updatedCount = 0;
    
    for (const user of users) {
      try {
        // Extract filename from local URL
        const filename = user.photo_url.split('/').pop();
        
        // Generate Supabase Storage URL
        const { data: publicData } = supabaseAdmin.storage
          .from('uploads')
          .getPublicUrl(`profile-photos/${filename}`);
        
        const newPhotoUrl = publicData.publicUrl;
        
        // Update user record
        const { error: updateError } = await supabase
          .from('users')
          .update({ photo_url: newPhotoUrl })
          .eq('id', user.id);
        
        if (updateError) {
          console.error(`❌ Failed to update user ${user.id_number}:`, updateError.message);
        } else {
          console.log(`✅ Updated photo URL for user ${user.id_number}: ${filename}`);
          updatedCount++;
        }
        
      } catch (userError) {
        console.error(`❌ Error processing user ${user.id}:`, userError.message);
      }
    }
    
    console.log(`📊 Successfully updated ${updatedCount} out of ${users.length} users`);
    
  } catch (error) {
    console.error('❌ Error updating database URLs:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  fullStorageMigration()
    .then(success => {
      if (success) {
        console.log('\n🎉 Full storage migration completed successfully!');
        console.log('🔧 Next steps:');
        console.log('1. Deploy the updated code to production');
        console.log('2. Test photo upload/view functionality');
        console.log('3. Optionally clean up local uploads directory');
        process.exit(0);
      } else {
        console.error('\n💥 Migration failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { 
  fullStorageMigration, 
  updateDatabaseUrls 
};
