const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const _multer = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(null, false); // silently drop; route handler returns 400
  },
});

// Wrapper so multer errors (LIMIT_UNEXPECTED_FILE, LIMIT_FILE_SIZE, etc.) return 400 not 500
const upload = {
  single: (field) => (req, res, next) => {
    _multer.single(field)(req, res, (err) => {
      if (!err) return next();
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'File too large. Maximum size is 10 MB.'
        : err.code === 'LIMIT_UNEXPECTED_FILE'
        ? 'Unexpected field — use "photo" as the field name.'
        : err.message || 'Upload error.';
      res.status(400).json({ success: false, message: msg });
    });
  },
};

const resizeProfilePic = async (req, res, next) => {
  if (!req.file) return next();
  try {
    const uploadsDir = path.join(__dirname, '../../uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });

    const filename = `profile_${req.user.id}_${Date.now()}.jpg`;
    await sharp(req.file.buffer)
      .resize(100, 100, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 90 })
      .toFile(path.join(uploadsDir, filename));

    req.file.filename = filename;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { upload, resizeProfilePic };
