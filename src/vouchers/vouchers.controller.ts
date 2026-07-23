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
import { VouchersService } from './vouchers.service';
import {
  CreateExamVoucherDto,
  ListExamVouchersDto,
  UpdateExamVoucherDto,
} from './dto/exam-voucher.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums';
import { PublishDto } from '../common/dto/publish.dto';

@ApiTags('Exam Vouchers')
@Controller()
export class VouchersController {
  constructor(private readonly service: VouchersService) {}

  // ── Public read ───────────────────────────────────
  @Public()
  @Get('exam-vouchers')
  list(@Query() query: ListExamVouchersDto) {
    return this.service.listPublic(query);
  }

  @Public()
  @Get('exam-vouchers/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.service.getBySlug(slug);
  }

  // ── Admin CRUD ────────────────────────────────────
  @Get('admin/exam-vouchers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  adminList(@Query() query: ListExamVouchersDto) {
    return this.service.adminList(query);
  }

  @Get('admin/exam-vouchers/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  adminGet(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.adminGet(id);
  }

  @Post('admin/exam-vouchers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateExamVoucherDto) {
    return this.service.create(dto);
  }

  @Patch('admin/exam-vouchers/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateExamVoucherDto) {
    return this.service.update(id, dto);
  }

  @Patch('admin/exam-vouchers/:id/publish')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  publish(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PublishDto) {
    return this.service.setPublished(id, dto.isPublished);
  }

  @Delete('admin/exam-vouchers/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
