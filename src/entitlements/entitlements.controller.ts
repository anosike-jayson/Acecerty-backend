import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EntitlementsService } from './entitlements.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('Entitlements')
@Controller()
export class EntitlementsController {
  constructor(private readonly service: EntitlementsService) {}

  @Get('me/entitlements')
  listMine(@CurrentUser() user: AuthUser) {
    return this.service.listForUser(user.id);
  }
}
