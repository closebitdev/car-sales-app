import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(__dirname, "..", "..", "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // e.g. car-<timestamp>.<ext>
    const ext = path.extname(file.originalname);
    cb(null, `car-${Date.now()}${ext}`);
  },
});

function fileFilter(_req: any, file: any, cb: multer.FileFilterCallback) {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error("Only JPG/PNG/WebP images are allowed"));
}

// single image upload // 5MB
export const uploadImage = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024, }, }).single("image");

// multi upload: up to 10 images per request
export const uploadImages = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }).array("images", 10);

