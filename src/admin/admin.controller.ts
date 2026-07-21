import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AuditLogService } from './audit-log.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly audit: AuditLogService,
  ) {}

  @Get('dashboard/stats')
  stats() {
    return this.admin.dashboardStats();
  }

  @Get('orders')
  orders(@Query() pagination: PaginationDto) {
    return this.admin.listOrders(pagination);
  }

  @Get('payments')
  payments(@Query() pagination: PaginationDto) {
    return this.admin.listPayments(pagination);
  }

  @Get('attempts')
  attempts(@Query() pagination: PaginationDto) {
    return this.admin.listAttempts(pagination);
  }

  @Get('audit-logs')
  auditLogs(@Query() pagination: PaginationDto) {
    return this.audit.list(pagination);
  }
}
