import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { UserRole } from '../enums';

const IMAGE_MIME = /^(image\/(png|jpe?g|webp|gif|svg\+xml))$/;

/**
 * Local-disk image upload for Iteration 1. Swap the storage engine for
 * S3/Cloudinary in production (PRD §4 common, §5.3).
 */
@ApiTags('Uploads')
@Controller('admin/uploads')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class UploadsController {
  constructor(private readonly config: ConfigService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: process.env.UPLOAD_DIR || 'uploads',
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
    }),
  )
  upload(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file uploaded');
    const base = this.config.get<string>('appBaseUrl');
    return {
      url: `${base}/uploads/${file.filename}`,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
