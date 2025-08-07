// Load environment variables
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('../config/supabase');

/**
 * Migrate existing profile photos from local storage to Supabase Storage
 */
async function migrateProfilePhotos() {
  try {
    console.log('📸 Starting profile photo migration to Supabase Storage...');
    
    const uploadsDir = path.join(__dirname, '../uploads/profile-photos');
    
    // Check if local uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      console.log('📁 No local uploads directory found, nothing to migrate');
      return true;
    }
    
    const files = fs.readdirSync(uploadsDir);
    console.log(`📄 Found ${files.length} files to migrate`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const filename of files) {
      try {
        const filePath = path.join(uploadsDir, filename);
        const fileBuffer = fs.readFileSync(filePath);
        const fileStats = fs.statSync(filePath);
        
        // Determine content type based on file extension
        const ext = path.extname(filename).toLowerCase();
        let contentType = 'image/jpeg'; // default
        switch (ext) {
          case '.png': contentType = 'image/png'; break;
          case '.gif': contentType = 'image/gif'; break;
          case '.webp': contentType = 'image/webp'; break;
          case '.jpg':
          case '.jpeg': contentType = 'image/jpeg'; break;
        }
        
        console.log(`📤 Uploading ${filename} (${fileStats.size} bytes)...`);
        
        // Upload to Supabase Storage
        const { data, error } = await supabaseAdmin.storage
          .from('uploads')
          .upload(`profile-photos/${filename}`, fileBuffer, {
            contentType: contentType,
            upsert: true
          });
        
        if (error) {
          console.error(`❌ Failed to upload ${filename}:`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Successfully uploaded ${filename}`);
          successCount++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (fileError) {
        console.error(`❌ Error processing ${filename}:`, fileError.message);
        errorCount++;
      }
    }
    
    console.log('📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${successCount} files`);
    console.log(`❌ Failed to migrate: ${errorCount} files`);
    console.log(`📁 Total files processed: ${files.length}`);
    
    if (successCount > 0) {
      console.log('🎉 Profile photo migration completed successfully!');
      console.log('💡 You can now delete the local uploads directory if desired');
    }
    
    return errorCount === 0;
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    return false;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateProfilePhotos()
    .then(success => {
      if (success) {
        console.log('🎉 Migration completed successfully!');
        process.exit(0);
      } else {
        console.error('💥 Migration completed with errors!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { migrateProfilePhotos };
