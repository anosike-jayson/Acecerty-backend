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
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ExamCatalogService } from './exam-catalog.service';
import {
  CreateExamDto,
  CreateExamProductDto,
  CreateTopicDto,
  ListExamProductsDto,
  UpdateExamDto,
  UpdateExamProductDto,
  UpdateTopicDto,
} from './dto/exam-catalog.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums';
import { PublishDto } from '../common/dto/publish.dto';

@ApiTags('Exam Catalog')
@Controller()
export class ExamCatalogController {
  constructor(private readonly service: ExamCatalogService) {}

  // ── Public read ───────────────────────────────────
  @Public()
  @Get('exam-products')
  list(@Query() query: ListExamProductsDto) {
    return this.service.listPublic(query);
  }

  @Public()
  @Get('exam-products/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.service.getBySlug(slug);
  }

  // ── Admin: products ───────────────────────────────
  @Get('admin/exam-products')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  adminList(@Query() query: ListExamProductsDto) {
    return this.service.adminList(query);
  }

  @Get('admin/exam-products/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  adminGet(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.adminGet(id);
  }

  @Post('admin/exam-products')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateExamProductDto) {
    return this.service.createProduct(dto);
  }

  @Patch('admin/exam-products/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateExamProductDto) {
    return this.service.updateProduct(id, dto);
  }

  @Patch('admin/exam-products/:id/publish')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  publish(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PublishDto) {
    return this.service.setProductPublished(id, dto.isPublished);
  }

  @Delete('admin/exam-products/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeProduct(id);
  }

  // ── Admin: exams ──────────────────────────────────
  @Post('admin/exam-products/:id/exams')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  addExam(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateExamDto) {
    return this.service.addExam(id, dto);
  }

  @Patch('admin/exams/:examId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateExam(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Body() dto: UpdateExamDto,
  ) {
    return this.service.updateExam(examId, dto);
  }

  @Patch('admin/exams/:examId/publish')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  publishExam(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Body() dto: PublishDto,
  ) {
    return this.service.setExamPublished(examId, dto.isPublished);
  }

  @Delete('admin/exams/:examId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  removeExam(@Param('examId', ParseUUIDPipe) examId: string) {
    return this.service.removeExam(examId);
  }

  // ── Admin: topics ─────────────────────────────────
  @Post('admin/exam-products/:id/topics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  addTopic(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateTopicDto) {
    return this.service.addTopic(id, dto);
  }

  @Patch('admin/topics/:topicId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateTopic(
    @Param('topicId', ParseUUIDPipe) topicId: string,
    @Body() dto: UpdateTopicDto,
  ) {
    return this.service.updateTopic(topicId, dto);
  }

  @Delete('admin/topics/:topicId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  removeTopic(@Param('topicId', ParseUUIDPipe) topicId: string) {
    return this.service.removeTopic(topicId);
  }
}
