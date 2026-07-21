import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService, sanitizeUser } from './users.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { AdminListUsersDto, UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // ── Self profile ──────────────────────────────────
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return sanitizeUser(await this.users.findById(user.id));
  }

  // ── Admin ─────────────────────────────────────────
  @Get('admin/users')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  adminList(@Query() query: AdminListUsersDto) {
    return this.users.adminList(query);
  }

  @Patch('admin/users/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminUpdate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return sanitizeUser(await this.users.adminUpdate(id, dto));
  }
}
