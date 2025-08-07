// Load environment variables
require('dotenv').config();

const { supabase, supabaseAdmin } = require('../config/supabase');

/**
 * Update database photo URLs to use Supabase Storage URLs
 * This fixes the issue where users still have local photo URLs
 */
async function updatePhotoUrls() {
  try {
    console.log('🔄 Updating database photo URLs to Supabase Storage...');
    
    // Get all users with any photo_url (local or otherwise)
    const { data: users, error } = await supabase
      .from('users')
      .select('id, id_number, photo_url')
      .not('photo_url', 'is', null);
    
    if (error) {
      throw error;
    }
    
    console.log(`📊 Found ${users.length} users with photo URLs`);
    
    // List all files in Supabase Storage to see what we have
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from('uploads')
      .list('profile-photos');
    
    if (listError) {
      throw listError;
    }
    
    console.log(`📁 Found ${files.length} files in Supabase Storage:`, files.map(f => f.name));
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const user of users) {
      try {
        let needsUpdate = false;
        let newPhotoUrl = null;
        
        // Check if user has local URL that needs updating
        if (user.photo_url && user.photo_url.includes('/uploads/profile-photos/')) {
          const filename = user.photo_url.split('/').pop();
          console.log(`🔍 User ${user.id_number}: Local URL found, filename: ${filename}`);
          
          // Check if file exists in Supabase Storage
          const fileExists = files.find(f => f.name === filename);
          if (fileExists) {
            const { data: publicData } = supabaseAdmin.storage
              .from('uploads')
              .getPublicUrl(`profile-photos/${filename}`);
            
            newPhotoUrl = publicData.publicUrl;
            needsUpdate = true;
            console.log(`✅ Will update ${user.id_number}: ${filename} -> Supabase URL`);
          } else {
            console.log(`⚠️ File ${filename} not found in Supabase Storage for user ${user.id_number}`);
          }
        } else if (user.photo_url && !user.photo_url.includes('supabase.co')) {
          // User has some other URL format, try to match by ID number
          const matchingFile = files.find(f => f.name.startsWith(user.id_number + '.'));
          if (matchingFile) {
            const { data: publicData } = supabaseAdmin.storage
              .from('uploads')
              .getPublicUrl(`profile-photos/${matchingFile.name}`);
            
            newPhotoUrl = publicData.publicUrl;
            needsUpdate = true;
            console.log(`✅ Will update ${user.id_number}: Found matching file ${matchingFile.name}`);
          }
        } else if (user.photo_url && user.photo_url.includes('supabase.co')) {
          console.log(`✓ User ${user.id_number}: Already has Supabase URL`);
          skippedCount++;
        } else {
          // Try to find file by ID number even if no photo_url
          const matchingFile = files.find(f => f.name.startsWith(user.id_number + '.'));
          if (matchingFile) {
            const { data: publicData } = supabaseAdmin.storage
              .from('uploads')
              .getPublicUrl(`profile-photos/${matchingFile.name}`);
            
            newPhotoUrl = publicData.publicUrl;
            needsUpdate = true;
            console.log(`✅ Will add photo URL for ${user.id_number}: Found file ${matchingFile.name}`);
          }
        }
        
        // Update user record if needed
        if (needsUpdate && newPhotoUrl) {
          const { error: updateError } = await supabase
            .from('users')
            .update({ photo_url: newPhotoUrl })
            .eq('id', user.id);
          
          if (updateError) {
            console.error(`❌ Failed to update user ${user.id_number}:`, updateError.message);
          } else {
            console.log(`✅ Updated photo URL for user ${user.id_number}`);
            updatedCount++;
          }
        }
        
      } catch (userError) {
        console.error(`❌ Error processing user ${user.id}:`, userError.message);
      }
    }
    
    console.log('\n📊 Update Summary:');
    console.log(`✅ Successfully updated: ${updatedCount} users`);
    console.log(`⏭️ Skipped (already correct): ${skippedCount} users`);
    console.log(`📁 Total users processed: ${users.length}`);
    
    return updatedCount > 0;
    
  } catch (error) {
    console.error('❌ Error updating photo URLs:', error);
    return false;
  }
}

// Run update if called directly
if (require.main === module) {
  updatePhotoUrls()
    .then(success => {
      if (success) {
        console.log('\n🎉 Photo URL update completed successfully!');
        console.log('💡 Users should now see their profile photos');
        process.exit(0);
      } else {
        console.log('\n✓ No updates needed or update failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { updatePhotoUrls };
