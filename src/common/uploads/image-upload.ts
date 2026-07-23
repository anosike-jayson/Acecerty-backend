import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// multer's diskStorage does not create the destination — ensure it exists.
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const IMAGE_MIME = /^(image\/(png|jpe?g|webp|gif|svg\+xml))$/;

/** Shared multer options for image uploads (courses thumbnails, admin uploads). */
export const imageUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const name = `${Date.now()}-${randomBytes(6).toString('hex')}${extname(
        file.originalname,
      )}`;
      cb(null, name);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (!IMAGE_MIME.test(file.mimetype)) {
      return cb(new BadRequestException('Only image files are allowed'), false);
    }
    cb(null, true);
  },
};

/** Builds the public URL for a stored upload. */
export function publicUploadUrl(baseUrl: string, filename: string): string {
  return `${baseUrl.replace(/\/$/, '')}/uploads/${filename}`;
}
