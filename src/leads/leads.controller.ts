import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LeadsService } from './leads.service';
import {
  ContactDto,
  InstructorApplicationDto,
  ListLeadsDto,
  NewsletterSignupDto,
  UpdateLeadStatusDto,
} from './dto/lead.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums';

@ApiTags('Leads')
@Controller()
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  // ── Public capture ────────────────────────────────
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @Post('leads/instructor-application')
  instructorApplication(@Body() dto: InstructorApplicationDto) {
    return this.service.createInstructorApplication(dto);
  }

  @Public()
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @Post('leads/newsletter')
  newsletter(@Body() dto: NewsletterSignupDto) {
    return this.service.createNewsletterSignup(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @Post('leads/contact')
  contact(@Body() dto: ContactDto) {
    return this.service.createContact(dto);
  }

  // ── Admin review ──────────────────────────────────
  @Get('admin/leads')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  list(@Query() query: ListLeadsDto) {
    return this.service.list(query);
  }

  @Patch('admin/leads/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadStatusDto,
  ) {
    return this.service.updateStatus(id, dto);
  }
}
