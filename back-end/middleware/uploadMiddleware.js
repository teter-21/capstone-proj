const multer = require("multer");
const path = require("path");

/*
 * Store the uploaded image temporarily in memory.
 * It will be uploaded to Cloudinary by the controller.
 */
const storage = multer.memoryStorage();

/*
 * Accept only common raster image formats.
 * SVG is intentionally excluded.
 */
const fileFilter = (req, file, cb) => {
  const allowed = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
  };

  const extension = path.extname(file.originalname).toLowerCase();

  if (allowed[extension] !== file.mimetype) {
    return cb(new Error("Only JPG, JPEG, PNG, and GIF images are allowed."));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
    files: 1,
  },
});

module.exports = upload;
