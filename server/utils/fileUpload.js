const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/profile-photos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// File filter for images only
const fileFilter = (req, file, cb) => {
  // Accept only image files
  const allowedMimes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('רק קבצי תמונה מותרים (JPEG, PNG, GIF, WebP)'), false);
  }
};

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, 'profile-' + uniqueSuffix + extension);
  }
});

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file at a time
  }
});

// Middleware to handle upload errors
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'גודל הקובץ חורג מ-5MB',
        message: 'File size exceeds 5MB limit'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'ניתן להעלות קובץ אחד בלבד',
        message: 'Only one file allowed'
      });
    }
  }
  
  if (error.message.includes('רק קבצי תמונה מותרים')) {
    return res.status(400).json({
      error: error.message,
      message: 'Only image files allowed'
    });
  }
  
  return res.status(500).json({
    error: 'שגיאה בהעלאת הקובץ',
    message: 'File upload error'
  });
};

// Function to delete old profile photo
const deleteOldPhoto = (photoUrl) => {
  if (photoUrl && photoUrl.includes('/uploads/profile-photos/')) {
    const filename = path.basename(photoUrl);
    const filePath = path.join(uploadsDir, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('🗑️ Deleted old profile photo:', filename);
    }
  }
};

// Function to validate image dimensions (optional)
const validateImageDimensions = (filePath) => {
  return new Promise((resolve, reject) => {
    try {
      // For basic validation, we'll just check if file exists and is readable
      // In production, you might want to use sharp or jimp for image processing
      if (fs.existsSync(filePath)) {
        resolve(true);
      } else {
        reject(new Error('File not found'));
      }
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  upload,
  handleUploadError,
  deleteOldPhoto,
  validateImageDimensions,
  uploadsDir
};
