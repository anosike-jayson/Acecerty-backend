import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { UserRole } from '../enums';
import { imageUploadOptions, publicUploadUrl } from './image-upload';

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
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Image file (png/jpg/webp/gif/svg, max 5 MB)',
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  upload(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file uploaded');
    const base = this.config.get<string>('appBaseUrl')!;
    return {
      url: publicUploadUrl(base, file.filename),
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
