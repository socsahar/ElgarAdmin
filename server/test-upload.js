const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { supabase, supabaseAdmin } = require('./config/supabase');

async function testUpload() {
  try {
    console.log('🔍 Testing Supabase Storage upload...');
    
    // Create a small test image file
    const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
    
    console.log('📤 Uploading test image...');
    
    // Try to upload to Supabase Storage using admin client
    const { data, error } = await supabaseAdmin.storage
      .from('uploads')
      .upload('profile-photos/test-upload.png', testImageBuffer, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (error) {
      console.error('❌ Upload failed:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        statusCode: error.statusCode,
        details: error.details
      });
      return false;
    }
    
    console.log('✅ Upload successful:', data);
    
    // Test getting public URL
    const { data: publicData } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl('profile-photos/test-upload.png');
    
    console.log('🔗 Public URL:', publicData.publicUrl);
    
    // Clean up - delete test file
    const { error: deleteError } = await supabaseAdmin.storage
      .from('uploads')
      .remove(['profile-photos/test-upload.png']);
    
    if (deleteError) {
      console.warn('⚠️ Could not delete test file:', deleteError);
    } else {
      console.log('🗑️ Test file cleaned up');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed with exception:', error);
    return false;
  }
}

// Run the test
testUpload().then(success => {
  console.log(success ? '✅ Test completed successfully' : '❌ Test failed');
  process.exit(success ? 0 : 1);
});
