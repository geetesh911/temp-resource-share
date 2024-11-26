import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (_req: Request, _file: Express.Multer.File, cb) {
        cb(null, uploadDir);
    },
    filename: function (_req: Request, file: Express.Multer.File, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

// File filter
const fileFilter = (_req: Request, _file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Add any file type restrictions here if needed
    cb(null, true);
};

// Export the configured multer middleware
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});
