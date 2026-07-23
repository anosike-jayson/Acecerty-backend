import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { CoursesService } from './courses.service';
import {
  CreateCourseDto,
  ListCoursesDto,
  UpdateCourseDto,
} from './dto/course.dto';
import {
  CreateLessonDto,
  CreateModuleDto,
  UpdateLessonDto,
  UpdateModuleDto,
} from './dto/module-lesson.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums';
import { PublishDto } from '../common/dto/publish.dto';
import {
  imageUploadOptions,
  publicUploadUrl,
} from '../common/uploads/image-upload';

@ApiTags('Courses')
@Controller()
export class CoursesController {
  constructor(
    private readonly service: CoursesService,
    private readonly config: ConfigService,
  ) {}

  private applyThumbnail(dto: CreateCourseDto | UpdateCourseDto, file?: any) {
    // Swagger-only field — never persist it.
    delete (dto as any).thumbnail;
    if (file) {
      const base = this.config.get<string>('appBaseUrl')!;
      (dto as any).imageUrl = publicUploadUrl(base, file.filename);
    }
  }

  // ── Public read ───────────────────────────────────
  @Public()
  @Get('courses')
  list(@Query() query: ListCoursesDto) {
    return this.service.listPublic(query);
  }

  @Public()
  @Get('courses/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.service.getBySlug(slug);
  }

  // ── Admin course CRUD ─────────────────────────────
  @Get('admin/courses')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  adminList(@Query() query: ListCoursesDto) {
    return this.service.adminList(query);
  }

  @Get('admin/courses/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  adminGet(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.adminGet(id);
  }

  @Post('admin/courses')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FileInterceptor('thumbnail', imageUploadOptions))
  create(@Body() dto: CreateCourseDto, @UploadedFile() thumbnail?: any) {
    this.applyThumbnail(dto, thumbnail);
    return this.service.create(dto);
  }

  @Patch('admin/courses/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FileInterceptor('thumbnail', imageUploadOptions))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDto,
    @UploadedFile() thumbnail?: any,
  ) {
    this.applyThumbnail(dto, thumbnail);
    return this.service.update(id, dto);
  }

  @Patch('admin/courses/:id/publish')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  publish(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PublishDto) {
    return this.service.setPublished(id, dto.isPublished);
  }

  @Delete('admin/courses/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  // ── Admin modules ─────────────────────────────────
  @Post('admin/courses/:id/modules')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  addModule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateModuleDto,
  ) {
    return this.service.addModule(id, dto);
  }

  @Patch('admin/modules/:moduleId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateModule(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: UpdateModuleDto,
  ) {
    return this.service.updateModule(moduleId, dto);
  }

  @Delete('admin/modules/:moduleId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  removeModule(@Param('moduleId', ParseUUIDPipe) moduleId: string) {
    return this.service.removeModule(moduleId);
  }

  // ── Admin lessons ─────────────────────────────────
  @Post('admin/modules/:moduleId/lessons')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  addLesson(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.service.addLesson(moduleId, dto);
  }

  @Patch('admin/lessons/:lessonId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateLesson(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.service.updateLesson(lessonId, dto);
  }

  @Delete('admin/lessons/:lessonId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  removeLesson(@Param('lessonId', ParseUUIDPipe) lessonId: string) {
    return this.service.removeLesson(lessonId);
  }
}
