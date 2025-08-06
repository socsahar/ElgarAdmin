const express = require('express');
const router = express.Router();
const { authMiddleware: auth } = require('../middleware/auth');
const { upload, handleUploadError, deleteOldPhoto } = require('../utils/fileUpload');

/**
 * Upload profile photo
 * POST /api/upload/profile-photo
 * Optional query parameter: userId (ID number for renaming)
 */
router.post('/profile-photo', auth, (req, res) => {
  // Use multer middleware for single file upload
  upload.single('profilePhoto')(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res);
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'לא נבחר קובץ להעלאה',
        message: 'No file selected'
      });
    }
    
    try {
      const { userId } = req.query; // Get userId from query parameters
      let finalFilename = req.file.filename;
      let finalPath = req.file.path;
      
      // If userId is provided, rename the file to use the ID number
      if (userId) {
        const path = require('path');
        const fs = require('fs');
        const extension = path.extname(req.file.originalname).toLowerCase();
        const newFilename = `${userId}${extension}`;
        const newPath = path.join(path.dirname(req.file.path), newFilename);
        
        // Delete existing photo with same ID if exists
        const existingFiles = fs.readdirSync(path.dirname(req.file.path));
        existingFiles.forEach(file => {
          if (file.startsWith(`${userId}.`)) {
            const existingPath = path.join(path.dirname(req.file.path), file);
            try {
              fs.unlinkSync(existingPath);
              console.log('🗑️ Deleted existing photo for user:', userId);
            } catch (deleteErr) {
              console.warn('Warning: Could not delete existing photo:', deleteErr.message);
            }
          }
        });
        
        // Rename the new file
        fs.renameSync(req.file.path, newPath);
        finalFilename = newFilename;
        finalPath = newPath;
      }
      
      // Generate file URL (relative to server)
      const fileUrl = `/uploads/profile-photos/${finalFilename}`;
      
      console.log('✅ Profile photo uploaded successfully:', {
        originalName: req.file.originalname,
        filename: finalFilename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedBy: req.user.username,
        userId: userId || 'none'
      });
      
      res.json({
        success: true,
        message: 'התמונה הועלתה בהצלחה',
        data: {
          filename: finalFilename,
          originalName: req.file.originalname,
          url: fileUrl,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });
      
    } catch (error) {
      console.error('❌ Error processing uploaded file:', error);
      res.status(500).json({
        error: 'שגיאה בעיבוד הקובץ',
        message: 'Error processing file'
      });
    }
  });
});

/**
 * Delete profile photo
 * DELETE /api/upload/profile-photo/:filename
 */
router.delete('/profile-photo/:filename', auth, (req, res) => {
  try {
    const { filename } = req.params;
    
    // Basic security check - ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        error: 'שם קובץ לא תקין',
        message: 'Invalid filename'
      });
    }
    
    const path = require('path');
    const fs = require('fs');
    const uploadsDir = path.join(__dirname, '../uploads/profile-photos');
    
    // If filename is just a number (ID), try to find and delete all files with that ID
    if (/^\d+$/.test(filename)) {
      const files = fs.readdirSync(uploadsDir);
      let deletedCount = 0;
      
      files.forEach(file => {
        if (file.startsWith(`${filename}.`)) {
          const filePath = path.join(uploadsDir, file);
          try {
            fs.unlinkSync(filePath);
            deletedCount++;
          } catch (err) {
            console.warn('Warning: Could not delete file:', file, err.message);
          }
        }
      });
      
      if (deletedCount > 0) {
        res.json({
          success: true,
          message: 'התמונה נמחקה בהצלחה',
          deletedFiles: deletedCount
        });
      } else {
        res.json({
          success: true,
          message: 'לא נמצאה תמונה למחיקה',
          deletedFiles: 0
        });
      }
    } else {
      // Handle regular filename deletion
      const photoPath = path.join(uploadsDir, filename);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
      
      res.json({
        success: true,
        message: 'התמונה נמחקה בהצלחה'
      });
    }
    
  } catch (error) {
    console.error('❌ Error deleting profile photo:', error);
    res.status(500).json({
      error: 'שגיאה במחיקת התמונה',
      message: 'Error deleting photo'
    });
  }
});

/**
 * Get upload status/info
 * GET /api/upload/info
 */
router.get('/info', auth, (req, res) => {
  res.json({
    maxFileSize: '5MB',
    allowedTypes: ['JPEG', 'JPG', 'PNG', 'GIF', 'WebP'],
    uploadPath: '/uploads/profile-photos/',
    guidelines: {
      hebrew: 'העלה תמונת פספורט ברורה עד 5MB',
      english: 'Upload clear passport photo up to 5MB'
    }
  });
});

module.exports = router;
