import multer from "multer";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const uploadPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Only JPG, PNG, WEBP or GIF images are allowed"));
  },
}).single("photo");
