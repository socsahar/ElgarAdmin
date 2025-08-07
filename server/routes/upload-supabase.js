const express = require('express');
const router = express.Router();
const multer = require('multer');
const { supabase } = require('../config/supabase');
const { authMiddleware: auth } = require('../middleware/auth');

// Configure multer for memory storage (we'll upload directly to Supabase)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('רק קבצי תמונה מותרים (JPEG, PNG, GIF, WebP)'), false);
    }
  }
});

/**
 * Upload profile photo to Supabase Storage
 * POST /api/upload/profile-photo
 * Optional query parameter: userId (ID number for renaming)
 */
router.post('/profile-photo', auth, (req, res) => {
  upload.single('profilePhoto')(req, res, async (err) => {
    if (err) {
      console.error('❌ Upload error:', err.message);
      return res.status(400).json({
        error: err.message.includes('רק קבצי תמונה') ? err.message : 'שגיאה בהעלאת הקובץ',
        message: 'Upload error'
      });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'לא נבחר קובץ להעלאה',
        message: 'No file selected'
      });
    }
    
    try {
      const { userId } = req.query;
      const file = req.file;
      
      // Generate filename - use userId if provided, otherwise use timestamp
      const fileExtension = file.originalname.split('.').pop().toLowerCase();
      const filename = userId ? `${userId}.${fileExtension}` : `${Date.now()}.${fileExtension}`;
      const filePath = `profile-photos/${filename}`;
      
      console.log('📤 Uploading to Supabase Storage:', {
        filename,
        size: file.size,
        type: file.mimetype,
        user: req.user.username
      });
      
      // Delete existing photo for this user if userId is provided
      if (userId) {
        // List all files for this user and delete them
        const { data: existingFiles } = await supabase.storage
          .from('uploads')
          .list('profile-photos', {
            search: userId
          });
          
        if (existingFiles && existingFiles.length > 0) {
          for (const existingFile of existingFiles) {
            if (existingFile.name.startsWith(`${userId}.`)) {
              await supabase.storage
                .from('uploads')
                .remove([`profile-photos/${existingFile.name}`]);
              console.log('🗑️ Deleted existing photo:', existingFile.name);
            }
          }
        }
      }
      
      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true // Overwrite if exists
        });
      
      if (error) {
        console.error('❌ Supabase upload error:', error);
        return res.status(500).json({
          error: 'שגיאה בהעלאה לאחסון הענן',
          message: 'Cloud storage upload failed',
          details: error.message
        });
      }
      
      // Get public URL for the uploaded file
      const { data: publicData } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);
      
      const publicUrl = publicData.publicUrl;
      
      console.log('✅ Profile photo uploaded successfully to Supabase:', {
        path: filePath,
        url: publicUrl,
        uploadedBy: req.user.username,
        userId: userId || 'none'
      });
      
      res.json({
        success: true,
        message: 'התמונה הועלתה בהצלחה לאחסון הענן',
        data: {
          filename,
          originalName: file.originalname,
          url: publicUrl,
          path: filePath,
          size: file.size,
          mimetype: file.mimetype
        }
      });
      
    } catch (error) {
      console.error('❌ Error uploading to Supabase:', error);
      res.status(500).json({
        error: 'שגיאה בעיבוד הקובץ',
        message: 'Error processing file',
        details: error.message
      });
    }
  });
});

/**
 * Delete profile photo from Supabase Storage
 * DELETE /api/upload/profile-photo/:filename
 */
router.delete('/profile-photo/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Basic security check
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        error: 'שם קובץ לא תקין',
        message: 'Invalid filename'
      });
    }
    
    let filesToDelete = [];
    
    // If filename is just a number (ID), find all files with that ID
    if (/^\d+$/.test(filename)) {
      const { data: files } = await supabase.storage
        .from('uploads')
        .list('profile-photos', {
          search: filename
        });
        
      if (files) {
        filesToDelete = files
          .filter(file => file.name.startsWith(`${filename}.`))
          .map(file => `profile-photos/${file.name}`);
      }
    } else {
      // Regular filename deletion
      filesToDelete = [`profile-photos/${filename}`];
    }
    
    if (filesToDelete.length > 0) {
      const { error } = await supabase.storage
        .from('uploads')
        .remove(filesToDelete);
        
      if (error) {
        console.error('❌ Supabase delete error:', error);
        return res.status(500).json({
          error: 'שגיאה במחיקת התמונה מהאחסון',
          message: 'Error deleting from cloud storage'
        });
      }
      
      console.log('🗑️ Deleted files from Supabase:', filesToDelete);
    }
    
    res.json({
      success: true,
      message: 'התמונה נמחקה בהצלחה מהאחסון הענן',
      deletedFiles: filesToDelete.length
    });
    
  } catch (error) {
    console.error('❌ Error deleting from Supabase:', error);
    res.status(500).json({
      error: 'שגיאה במחיקת התמונה',
      message: 'Error deleting photo',
      details: error.message
    });
  }
});

/**
 * Get upload info
 * GET /api/upload/info
 */
router.get('/info', auth, (req, res) => {
  res.json({
    storage: 'Supabase Cloud Storage',
    maxFileSize: '5MB',
    allowedTypes: ['JPEG', 'JPG', 'PNG', 'GIF', 'WebP'],
    guidelines: {
      hebrew: 'העלה תמונת פספורט ברורה עד 5MB - נשמרת באחסון ענן מאובטח',
      english: 'Upload clear passport photo up to 5MB - stored in secure cloud storage'
    }
  });
});

module.exports = router;
