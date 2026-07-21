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
import { InstructorsService } from './instructors.service';
import {
  CreateInstructorDto,
  ListInstructorsDto,
  UpdateInstructorDto,
} from './dto/instructor.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums';

@ApiTags('Instructors')
@Controller()
export class InstructorsController {
  constructor(private readonly service: InstructorsService) {}

  // ── Public read ───────────────────────────────────
  @Public()
  @Get('instructors')
  list(@Query() query: ListInstructorsDto) {
    return this.service.list(query);
  }

  @Public()
  @Get('instructors/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  // ── Admin CRUD ────────────────────────────────────
  @Post('admin/instructors')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateInstructorDto) {
    return this.service.create(dto);
  }

  @Patch('admin/instructors/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInstructorDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete('admin/instructors/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
