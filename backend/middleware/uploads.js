import multer from "multer";
import path from "path";
import crypto from "crypto";

// Only genuine image types are accepted for question images.
const ALLOWED_MIME_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB (matches the error handler in server.js)

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  // Derive the extension from the validated MIME type instead of trusting the
  // client-supplied originalname, and use a random component so filenames are
  // not predictable/collidable.
  filename: (req, file, cb) => {
    const ext = ALLOWED_MIME_TYPES[file.mimetype] || "";
    const unique = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
    cb(null, `${unique}${ext}`);
  },
});

// Reject anything that is not an allowed image type.
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES[file.mimetype]) {
    return cb(null, true);
  }
  const err = new Error("Invalid file type. Only JPEG, PNG, GIF and WebP images are allowed.");
  err.code = "LIMIT_UNEXPECTED_FILE_TYPE";
  return cb(err);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE, // enforce a maximum size (previously unbounded)
    files: 1,                // never accept more than one file
  },
});

export default upload;
